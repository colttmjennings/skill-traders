"use client";

import Map from "@/components/Map";

type Props = {
  mode?: string | null;
  login?: string | null;
};

export default function MapShell({ mode, login }: Props) {
  return (
    <div style={{ height: "100vh" }}>
      <Map />
    </div>
  );
}
