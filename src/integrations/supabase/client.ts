// Dynamic Supabase client - uses localStorage config if available
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { getSupabaseConfig } from '@/lib/supabaseConfig';

// Default values from environment
const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const DEFAULT_SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Get config from localStorage or use defaults
const getConfig = () => {
  const storedConfig = getSupabaseConfig();
  if (storedConfig) {
    return {
      url: storedConfig.url,
      key: storedConfig.anonKey
    };
  }
  return {
    url: DEFAULT_SUPABASE_URL,
    key: DEFAULT_SUPABASE_KEY
  };
};

const config = getConfig();

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export let supabase: SupabaseClient<Database> = createClient<Database>(config.url, config.key, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Function to reinitialize client after config change
export const reinitializeSupabaseClient = () => {
  const newConfig = getConfig();
  supabase = createClient<Database>(newConfig.url, newConfig.key, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
  return supabase;
};

// Check if using custom config
export const isUsingCustomConfig = () => {
  return getSupabaseConfig() !== null;
};

// Get current Supabase URL
export const getCurrentSupabaseUrl = () => {
  const storedConfig = getSupabaseConfig();
  return storedConfig?.url || DEFAULT_SUPABASE_URL;
};