// The marketplace page - browse all the stuff students are selling at CCNY.
// Supports searching, filtering by category, and sorting by price or date.
import { Product, ProductData, DBProduct, DBProductWithSoldStatus } from './types.js';
import { supabase, isSupabaseConfigured } from './supabase-client.js';

// All the products we've loaded get stored here so we can filter/search through them
let DATA: Product[] = [];
// Store ALL products including sold items for the "Sold Items" category
let ALL_DATA: DBProductWithSoldStatus[] = [];

// Helper function to show error messages to the user
function showErrorBanner(message: string): void {
  const resultsEl = document.getElementById('results');
  if (resultsEl) {
    resultsEl.innerHTML = `
      <div style="padding: 20px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; margin: 20px;">
        <strong>⚠️ ${message}</strong>
      </div>
    `;
  }
}

// Go fetch all the active product listings from the database when the page loads
(async function (): Promise<void> {
  // Check if Supabase is configured before trying to fetch
  if (!isSupabaseConfigured) {
    console.warn('[market] Supabase not configured, using local fallback data');
    showErrorBanner('Database connection unavailable. Showing sample products only.');
    // Skip trying Supabase and go straight to local fallback
    await loadFallbackData();
    return;
  }

  try {
    // Get all active products, but we'll filter sold items client-side
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[market] Supabase error:', error);
      throw new Error(`Database query failed: ${error.message}`);
    }
    
    if (data && Array.isArray(data)) {
      // Store all products (including sold) for filtering
      ALL_DATA = (data as DBProduct[]).map((p) => ({
        ...p,
        isSold: (p.quantity_sold || 0) >= (p.quantity || 1)
      }));

      // By default, only show available items (not sold)
      const availableData = ALL_DATA.filter((p) => !p.isSold);

      DATA = availableData.map((p): Product => ({
        id: p.id,
        title: p.name || '',
        description: p.description || '',
        category: p.category || '',
        price_cents: p.price ? Math.round(Number(p.price) * 100) : 0,
        currency: 'USD',
        condition: p.condition || 'Used',
        location: p.location || '',
        created_at: p.created_at,
        seller_id: p.seller_id || undefined,
        tags: p.tags || [],
        images: p.images || [],
        quantity: p.quantity || 1,
        quantity_sold: p.quantity_sold || 0,
      }));
      initCategories();
      readURLParams();
      applyFilters();
      return;
    }
  } catch (e) {
    console.error('[market] Failed to fetch products from database:', e);
    showErrorBanner('Unable to load products from database. Showing sample products.');
  }
  
  // If the database is down or not set up, we can still use the local JSON file for development
  await loadFallbackData();
})();

// Load products from local JSON file as a fallback
async function loadFallbackData(): Promise<void> {
  try {
    const res = await fetch('data/products.json');
    if (res.ok) {
      const j: ProductData = await res.json();
      DATA = j.products || [];
      initCategories();
      readURLParams();
      applyFilters();
    } else {
      console.error('[market] products.json load failed with status:', res.status);
      showErrorBanner('Unable to load products. Please try again later.');
    }
  } catch (e) {
    console.error('[market] Failed to load fallback data:', e);
    showErrorBanner('Unable to load products. Please check your connection.');
  }
}

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
  
  // Add a "Sold Items" option at the end
  const soldOpt = document.createElement('option');
  soldOpt.value = '__SOLD__';
  soldOpt.textContent = 'Sold Items';
  catEl.appendChild(soldOpt);
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
function normalizeText(s: string | number | null | undefined): string {
  return (s || '').toString().toLowerCase();
}

// The heart of the marketplace - filters and sorts products based on what the user wants to see
function applyFilters(): void {
  const q = normalizeText(qEl.value); // search query
  const category = catEl.value; // selected category
  const sort = sortEl.value; // sort option

  // Special handling for "Sold Items" category
  let sourceData: Product[];
  if (category === '__SOLD__') {
    // Show only sold items
    const soldData = ALL_DATA.filter((p) => p.isSold);
    sourceData = soldData.map((p): Product => ({
      id: p.id,
      title: p.name || '',
      description: p.description || '',
      category: p.category || '',
      price_cents: p.price ? Math.round(Number(p.price) * 100) : 0,
      currency: 'USD',
      condition: p.condition || 'Used',
      location: p.location || '',
      created_at: p.created_at,
      seller_id: p.seller_id || undefined,
      tags: p.tags || [],
      images: p.images || [],
    }));
  } else {
    // Use regular available products
    sourceData = DATA;
  }

  // filter products based on category and search query
  let out = sourceData.filter((p) => {
    // if a category is selected (and not "Sold Items"), only show products in that category
    if (category && category !== '__SOLD__' && p.category !== category) return false;
    
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
async function createCard(p: Product): Promise<HTMLElement> {
  const a = document.createElement('article');
  a.className = 'card';
  
  // Check if this product belongs to the current user
  let isOwnProduct = false;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user.id === p.seller_id) {
      isOwnProduct = true;
    }
  } catch (e) {
    // Ignore errors, just don't mark as own product
  }
  
  // create thumbnail - use first uploaded image if available, otherwise placeholder
  const img = document.createElement('div');
  img.className = 'thumb';
  img.setAttribute('aria-hidden', 'true');
  
  // Add opacity and badge if it's the user's own product
  if (isOwnProduct) {
    img.style.opacity = '0.6';
    img.style.position = 'relative';
  }
  
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
  
  // Add "Your Product" badge if it's the user's own listing
  if (isOwnProduct) {
    const badge = document.createElement('span');
    badge.textContent = 'Your Product';
    badge.style.cssText = 'display:inline-block;background:linear-gradient(90deg, #6366f1, #8b5cf6);color:white;padding:0.25rem 0.5rem;border-radius:4px;font-size:0.75rem;font-weight:600;margin-bottom:0.5rem;';
    body.appendChild(badge);
  }
  
  const h3 = document.createElement('h3');
  h3.className = 'card-title';
  h3.textContent = p.title;
  const meta = document.createElement('p');
  meta.className = 'muted';
  meta.textContent = `${p.category} • ${p.location}`;
  
  // Add quantity information if available
  if (p.quantity !== undefined && p.quantity_sold !== undefined) {
    const availableQty = p.quantity - p.quantity_sold;
    const qtyInfo = document.createElement('p');
    qtyInfo.style.cssText = 'font-size: 0.875rem; margin: 0.25rem 0; font-weight: 600;';
    
    if (availableQty <= 0) {
      qtyInfo.style.color = '#dc3545';
      qtyInfo.textContent = '❌ Sold Out';
    } else if (availableQty === 1) {
      qtyInfo.style.color = '#ff6b6b';
      qtyInfo.textContent = `⚠️ Only 1 left`;
    } else {
      qtyInfo.style.color = '#28a745';
      qtyInfo.textContent = `✓ ${availableQty} available`;
    }
    
    body.appendChild(qtyInfo);
  }
  
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
  btn.className = 'btn btn-primary btn-sm';
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
async function renderResults(list: Product[]): Promise<void> {
  resultsEl.innerHTML = ''; // clear old results
  if (!list.length) {
    // no matches, show the "no results" message
    noResultsEl.style.display = 'block';
    return;
  }
  noResultsEl.style.display = 'none';
  // create a card for each product and add it to the page
  for (const p of list) {
    const card = await createCard(p);
    resultsEl.appendChild(card);
  }
}

function debounce<T extends (...args: never[]) => void>(
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
