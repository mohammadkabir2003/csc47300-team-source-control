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
  
  // Check if database is available before trying to load orders
  if (!isSupabaseConfigured) {
    container.innerHTML = `
      <div style="padding: 20px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px;">
        <strong>⚠️ Database connection unavailable</strong>
        <p>Unable to load your orders. Please check your configuration or try again later.</p>
      </div>
    `;
    return;
  }

  try {
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      container.innerHTML = '<p>Please <a href="login.html">log in</a> to view your orders.</p>';
      return;
    }

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
      throw new Error('Failed to load orders: ' + error.message);
    }

    if (!orders || orders.length === 0) {
      container.innerHTML = '<p>No orders yet. <a href="market.html">Start shopping!</a></p>';
      return;
    }

    container.innerHTML = '';
    orders.forEach((order: any) => {
      const orderCard = document.createElement('div');
      orderCard.style.cssText = 'border:1px solid #e2e8f0;border-radius:8px;padding:1.5rem;margin-bottom:1.5rem;background:#fff';

      const orderHeader = document.createElement('div');
      orderHeader.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid #e2e8f0';
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

      order.order_items.forEach((item: any) => {
        const product = item.products;
        const itemTotal = item.price_at_purchase * item.quantity;
        orderTotal += itemTotal;

        const itemDiv = document.createElement('div');
        itemDiv.style.cssText = 'display:flex;gap:1rem;padding:1rem 0;border-bottom:1px solid #f1f5f9';

        const imgDiv = document.createElement('div');
        imgDiv.style.cssText = 'width:80px;height:80px;flex-shrink:0;border-radius:6px;overflow:hidden;background:#f8fafc';
        
        if (product.images && product.images.length > 0) {
          imgDiv.style.backgroundImage = `url(${product.images[0]})`;
          imgDiv.style.backgroundSize = 'cover';
          imgDiv.style.backgroundPosition = 'center';
        } else {
          const initials = product.name.split(' ').slice(0, 2).map((s: string) => s[0]).join('').toUpperCase();
          imgDiv.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:1.5rem;font-weight:bold;color:#64748b">${initials}</div>`;
        }

        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'flex:1';
        infoDiv.innerHTML = `
          <h4 style="margin:0 0 .5rem 0"><a href="product.html?id=${product.id}" style="color:#1e293b;text-decoration:none">${product.name}</a></h4>
          <p class="muted-small" style="margin:0 0 .5rem 0">${product.description ? product.description.substring(0, 80) + '...' : ''}</p>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span class="muted-small">Qty: ${item.quantity}</span>
            <span style="font-weight:700">$${itemTotal.toFixed(2)}</span>
          </div>
        `;

        itemDiv.appendChild(imgDiv);
        itemDiv.appendChild(infoDiv);
        itemsContainer.appendChild(itemDiv);
      });

      orderCard.appendChild(itemsContainer);

      const totalDiv = document.createElement('div');
      totalDiv.style.cssText = 'text-align:right;margin-top:1rem;padding-top:1rem;border-top:2px solid #e2e8f0';
      totalDiv.innerHTML = `<strong style="font-size:1.125rem">Order Total: $${orderTotal.toFixed(2)}</strong>`;
      orderCard.appendChild(totalDiv);

      container.appendChild(orderCard);
    });

  } catch (err: any) {
    console.error('[orders] Error loading orders:', err);
    // Show a helpful error message depending on what went wrong
    if (err.message?.includes('fetch') || err.message?.includes('Network')) {
      container.innerHTML = `
        <div style="padding: 20px; background-color: #fee; border: 1px solid #f00; border-radius: 5px;">
          <strong>⚠️ Network error</strong>
          <p>Unable to load your orders. Please check your internet connection and try again.</p>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="padding: 20px; background-color: #fee; border: 1px solid #f00; border-radius: 5px;">
          <strong>⚠️ Error loading orders</strong>
          <p>Failed to load orders. Please try again later.</p>
        </div>
      `;
    }
  }
}

// Kick things off when the page loads
loadOrders();
