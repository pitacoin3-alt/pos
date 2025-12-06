import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShopSettings } from '@/lib/storage';

export const useSettings = () => {
  const [settings, setSettings] = useState<ShopSettings>({
    name: 'My Shop',
    currency: '₹',
    tax_rate: 0,
    printer_width: '80mm',
    auto_print: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('shop_settings')
      .select('*')
      .maybeSingle();

    if (!error && data) {
      setSettings({
        name: data.name,
        logo: data.logo,
        currency: data.currency,
        tax_rate: data.tax_rate,
        printer_name: data.printer_name,
        printer_width: data.printer_width,
        auto_print: data.auto_print,
      });
    }
    setLoading(false);
  };

  const updateSettings = async (newSettings: ShopSettings) => {
    // First get the existing settings id
    const { data: existingSettings } = await supabase
      .from('shop_settings')
      .select('id')
      .single();

    if (!existingSettings) {
      // If no settings exist, insert new row
      const { error } = await supabase
        .from('shop_settings')
        .insert({
          name: newSettings.name,
          logo: newSettings.logo,
          currency: newSettings.currency,
          tax_rate: newSettings.tax_rate,
          printer_name: newSettings.printer_name,
          printer_width: newSettings.printer_width,
          auto_print: newSettings.auto_print,
        });
      
      if (!error) {
        setSettings(newSettings);
      }
      return { error };
    }

    // Update existing settings
    const { error } = await supabase
      .from('shop_settings')
      .update({
        name: newSettings.name,
        logo: newSettings.logo,
        currency: newSettings.currency,
        tax_rate: newSettings.tax_rate,
        printer_name: newSettings.printer_name,
        printer_width: newSettings.printer_width,
        auto_print: newSettings.auto_print,
      })
      .eq('id', existingSettings.id);

    if (!error) {
      setSettings(newSettings);
    }
    return { error };
  };

  return { settings, loading, updateSettings, refetch: fetchSettings };
};