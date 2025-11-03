// Individual product page - shows one item with all its details, photos, and an add-to-cart button.
// Also displays who's selling it and how to contact them.
import { ProductData, Product, DBReview } from './types.js';
import { supabase, supabaseAdmin } from './supabase-client.js';
import { updateNavCart } from './cart-utils.js';

// Convert a price from cents to a nice formatted string like "$24.99"
function formatPrice(cents: number, currency: string): string {
  if (typeof cents !== 'number') return '';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency
    }).format(cents / 100);
  } catch (e) {
    return (cents / 100).toFixed(2) + ' ' + (currency || 'USD');
  }
}

// Figure out which product they want to see by grabbing the ID from the URL
function getIdFromUrl(): string | null {
  const params = new URLSearchParams(location.search);
  return params.get('id');
}

// Load all the details for one specific product, including who's selling it
async function loadProductById(id: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('[product] Database error loading product:', error);
      throw error;
    }
    if (data) {
      // Try to get info about the seller so we can show their name
      let sellerName = 'CCNY Student';
      let sellerEmail = '';
      
      if (data.seller_id && supabaseAdmin) {
        try {
          const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(data.seller_id);
          if (!userError && user) {
            const fullName = user.user_metadata?.full_name || user.user_metadata?.fullName;
            sellerName = fullName || user.email?.split('@')[0] || 'CCNY Student';
            sellerEmail = user.email || '';
          }
        } catch (e) {
          console.error('[product] Error fetching seller info:', e);
        }
      }
      
      return {
        id: data.id,
        title: data.name || data.title || '',
        description: data.description || '',
        category: data.category || '',
        price_cents: data.price ? Math.round(Number(data.price) * 100) : 0,
        currency: 'USD',
        condition: data.condition || 'Used',
        location: data.location || '',
        created_at: data.created_at,
        seller_id: data.seller_id,
        tags: data.tags || [],
        images: data.images || [],
        quantity: data.quantity || 1,
        quantity_sold: data.quantity_sold || 0,
        seller: {
          id: data.seller_id || 'unknown',
          name: sellerName,
          verified: true,
          contact: {
            via: 'email',
            address: sellerEmail
          }
        }
      };
    }
  } catch (e) {
    console.error('[product] Product fetch failed, falling back to local data:', e);
    // Show a warning banner to the user
    const container = document.getElementById('product-detail');
    if (container) {
      const warning = document.createElement('div');
      warning.style.cssText = 'padding: 15px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; margin-bottom: 20px;';
      warning.innerHTML = '<strong>⚠️ Database connection unavailable.</strong> Product information may be limited.';
      container.insertBefore(warning, container.firstChild);
    }
  }
  // If we can't reach the database, check the local backup file instead
  try {
    const res = await fetch('data/products.json');
    if (!res.ok) throw new Error('load');
    const j: ProductData = await res.json();
    return (j.products || []).find((p) => p.id === id) || null;
  } catch (e) {
    console.error('[product] Failed to load fallback data:', e);
    return null;
  }
}

// Find or create a shopping cart for whoever's logged in right now
async function getOrCreateCart(): Promise<string | null> {
  const session = await supabase.auth.getSession();
  if (!session.data.session) return null;
  
  const { data: existingCart } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', session.data.session.user.id)
    .maybeSingle();
  
  if (existingCart) return existingCart.id;
  
  const { data: newCart } = await supabase
    .from('carts')
    .insert([{ user_id: session.data.session.user.id }])
    .select('id')
    .single();
  
  return newCart?.id || null;
}

