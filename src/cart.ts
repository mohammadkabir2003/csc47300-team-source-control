// The shopping cart page where you see all the stuff you're about to buy.
// Shows each item with quantity controls and calculates your total.
import { Product } from './types.js';
import { supabase, getSession, isSupabaseConfigured } from './supabase-client.js';
import { updateNavCart } from './cart-utils.js';

// Find the user's cart in the database, or make a new one if they don't have one yet
async function getOrCreateCart(): Promise<string | null> {
  // Can't get a cart if database isn't available
  if (!isSupabaseConfigured) {
    console.error('[cart] Supabase not configured');
    return null;
  }

  const session = await getSession();
  if (!session) return null;
  
  try {
    // See if this user already has a cart sitting in the database
    const { data: existingCart, error: fetchError } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', session.user.id)
      .maybeSingle();
    
    if (fetchError) {
      console.error('[cart] Error fetching cart:', fetchError);
      return null;
    }
    
    if (existingCart) return existingCart.id;
    
    // No cart yet? Make them a fresh one
    const { data: newCart, error: createError } = await supabase
      .from('carts')
      .insert([{ user_id: session.user.id }])
      .select('id')
      .single();
    
    if (createError) {
      console.error('[cart] Error creating cart:', createError);
      return null;
    }
    
    return newCart?.id || null;
  } catch (err) {
    console.error('[cart] Network error accessing cart:', err);
    return null;
  }
}

