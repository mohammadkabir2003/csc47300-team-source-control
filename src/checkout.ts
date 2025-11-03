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

async function loadProducts(): Promise<Product[]> {
  const res = await fetch('data/products.json')
    .then((r) => r.json())
    .catch(() => null);
  return res ? (res as ProductData).products : [];
}

async function renderSummary(): Promise<void> {
  const products = await loadProducts();
  const cart = readCart();
  const summary = document.getElementById('order-summary') as HTMLElement;
  summary.innerHTML = '';
  let total = 0;
  const ids = Object.keys(cart);

  if (!ids.length) {
    summary.innerHTML = '<p>Your cart is empty.</p>';
    const orderTotalEl = document.getElementById('order-total');
    if (orderTotalEl) orderTotalEl.textContent = '';
    return;
  }

  ids.forEach((id) => {
    const qty = cart[id];
    const p = products.find((x) => x.id === id);
    if (!p) return;
    const line = document.createElement('div');
    line.style.display = 'flex';
    line.style.justifyContent = 'space-between';
    line.style.marginBottom = '.35rem';
    line.innerHTML = `<div>${p.title} <span class="muted-small">x${qty}</span></div><div style="font-weight:800">${(
      (p.price_cents * qty) /
      100
    ).toLocaleString(undefined, {
      style: 'currency',
      currency: p.currency
    })}</div>`;
    summary.appendChild(line);
    total += p.price_cents * qty;
  });

  const tot = document.createElement('div');
  tot.style.marginTop = '.6rem';
  tot.style.fontWeight = '800';
  tot.textContent =
    'Total: ' +
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD'
    }).format(total / 100);
  summary.appendChild(tot);
}

const checkoutForm = document.getElementById('checkout-form') as HTMLFormElement;
checkoutForm.addEventListener('submit', async function (e: Event): Promise<void> {
  e.preventDefault();
  const cart = readCart();
  const ids = Object.keys(cart);
  if (!ids.length) {
    alert('Your cart is empty');
    return;
  }
  const form = new FormData(e.target as HTMLFormElement);
  const name = form.get('name') as string;
  const email = form.get('email') as string;
  if (!name || !email) {
    alert('Please fill required fields');
    return;
  }
  const result = document.getElementById('order-result') as HTMLElement;
  result.style.display = 'block';
  result.innerHTML = `<h3>Order placed</h3><p>Thanks, ${name}! We'll email a confirmation to ${email}. Meet in a public place to exchange items.</p><p><strong>Order ID:</strong> ${'ORD-' + Date.now()}</p>`;
  writeCart({});
  await renderSummary();
});

renderSummary();
