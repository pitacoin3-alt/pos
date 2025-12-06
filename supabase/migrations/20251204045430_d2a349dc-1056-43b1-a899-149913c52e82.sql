-- Function to get tables info
CREATE OR REPLACE FUNCTION public.get_tables_info()
RETURNS TABLE (
  table_name text,
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
)
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

-- Function to get RLS policies
CREATE OR REPLACE FUNCTION public.get_rls_policies()
RETURNS TABLE (
  table_name text,
  policy_name text,
  command text,
  permissive text,
  roles text[],
  using_expression text,
  with_check_expression text
)
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

-- Function to get database functions
CREATE OR REPLACE FUNCTION public.get_db_functions()
RETURNS TABLE (
  function_name text,
  arguments text,
  return_type text,
  function_definition text
)
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