"use client";

import Map from "@/components/Map";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";


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
  const hydrateSeq = useRef(0);

useEffect(() => {
  let mounted = true;

  const hydrate = async (session: any | null) => {
    const seq = ++hydrateSeq.current;

    const email = session?.user?.email ?? null;
    const userId = session?.user?.id ?? null;

    if (!mounted) return;

    setSessionEmail(email);

    if (!userId) {
      setSessionLabel(null);
      setSessionAvatarUrl(null);
      return;
    }

    // show loading immediately
    setSessionLabel("@loading");
    setSessionAvatarUrl(null);

    // fail-safe: never allow @loading to stick forever
    const stuckTimer = window.setTimeout(() => {
      if (!mounted) return;
      if (seq !== hydrateSeq.current) return;
      setSessionLabel((prev) => (prev === "@loading" ? "@unknown" : prev));
    }, 2500);

    try {
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (!mounted || seq !== hydrateSeq.current) return;

      const u = prof?.username ? `@${prof.username}` : null;
      setSessionLabel(u ?? "@unknown");
      setSessionAvatarUrl(prof?.avatar_url ?? null);

      if (error) console.warn("[MapPage] profile load error:", error.message);
    } catch (e: any) {
      if (!mounted || seq !== hydrateSeq.current) return;
      console.warn("[MapPage] profile load crash:", e?.message ?? e);
      setSessionLabel("@unknown");
      setSessionAvatarUrl(null);
    } finally {
      window.clearTimeout(stuckTimer);
    }
  };

  supabase.auth.getSession().then(({ data }) => hydrate(data.session ?? null));

  const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
    hydrate(session ?? null);
  });

  return () => {
    mounted = false;
    authListener.subscription.unsubscribe();
  };
}, []);


  async function logout() {
  // instantly update UI so it feels responsive
  setSessionEmail(null);
  setSessionLabel(null);
  setSessionAvatarUrl(null);

  // clear client session
  await supabase.auth.signOut();

  // clear server cookie session (this is the real fix for WEBSITE)
  await fetch("/auth/signout", { method: "POST", credentials: "include" });

  // hard navigate
  window.location.assign("/map?loggedout=1");
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
