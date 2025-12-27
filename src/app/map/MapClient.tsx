"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import MapPage from "./MapPage";
import { ensureSupabaseHealthy } from "@/lib/supabaseGuard";

export default function MapClient() {
  const sp = useSearchParams();

  const mode = sp.get("mode");   // "post" | "find" | null
  const login = sp.get("login"); // "1" | null

  useEffect(() => {
    ensureSupabaseHealthy({ timeoutMs: 3000 });
  }, []);

  return <MapPage mode={mode} login={login} />;
}
