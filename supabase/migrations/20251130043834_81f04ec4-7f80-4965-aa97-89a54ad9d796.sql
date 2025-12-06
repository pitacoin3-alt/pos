-- Fix 1: Update user role from manager to admin
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = '8b6aecdc-6ad7-4beb-92ce-573121377ff9';

-- Fix 2: Update shop_settings RLS policy to allow managers as well
DROP POLICY IF EXISTS "Admins can manage settings" ON public.shop_settings;

CREATE POLICY "Admins and managers can manage settings"
ON public.shop_settings
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);