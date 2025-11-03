// The marketplace page - browse all the stuff students are selling at CCNY.
// Supports searching, filtering by category, and sorting by price or date.
import { Product, ProductData } from './types.js';
import { supabase } from './supabase-client.js';

// All the products we've loaded get stored here so we can filter/search through them
let DATA: Product[] = [];

// Go fetch all the active product listings from the database when the page loads
(async function (): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (data && Array.isArray(data)) {
      DATA = data.map((p: any) => ({
        id: p.id,
        title: p.name || p.title || '',
        description: p.description || '',
        category: p.category || '',
        price_cents: p.price ? Math.round(Number(p.price) * 100) : 0,
        currency: 'USD',
        condition: p.condition || 'Used',
        location: p.location || '',
        created_at: p.created_at,
        seller_id: p.seller_id,
        tags: p.tags || [],
        images: p.images || [],
      }));
      initCategories();
      readURLParams();
      applyFilters();
      return;
    }
  } catch (e) {
    console.error('[supabase] products fetch failed, falling back to local data:', e);
  }
  // If the database is down or not set up, we can still use the local JSON file for development
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

// Find all the form elements we need for searching and filtering products
const qEl = document.getElementById('q') as HTMLInputElement; // search box
const catEl = document.getElementById('category') as HTMLSelectElement; // category dropdown
const sortEl = document.getElementById('sort') as HTMLSelectElement; // sort dropdown
const formEl = document.getElementById('filters') as HTMLFormElement; // the whole form
const resultsEl = document.getElementById('results') as HTMLElement; // where products show up
const noResultsEl = document.getElementById('no-results') as HTMLElement; // "no results" message

// Build the category dropdown by looking at what categories actually exist in our products
function initCategories(): void {
  // Pull out all the categories and remove duplicates using a Set
  const cats: string[] = Array.from(
    new Set(DATA.map((p) => p.category).filter(Boolean))
  );
  // Add each category to the dropdown so people can filter by it
  cats.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    catEl.appendChild(opt);
  });
}

// If someone shared a link with search terms in it, we want to automatically apply those filters
// Checks the URL for things like ?q=textbook and fills in the search box
function readURLParams(): void {
  const params = new URLSearchParams(location.search);
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || '';
  if (q) qEl.value = q;
  if (category) catEl.value = category;
  if (sort) sortEl.value = sort;
}

// Make text lowercase so searching isn't case-sensitive - "Textbook" matches "textbook"
function normalizeText(s: any): string {
  return (s || '').toString().toLowerCase();
}

// The heart of the marketplace - filters and sorts products based on what the user wants to see
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
  
  // create thumbnail - use first uploaded image if available, otherwise placeholder
  const img = document.createElement('div');
  img.className = 'thumb';
  img.setAttribute('aria-hidden', 'true');
  
  if (p.images && p.images.length > 0) {
    // use the first uploaded image
    img.style.backgroundImage = `url(${p.images[0]})`;
    img.style.backgroundSize = 'cover';
    img.style.backgroundPosition = 'center';
  } else {
    // fallback to placeholder SVG with product initials
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
  }

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
