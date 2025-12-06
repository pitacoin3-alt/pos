-- Add permissions for the new database-schema page
INSERT INTO public.role_permissions (role, page_path, can_access)
VALUES 
  ('admin', '/database-schema', true),
  ('manager', '/database-schema', false),
  ('cashier', '/database-schema', false),
  ('viewer', '/database-schema', false)
ON CONFLICT DO NOTHING;