# Checklist — CCNY Exchange

This document lists the features implemented in the CCNY Exchange prototype. Use this as a checklist and quick developer reference. Each item contains a short description and where it lives in the repository.

---

## Core marketplace

- [x] Product listings / marketplace — `market.html`, `data/products.json`
  - Browse listings, category filter, search/URL param support.
- [x] Product detail page — `product.html`, `data/products.json`
  - Title, price, description, tags, images (fallback initials), seller info, date posted.
- [x] Category & tag filtering — `market.html`, `data/categories.json`

## Cart & checkout

- [x] Add to cart (client-side) — helpers inside `product.html`
  - Functions: `readCart()`, `writeCart()`, `addToCart(id, qty)`, nav badge via `updateNavCart()`.
- [x] Cart page — `cart.html` (client-side review of cart)
- [x] Checkout page (UI prototype) — `checkout.html`

## User accounts & authentication

- [x] Sign up (client-side) — `signup.html`, `signup.js`
  - Saves accounts to `localStorage` under the `users` key; optional seller flag.
- [x] Login — `login.html`, `login.js`
  - Checks `localStorage` users first, falls back to `data/users.json` seed; stores session in `sessionStorage.loggedInUser`.
- [x] Profile page & session handling — `user.html`, `user.js`
  - Renders session user from `sessionStorage` and includes logout (clears session only).

## Seller flows & listings

- [x] Sell an item form (listing creation preview) — `sell.html`
- [x] Seller info on product page — `product.html` (seller name, verified badge, contact methods)

## Messaging, reviews & community

- [x] Message seller CTA — `product.html` (`msg-seller` anchor constructs `mailto:`/`tel:` when contact exists)
- [x] Reviews data (seed) — `data/reviews.json` (UI minimal)
- [x] Messages data (seed) — `data/messages.json` (no full inbox UI yet)

## Orders, coupons & admin data (prototyped)

- [x] Orders seed — `data/orders.json`
- [x] Coupons seed — `data/coupons.json`

## Supporting data & utilities

- [x] Categories — `data/categories.json`
- [x] Campus list — `data/campus.json`
- [x] Users seed — `data/users.json`

## Client-side persistence strategy

- [x] `localStorage` used for demo data that should persist across sessions:
  - `users` (accounts created via `signup.js`), `ccny_cart_v1` (cart)
- [x] `sessionStorage` used for session-only login:
  - `loggedInUser` — cleared when the tab/browser session ends

## UI / theme

- [x] Global header, nav and CTAs — `styles.css`, header markup in `*.html`
- [x] Sign Up CTA added to header and `login.html`
- [x] Cart badge in nav updates with item count (via product/cart scripts)
- [x] Visual theme & responsive layout — `styles.css`

## Developer / prototyping notes

- [x] Product JSON-driven loading and client-side filtering (`market.html` fetches `data/products.json`).
- [x] Local-first login flow supports accounts created from `signup.js` and seeded `data/users.json`.
- [x] Demo-friendly product image fallback (initials when no image is provided).

## Missing / future improvements (not yet implemented / recommended)

- [ ] Server-side API for products/users/carts/orders (currently local-only + seed JSON)
- [ ] Payment integration (Stripe or similar) for checkout
- [ ] Image upload support for seller listings (server storage)
- [ ] Messaging inbox UI and review moderation
- [ ] Email verification and CCNY-domain enforcement on signup
- [ ] Admin dashboard / seller management
- [ ] Security hardening (password storage, auth tokens, backend validation)

---

## How to run locally (quick)

From the project directory (`c:\Users\rabbi\Web Design`) you can serve files with a simple HTTP server for best behavior (some browsers restrict `fetch` for `file://`):

```powershell
# from project root
python -m http.server 8000
# then open
http://localhost:8000/
```

Notes:

- The app is prototyped as a static client-side site using JSON files in `data/` and browser storage. To persist changes between machines or users, add a backend API.
- To clear any persistent demo user or cart data, open DevTools → Application → Local Storage and remove the keys: `users`, `ccny_cart_v1`, and `loggedInUser` (sessionStorage).

## Where to look for related code

- Authentication and session: `signup.js`, `login.js`, `user.js`
- Product & marketplace: `market.html`, `product.html`, `data/products.json`
- Cart & checkout: `product.html` (cart helpers), `cart.html`, `checkout.html`
- Seller/listing form: `sell.html`
- Styles & theme: `styles.css`

---

If you'd like, I can:

- Add a small server (Express or Flask) to turn seed JSON into real API endpoints and persist changes,
- Add a "Remember me" option to `login.html` that persists the session in `localStorage` only when chosen,
- Or implement one specific missing improvement above — tell me which and I'll add a scoped plan and start implementing it.
