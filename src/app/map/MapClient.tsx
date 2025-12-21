"use client";

import { useSearchParams } from "next/navigation";
import MapPage from "./MapPage";

export default function MapClient() {
  const sp = useSearchParams();

  const mode = sp.get("mode");   // "post" | "find" | null
  const login = sp.get("login"); // "1" | null

  return <MapPage mode={mode} login={login} />;
}
