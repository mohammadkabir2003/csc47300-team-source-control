// The orders page where you can see everything you've bought through the marketplace.
// Shows each order with all the items, when you bought them, and the mock payment status.
import { supabase, isSupabaseConfigured } from './supabase-client.js';

// interface OrderItem {
//   id: string;
//   quantity: number;
//   price_at_purchase: number;
//   products: {
//     id: string;
//     name: string;
//     description: string;
//     images: string[];
//   };
// }

// interface Order {
//   id: string;
//   created_at: string;
//   status: string;
//   order_items: OrderItem[];
// }

// Fetch all the orders for whoever's logged in and display them on the page
async function loadOrders(): Promise<void> {
  const container = document.getElementById('orders-container') as HTMLElement;
  const errorMsg = document.getElementById('orders-error') as HTMLElement;
  const successMsg = document.getElementById('orders-success') as HTMLElement;
  
  // Clear previous messages
  if (errorMsg) {
    errorMsg.textContent = '';
    errorMsg.style.display = 'none';
  }
  if (successMsg) {
    successMsg.textContent = '';
    successMsg.style.display = 'none';
  }
  
  // Check if database is available before trying to load orders
  if (!isSupabaseConfigured) {
    if (errorMsg) {
      errorMsg.textContent = 'Database connection unavailable. Unable to load your orders at this time.';
      errorMsg.style.display = 'block';
    }
    if (container) container.style.display = 'none';
    return;
  }

  try {
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      if (errorMsg) {
        errorMsg.innerHTML = 'Please <a href="login.html">log in</a> to view your orders.';
        errorMsg.style.display = 'block';
      }
      if (container) container.style.display = 'none';
      return;
    }
    
    // Show container when logged in
    if (container) container.style.display = 'block';

    // Pull all their orders from the database with all the details about each item
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        status,
        order_items (
          id,
          quantity,
          price_at_purchase,
          products (
            id,
            name,
            description,
            images
          )
        )
      `)
      .eq('user_id', session.data.session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[orders] Error fetching orders:', error);
      if (errorMsg) {
        errorMsg.textContent = 'Error loading orders. Please try refreshing the page.';
        errorMsg.style.display = 'block';
      }
      if (container) container.style.display = 'none';
      return;
    }

    if (!orders || orders.length === 0) {
      if (errorMsg) {
        errorMsg.innerHTML = 'No orders yet. <a href="market.html">Start shopping!</a>';
        errorMsg.style.display = 'block';
      }
      if (container) container.style.display = 'none';
      return;
    }

    container.innerHTML = '';
    orders.forEach((order) => {
      const orderCard = document.createElement('div');
      orderCard.style.cssText = 'border:1px solid var(--border);border-radius:8px;padding:1.5rem;margin-bottom:1.5rem;background:var(--card)';

      const orderHeader = document.createElement('div');
      orderHeader.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid var(--border)';
      orderHeader.innerHTML = `
        <div>
          <h3 style="margin:0">Order #${order.id.slice(0, 8)}</h3>
          <p class="muted-small" style="margin:.25rem 0 0 0">${new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div>
          <span class="pill" style="background:#10b981;color:#fff;padding:.25rem .75rem;border-radius:12px;font-size:.875rem">${order.status}</span>
        </div>
      `;
      orderCard.appendChild(orderHeader);

      const itemsContainer = document.createElement('div');
      let orderTotal = 0;

      order.order_items.forEach((item) => {
        const product = Array.isArray(item.products) ? item.products[0] : item.products;
        const itemTotal = (item.price_at_purchase || 0) * item.quantity;
        orderTotal += itemTotal;

        const itemDiv = document.createElement('div');
        itemDiv.style.cssText = 'display:flex;gap:1rem;padding:1rem 0;border-bottom:1px solid var(--border)';

        const imgDiv = document.createElement('div');
        imgDiv.style.cssText = 'width:80px;height:80px;flex-shrink:0;border-radius:6px;overflow:hidden;background:var(--card);border:1px solid var(--border)';
        
        if (product.images && product.images.length > 0) {
          imgDiv.style.backgroundImage = `url(${product.images[0]})`;
          imgDiv.style.backgroundSize = 'cover';
          imgDiv.style.backgroundPosition = 'center';
        } else {
          const initials = product.name.split(' ').slice(0, 2).map((s: string) => s[0]).join('').toUpperCase();
          imgDiv.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:1.5rem;font-weight:bold;color:var(--ink-2)">${initials}</div>`;
        }

        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'flex:1';
        infoDiv.innerHTML = `
          <h4 style="margin:0 0 .5rem 0"><a href="product.html?id=${product.id}" style="color:var(--ink);text-decoration:none">${product.name}</a></h4>
          <p class="muted-small" style="margin:0 0 .5rem 0;color:var(--ink-2)">${product.description ? product.description.substring(0, 80) + '...' : ''}</p>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span class="muted-small" style="color:var(--ink-2)">Qty: ${item.quantity}</span>
            <span style="font-weight:700;color:var(--ink)">$${itemTotal.toFixed(2)}</span>
          </div>
        `;

        itemDiv.appendChild(imgDiv);
        itemDiv.appendChild(infoDiv);
        itemsContainer.appendChild(itemDiv);
      });

      orderCard.appendChild(itemsContainer);

      const totalDiv = document.createElement('div');
      totalDiv.style.cssText = 'text-align:right;margin-top:1rem;padding-top:1rem;border-top:2px solid var(--border)';
      totalDiv.innerHTML = `<strong style="font-size:1.125rem;color:var(--ink)">Order Total: $${orderTotal.toFixed(2)}</strong>`;
      orderCard.appendChild(totalDiv);

      container.appendChild(orderCard);
    });

  } catch (err) {
    console.error('[orders] Error loading orders:', err);
    // Show a helpful error message depending on what went wrong
    const error = err as Error;
    if (errorMsg) {
      if (error.message?.includes('fetch') || error.message?.includes('Network')) {
        errorMsg.textContent = 'Network error. Unable to load your orders. Please check your internet connection and try again.';
      } else {
        errorMsg.textContent = error.message || 'An unexpected error occurred. Please try again.';
      }
      errorMsg.style.display = 'block';
    }
    if (container) container.style.display = 'none';
  }
}

// Kick things off when the page loads
loadOrders();
