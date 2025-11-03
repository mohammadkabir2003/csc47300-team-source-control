// This file holds all the core data structures we use throughout the marketplace.
// Think of these as the "blueprints" for what a user, product, or cart looks like.
// We define them once here so every part of the app speaks the same language.

// Everything we know about a CCNY student - their major, where they live, when they graduate
export interface StudentProfile {
  student_id?: string;
  first_name?: string;
  last_name?: string;
  firstName?: string;
  lastName?: string;
  graduation_year?: number;
  major?: string;
  residence?: {
    campus: boolean;
    dorm?: string;
    room?: string;
  };
}

// When someone starts selling, we track their reputation here - ratings and review counts
export interface SellerProfile {
  display_name: string;
  rating: number;
  reviews_count: number;
}

// The full user object with everything - email, profile info, seller status, all of it
export interface User {
  id: string | number;
  email: string;
  password?: string;
  role?: string;
  fullName?: string;
  phone?: string;
  isSeller?: boolean;
  student_profile?: StudentProfile;
  is_email_verified?: boolean;
  can_sell?: boolean;
  seller_profile?: SellerProfile;
  created_at?: string;
  first_name?: string;
  last_name?: string;
  _lcEmail?: string;
}

// A slimmed-down version of User for when someone's logged in - just what we need to show their session
export interface UserSession {
  id: string | number;
  email: string;
  fullName?: string;
  phone?: string;
  isSeller?: boolean;
  student_profile?: StudentProfile;
  seller_profile?: SellerProfile;
  first_name?: string;
  last_name?: string;
}

// Info about someone selling stuff - their name, verified badge status, how to reach them
export interface Seller {
  id: string;
  name: string;
  verified: boolean;
  contact: {
    via: string;
    handle?: string;
    number?: string;
    address?: string;
  };
}

// A product listing with all the details - what it is, how much, where to get it, photos, everything
export interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  category_id?: string;
  tags?: string[];
  price_cents: number;
  currency: string;
  condition: string;
  location: string;
  images?: string[];
  seller?: Seller;
  seller_id?: string;
  created_at: string;
  shipping?: boolean;
  quantity?: number;
  quantity_sold?: number;
  inventory?: {
    quantity: number;
    status: string;
  };
  delivery_options?: {
    pickup_location_ids?: string[];
    meetup_ok?: boolean;
    shipping?: boolean;
  };
}

// When we load a bunch of products at once, this wraps them up with some metadata
export interface ProductData {
  meta?: {
    version: string;
    generated_at: string;
    count: number;
  };
  products: Product[];
}

// Simple shopping cart - just product IDs mapped to how many you want
export interface Cart {
  [productId: string]: number;
}

// Collection of all users when we need to work with multiple at once
export interface UsersData {
  users: User[];
}

export interface FormMessage {
  text: string;
  type: 'error' | 'success';
}

// Database row types - matching Supabase schema
export interface DBProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  seller_id: string | null;
  created_at: string;
  is_active: boolean;
  location: string | null;
  images: string[] | null;
  quantity: number;
  quantity_sold: number;
  condition?: string | null;
  tags?: string[] | null;
}

export interface DBProductWithSoldStatus extends DBProduct {
  isSold: boolean;
}

export interface DBReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewerName?: string;
}

export interface DBCartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  created_at?: string;
}

export interface DBOrder {
  id: string;
  user_id: string;
  total_price: number;
  status: string;
  created_at: string;
  order_items: DBOrderItem[];
}

export interface DBOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  price_at_purchase?: number;
  products?: DBProduct | DBProduct[];
}

export interface UserMetadata {
  full_name?: string;
  fullName?: string;
  is_seller?: boolean;
  first_name?: string;
  last_name?: string;
  [key: string]: unknown;
}
