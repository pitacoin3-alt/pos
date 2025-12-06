import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type DataType = 'products' | 'sales' | 'refunds' | 'credit_customers';

export const useResetData = () => {
  const [isResetting, setIsResetting] = useState(false);

  const resetProducts = async () => {
    // First delete sale_items and refund_items that reference products
    await supabase.from('refund_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('sale_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Then delete products
    const { error } = await supabase
      .from('products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    return { error };
  };

  const resetSales = async () => {
    // Delete refund_items first (references refunds)
    await supabase.from('refund_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Delete refunds (references sales)
    await supabase.from('refunds').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Delete sale_items (references sales)
    const { error: itemsError } = await supabase
      .from('sale_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (itemsError) return { error: itemsError };

    // Then delete sales
    const { error: salesError } = await supabase
      .from('sales')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    return { error: salesError };
  };

  const resetRefunds = async () => {
    // Delete refund_items first (foreign key constraint)
    const { error: itemsError } = await supabase
      .from('refund_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (itemsError) return { error: itemsError };

    // Then delete refunds
    const { error: refundsError } = await supabase
      .from('refunds')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    return { error: refundsError };
  };

  const resetCreditCustomers = async () => {
    // Delete credit_transactions first (foreign key constraint)
    const { error: transactionsError } = await supabase
      .from('credit_transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (transactionsError) return { error: transactionsError };

    // Then delete credit_customers
    const { error: customersError } = await supabase
      .from('credit_customers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    return { error: customersError };
  };

  const resetSelectedData = async (dataTypes: DataType[]) => {
    setIsResetting(true);
    
    try {
      // Reset in correct order to handle foreign keys
      // Order: refunds -> sales -> credit_customers -> products
      
      if (dataTypes.includes('refunds')) {
        const result = await resetRefunds();
        if (result?.error) throw result.error;
      }
      
      if (dataTypes.includes('sales')) {
        const result = await resetSales();
        if (result?.error) throw result.error;
      }
      
      if (dataTypes.includes('credit_customers')) {
        const result = await resetCreditCustomers();
        if (result?.error) throw result.error;
      }
      
      if (dataTypes.includes('products')) {
        const result = await resetProducts();
        if (result?.error) throw result.error;
      }
      
      return { error: null };
    } catch (error: any) {
      return { error };
    } finally {
      setIsResetting(false);
    }
  };

  const resetAllData = async () => {
    setIsResetting(true);
    
    try {
      // Delete in correct order for foreign key constraints
      // 1. refund_items (references refunds, products)
      await supabase.from('refund_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // 2. refunds (references sales)
      await supabase.from('refunds').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // 3. sale_items (references sales, products)
      await supabase.from('sale_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // 4. sales (references credit_customers)
      await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // 5. credit_transactions (references credit_customers)
      await supabase.from('credit_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // 6. credit_customers
      await supabase.from('credit_customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // 7. products (last, as it's referenced by sale_items and refund_items)
      const { error } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      return { error };
    } catch (error: any) {
      return { error };
    } finally {
      setIsResetting(false);
    }
  };

  return {
    isResetting,
    resetSelectedData,
    resetAllData,
  };
};
