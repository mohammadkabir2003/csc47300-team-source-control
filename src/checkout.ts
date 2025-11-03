// The checkout page where students finalize their purchases and enter payment info.
// Right now we're doing mock payments but everything else (cart, orders) is real database stuff.
import { supabase, isSupabaseConfigured } from './supabase-client.js';
import { updateNavCart } from './cart-utils.js';

// Structure for each item in the cart - includes product details and how many they want
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

// Grab all the items currently sitting in the user's shopping cart
async function getCartItems(): Promise<CartItem[]> {
  // Can't get cart if database isn't working
  if (!isSupabaseConfigured) {
    console.error('[checkout] Supabase not configured');
    return [];
  }

  try {
    const session = await supabase.auth.getSession();
    if (!session.data.session) return [];

    const { data: cartData, error: cartError } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', session.data.session.user.id)
      .maybeSingle();

    if (cartError) {
      console.error('[checkout] Error fetching cart:', cartError);
      return [];
    }
    if (!cartData) return [];

    const { data: items, error: itemsError } = await supabase
      .from('cart_items')
      .select('product_id, quantity, products(id, name, price, images)')
      .eq('cart_id', cartData.id);

    if (itemsError) {
      console.error('[checkout] Error fetching cart items:', itemsError);
      return [];
    }
    if (!items) return [];

    return items.map((item: any) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      product: item.products
    })) as CartItem[];
  } catch (err) {
    console.error('[checkout] Network error getting cart items:', err);
    return [];
  }
}

// Load the logged-in user's info so we can pre-fill the checkout form
async function loadUserInfo(): Promise<void> {
  // If database isn't available, we can't load user info
  if (!isSupabaseConfigured) {
    console.error('[checkout] Cannot load user info - Supabase not configured');
    return;
  }

  try {
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      // Nobody's logged in, send them to login page
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
  } catch (err) {
    console.error('[checkout] Error loading user info:', err);
    // If we can't verify the user, better send them to login
    window.location.href = 'login.html';
  }
}

// Draw the order summary showing everything they're about to buy
async function renderSummary(): Promise<void> {
  const summary = document.getElementById('order-summary') as HTMLElement;
  if (!summary) {
    console.error('[checkout] order-summary element not found!');
    return;
  }
  
  // Check if database is available before trying to load cart
  if (!isSupabaseConfigured) {
    summary.innerHTML = `
      <div style="padding: 20px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px;">
        <strong>⚠️ Database connection unavailable</strong>
        <p>Unable to load your cart. Please check your configuration or try again later.</p>
      </div>
    `;
    return;
  }
  
  summary.innerHTML = '';
  
  const items = await getCartItems();
  console.log('[checkout] Cart items:', items);

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

// When they hit the "Place Order" button, process the mock payment and create the order
const checkoutForm = document.getElementById('checkout-form') as HTMLFormElement;
checkoutForm.addEventListener('submit', async function (e: Event): Promise<void> {
  e.preventDefault();
  
  // Make sure database is available before trying to place an order
  if (!isSupabaseConfigured) {
    alert('⚠️ Database connection unavailable. Cannot place order at this time.');
    return;
  }

  try {
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

    // Create order in database - this is where the magic happens
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: session.data.session.user.id,
        status: 'completed'  // Mock payment always succeeds for now
      }])
      .select()
      .single();

    if (orderError) {
      console.error('[checkout] Error creating order:', orderError);
      throw new Error('Failed to create order: ' + orderError.message);
    }

    // Now add all the items they bought to the order
    const orderItems = items.map(item => ({
      order_id: orderData.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_purchase: item.product.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('[checkout] Error creating order items:', itemsError);
      throw new Error('Failed to add items to order: ' + itemsError.message);
    }

    // Empty out their cart now that they've checked out
    const { data: cartData } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', session.data.session.user.id)
      .maybeSingle();

    if (cartData) {
      const { error: clearError } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cartData.id);
      
      if (clearError) {
        console.error('[checkout] Error clearing cart:', clearError);
        // Don't throw here - order was placed successfully, cart clearing is less critical
      }
    }

    // Show them the success message with their order details
    const userName = session.data.session.user.user_metadata?.full_name || session.data.session.user.user_metadata?.fullName || 'Student';
    const result = document.getElementById('order-result') as HTMLElement;
    result.style.display = 'block';
    result.innerHTML = `<h3>✓ Order placed (Mock Payment)</h3><p>Thanks, ${userName}! Your order has been recorded. In a real system, payment would be processed here.</p><p><strong>Order ID:</strong> ${orderData.id}</p><p>Meet in a public place to exchange items safely.</p><div style="display:flex;gap:.5rem;margin-top:1rem"><a href="orders.html" class="btn btn-primary">View My Orders</a><a href="market.html" class="btn btn-ghost">Continue shopping</a></div>`;
    
    // Update the cart badge in the navbar and refresh the summary
    await updateNavCart();
    await renderSummary();
  } catch (err: any) {
    console.error('[checkout] Order error:', err);
    // Show a user-friendly error message
    if (err.message?.includes('fetch') || err.message?.includes('Network')) {
      alert('⚠️ Network error. Unable to place order. Please check your connection and try again.');
    } else if (err.message?.includes('permission')) {
      alert('⚠️ Permission denied. Please make sure you are logged in.');
    } else {
      alert('Failed to place order: ' + (err.message || 'Unknown error'));
    }
  }
});

// Load user info and cart summary on page load
(async () => {
  await loadUserInfo();
  await renderSummary();
})();
