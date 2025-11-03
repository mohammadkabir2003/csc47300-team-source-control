import { Product, ProductData } from './types.js';

// global array to hold all products once loaded
let DATA: Product[] = [];

// immediately load product data when the script runs
// this is an IIFE (Immediately Invoked Function Expression)
(async function (): Promise<void> {
  try {
    const res = await fetch('data/products.json');
    if (res.ok) {
      const j: ProductData = await res.json();
      DATA = j.products || [];
      initCategories(); // populate the category dropdown
      readURLParams(); // check if there's a search/filter in the URL
      applyFilters(); // show the products
    } else {
      console.error('products.json load failed');
    }
  } catch (e) {
    console.error(e);
  }
})();

// grab all the filter/search elements from the page
const qEl = document.getElementById('q') as HTMLInputElement; // search box
const catEl = document.getElementById('category') as HTMLSelectElement; // category dropdown
const sortEl = document.getElementById('sort') as HTMLSelectElement; // sort dropdown
const formEl = document.getElementById('filters') as HTMLFormElement; // the whole form
const resultsEl = document.getElementById('results') as HTMLElement; // where products show up
const noResultsEl = document.getElementById('no-results') as HTMLElement; // "no results" message

// populate the category dropdown with unique categories from the data
function initCategories(): void {
  // get all unique categories (using Set to deduplicate)
  const cats: string[] = Array.from(
    new Set(DATA.map((p) => p.category).filter(Boolean))
  );
  // add each category as an option in the dropdown
  cats.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    catEl.appendChild(opt);
  });
}

// check the URL for search params (like ?q=textbook&category=Textbooks)
// and pre-fill the form with those values
function readURLParams(): void {
  const params = new URLSearchParams(location.search);
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || '';
  if (q) qEl.value = q;
  if (category) catEl.value = category;
  if (sort) sortEl.value = sort;
}

// helper to convert text to lowercase for case-insensitive searching
// helper to convert text to lowercase for case-insensitive searching
function normalizeText(s: any): string {
  return (s || '').toString().toLowerCase();
}

// main filtering logic - runs whenever search, category, or sort changes
function applyFilters(): void {
  const q = normalizeText(qEl.value); // search query
  const category = catEl.value; // selected category
  const sort = sortEl.value; // sort option

  // filter products based on category and search query
  let out = DATA.filter((p) => {
    // if a category is selected, only show products in that category
    if (category && p.category !== category) return false;
    
    // if there's no search query, include this product
    if (!q) return true;
    
    // search across title, description, tags, and location
    // basically check if the search term appears anywhere in the product
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

  // sort the filtered results
  if (sort === 'newest') {
    // most recent first
    out.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } else if (sort === 'price-asc') {
    // cheapest first
    out.sort((a, b) => a.price_cents - b.price_cents);
  } else if (sort === 'price-desc') {
    // most expensive first
    out.sort((a, b) => b.price_cents - a.price_cents);
  }

  // show the filtered results
  renderResults(out);
  
  // update the URL with the current filters (so you can bookmark or share the link)
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

// create a card element for a single product
// this builds the HTML for the product thumbnail, title, price, etc
function createCard(p: Product): HTMLElement {
  const a = document.createElement('article');
  a.className = 'card';
  
  // create a placeholder image using SVG with the product's initials
  // (we don't have real images, so this looks nicer than nothing)
  const img = document.createElement('div');
  img.className = 'thumb';
  img.setAttribute('aria-hidden', 'true');
  const initials = p.title
    .split(' ')
    .slice(0, 2) // first two words
    .map((s) => s[0]) // first letter of each
    .join('')
    .toUpperCase();
  const svg =
    `data:image/svg+xml;utf8,` +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='%23eef2ff'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='40' fill='%23334155' font-family='Arial, Helvetica, sans-serif'>${initials}</text></svg>`
    );
  img.style.backgroundImage = `url(${svg})`;
  img.style.backgroundSize = 'cover';

  // build the card body with title, category/location, and price
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
  // link to the product detail page
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

// take a list of products and display them on the page
function renderResults(list: Product[]): void {
  resultsEl.innerHTML = ''; // clear old results
  if (!list.length) {
    // no matches, show the "no results" message
    noResultsEl.style.display = 'block';
    return;
  }
  noResultsEl.style.display = 'none';
  // create a card for each product and add it to the page
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
