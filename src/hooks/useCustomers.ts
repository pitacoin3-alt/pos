import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CreditCustomer, CreditTransaction } from '@/types/database';

export const useCustomers = () => {
  const [customers, setCustomers] = useState<(CreditCustomer & { transactions: CreditTransaction[] })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data: customersData, error } = await supabase
      .from('credit_customers')
      .select(`
        *,
        credit_transactions (*)
      `)
      .order('name');

    if (!error && customersData) {
      setCustomers(customersData.map(customer => ({
        ...customer,
        transactions: customer.credit_transactions || []
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const addCustomer = async (customer: Omit<CreditCustomer, 'id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase
      .from('credit_customers')
      .insert([customer]);

    if (!error) {
      await fetchCustomers();
    }
    return { error };
  };

  const updateCustomer = async (id: string, updates: Partial<CreditCustomer>) => {
    const { error } = await supabase
      .from('credit_customers')
      .update(updates)
      .eq('id', id);

    if (!error) {
      await fetchCustomers();
    }
    return { error };
  };

  const addTransaction = async (transaction: Omit<CreditTransaction, 'id'>) => {
    const { error } = await supabase
      .from('credit_transactions')
      .insert([transaction]);

    if (!error) {
      await fetchCustomers();
    }
    return { error };
  };

  const deleteCustomer = async (id: string) => {
    const { error } = await supabase
      .from('credit_customers')
      .delete()
      .eq('id', id);

    if (!error) {
      await fetchCustomers();
    }
    return { error };
  };

  return { customers, loading, addCustomer, updateCustomer, addTransaction, deleteCustomer, refetch: fetchCustomers };
};