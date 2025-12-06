-- Step 1: Insert admin role for the existing user
INSERT INTO public.user_roles (user_id, role)
VALUES ('8b6aecdc-6ad7-4beb-92ce-573121377ff9', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 2: Update the handle_new_user trigger to auto-assign roles
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