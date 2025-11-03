import { Product, ProductData } from './types.js';

let DATA: Product[] = [];

(async function (): Promise<void> {
  try {
    const res = await fetch('data/products.json');
    if (res.ok) {
      const j: ProductData = await res.json();
      DATA = j.products || [];
      initCategories();
      readURLParams();
      applyFilters();
    } else {
      console.error('products.json load failed');
    }
  } catch (e) {
    console.error(e);
  }
})();

const qEl = document.getElementById('q') as HTMLInputElement;
const catEl = document.getElementById('category') as HTMLSelectElement;
const sortEl = document.getElementById('sort') as HTMLSelectElement;
const formEl = document.getElementById('filters') as HTMLFormElement;
const resultsEl = document.getElementById('results') as HTMLElement;
const noResultsEl = document.getElementById('no-results') as HTMLElement;

function initCategories(): void {
  const cats: string[] = Array.from(
    new Set(DATA.map((p) => p.category).filter(Boolean))
  );
  cats.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    catEl.appendChild(opt);
  });
}

function readURLParams(): void {
  const params = new URLSearchParams(location.search);
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || '';
  if (q) qEl.value = q;
  if (category) catEl.value = category;
  if (sort) sortEl.value = sort;
}

function normalizeText(s: any): string {
  return (s || '').toString().toLowerCase();
}

function applyFilters(): void {
  const q = normalizeText(qEl.value);
  const category = catEl.value;
  const sort = sortEl.value;

  let out = DATA.filter((p) => {
    if (category && p.category !== category) return false;
    if (!q) return true;
    const hay = [
      p.title,
      p.description,
      (p.tags || []).join(' '),
      p.location
    ]
      .map(normalizeText)
      .join(' ');
    return hay.indexOf(q) !== -1;
  });

  if (sort === 'newest') {
    out.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } else if (sort === 'price-asc') {
    out.sort((a, b) => a.price_cents - b.price_cents);
  } else if (sort === 'price-desc') {
    out.sort((a, b) => b.price_cents - a.price_cents);
  }

  renderResults(out);
  try {
    const params = new URLSearchParams();
    if (q) params.set('q', qEl.value);
    if (category) params.set('category', category);
    if (sort) params.set('sort', sort);
    const newUrl = params.toString()
      ? `${location.pathname}?${params.toString()}`
      : location.pathname;
    history.replaceState(null, '', newUrl);
  } catch (e) {}
}

function createCard(p: Product): HTMLElement {
  const a = document.createElement('article');
  a.className = 'card';
  const img = document.createElement('div');
  img.className = 'thumb';
  img.setAttribute('aria-hidden', 'true');
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
  img.style.backgroundImage = `url(${svg})`;
  img.style.backgroundSize = 'cover';

  const body = document.createElement('div');
  body.className = 'card-body';
  const h3 = document.createElement('h3');
  h3.className = 'card-title';
  h3.textContent = p.title;
  const meta = document.createElement('p');
  meta.className = 'muted';
  meta.textContent = `${p.category} • ${p.location}`;
  const priceRow = document.createElement('div');
  priceRow.className = 'price-row';
  const price = document.createElement('span');
  price.className = 'price';
  price.textContent = (p.price_cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: p.currency || 'USD'
  });
  const btn = document.createElement('a');
  btn.className = 'btn btn-sm';
  btn.href = `product.html?id=${encodeURIComponent(p.id)}`;
  btn.textContent = 'View';
  priceRow.appendChild(price);
  priceRow.appendChild(btn);

  body.appendChild(h3);
  body.appendChild(meta);
  body.appendChild(priceRow);
  a.appendChild(img);
  a.appendChild(body);
  return a;
}

function renderResults(list: Product[]): void {
  resultsEl.innerHTML = '';
  if (!list.length) {
    noResultsEl.style.display = 'block';
    return;
  }
  noResultsEl.style.display = 'none';
  list.forEach((p) => {
    resultsEl.appendChild(createCard(p));
  });
}

function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number = 150
): (...args: Parameters<T>) => void {
  let t: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>): void => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

formEl.addEventListener('submit', (e: Event): void => {
  e.preventDefault();
  applyFilters();
});

qEl.addEventListener('input', debounce(applyFilters, 200));
catEl.addEventListener('change', applyFilters);
sortEl.addEventListener('change', applyFilters);
