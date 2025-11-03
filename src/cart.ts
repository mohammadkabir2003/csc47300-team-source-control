// The shopping cart page where you see all the stuff you're about to buy.
// Shows each item with quantity controls and calculates your total.
import { Product } from './types.js';
import { supabase, getSession } from './supabase-client.js';
import { updateNavCart } from './cart-utils.js';

// Find the user's cart in the database, or make a new one if they don't have one yet
async function getOrCreateCart(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;
  
  // See if this user already has a cart sitting in the database
  const { data: existingCart, error: fetchError } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();
  
  if (fetchError) {
    console.error('Error fetching cart:', fetchError);
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
    console.error('Error creating cart:', createError);
    return null;
  }
  
  return newCart?.id || null;
}

// Pull all the items from the user's cart so we can show them on the page
async function getCartItems(): Promise<any[]> {
  const cartId = await getOrCreateCart();
  if (!cartId) return [];
  
  const { data, error } = await supabase
    .from('cart_items')
    .select('id, product_id, quantity')
    .eq('cart_id', cartId);
  
  if (error) {
    console.error('Error fetching cart items:', error);
    return [];
  }
  
  return data || [];
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
async function render(): Promise<void> {
  const list = document.getElementById('cart-list') as HTMLElement;
  list.innerHTML = '<p>Loading cart...</p>';
  
  const session = await getSession();
  if (!session) {
    list.innerHTML = '<p>Please <a href="login.html">log in</a> to view your cart.</p>';
    const subtotalEl = document.getElementById('subtotal');
    if (subtotalEl) subtotalEl.textContent = '$0.00';
    return;
  }
  
  const cartItems = await getCartItems();
  
  if (!cartItems.length) {
    list.innerHTML = '<p>Your cart is empty. Browse listings to add items.</p>';
    const subtotalEl = document.getElementById('subtotal');
    if (subtotalEl) subtotalEl.textContent = '$0.00';
    return;
  }
  
  // We have the cart items, now go get the actual product details for each one
  const productIds = cartItems.map((item) => item.product_id);
  const { data: productsData, error } = await supabase
    .from('products')
    .select('*')
    .in('id', productIds);
  
  if (error) {
    console.error('Error fetching products:', error);
    list.innerHTML = '<p>Error loading cart items.</p>';
    return;
  }
  
  const products: Product[] = (productsData || []).map((p: any) => ({
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
    row.innerHTML = `<div class="cart-thumb" aria-hidden="true"></div><div style="flex:1"><div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${
      p.title
    }</strong><div class="muted-small">${p.category} • ${
      p.location || 'N/A'
    }</div></div><div style="text-align:right"><div style="font-weight:800">${(
      p.price_cents / 100
    ).toLocaleString(undefined, {
      style: 'currency',
      currency: p.currency
    })}</div><div class="muted-small">x <input data-id="${item.product_id}" class="input qty" type="number" min="1" value="${item.quantity}" style="width:64px" /></div><div style="margin-top:.4rem"><a href="#" data-remove="${item.product_id}" class="btn btn-ghost">Remove</a></div></div></div></div>`;
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

// render the cart when the page loads
render();
