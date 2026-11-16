/** API response shapes. Money values are always 2-decimal strings. */

export type Money = string;

export type OrderStatus =
  | 'received'
  | 'washing'
  | 'drying'
  | 'folding'
  | 'ready_for_pickup'
  | 'released'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'refunded';
export type PricingType = 'per_kg' | 'per_piece' | 'fixed';
export type RoleName = 'owner' | 'operator' | 'staff';

export interface User {
  id: number;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: RoleName;
  role_label: string;
  is_active: boolean;
  avatar_url: string | null;
  last_login_at: string | null;
  created_at: string;
  permissions: string[];
}

export interface Customer {
  id: number;
  customer_code: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  orders_count?: number;
  total_spent?: Money;
  outstanding_balance?: Money;
  last_order_at?: string | null;
}

export interface LaundryService {
  id: number;
  name: string;
  description: string | null;
  pricing_type: PricingType;
  pricing_label: string;
  unit: string;
  price: Money;
  minimum_quantity: Money | null;
  turnaround_hours: number | null;
  is_active: boolean;
  sort_order: number;
}

export interface ServiceAddon {
  id: number;
  name: string;
  description: string | null;
  price: Money;
  is_active: boolean;
  sort_order: number;
}

export interface PaymentMethod {
  id: number;
  name: string;
  code: string;
  requires_reference: boolean;
  is_cash: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface Payment {
  id: number;
  payment_number: string;
  type: 'payment' | 'refund';
  amount: Money;
  amount_tendered: Money | null;
  change_given: Money;
  reference_number: string | null;
  notes: string | null;
  paid_at: string;
  method?: { id: number; name: string; code: string };
  received_by?: { id: number; name: string } | null;
  order?: { id: number; order_number: string; customer_name: string | null };
}

export interface StatusHistory {
  id: number;
  from_status: OrderStatus | null;
  from_label: string | null;
  to_status: OrderStatus;
  to_label: string;
  remarks: string | null;
  user?: { id: number; name: string } | null;
  created_at: string;
}

export interface OrderItem {
  id: number;
  laundry_service_id: number | null;
  service_name: string;
  pricing_type: PricingType;
  unit: string;
  unit_price: Money;
  quantity: Money;
  billable_quantity: Money;
  line_total: Money;
  notes: string | null;
}

export interface OrderAddon {
  id: number;
  service_addon_id: number | null;
  addon_name: string;
  unit_price: Money;
  quantity: number;
  line_total: Money;
}

export interface Order {
  id: number;
  order_number: string;
  status: OrderStatus;
  status_label: string;
  status_step: number | null;
  payment_status: PaymentStatus;
  payment_status_label: string;
  subtotal: Money;
  discount_type: 'percent' | 'fixed' | null;
  discount_value: Money;
  discount_amount: Money;
  discount_reason: string | null;
  tax_rate: Money;
  tax_amount: Money;
  total: Money;
  amount_paid: Money;
  balance: Money;
  notes: string | null;
  expected_at: string | null;
  released_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  customer?: { id: number; customer_code: string; name: string; phone: string };
  created_by?: { id: number; name: string } | null;
  released_by?: { id: number; name: string } | null;
  items?: OrderItem[];
  addons?: OrderAddon[];
  total_weight?: Money;
  total_pieces?: number;
  payments?: Payment[];
  status_history?: StatusHistory[];
}

export interface Quote {
  items: Array<{
    laundry_service_id: number;
    service_name: string;
    pricing_type: PricingType;
    unit_price: Money;
    quantity: Money;
    billable_quantity: Money;
    line_total: Money;
  }>;
  addons: Array<{ service_addon_id: number; addon_name: string; unit_price: Money; quantity: number; line_total: Money }>;
  subtotal: Money;
  discount_type: string | null;
  discount_value: Money;
  discount_amount: Money;
  tax_rate: Money;
  tax_amount: Money;
  total: Money;
}

export interface Settings {
  shop_name: string;
  shop_address: string;
  shop_phone: string;
  shop_email: string;
  shop_logo_url: string | null;
  currency: string;
  currency_symbol: string;
  order_prefix: string;
  order_number_padding: number;
  default_turnaround_hours: number;
  tax_label: string;
  tax_rate: Money;
  operator_max_discount_percent: Money;
  require_full_payment_on_release: boolean;
  receipt_paper_width: '58' | '80';
  receipt_footer: string;
  receipt_terms: string;
}

export interface Receipt {
  shop: { name: string; address: string; phone: string; email: string; logo_url: string | null };
  paper_width: '58' | '80';
  currency_symbol: string;
  tax_label: string;
  footer: string;
  terms: string[];
  order: Order;
  printed_at: string;
}

export interface ActivityLog {
  id: number;
  action: string;
  description: string;
  subject_type: string | null;
  subject_id: number | null;
  properties: Record<string, unknown> | null;
  ip_address: string | null;
  user?: { id: number; name: string } | null;
  created_at: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null };
  links: Record<string, string | null>;
}

export interface DashboardData {
  stats: {
    today_orders: number;
    pending_orders: number;
    processing_orders: number;
    ready_orders: number;
    today_sales?: Money;
    today_order_value?: Money;
    unpaid_balance?: Money;
    unpaid_orders?: number;
  };
  status_overview: Array<{ status: OrderStatus; label: string; count: number }>;
  sales_chart: Array<{ period: string; label: string; orders_count: number; order_value: Money; collected: Money }>;
  recent_orders: Order[];
  recent_payments: Payment[];
}
