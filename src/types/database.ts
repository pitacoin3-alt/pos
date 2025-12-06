// Database types for the POS system

export interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  company?: string;
  category?: string;
  image?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreditCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  total_credit: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreditTransaction {
  id: string;
  customer_id: string;
  date: string;
  amount: number;
  type: 'sale' | 'payment';
  description: string;
}

export interface Sale {
  id: string;
  date: string;
  total: number;
  payment_method: 'cash' | 'card' | 'upi' | 'credit';
  customer_id?: string;
  refunded: boolean;
  created_by?: string;
  created_at?: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  price: number;
  cost: number;
}

export interface Refund {
  id: string;
  sale_id: string;
  date: string;
  total: number;
  reason: string;
  created_by?: string;
  created_at?: string;
}

export interface RefundItem {
  id: string;
  refund_id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  price: number;
  cost: number;
}