// Add item to cart in database
async function addToCart(productId: string, quantity: number): Promise<void> {
  const cartId = await getOrCreateCart();
  if (!cartId) {
    alert('Please log in to add items to your cart.');
    return;
  }
  
  // First check the product's available quantity
  const { data: product } = await supabase
    .from('products')
    .select('quantity')
    .eq('id', productId)
    .single();
  
  if (!product) {
    alert('Product not found.');
    return;
  }
  
  // Check if item already in cart
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('cart_id', cartId)
    .eq('product_id', productId)
    .maybeSingle();
  
  const currentCartQty = existing ? existing.quantity : 0;
  const newTotalQty = currentCartQty + quantity;
  
  // Check if new total would exceed available stock
  if (newTotalQty > product.quantity) {
    const available = product.quantity - currentCartQty;
    if (available <= 0) {
      alert('This item is already at maximum quantity in your cart.');
    } else {
      alert(`Only ${available} more item(s) available. You already have ${currentCartQty} in your cart.`);
    }
    return;
  }
  
  if (existing) {
    // Update quantity
    await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id);
  } else {
    // Insert new item
    await supabase
      .from('cart_items')
      .insert([{ cart_id: cartId, product_id: productId, quantity }]);
  }
  
  await updateNavCart();
}

// Load reviews for a product
async function loadReviews(productId: string): Promise<DBReview[]> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.log('Reviews table might not exist yet:', error.message);
      return [];
    }
    
    // Fetch reviewer names using admin client if available
    if (data && data.length > 0 && supabaseAdmin) {
      const reviewsWithNames = await Promise.all(
        data.map(async (review): Promise<DBReview> => {
          let reviewerName = 'CCNY Student';
          
          if (review.user_id && supabaseAdmin) {
            try {
              const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(review.user_id);
              if (!userError && user) {
                const fullName = user.user_metadata?.full_name || user.user_metadata?.fullName;
                reviewerName = fullName || user.email?.split('@')[0] || 'CCNY Student';
              }
            } catch (e) {
              console.error('Error fetching reviewer info:', e);
            }
          }
          
          return { ...review, reviewerName } as DBReview;
        })
      );
      return reviewsWithNames;
    }
    
    return (data || []) as DBReview[];
  } catch (e) {
    console.error('Error loading reviews:', e);
    return [];
  }
}

