"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";


export default function AppLanding() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session ?? null;

      // If already signed in, skip landing page
      if (session?.user && mounted) {
        router.replace("/map");
        return;
      }

      if (mounted) setCheckingSession(false);
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (checkingSession)
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(900px 500px at 50% -120px, rgba(27,191,138,0.25), transparent 60%), #0b1220",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 22,
        fontFamily: "system-ui",
        opacity: 0.9,
      }}
    >
      Loading…
    </main>
  );


  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(900px 500px at 50% -120px, rgba(27,191,138,0.25), transparent 60%), #0b1220",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 22,
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 22,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <img
            src="/logo.png"
            alt="Skill Traders"
            style={{
              width: 56,
              height: 56,
              objectFit: "contain",
              filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.35))",
            }}
          />
        </div>

        {/* Title + tagline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 34,
              lineHeight: 1.05,
              fontWeight: 950,
              letterSpacing: -0.8,
              color: "#19c6c3",
            }}
          >
            Skill Traders
          </h1>

          <p
            style={{
              margin: 0,
              opacity: 0.85,
              fontSize: 15,
              lineHeight: 1.5,
              maxWidth: 360,
              fontWeight: 500,
            }}
          >
            Trade skills locally —{" "}
            <span style={{ color: "#1bbf8a", fontWeight: 900 }}>no cash</span>.{" "}
            Just value.
          </p>
        </div>

        {/* CTAs */}
<div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
  <button
    style={{
      width: "100%",
      padding: "14px 16px",
      borderRadius: 16,
      border: "none",
      background: "#1bbf8a",
      color: "#06101a",
      fontWeight: 950,
      fontSize: 16,
      cursor: "pointer",
      boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
    }}
    onClick={() => (window.location.href = "/map")}
  >
    Find Skills Near Me
  </button>

  <button
    style={{
      width: "100%",
      padding: "14px 16px",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.16)",
      background: "rgba(255,255,255,0.06)",
      color: "white",
      fontWeight: 900,
      fontSize: 16,
      cursor: "pointer",
    }}
    onClick={() => (window.location.href = "/map?login=1")}
  >
    Log in
  </button>

  <button
    style={{
      width: "100%",
      padding: "14px 16px",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.16)",
      background: "rgba(255,255,255,0.06)",
      color: "white",
      fontWeight: 900,
      fontSize: 16,
      cursor: "pointer",
    }}
    onClick={() => (window.location.href = "/map?login=1&auth=signup")}
  >
    Sign up
  </button>
</div>


        {/* Small trust/safety note */}
        <div
          style={{
            width: "100%",
            borderRadius: 16,
            padding: 12,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            textAlign: "left",
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 13, marginBottom: 6 }}>
            Quick notes
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
            • Skill Traders does not handle payments. You choose the terms. <br />
            • Meet safely in public spaces for first-time trades.
          </div>
        </div>
      </div>
    </main>
  );
}
