**HW3**
- Dynamic market.html is now dynamic (search, category, sort functional) and product.html has further details renderng from json data
- JSON data in data/products.json (products array + meta).
- The cart page is also new, when adding a product to cart.
- **In order for website to function, user must run it on a local server (Go Live)**
---

**HW4** implements 3 features
1. **Login**
2. **User Profile**
3. **Sign Up**


## Login

- Validates user email and password from `users.json` (some pre-defined users).
- Stores logged-in user in `localStorage`.

---

## User Profile

- Displays user information
- Reads user data from `sessionStorage`.

---

## Sign Up

- Validates form inputs
- Stores newly created users locally.
- Redirects to profile age (logged in state) after success

---
***All commits starting from "Implemented login feature" to "HW4 Final Submission" are part of HW #4*** 

---

**HW5** implements database integration and new features:

## Database-Backed Authentication

- Sign up and login now use **Supabase** for user authentication (no more local JSON files)
- User data stored in Supabase Auth with metadata (full name, phone, seller status)
- Password reset flow implemented with email link sent via Supabase

---

## Product Listings with Image Upload

- Sellers can post product listings through `sell.html`
- Images uploaded to **Supabase Storage** bucket (`Product_Images`)
- Product data stored in `products` table in database
- Image URLs referenced in product records

---

## Shopping Cart (Per-User, Database-Backed)

- Each user has a cart stored in the database (`carts` and `cart_items` tables)
- Cart persists across sessions
- Live cart count shown in navbar
- Add/remove items, update quantities

---

## Checkout & Orders

- Mock payment flow (no real payment processing)
- Orders recorded in database with `orders` and `order_items` tables
- Each order captures product details, quantities, and prices at purchase time
- View past orders on `orders.html`

---

## Reviews System

- Customers can leave reviews on products
- Reviews stored in `reviews` table in database
- Reviews displayed on product detail pages

---

## Dark Mode (Night Mode)

- Toggle button in navbar for dark/light theme
- Preference persists across page visits (stored in `localStorage`)
- Applies to all pages for consistent UI experience

---

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Create a `.env` file with your Supabase credentials:
     ```
     SUPABASE_URL=your_supabase_url
     SUPABASE_ANON_KEY=your_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     ```

3. **Build TypeScript:**
   ```bash
   npm run build
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```
   - Server runs on `http://127.0.0.1:8080`

---

## Additional npm Scripts

- `npm run watch` — Auto-compile TypeScript on file changes
- `npm run clean` — Remove compiled files from `dist/`

---

***All features for HW5 committed to this branch*** 