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
  isSeller?: boolean;
  student_profile?: StudentProfile;
  seller_profile?: SellerProfile;
  first_name?: string;
  last_name?: string;
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

export interface UsersData {
  users: User[];
}

export interface FormMessage {
  text: string;
  type: 'error' | 'success';
}
