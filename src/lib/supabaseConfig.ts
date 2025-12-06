const STORAGE_KEY = 'supabase_config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export const getSupabaseConfig = (): SupabaseConfig | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse Supabase config:', e);
  }
  return null;
};

export const setSupabaseConfig = (config: SupabaseConfig): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const clearSupabaseConfig = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const hasSupabaseConfig = (): boolean => {
  return getSupabaseConfig() !== null;
};
