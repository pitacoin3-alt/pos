export const DATABASE_SCHEMA = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUMs
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'cashier', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.credit_transaction_type AS ENUM ('sale', 'payment');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'upi', 'credit');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  cost NUMERIC NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  company TEXT,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create credit_customers table
CREATE TABLE IF NOT EXISTS public.credit_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  total_credit NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.credit_customers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type public.credit_transaction_type NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total NUMERIC NOT NULL,
  payment_method public.payment_method NOT NULL,
  customer_id UUID REFERENCES public.credit_customers(id),
  refunded BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  cost NUMERIC NOT NULL
);

-- Create refunds table
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id),
  total NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create refund_items table
CREATE TABLE IF NOT EXISTS public.refund_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  refund_id UUID NOT NULL REFERENCES public.refunds(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  cost NUMERIC NOT NULL
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  role public.app_role NOT NULL
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role public.app_role NOT NULL,
  page_path TEXT NOT NULL,
  can_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, page_path)
);

-- Create shop_settings table
CREATE TABLE IF NOT EXISTS public.shop_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'My Shop',
  logo TEXT,
  currency TEXT NOT NULL DEFAULT '₹',
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  printer_name TEXT,
  printer_width TEXT DEFAULT '80mm',
  auto_print BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, username)
  VALUES (new.id, new.email);
  
  -- Auto-assign role: first user gets admin, others get cashier
  IF NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'cashier');
  END IF;
  
  RETURN new;
END;
$$;

-- Create trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create update triggers
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_credit_customers_updated_at ON public.credit_customers;
CREATE TRIGGER update_credit_customers_updated_at
  BEFORE UPDATE ON public.credit_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_shop_settings_updated_at ON public.shop_settings;
CREATE TRIGGER update_shop_settings_updated_at
  BEFORE UPDATE ON public.shop_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON public.role_permissions;
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

-- Products policies
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and managers can manage products" ON public.products;
CREATE POLICY "Admins and managers can manage products" ON public.products FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Credit customers policies
DROP POLICY IF EXISTS "Anyone can view customers" ON public.credit_customers;
CREATE POLICY "Anyone can view customers" ON public.credit_customers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and managers can manage customers" ON public.credit_customers;
CREATE POLICY "Admins and managers can manage customers" ON public.credit_customers FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins can delete credit customers" ON public.credit_customers;
CREATE POLICY "Admins can delete credit customers" ON public.credit_customers FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Credit transactions policies
DROP POLICY IF EXISTS "Anyone can view transactions" ON public.credit_transactions;
CREATE POLICY "Anyone can view transactions" ON public.credit_transactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and managers can manage transactions" ON public.credit_transactions;
CREATE POLICY "Admins and managers can manage transactions" ON public.credit_transactions FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins can delete credit transactions" ON public.credit_transactions;
CREATE POLICY "Admins can delete credit transactions" ON public.credit_transactions FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Sales policies
DROP POLICY IF EXISTS "Anyone can view sales" ON public.sales;
CREATE POLICY "Anyone can view sales" ON public.sales FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins, managers, and cashiers can create sales" ON public.sales;
CREATE POLICY "Admins, managers, and cashiers can create sales" ON public.sales FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'cashier'));

DROP POLICY IF EXISTS "Admins and managers can update sales" ON public.sales;
CREATE POLICY "Admins and managers can update sales" ON public.sales FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins can delete sales" ON public.sales;
CREATE POLICY "Admins can delete sales" ON public.sales FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Sale items policies
DROP POLICY IF EXISTS "Anyone can view sale items" ON public.sale_items;
CREATE POLICY "Anyone can view sale items" ON public.sale_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone who can create sales can create items" ON public.sale_items;
CREATE POLICY "Anyone who can create sales can create items" ON public.sale_items FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'cashier'));

