import { Product, ProductData, Cart } from './types.js';

const CART_KEY = 'ccny_cart_v1';

function readCart(): Cart {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function writeCart(c: Cart): void {
  localStorage.setItem(CART_KEY, JSON.stringify(c));
}

async function render(): Promise<void> {
  const dataResp = await fetch('data/products.json')
    .then((r) => r.json())
    .catch(() => null);
  const data: Product[] = dataResp ? (dataResp as ProductData).products : [];
  const cart = readCart();
  const list = document.getElementById('cart-list') as HTMLElement;
  list.innerHTML = '';
  let subtotal = 0;
  const ids = Object.keys(cart);

  if (!ids.length) {
    list.innerHTML =
      '<p>Your cart is empty. Browse listings to add items.</p>';
    const subtotalEl = document.getElementById('subtotal');
    if (subtotalEl) subtotalEl.textContent = '$0.00';
    return;
  }

  ids.forEach((id) => {
    const qty = cart[id];
    const p = data.find((x) => x.id === id);
    if (!p) return;
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
    subtotal += p.price_cents * qty;
  });

  const subtotalEl = document.getElementById('subtotal');
  if (subtotalEl) {
    subtotalEl.textContent = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD'
    }).format(subtotal / 100);
  }

  list.querySelectorAll('input[data-id]').forEach((inp) => {
    inp.addEventListener('change', (e: Event): void => {
      const target = e.target as HTMLInputElement;
      const id = target.dataset.id;
      if (!id) return;
      const v = Math.max(1, parseInt(target.value || '1', 10));
      const c = readCart();
      c[id] = v;
      writeCart(c);
      render();
    });
  });

  list.querySelectorAll('[data-remove]').forEach((a) => {
    a.addEventListener('click', (e: Event): void => {
      e.preventDefault();
      const target = a as HTMLAnchorElement;
      const id = target.dataset.remove;
      if (!id) return;
      const c = readCart();
      delete c[id];
      writeCart(c);
      render();
    });
  });
}

render();
