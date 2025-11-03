import { supabase } from './supabase-client.js';
import { updateNavCart } from './cart-utils.js';

interface CartItem {
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    images: string[];
  };
}

async function getCartItems(): Promise<CartItem[]> {
  const session = await supabase.auth.getSession();
  if (!session.data.session) return [];

  const { data: cartData } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', session.data.session.user.id)
    .maybeSingle();

  if (!cartData) return [];

  const { data: items } = await supabase
    .from('cart_items')
    .select('product_id, quantity, products(id, name, price, images)')
    .eq('cart_id', cartData.id);

  if (!items) return [];

  return items.map((item: any) => ({
    product_id: item.product_id,
    quantity: item.quantity,
    product: item.products
  })) as CartItem[];
}

async function loadUserInfo(): Promise<void> {
  const session = await supabase.auth.getSession();
  if (!session.data.session) {
    window.location.href = 'login.html';
    return;
  }

  const user = session.data.session.user;
  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');
  
  if (nameEl) {
    const fullName = user.user_metadata?.full_name || user.user_metadata?.fullName || 'CCNY Student';
    nameEl.textContent = 'Name: ' + fullName;
  }
  if (emailEl) {
    emailEl.textContent = 'Email: ' + user.email;
  }
}

async function renderSummary(): Promise<void> {
  const summary = document.getElementById('order-summary') as HTMLElement;
  if (!summary) {
    console.error('order-summary element not found!');
    return;
  }
  
  summary.innerHTML = '';
  
  const items = await getCartItems();
  console.log('Cart items:', items);

  if (!items.length) {
    summary.innerHTML = '<p>Your cart is empty. <a href="market.html">Browse products</a></p>';
    const checkoutForm = document.getElementById('checkout-form') as HTMLFormElement;
    if (checkoutForm) {
      const btn = checkoutForm.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (btn) btn.disabled = true;
    }
    return;
  }

  let total = 0;
  items.forEach((item) => {
    const p = item.product;
    const qty = item.quantity;
    const line = document.createElement('div');
    line.style.display = 'flex';
    line.style.justifyContent = 'space-between';
    line.style.marginBottom = '.35rem';
    line.innerHTML = `<div>${p.name} <span class="muted-small">x${qty}</span></div><div style="font-weight:800">$${(
      p.price * qty
    ).toFixed(2)}</div>`;
    summary.appendChild(line);
    total += p.price * qty;
  });

  const tot = document.createElement('div');
  tot.style.marginTop = '.6rem';
  tot.style.fontWeight = '800';
  tot.textContent = 'Total: $' + total.toFixed(2);
  summary.appendChild(tot);
  
  console.log('Order summary rendered with', items.length, 'items, total:', total);
}

const checkoutForm = document.getElementById('checkout-form') as HTMLFormElement;
checkoutForm.addEventListener('submit', async function (e: Event): Promise<void> {
  e.preventDefault();
  
  const session = await supabase.auth.getSession();
  if (!session.data.session) {
    alert('Please log in to complete your order.');
    window.location.href = 'login.html';
    return;
  }

  const items = await getCartItems();
  if (!items.length) {
    alert('Your cart is empty');
    return;
  }

  try {
    // Create order in database
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: session.data.session.user.id,
        status: 'completed'  // Mock payment always succeeds
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = items.map(item => ({
      order_id: orderData.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_purchase: item.product.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Clear the cart
    const { data: cartData } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', session.data.session.user.id)
      .maybeSingle();

    if (cartData) {
      await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cartData.id);
    }

    // Show success message
    const userName = session.data.session.user.user_metadata?.full_name || session.data.session.user.user_metadata?.fullName || 'Student';
    const result = document.getElementById('order-result') as HTMLElement;
    result.style.display = 'block';
    result.innerHTML = `<h3>✓ Order placed (Mock Payment)</h3><p>Thanks, ${userName}! Your order has been recorded. In a real system, payment would be processed here.</p><p><strong>Order ID:</strong> ${orderData.id}</p><p>Meet in a public place to exchange items safely.</p><div style="display:flex;gap:.5rem;margin-top:1rem"><a href="orders.html" class="btn btn-primary">View My Orders</a><a href="market.html" class="btn btn-ghost">Continue shopping</a></div>`;
    
    await updateNavCart();
    await renderSummary();
  } catch (err: any) {
    console.error('Order error:', err);
    alert('Failed to place order: ' + (err.message || 'Unknown error'));
  }
});

// Load user info and cart summary on page load
(async () => {
  await loadUserInfo();
  await renderSummary();
})();
