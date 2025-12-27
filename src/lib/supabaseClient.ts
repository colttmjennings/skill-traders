"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create the client ONLY in the browser runtime
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // keep true because you use /auth/reset hash handling
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

// DevTools debug handle
if (typeof window !== "undefined") {
  (window as any).__supabase = supabase;
}
