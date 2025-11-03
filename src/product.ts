// Individual product page - shows one item with all its details, photos, and an add-to-cart button.
// Also displays who's selling it and how to contact them.
import { ProductData, Product } from './types.js';
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
  
  // Check if item already in cart
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('cart_id', cartId)
    .eq('product_id', productId)
    .maybeSingle();
  
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
async function loadReviews(productId: string): Promise<any[]> {
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
        data.map(async (review) => {
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
          
          return { ...review, reviewerName };
        })
      );
      return reviewsWithNames;
    }
    
    return data || [];
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
  reviews.forEach((review: any) => {
    const stars = '⭐'.repeat(review.rating || 5);
    const reviewerName = review.reviewerName || 'CCNY Student';
    const date = new Date(review.created_at).toLocaleDateString();
    
    const reviewDiv = document.createElement('div');
    reviewDiv.style.cssText = 'padding:1rem;margin-bottom:1rem;background:#fff;border:1px solid #e2e8f0;border-radius:8px';
    reviewDiv.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem">
        <strong>${reviewerName}</strong>
        <span class="muted-small">${date}</span>
      </div>
      <div style="margin-bottom:0.5rem">${stars}</div>
      <p style="margin:0">${review.comment || ''}</p>
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

  const addCartBtn = document.getElementById('add-cart');
  if (addCartBtn) {
    addCartBtn.addEventListener('click', async (): Promise<void> => {
      const qtyInput = document.getElementById('qty') as HTMLInputElement;
      const qty = Math.max(1, parseInt(qtyInput.value || '1', 10));
      await addToCart(product.id, qty);
      alert(`Added ${qty} × ${product.title} to cart`);
    });
  }

  // Load reviews for this product
  await renderReviews(product.id);

  // Handle review form submission
  const reviewForm = document.getElementById('review-form') as HTMLFormElement;
  const reviewError = document.getElementById('review-error') as HTMLElement;
  const reviewSuccess = document.getElementById('review-success') as HTMLElement;
  
  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e: Event): Promise<void> => {
      e.preventDefault();
      
      reviewError.style.display = 'none';
      reviewSuccess.style.display = 'none';
      
      const formData = new FormData(reviewForm);
      const rating = parseInt(formData.get('rating') as string);
      const comment = formData.get('comment') as string;
      
      if (!rating || !comment) {
        reviewError.textContent = 'Please fill in all fields';
        reviewError.style.display = 'block';
        return;
      }
      
      const success = await submitReview(product.id, rating, comment);
      
      if (success) {
        reviewSuccess.textContent = 'Review submitted successfully!';
        reviewSuccess.style.display = 'block';
        reviewForm.reset();
        await renderReviews(product.id);
      } else {
        reviewError.textContent = 'Failed to submit review. Please try again.';
        reviewError.style.display = 'block';
      }
    });
  }
})();
