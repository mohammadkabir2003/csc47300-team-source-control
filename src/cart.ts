import { Product, ProductData, Cart } from './types.js';

// key where we store cart data in localStorage
const CART_KEY = 'ccny_cart_v1';

// grab the cart from localStorage, or return empty object if nothing's there
// cart structure is like: { "product-id": quantity, ... }
function readCart(): Cart {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '{}');
  } catch (e) {
    // if JSON is corrupted somehow, just start fresh
    return {};
  }
}

// save cart back to localStorage
function writeCart(c: Cart): void {
  localStorage.setItem(CART_KEY, JSON.stringify(c));
}

// main function that displays the cart contents
async function render(): Promise<void> {
  // load product data so we can show prices, titles, etc
  const dataResp = await fetch('data/products.json')
    .then((r) => r.json())
    .catch(() => null);
  const data: Product[] = dataResp ? (dataResp as ProductData).products : [];
  
  const cart = readCart();
  const list = document.getElementById('cart-list') as HTMLElement;
  list.innerHTML = ''; // clear out old contents
  let subtotal = 0;
  const ids = Object.keys(cart); // get all product IDs in the cart

  // if cart is empty, show a message
  // if cart is empty, show a message
  if (!ids.length) {
    list.innerHTML =
      '<p>Your cart is empty. Browse listings to add items.</p>';
    const subtotalEl = document.getElementById('subtotal');
    if (subtotalEl) subtotalEl.textContent = '$0.00';
    return;
  }

  // loop through each product in the cart and create a row for it
  ids.forEach((id) => {
    const qty = cart[id]; // how many of this item they want
    const p = data.find((x) => x.id === id); // find the product details
    if (!p) return; // skip if product doesn't exist anymore
    
    // create a cart row with product info, quantity input, and remove button
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `<div class="cart-thumb" aria-hidden="true"></div><div style="flex:1"><div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${
      p.title
    }</strong><div class="muted-small">${p.category} • ${
      p.location
    }</div></div><div style="text-align:right"><div style="font-weight:800">${(
      p.price_cents / 100
    ).toLocaleString(undefined, {
      style: 'currency',
      currency: p.currency
    })}</div><div class="muted-small">x <input data-id="${id}" class="input qty" type="number" min="1" value="${qty}" style="width:64px" /></div><div style="margin-top:.4rem"><a href="#" data-remove="${id}" class="btn btn-ghost">Remove</a></div></div></div></div>`;
    list.appendChild(row);
    
    // add to running subtotal
    // add to running subtotal
    subtotal += p.price_cents * qty;
  });

  // show the subtotal at the bottom (formatted as currency)
  const subtotalEl = document.getElementById('subtotal');
  if (subtotalEl) {
    subtotalEl.textContent = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD'
    }).format(subtotal / 100);
  }

  // wire up the quantity inputs so they update the cart when changed
  list.querySelectorAll('input[data-id]').forEach((inp) => {
    inp.addEventListener('change', (e: Event): void => {
      const target = e.target as HTMLInputElement;
      const id = target.dataset.id;
      if (!id) return;
      // make sure quantity is at least 1
      const v = Math.max(1, parseInt(target.value || '1', 10));
      const c = readCart();
      c[id] = v; // update quantity
      writeCart(c); // save to localStorage
      render(); // re-render the whole cart to update subtotal
    });
  });

  // wire up the remove buttons to delete items from cart
  list.querySelectorAll('[data-remove]').forEach((a) => {
    a.addEventListener('click', (e: Event): void => {
      e.preventDefault(); // don't actually navigate
      const target = a as HTMLAnchorElement;
      const id = target.dataset.remove;
      if (!id) return;
      const c = readCart();
      delete c[id]; // remove this product from cart
      writeCart(c); // save
      render(); // re-render
    });
  });
}

// render the cart when the page loads
render();
