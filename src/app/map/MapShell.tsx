"use client";

import Map from "@/components/Map";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  mode?: string | null;
  login?: string | null;
};

export default function MapShell({ mode, login }: Props) {
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

    // logged out
    if (!userId) {
      setSessionLabel(null);
      setSessionAvatarUrl(null);
      return;
    }

    // show loading label (never email)
    setSessionLabel((prev) => (prev && prev.startsWith("@") ? prev : "@loading"));
    setSessionAvatarUrl(null);

    const { data: prof, error } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", userId)
      .single();

    if (!mounted || seq !== hydrateSeq.current) return;

    const u = prof?.username ? `@${prof.username}` : null;

    setSessionLabel((prev) => {
      if (u) return u;
      if (prev && prev.startsWith("@") && prev !== "@loading") return prev;
      return "@unknown";
    });

    setSessionAvatarUrl(prof?.avatar_url ?? null);

    if (error) console.warn("[MapShell] profile load error:", error.message);
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
  await supabase.auth.signOut();
  setSessionEmail(null);
  setSessionLabel(null);
  setSessionAvatarUrl(null);
}

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* TOP BAR (this is what you keep losing) */}
      <header
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          fontFamily: "system-ui",
          fontWeight: 900,
          background: "#0b1220",
          color: "white",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div style={{ fontWeight: 900 }}>Skill Traders</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {sessionEmail ? (
            <>
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                <span style={{ opacity: 0.8 }}>Signed in:</span>{" "}
                <span style={{ fontWeight: 800 }}>{sessionLabel ?? ""}</span>
              </div>

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
                background: "#1bbf8a",
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

      {/* MAP AREA */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Map />
      </div>
    </div>
  );
}
