-- Create table for role permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  page_path text NOT NULL,
  can_access boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(role, page_path)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view permissions
CREATE POLICY "Anyone can view role permissions"
ON public.role_permissions
FOR SELECT
USING (true);

-- Only admins can manage permissions
CREATE POLICY "Admins can manage role permissions"
ON public.role_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default permissions for all roles
INSERT INTO public.role_permissions (role, page_path, can_access) VALUES
  -- Admin has access to everything
  ('admin', '/dashboard', true),
  ('admin', '/pos', true),
  ('admin', '/products', true),
  ('admin', '/sales', true),
  ('admin', '/credit-customers', true),
  ('admin', '/refund', true),
  ('admin', '/refunds', true),
  ('admin', '/profit-analysis', true),
  ('admin', '/settings', true),
  
  -- Manager permissions
  ('manager', '/dashboard', true),
  ('manager', '/pos', true),
  ('manager', '/products', true),
  ('manager', '/sales', true),
  ('manager', '/credit-customers', true),
  ('manager', '/refund', true),
  ('manager', '/refunds', true),
  ('manager', '/profit-analysis', true),
  ('manager', '/settings', false),
  
  -- Cashier permissions
  ('cashier', '/dashboard', true),
  ('cashier', '/pos', true),
  ('cashier', '/products', false),
  ('cashier', '/sales', true),
  ('cashier', '/credit-customers', true),
  ('cashier', '/refund', false),
  ('cashier', '/refunds', false),
  ('cashier', '/profit-analysis', false),
  ('cashier', '/settings', false),
  
  -- Viewer permissions
  ('viewer', '/dashboard', true),
  ('viewer', '/pos', false),
  ('viewer', '/products', false),
  ('viewer', '/sales', true),
  ('viewer', '/credit-customers', false),
  ('viewer', '/refund', false),
  ('viewer', '/refunds', false),
  ('viewer', '/profit-analysis', true),
  ('viewer', '/settings', false)
ON CONFLICT (role, page_path) DO NOTHING;