import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SaleItem } from '@/types/database';

export const useSales = () => {
  const [sales, setSales] = useState<(Sale & { items: SaleItem[] })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSales = async () => {
    setLoading(true);
    const { data: salesData, error } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items (*)
      `)
      .order('date', { ascending: false });

    if (!error && salesData) {
      setSales(salesData.map(sale => ({
        ...sale,
        items: sale.sale_items || []
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const createSale = async (
    sale: Omit<Sale, 'id' | 'created_at'>,
    items: Omit<SaleItem, 'id' | 'sale_id'>[]
  ) => {
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([sale])
      .select()
      .single();

    if (saleError || !saleData) {
      return { error: saleError };
    }

    const itemsWithSaleId = items.map(item => ({
      ...item,
      sale_id: saleData.id
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(itemsWithSaleId);

    if (!itemsError) {
      await fetchSales();
    }
    return { error: itemsError };
  };

  const updateSale = async (id: string, updates: Partial<Sale>) => {
    const { error } = await supabase
      .from('sales')
      .update(updates)
      .eq('id', id);

    if (!error) {
      await fetchSales();
    }
    return { error };
  };

  return { sales, loading, createSale, updateSale, refetch: fetchSales };
};