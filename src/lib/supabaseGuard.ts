"use client";

import { supabase } from "./supabaseClient";

/**
 * If supabase-js hangs due to corrupted localStorage/session state,
 * automatically reset ONLY the supabase auth storage for this project.
 * This prevents "stuck loading" for returning users.
 */
export async function ensureSupabaseHealthy(opts?: { timeoutMs?: number }) {
    return;

  const timeoutMs = opts?.timeoutMs ?? 12000;

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
let sessionUser: any = null;
try {
  const { data } = await runWithTimeout(() => supabase.auth.getSession());
  sessionUser = data?.session?.user ?? null;

  // If the user is not logged in, do NOT reset anything.
  // Being logged out is a valid state.
  if (!sessionUser) return;
} catch {
  console.warn("Supabase health check failed; NOT resetting auth.");
return;

}


    // 2) Quick data check (tiny read)
  // IMPORTANT: do NOT hard-reset auth just because a table read fails (RLS/permissions/network blips).
  // This guard is ONLY to recover from "stuck/hanging" states.
  try {
    await runWithTimeout(async () => {
      await supabase.from("trades").select("id").limit(1);
      return true;
    });
    } catch (e: any) {
    console.warn("Supabase health check failed; NOT resetting auth.", e);
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
