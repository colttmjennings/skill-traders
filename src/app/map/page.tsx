"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: 16, color: "white" }}>Loading…</div>
  ),
});

export default function MapRoutePage() {
  return (
    <Suspense fallback={<div style={{ padding: 16, color: "white" }}>Loading…</div>}>
      <MapClient />
    </Suspense>
  );
}
