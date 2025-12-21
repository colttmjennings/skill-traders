import { Suspense } from "react";
import MapClient from "./MapClient";

export default function MapRoutePage() {
  return (
    <Suspense fallback={<div style={{ padding: 16, color: "white" }}>Loading…</div>}>
      <MapClient />
    </Suspense>
  );
}
