import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// Validate environment variables
if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
  throw new Error('Missing VITE_SUPABASE_URL in .env file')
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY in .env file')
}

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Database types
export interface RegistrationRequest {
  id: string;
  restaurant_name: string;
  owner_name: string;
  phone: string;
  email?: string;
  city: string;
  address?: string;
  restaurant_type: string;
  heard_from?: string;
  notes?: string;
  status: "pending" | "contacted" | "verified" | "rejected";
  contacted_at?: string;
  rejection_reason?: string;
  internal_notes?: string;
  created_at: string;
}

export interface Restaurant {
  id: string;
  registration_request_id?: string;
  name: string;
  slug: string;
  owner_name?: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
  description?: string;
  website?: string;
  restaurant_type?: string;
  logo_url?: string;
  cover_url?: string;
  qr_code_url?: string;
  whatsapp_number?: string;
  business_hours?: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
  is_manually_closed?: boolean;
  subscription_plan: "free_trial" | "starter" | "pro" | "enterprise";
  status: "active" | "blocked" | "trial";
  is_active: boolean;
  internal_notes?: string;
  block_reason?: string;
  trial_ends_at?: string;
  payment_settings?: {
    cash_enabled: boolean;
    instapay_enabled: boolean;
    instapay_link: string;
    instapay_whatsapp: string;
  };
  order_types_enabled?: {
    dine_in: boolean;
    takeaway: boolean;
    delivery: boolean;
  };
  print_settings?: {
    paper_size: "58mm" | "80mm" | "A4";
  };
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  restaurant_id?: string;
  email: string;
  password_hash: string;
  temp_password: boolean;
  role: "owner" | "staff";
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  base_price: number;
  category?: string;
  category_ar?: string;
  image_url?: string;
  is_available: boolean;
  sizes?: { name: string; name_ar?: string; price: number }[];
  addons?: { name: string; name_ar?: string; price: number }[];
  created_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  order_number: string;
  order_type: "qr" | "counter" | "phone" | "table";
  table_number?: string;
  customer_name?: string;
  customer_phone?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  delivery_fee?: number;
  delivery_zone_id?: string;
  discount?: number;
  total: number;
  status:
    | "pending"
    | "accepted"
    | "preparing"
    | "ready"
    | "completed"
    | "cancelled"
    | "rejected";
  payment_method?: string;
  payment_status?: string;
  payment_transaction_id?: string;
  customer_notes?: string;
  internal_notes?: string;
  accepted_at?: string;
  preparing_at?: string;
  ready_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  created_at: string;
  updated_at?: string;
}

export interface OrderItem {
  menu_item_id: string;
  name: string;
  name_ar?: string;
  quantity: number;
  base_price: number;
  selected_size?: { name: string; price: number };
  selected_addons?: { name: string; price: number }[];
  item_total: number;
  special_instructions?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  name?: string;
  created_at: string;
}

export interface DeliveryZone {
  id: string;
  restaurant_id: string;
  name_ar: string;
  name_en: string;
  delivery_fee: number;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  restaurant_id: string;
  customer_name: string;
  customer_phone: string;
  reservation_date: string;
  reservation_time: string;
  guests_count: number;
  table_number?: string;
  status: "pending" | "confirmed" | "cancelled" | "rejected";
  notes?: string;
  created_at: string;
  updated_at?: string;
}
