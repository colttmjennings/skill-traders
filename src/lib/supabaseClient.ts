import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 🔍 TEMP DEBUG: expose supabase to browser console
// This is safe for debugging and can be removed later
if (typeof window !== "undefined") {
  (window as any).supabase = supabase;
}
