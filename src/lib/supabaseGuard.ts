"use client";

import { supabase } from "./supabaseClient";

/**
 * If supabase-js hangs due to corrupted localStorage/session state,
 * automatically reset ONLY the supabase auth storage for this project.
 * This prevents "stuck loading" for returning users.
 */
export async function ensureSupabaseHealthy(opts?: { timeoutMs?: number }) {
  const timeoutMs = opts?.timeoutMs ?? 3000;

  // Run only once per page load (prevents reload loops)
  if (sessionStorage.getItem("st_supabase_health_checked") === "1") return;
  sessionStorage.setItem("st_supabase_health_checked", "1");

  // Helper: run an async function with a timeout
  const runWithTimeout = async <T,>(fn: () => Promise<T>) => {
    return await Promise.race<T>([
      fn(),
      new Promise<T>((_, reject) =>
        window.setTimeout(() => reject(new Error("SUPABASE_TIMEOUT")), timeoutMs)
      ),
    ]);
  };

  // 1) Quick auth check
  try {
    await runWithTimeout(() => supabase.auth.getSession());
  } catch {
    await hardResetSupabaseAuth();
    return;
  }

  // 2) Quick data check (tiny read)
  try {
    await runWithTimeout(async () => {
      const { error } = await supabase.from("trades").select("id").limit(1);
      if (error) throw error;
      return true;
    });
  } catch {
    await hardResetSupabaseAuth();
    return;
  }
}

async function hardResetSupabaseAuth() {
  // Only attempt reset once per page load
  if (sessionStorage.getItem("st_supabase_reset") === "1") return;
  sessionStorage.setItem("st_supabase_reset", "1");

  // Try a clean sign out first
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }

  // Remove ONLY supabase keys for this project
  try {
    const prefix = "sb-ptprzorwimjqnxzadvth-"; // your project ref
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }

  // Reload once to re-init cleanly
  window.location.reload();
}