DROP POLICY IF EXISTS "Admins can delete sale items" ON public.sale_items;
CREATE POLICY "Admins can delete sale items" ON public.sale_items FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Refunds policies
DROP POLICY IF EXISTS "Anyone can view refunds" ON public.refunds;
CREATE POLICY "Anyone can view refunds" ON public.refunds FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and managers can create refunds" ON public.refunds;
CREATE POLICY "Admins and managers can create refunds" ON public.refunds FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins can delete refunds" ON public.refunds;
CREATE POLICY "Admins can delete refunds" ON public.refunds FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Refund items policies
DROP POLICY IF EXISTS "Anyone can view refund items" ON public.refund_items;
CREATE POLICY "Anyone can view refund items" ON public.refund_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone who can create refunds can create items" ON public.refund_items;
CREATE POLICY "Anyone who can create refunds can create items" ON public.refund_items FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins can delete refund items" ON public.refund_items;
CREATE POLICY "Admins can delete refund items" ON public.refund_items FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- User roles policies
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Role permissions policies
DROP POLICY IF EXISTS "Anyone can view role permissions" ON public.role_permissions;
CREATE POLICY "Anyone can view role permissions" ON public.role_permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage role permissions" ON public.role_permissions;
CREATE POLICY "Admins can manage role permissions" ON public.role_permissions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Shop settings policies
DROP POLICY IF EXISTS "Anyone can view settings" ON public.shop_settings;
CREATE POLICY "Anyone can view settings" ON public.shop_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and managers can manage settings" ON public.shop_settings;
CREATE POLICY "Admins and managers can manage settings" ON public.shop_settings FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Insert default shop settings if not exists
INSERT INTO public.shop_settings (name, currency, tax_rate)
SELECT 'My Shop', '₹', 0
WHERE NOT EXISTS (SELECT 1 FROM public.shop_settings LIMIT 1);

-- Insert default role permissions
INSERT INTO public.role_permissions (role, page_path, can_access) VALUES
  ('admin', '/dashboard', true),
  ('admin', '/pos', true),
  ('admin', '/products', true),
  ('admin', '/sales', true),
  ('admin', '/credit-customers', true),
  ('admin', '/refund', true),
  ('admin', '/refunds', true),
  ('admin', '/profit-analysis', true),
  ('admin', '/settings', true),
  ('manager', '/dashboard', true),
  ('manager', '/pos', true),
  ('manager', '/products', true),
  ('manager', '/sales', true),
  ('manager', '/credit-customers', true),
  ('manager', '/refund', true),
  ('manager', '/refunds', true),
  ('manager', '/profit-analysis', true),
  ('manager', '/settings', true),
  ('cashier', '/dashboard', true),
  ('cashier', '/pos', true),
  ('cashier', '/products', false),
  ('cashier', '/sales', true),
  ('cashier', '/credit-customers', true),
  ('cashier', '/refund', false),
  ('cashier', '/refunds', false),
  ('cashier', '/profit-analysis', false),
  ('cashier', '/settings', false),
  ('viewer', '/dashboard', true),
  ('viewer', '/pos', false),
  ('viewer', '/products', true),
  ('viewer', '/sales', true),
  ('viewer', '/credit-customers', false),
  ('viewer', '/refund', false),
  ('viewer', '/refunds', false),
  ('viewer', '/profit-analysis', false),
  ('viewer', '/settings', false)
ON CONFLICT (role, page_path) DO NOTHING;

-- Schema functions for database schema page
CREATE OR REPLACE FUNCTION public.get_tables_info()
RETURNS TABLE(table_name text, column_name text, data_type text, is_nullable text, column_default text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.table_name::text,
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
  ORDER BY c.table_name, c.ordinal_position;
$$;

CREATE OR REPLACE FUNCTION public.get_rls_policies()
RETURNS TABLE(table_name text, policy_name text, command text, permissive text, roles text[], using_expression text, with_check_expression text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    schemaname || '.' || tablename as table_name,
    policyname as policy_name,
    cmd as command,
    permissive,
    roles,
    qual as using_expression,
    with_check as with_check_expression
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
$$;

CREATE OR REPLACE FUNCTION public.get_db_functions()
RETURNS TABLE(function_name text, arguments text, return_type text, function_definition text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.proname::text as function_name,
    pg_get_function_arguments(p.oid)::text as arguments,
    pg_get_function_result(p.oid)::text as return_type,
    pg_get_functiondef(p.oid)::text as function_definition
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
  ORDER BY p.proname;
$$;
`;
