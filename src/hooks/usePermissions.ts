import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type RolePermission = {
  id: string;
  role: 'admin' | 'manager' | 'cashier' | 'viewer';
  page_path: string;
  can_access: boolean;
  created_at: string;
  updated_at: string;
};

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .order('role', { ascending: true })
      .order('page_path', { ascending: true });

    if (!error && data) {
      setPermissions(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const updatePermission = async (role: 'admin' | 'manager' | 'cashier' | 'viewer', page_path: string, can_access: boolean) => {
    const { error } = await supabase
      .from('role_permissions')
      .update({ can_access })
      .eq('role', role)
      .eq('page_path', page_path);

    if (!error) {
      await fetchPermissions();
    }
    return { error };
  };

  const hasAccess = (userRole: string | undefined, path: string): boolean => {
    if (!userRole) return false;
    
    // Admin always has access
    if (userRole === 'admin') return true;

    const permission = permissions.find(
      p => p.role === userRole && p.page_path === path
    );
    
    return permission?.can_access ?? false;
  };

  return { 
    permissions, 
    loading, 
    updatePermission, 
    hasAccess,
    refetch: fetchPermissions 
  };
};
