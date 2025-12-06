// Types for CCNY Exchange

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

export interface SellerProfile {
  display_name: string;
  rating: number;
  reviews_count: number;
}

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

export interface UserSession {
  id: string | number;
  email: string;
  fullName?: string;
  phone?: string;
  role?: string;
  isSeller?: boolean;
  student_profile?: StudentProfile;
  seller_profile?: SellerProfile;
  first_name?: string;
  last_name?: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified?: boolean;
  createdAt?: string;
}

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

export interface Product {
  id: string;
  _id?: string;
  title?: string;
  name?: string;
  description: string;
  category: string;
  category_id?: string;
  tags?: string[];
  price_cents?: number;
  price?: string;
  currency?: string;
  condition: string;
  location?: string;
  campus?: string;
  images?: string[];
  seller?: Seller;
  seller_id?: string;
  sellerId?: string; // MongoDB ObjectId as string
  sellerName?: string;
  sellerEmail?: string;
  created_at: string;
  shipping?: boolean;
  quantity?: number;
  availableQuantity?: number; // Calculated: quantity - active orders
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

export interface ProductData {
  meta?: {
    version: string;
    generated_at: string;
    count: number;
  };
  products: Product[];
}

export interface Cart {
  [productId: string]: number;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

export interface UsersData {
  users: User[];
}

export interface FormMessage {
  text: string;
  type: 'error' | 'success';
}

export interface DBProduct {
  id: string;
  name: string;
  description: string | null;
  price: string;
  category: string | null;
  seller_id: string | null;
  created_at: string;
  is_active: boolean;
  location?: string | null;
  campus?: string | null;
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
  _id?: string;
  id?: string;
  orderNumber?: string;
  userId?: string;
  user_id?: string;
  totalAmount?: string;
  total_price?: string;
  status: string;
  buyerConfirmed?: boolean;
  sellerConfirmed?: boolean;
  buyerBanned?: boolean;
  buyerDeleted?: boolean;
  disputeId?: string;
  createdAt?: string;
  created_at?: string;
  items?: Array<{
    productId?: string;
    name?: string;
    price: string;
    quantity: number;
    imageId?: string;
    sellerBanned?: boolean;
    sellerDeleted?: boolean;
  }>;
  order_items?: DBOrderItem[];
  shippingAddress?: any;
}

export interface DBOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: string;
  price_at_purchase?: string;
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
