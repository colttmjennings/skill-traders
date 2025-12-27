"use client";

import { useSearchParams } from "next/navigation";
import MapPage from "./MapPage";
import { useEffect } from "react";
import { ensureSupabaseHealthy } from "@/lib/supabaseGuard";

useEffect(() => {
  ensureSupabaseHealthy({ timeoutMs: 3000 });
}, []);

export default function MapClient() {
  const sp = useSearchParams();

  const mode = sp.get("mode");   // "post" | "find" | null
  const login = sp.get("login"); // "1" | null

  return <MapPage mode={mode} login={login} />;
}