// Submit a review
async function submitReview(productId: string, rating: number, comment: string): Promise<boolean> {
  try {
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      alert('Please log in to leave a review.');
      return false;
    }

    const { error } = await supabase
      .from('reviews')
      .insert([{
        product_id: productId,
        user_id: session.data.session.user.id,
        rating,
        comment,
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Error submitting review:', e);
    return false;
  }
}

// Render reviews list
async function renderReviews(productId: string): Promise<void> {
  const reviewsList = document.getElementById('reviews-list');
  if (!reviewsList) return;

  const reviews = await loadReviews(productId);
  
  if (!reviews.length) {
    reviewsList.innerHTML = '<p class="muted">No reviews yet. Be the first to review this product!</p>';
    return;
  }

  reviewsList.innerHTML = '';
  reviews.forEach((review) => {
    const rating = review.rating || 5;
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    const reviewerName = review.reviewerName || 'CCNY Student';
    const date = new Date(review.created_at).toLocaleDateString();
    
    const reviewDiv = document.createElement('div');
    reviewDiv.className = 'review-card';
    reviewDiv.style.cssText = 'padding:1rem;margin-bottom:1rem;background:var(--card);border:1px solid var(--border);border-radius:8px';
    reviewDiv.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem">
        <strong style="color:var(--ink)">${reviewerName}</strong>
        <span class="muted-small" style="color:var(--ink-2)">${date}</span>
      </div>
      <div class="review-stars" style="margin-bottom:0.5rem">${stars}</div>
      <p style="margin:0;color:var(--ink)">${review.comment || ''}</p>
    `;
    reviewsList.appendChild(reviewDiv);
  });
}

(async function render(): Promise<void> {
  await updateNavCart();
  const id = getIdFromUrl();
  const root = document.getElementById('product-root') as HTMLElement;
  const notFound = document.getElementById('not-found') as HTMLElement;

  if (!id) {
    const titleEl = document.getElementById('product-title');
    const subEl = document.getElementById('product-sub');
    if (titleEl) titleEl.textContent = 'No product selected';
    if (subEl) subEl.innerHTML = 'Open via <code>?id=&lt;product-id&gt;</code>.';
    return;
  }

  const product = await loadProductById(id);
  if (!product) {
    root.style.display = 'none';
    notFound.style.display = 'block';
    return;
  }

  const titleEl = document.getElementById('product-title');
  const subEl = document.getElementById('product-sub');
  const priceEl = document.getElementById('product-price');
  const descEl = document.getElementById('product-desc');
  const conditionEl = document.getElementById('product-condition');
  const locationEl = document.getElementById('product-location');
  const sellerEl = document.getElementById('product-seller');
  const createdEl = document.getElementById('product-created');
  const metaDetailsEl = document.getElementById('meta-details');

  if (titleEl) titleEl.textContent = product.title;
  if (subEl) subEl.textContent = (product.category || '') + ' • ' + (product.location || '');
  if (priceEl) priceEl.textContent = formatPrice(product.price_cents, product.currency);
  if (descEl) descEl.textContent = product.description || '';
  if (conditionEl) conditionEl.textContent = product.condition || '';
  if (locationEl) locationEl.textContent = product.location || '';
  if (sellerEl) {
    sellerEl.textContent = product.seller
      ? product.seller.name + (product.seller.verified ? ' ✓' : '')
      : '';
  }
  if (createdEl) createdEl.textContent = new Date(product.created_at).toLocaleString();
  if (metaDetailsEl) metaDetailsEl.textContent = '';

  const tagRow = document.getElementById('tag-row');
  if (tagRow) {
    tagRow.innerHTML = '';
    (product.tags || []).forEach((t: string) => {
      const s = document.createElement('span');
      s.className = 'tag';
      s.textContent = t;
      tagRow.appendChild(s);
    });
  }

  const main = document.getElementById('main-image') as HTMLElement;
  const thumbs = document.getElementById('thumbs') as HTMLElement;
  if (thumbs) thumbs.innerHTML = '';
  const imgs = product.images && product.images.length ? product.images : [];
  
  console.log('Product images debug:', { raw: product.images, parsed: imgs, type: typeof product.images, isArray: Array.isArray(product.images) });

  if (imgs.length) {
    function show(i: number): void {
      if (main) {
        main.style.backgroundImage = `url(${imgs[i]})`;
        main.style.backgroundSize = 'cover';
      }
    }
    imgs.forEach((u: string, i: number) => {
      const ti = document.createElement('div');
      ti.className = 'thumb-item';
      ti.style.backgroundImage = `url(${u})`;
      ti.style.backgroundSize = 'cover';
      ti.onclick = (): void => show(i);
      if (thumbs) thumbs.appendChild(ti);
    });
    show(0);
  } else {
    const initials = product.title
      .split(' ')
      .slice(0, 2)
      .map((s: string) => s[0])
      .join('')
      .toUpperCase();
    const svg =
      `data:image/svg+xml;utf8,` +
      encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='100%' height='100%' fill='%23eef2ff'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='72' fill='%23334155' font-family='Arial, Helvetica, sans-serif'>${initials}</text></svg>`
      );
    if (main) {
      main.style.backgroundImage = `url(${svg})`;
      main.style.backgroundSize = 'cover';
    }
    const ti = document.createElement('div');
    ti.className = 'thumb-item';
    ti.style.backgroundImage = `url(${svg})`;
    ti.style.backgroundSize = 'cover';
    if (thumbs) thumbs.appendChild(ti);
  }

  const addCartBtn = document.getElementById('add-cart') as HTMLButtonElement;
  const qtyInput = document.getElementById('qty') as HTMLInputElement;
  
  // Helper function to update button state based on cart quantity
  async function updateAddToCartButton(productId: string, availableQty: number): Promise<void> {
    if (!addCartBtn) return;
    
    const session = await supabase.auth.getSession();
    if (!session.data.session) return;
    
    // Check how many are already in cart
    const cartId = await getOrCreateCart();
    if (!cartId) return;
    
    const { data: existing } = await supabase
      .from('cart_items')
      .select('quantity')
      .eq('cart_id', cartId)
      .eq('product_id', productId)
      .maybeSingle();
    
    const currentCartQty = existing ? existing.quantity : 0;
    const remaining = availableQty - currentCartQty;
    
    if (remaining <= 0) {
      // Already at max in cart
      addCartBtn.disabled = true;
      addCartBtn.textContent = 'Maximum in Cart';
      addCartBtn.style.cursor = 'not-allowed';
      addCartBtn.style.opacity = '0.6';
      addCartBtn.title = `You already have ${currentCartQty} in your cart (maximum available)`;
      addCartBtn.style.background = '#6c757d';
      if (qtyInput) qtyInput.disabled = true;
    } else {
      // Update max on input
      if (qtyInput) {
        qtyInput.max = remaining.toString();
        if (parseInt(qtyInput.value) > remaining) {
          qtyInput.value = remaining.toString();
        }
      }
    }
  }
  
  if (addCartBtn) {
    // Check if product is sold out
    const quantity = product.quantity || 1;
    const quantitySold = product.quantity_sold || 0;
    const availableQty = quantity - quantitySold;
    const isSold = availableQty <= 0;

    // Display available quantity to user
    const quantityDisplay = document.createElement('div');
    quantityDisplay.id = 'quantity-available';
    quantityDisplay.style.cssText = 'margin-top: 0.5rem; font-size: 0.875rem; font-weight: 600;';
    
    if (isSold) {
      quantityDisplay.style.color = '#dc3545';
      quantityDisplay.textContent = '❌ Sold Out';
    } else if (availableQty === 1) {
      quantityDisplay.style.color = '#ff6b6b';
      quantityDisplay.textContent = `⚠️ Only 1 left!`;
    } else {
      quantityDisplay.style.color = '#28a745';
      quantityDisplay.textContent = `✓ ${availableQty} available`;
    }
    
    // Insert quantity display near the add to cart button
    const cartSection = addCartBtn.parentElement;
    if (cartSection && !document.getElementById('quantity-available')) {
      cartSection.appendChild(quantityDisplay);
    }

    // Set max quantity on input field
    if (qtyInput) {
      qtyInput.max = availableQty.toString();
      qtyInput.value = '1';
      
      // Add input validation
      qtyInput.addEventListener('input', () => {
        const inputVal = parseInt(qtyInput.value || '1', 10);
        if (inputVal > availableQty) {
          qtyInput.value = availableQty.toString();
          alert(`Only ${availableQty} items available!`);
        } else if (inputVal < 1) {
          qtyInput.value = '1';
        }
      });
    }

    if (isSold) {
      // Product is sold out - disable button
      addCartBtn.disabled = true;
      addCartBtn.textContent = 'Sold Out';
      addCartBtn.style.cursor = 'not-allowed';
      addCartBtn.style.opacity = '0.6';
      addCartBtn.title = 'This item is sold out';
      addCartBtn.style.background = 'linear-gradient(135deg, var(--accent-1), var(--accent-2))';
      if (qtyInput) qtyInput.disabled = true;
    } else {
      // Check if user is logged in
      const session = await supabase.auth.getSession();
      
      if (!session.data.session) {
        // User not logged in - disable button and show login message
        addCartBtn.disabled = true;
        addCartBtn.textContent = 'Log In to Add to Cart';
        addCartBtn.style.cursor = 'not-allowed';
        addCartBtn.style.opacity = '0.6';
        addCartBtn.title = 'Please log in to add items to your cart';
        
        // Make button redirect to login when clicked
        addCartBtn.addEventListener('click', (): void => {
          if (confirm('You need to log in to add items to your cart. Go to login page?')) {
            window.location.href = 'login.html';
          }
        });
      } else if (session.data.session.user.id === product.seller_id) {
        // User is viewing their own product - can't buy your own stuff!
        addCartBtn.disabled = true;
        addCartBtn.textContent = 'Your Own Product';
        addCartBtn.style.cursor = 'not-allowed';
        addCartBtn.style.opacity = '0.6';
        addCartBtn.title = "You can't add your own products to cart";
      } else {
        // Check cart status on page load
        await updateAddToCartButton(product.id, availableQty);
        
        // User is logged in and viewing someone else's product - normal behavior
        addCartBtn.addEventListener('click', async (): Promise<void> => {
          const qtyInput = document.getElementById('qty') as HTMLInputElement;
          const requestedQty = Math.max(1, parseInt(qtyInput.value || '1', 10));
          const availableQty = (product.quantity || 1) - (product.quantity_sold || 0);
          
          // Validate quantity before adding to cart
          if (requestedQty > availableQty) {
            alert(`Sorry, only ${availableQty} item${availableQty !== 1 ? 's' : ''} available!`);
            qtyInput.value = availableQty.toString();
            return;
          }
          
          await addToCart(product.id, requestedQty);
          
          // Update button state after adding
          await updateAddToCartButton(product.id, availableQty);
          
          // Show success feedback only if button is still enabled
          if (!addCartBtn.disabled) {
            const originalText = addCartBtn.textContent;
            addCartBtn.textContent = '✓ Added!';
            const tempDisabled = true;
            addCartBtn.disabled = tempDisabled;
            setTimeout(() => {
              addCartBtn.textContent = originalText || 'Add to Cart';
              addCartBtn.disabled = false;
            }, 1500);
          }
        });
      }
    }
  }

  // Load reviews for this product
  await renderReviews(product.id);

  // Handle review form - check if user is logged in
  const reviewFormContainer = document.getElementById('review-form-container') as HTMLElement;
  const reviewForm = document.getElementById('review-form') as HTMLFormElement;
  const reviewError = document.getElementById('review-error') as HTMLElement;
  const reviewSuccess = document.getElementById('review-success') as HTMLElement;
  
  // Check if user is logged in for reviews
  const sessionForReview = await supabase.auth.getSession();
  
  if (!sessionForReview.data.session) {
    // User not logged in - hide form and show login message
    if (reviewFormContainer) {
      reviewFormContainer.innerHTML = `
        <div class="error-msg" style="display: block;">
          Please <a href="login.html">log in</a> to leave a review.
        </div>
      `;
    }
  } else if (reviewForm) {
    // User is logged in - enable review form
    
    // Initialize star rating system
    const starContainer = document.getElementById('star-rating');
    const ratingInput = document.getElementById('review-rating') as HTMLInputElement;
    let selectedRating = 0;
    
    if (starContainer) {
      const stars = starContainer.querySelectorAll('.star');
      
      // Handle star click
      stars.forEach((star, index) => {
        star.addEventListener('click', () => {
          selectedRating = index + 1;
          ratingInput.value = selectedRating.toString();
          updateStars(selectedRating);
        });
        
        // Handle star hover
        star.addEventListener('mouseenter', () => {
          updateStars(index + 1, true);
        });
      });
      
      // Reset hover effect on mouse leave
      starContainer.addEventListener('mouseleave', () => {
        updateStars(selectedRating);
      });
      
      // Update star display
      function updateStars(rating: number, isHover: boolean = false): void {
        stars.forEach((star, index) => {
          star.textContent = index < rating ? '★' : '☆';
          star.classList.remove('filled', 'hovered');
          if (index < rating) {
            star.classList.add(isHover ? 'hovered' : 'filled');
          }
        });
      }
    }
    
    reviewForm.addEventListener('submit', async (e: Event): Promise<void> => {
      e.preventDefault();
      
      reviewError.style.display = 'none';
      reviewSuccess.style.display = 'none';
      
      const formData = new FormData(reviewForm);
      const rating = parseInt(formData.get('rating') as string);
      const comment = formData.get('comment') as string;
      
      if (!rating || !comment) {
        reviewError.textContent = 'Please select a rating and write a comment';
        reviewError.style.display = 'block';
        return;
      }
      
      const success = await submitReview(product.id, rating, comment);
      
      if (success) {
        reviewSuccess.textContent = 'Review submitted successfully!';
        reviewSuccess.style.display = 'block';
        reviewForm.reset();
        selectedRating = 0;
        if (starContainer) {
          starContainer.querySelectorAll('.star').forEach(star => {
            star.textContent = '☆';
            star.classList.remove('filled', 'hovered');
          });
        }
        await renderReviews(product.id);
      } else {
        reviewError.textContent = 'Failed to submit review. Please try again.';
        reviewError.style.display = 'block';
      }
    });
  }
})();
