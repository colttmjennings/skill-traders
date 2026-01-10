"use client";

import Map from "@/components/Map";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";


export default function MapPage({
  mode,
  login,
}: {
  mode?: string | null;
  login?: string | null;
}) {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [sessionLabel, setSessionLabel] = useState<string | null>(null);
  const [sessionAvatarUrl, setSessionAvatarUrl] = useState<string | null>(null);

useEffect(() => {
  let alive = true;

  const hydrate = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user ?? null;

      if (!alive) return;

      if (!user) {
        setSessionEmail(null);
        setSessionLabel(null);
        setSessionAvatarUrl(null);
        return;
      }

      // Only used as UI toggle in your header
      setSessionEmail("logged-in");

      // Pull profile info (adjust column names if yours differ)
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!alive) return;

      const label =
        profile?.username ? `@${profile.username}` : (user.email ?? "Signed in");

      setSessionLabel(label);
      setSessionAvatarUrl(profile?.avatar_url ?? null);
    } catch (e) {
      // If anything fails, just fall back to logged-out UI
      setSessionEmail(null);
      setSessionLabel(null);
      setSessionAvatarUrl(null);
    }
  };

  // Initial load
  hydrate();

  // Keep it updated if auth changes
  const { data: sub } = supabase.auth.onAuthStateChange(() => {
    hydrate();
  });

  return () => {
    alive = false;
    sub?.subscription?.unsubscribe();
  };
}, []);




 async function logout() {
  // 1) Update UI immediately
  setSessionEmail(null);
  setSessionLabel(null);
  setSessionAvatarUrl(null);

  try {
    // 2) Sign out from Supabase (client)
    await supabase.auth.signOut();

    // 3) Clear any leftover Supabase keys (belt + suspenders)
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith("sb-")) localStorage.removeItem(k);
      }
      for (const k of Object.keys(sessionStorage)) {
        if (k.startsWith("sb-")) sessionStorage.removeItem(k);
      }
    } catch {}
  } finally {
    // 4) Hard reload to a clean state
    window.location.replace("/map?loggedout=1&ts=" + Date.now());
  }
}




  return (
    <div className="capacitor-safe-top" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* TOP BAR */}
      <header
        style={{
          minHeight: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px 0 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          fontFamily: "system-ui",
          fontWeight: 900,
          background: "#0b1220",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
  <img
  src="/logo.png"
  alt="Skill Traders"
  style={{
    height: 32,
    width: 32,
    display: "block",
    objectFit: "contain",
    transform: "translateY(1px)",
  }}
/>

  <div
    style={{
      fontSize: 22,
      fontWeight: 900,
      letterSpacing: 0.4,
      color: "#22d3c5",
      lineHeight: 1,
    }}
  >
    Skill Traders
  </div>
</div>


        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {sessionEmail ? (
            <>
              <button
  onClick={() => {
    // Tell Map.tsx to switch the right panel to Profile view
    window.dispatchEvent(new Event("skilltraders:open-profile"));
  }}
  style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
  }}
  title="Open profile"
>
  {sessionAvatarUrl ? (
  <img
    src={sessionAvatarUrl}
    alt="avatar"
    style={{
      width: 26,
      height: 26,
      borderRadius: 999,
      objectFit: "cover",
      border: "1px solid rgba(255,255,255,0.20)",
      flexShrink: 0,
    }}
  />
) : (
  <div
    style={{
      width: 26,
      height: 26,
      borderRadius: 999,
      background: "rgba(255,255,255,0.14)",
      border: "1px solid rgba(255,255,255,0.18)",
      flexShrink: 0,
    }}
  />
)}

  <div style={{ fontSize: 13, opacity: 0.9, textAlign: "left" }}>
    <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 800 }}>Signed in</div>
    <div style={{ fontSize: 13, fontWeight: 900, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {sessionLabel ?? "@loading"}

    </div>
  </div>
</button>


              <button
                onClick={logout}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                window.location.href = "/map?login=1";
              }}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#22c55e",
                color: "#06101a",
                fontWeight: 900,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Log in
            </button>
          )}
        </div>
      </header>

      {/* MAP BODY */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Map mode={mode ?? null} login={login ?? null} />
      </div>
    </div>
  );
}