// Pull all the items from the user's cart so we can show them on the page
async function getCartItems(): Promise<any[]> {
  if (!isSupabaseConfigured) {
    console.error('[cart] Cannot get cart items - Supabase not configured');
    return [];
  }

  const cartId = await getOrCreateCart();
  if (!cartId) return [];
  
  try {
    const { data, error } = await supabase
      .from('cart_items')
      .select('id, product_id, quantity')
      .eq('cart_id', cartId);
    
    if (error) {
      console.error('[cart] Error fetching cart items:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('[cart] Network error fetching cart items:', err);
    return [];
  }
}

// Change how many of something they want, or remove it entirely if they set it to zero
async function updateCartItemQuantity(productId: string, quantity: number): Promise<void> {
  const cartId = await getOrCreateCart();
  if (!cartId) return;
  
  if (quantity <= 0) {
    // They don't want this anymore, take it out of the cart
    await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId)
      .eq('product_id', productId);
  } else {
    // First check if this product is already in their cart
    const { data: existing } = await supabase
      .from('cart_items')
      .select('id')
      .eq('cart_id', cartId)
      .eq('product_id', productId)
      .maybeSingle();
    
    if (existing) {
      // It's already there, just update the quantity
      await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', existing.id);
    } else {
      // Brand new item, add it to the cart
      await supabase
        .from('cart_items')
        .insert([{ cart_id: cartId, product_id: productId, quantity }]);
    }
  }
}

// Draw the cart page with all the items, quantities, and total price
async function renderCart(): Promise<void> {
  const list = document.getElementById('cart-list');
  const errorMsg = document.getElementById('cart-error') as HTMLElement;
  const successMsg = document.getElementById('cart-success') as HTMLElement;
  const cartSection = document.getElementById('cart-section') as HTMLElement;
  
  if (!list) return;
  
  // Clear any previous messages
  if (errorMsg) {
    errorMsg.textContent = '';
    errorMsg.style.display = 'none';
  }
  if (successMsg) {
    successMsg.textContent = '';
    successMsg.style.display = 'none';
  }
  
  // If no database available, show a warning
  if (!isSupabaseConfigured) {
    if (errorMsg) {
      errorMsg.textContent = 'Database unavailable. Cannot load cart at this time.';
      errorMsg.style.display = 'block';
    }
    if (cartSection) cartSection.style.display = 'none';
    return;
  }
  
  const session = await getSession();
  if (!session) {
    if (errorMsg) {
      errorMsg.innerHTML = 'Please <a href="login.html">log in</a> to view your cart.';
      errorMsg.style.display = 'block';
    }
    if (cartSection) cartSection.style.display = 'none';
    return;
  }
  
  const cartItems = await getCartItems();
  
  if (!cartItems.length) {
    if (errorMsg) {
      errorMsg.innerHTML = 'Your cart is empty. <a href="market.html">Browse listings</a> to add items.';
      errorMsg.style.display = 'block';
    }
    if (cartSection) cartSection.style.display = 'none';
    return;
  }
  
  // Show cart section when we have items
  if (cartSection) cartSection.style.display = 'block';
  
  // We have the cart items, now go get the actual product details for each one
  const productIds = cartItems.map((item) => item.product_id);
  const { data: productsData, error } = await supabase
    .from('products')
    .select('*')
    .in('id', productIds);
  
  if (error) {
    console.error('Error fetching products:', error);
    if (errorMsg) {
      errorMsg.textContent = 'Error loading cart items. Please try refreshing the page.';
      errorMsg.style.display = 'block';
    }
    return;
  }
  
  const products: Product[] = (productsData || []).map((p): Product => ({
    id: p.id,
    title: p.name || p.title || '',
    description: p.description || '',
    category: p.category || '',
    price_cents: p.price ? Math.round(Number(p.price) * 100) : 0,
    currency: 'USD',
    condition: p.condition || 'Used',
    location: p.location || '',
    created_at: p.created_at,
    seller_id: p.seller_id,
    tags: p.tags || [],
    images: p.images || [],
  }));
  
  list.innerHTML = '';
  let subtotal = 0;
  
  cartItems.forEach((item) => {
    const p = products.find((x) => x.id === item.product_id);
    if (!p) return;
    
    const row = document.createElement('div');
    row.className = 'cart-row';
    
    // Create thumbnail element with product image or placeholder
    const thumb = document.createElement('div');
    thumb.className = 'cart-thumb';
    thumb.setAttribute('aria-hidden', 'true');
    
    if (p.images && p.images.length > 0) {
      // Use the first uploaded image from Supabase
      thumb.style.backgroundImage = `url(${p.images[0]})`;
      thumb.style.backgroundSize = 'cover';
      thumb.style.backgroundPosition = 'center';
    } else {
      // Fallback to placeholder SVG with product initials
      const initials = p.title
        .split(' ')
        .slice(0, 2)
        .map((s) => s[0])
        .join('')
        .toUpperCase();
      const svg =
        `data:image/svg+xml;utf8,` +
        encodeURIComponent(
          `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='%23eef2ff'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='40' fill='%23334155' font-family='Arial, Helvetica, sans-serif'>${initials}</text></svg>`
        );
      thumb.style.backgroundImage = `url(${svg})`;
      thumb.style.backgroundSize = 'cover';
    }
    
    // Build the rest of the cart row
    const details = document.createElement('div');
    details.style.flex = '1';
    details.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${
      p.title
    }</strong><div class="muted-small">${p.category} • ${
      p.location || 'N/A'
    }</div></div><div style="text-align:right"><div style="font-weight:800">${(
      p.price_cents / 100
    ).toLocaleString(undefined, {
      style: 'currency',
      currency: p.currency
    })}</div><div class="muted-small">x <input data-id="${item.product_id}" class="input qty" type="number" min="1" value="${item.quantity}" style="width:64px" /></div><div style="margin-top:.4rem"><a href="#" data-remove="${item.product_id}" class="btn btn-ghost btn-sm">Remove</a></div></div></div>`;
    
    row.appendChild(thumb);
    row.appendChild(details);
    list.appendChild(row);
    subtotal += p.price_cents * item.quantity;
  });
  
  const subtotalEl = document.getElementById('subtotal');
  if (subtotalEl) {
    subtotalEl.textContent = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD'
    }).format(subtotal / 100);
  }
  
  // Wire up quantity inputs
  list.querySelectorAll('input[data-id]').forEach((inp) => {
    inp.addEventListener('change', async (e: Event): Promise<void> => {
      const target = e.target as HTMLInputElement;
      const id = target.dataset.id;
      if (!id) return;
      const v = Math.max(1, parseInt(target.value || '1', 10));
      await updateCartItemQuantity(id, v);
      await render();
      await updateNavCart();
    });
  });
  
  // Wire up remove buttons
  list.querySelectorAll('[data-remove]').forEach((a) => {
    a.addEventListener('click', async (e: Event): Promise<void> => {
      e.preventDefault();
      const target = a as HTMLAnchorElement;
      const id = target.dataset.remove;
      if (!id) return;
      await updateCartItemQuantity(id, 0);
      await render();
      await updateNavCart();
    });
  });
}

// Alias for compatibility
const render = renderCart;

// render the cart when the page loads
render();
