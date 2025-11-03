import { ProductData, Cart } from './types.js';

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

function getIdFromUrl(): string | null {
  const params = new URLSearchParams(location.search);
  return params.get('id');
}

async function loadProducts(): Promise<ProductData | null> {
  try {
    const res = await fetch('data/products.json');
    if (!res.ok) throw new Error('load');
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

const CART_KEY = 'ccny_cart_v1';

function readCart(): Cart {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function writeCart(cart: Cart): void {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateNavCart();
}

function addToCart(id: string, qty: number): void {
  const cart = readCart();
  cart[id] = (cart[id] || 0) + qty;
  writeCart(cart);
}

// update the cart count badge in the navbar
// also adds a little bounce animation when the count changes
function updateNavCart(): void {
  const el = document.getElementById('nav-cart-count');
  if (!el) return;
  const cart = readCart();
  const count = Object.values(cart).reduce((s, n) => s + n, 0);
  if (count > 0) {
    el.style.display = 'inline-block';
    el.textContent = String(count);
    
    // add bounce animation when cart updates
    el.classList.remove('animate');
    // force reflow so animation plays again even if count stays the same
    void el.offsetWidth;
    el.classList.add('animate');
  } else {
    el.style.display = 'none';
  }
}

(async function render(): Promise<void> {
  updateNavCart();
  const data = await loadProducts();
  const id = getIdFromUrl();
  const root = document.getElementById('product-root') as HTMLElement;
  const notFound = document.getElementById('not-found') as HTMLElement;

  if (!data || !Array.isArray(data.products)) {
    const titleEl = document.getElementById('product-title');
    if (titleEl) titleEl.textContent = 'Data unavailable';
    return;
  }

  if (!id) {
    const titleEl = document.getElementById('product-title');
    const subEl = document.getElementById('product-sub');
    if (titleEl) titleEl.textContent = 'No product selected';
    if (subEl) subEl.innerHTML = 'Open via <code>?id=&lt;product-id&gt;</code>.';
    return;
  }

  const product = data.products.find((p) => p.id === id);
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
    (product.tags || []).forEach((t) => {
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
  
  if (imgs.length) {
    function show(i: number): void {
      if (main) {
        main.style.backgroundImage = `url(${imgs[i]})`;
        main.style.backgroundSize = 'cover';
      }
    }
    imgs.forEach((u, i) => {
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
      .map((s) => s[0])
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

  const msg = document.getElementById('msg-seller') as HTMLAnchorElement;
  if (msg && product.seller && product.seller.contact) {
    const c = product.seller.contact;
    if (c.address) {
      msg.href = 'mailto:' + encodeURIComponent(c.address);
    } else if (c.number) {
      msg.href = 'tel:' + encodeURIComponent(c.number);
    } else {
      msg.href = '#';
    }
  } else if (msg) {
    msg.href = '#';
  }

  const addCartBtn = document.getElementById('add-cart');
  if (addCartBtn) {
    addCartBtn.addEventListener('click', (): void => {
      const qtyInput = document.getElementById('qty') as HTMLInputElement;
      const qty = Math.max(1, parseInt(qtyInput.value || '1', 10));
      addToCart(product.id, qty);
      alert(`Added ${qty} × ${product.title} to cart`);
    });
  }
})();
