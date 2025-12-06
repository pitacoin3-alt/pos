-- Add DELETE policies for data reset functionality

-- Allow admins to delete sales
CREATE POLICY "Admins can delete sales" 
ON public.sales 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete sale_items
CREATE POLICY "Admins can delete sale items" 
ON public.sale_items 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete refunds
CREATE POLICY "Admins can delete refunds" 
ON public.refunds 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete refund_items
CREATE POLICY "Admins can delete refund items" 
ON public.refund_items 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete credit_transactions
CREATE POLICY "Admins can delete credit transactions" 
ON public.credit_transactions 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete credit_customers
CREATE POLICY "Admins can delete credit customers" 
ON public.credit_customers 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete products
CREATE POLICY "Admins can delete products" 
ON public.products 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));