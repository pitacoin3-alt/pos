import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Refund, RefundItem } from '@/types/database';

export const useRefunds = () => {
  const [refunds, setRefunds] = useState<(Refund & { items: RefundItem[] })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRefunds = async () => {
    setLoading(true);
    const { data: refundsData, error } = await supabase
      .from('refunds')
      .select(`
        *,
        refund_items (*)
      `)
      .order('date', { ascending: false });

    if (!error && refundsData) {
      setRefunds(refundsData.map(refund => ({
        ...refund,
        items: refund.refund_items || []
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const createRefund = async (
    refund: Omit<Refund, 'id' | 'created_at'>,
    items: Omit<RefundItem, 'id' | 'refund_id'>[]
  ) => {
    const { data: refundData, error: refundError } = await supabase
      .from('refunds')
      .insert([refund])
      .select()
      .single();

    if (refundError || !refundData) {
      return { error: refundError };
    }

    const itemsWithRefundId = items.map(item => ({
      ...item,
      refund_id: refundData.id
    }));

    const { error: itemsError } = await supabase
      .from('refund_items')
      .insert(itemsWithRefundId);

    if (!itemsError) {
      await fetchRefunds();
    }
    return { error: itemsError };
  };

  return { refunds, loading, createRefund, refetch: fetchRefunds };
};