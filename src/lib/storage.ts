// Type definitions for POS system (now using Supabase)

export interface ShopSettings {
  name: string;
  logo?: string;
  currency: string;
  tax_rate: number;
  printer_name?: string;
  printer_width?: string;
  auto_print?: boolean;
}

// Utility function to format settings from database format to app format
export const formatSettings = (dbSettings: any): ShopSettings => {
  return {
    name: dbSettings.name,
    logo: dbSettings.logo,
    currency: dbSettings.currency,
    tax_rate: dbSettings.tax_rate,
    printer_name: dbSettings.printer_name,
    printer_width: dbSettings.printer_width,
    auto_print: dbSettings.auto_print,
  };
};