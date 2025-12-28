"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [status, setStatus] = useState<string>("Checking reset link...");
  const [ready, setReady] = useState(false);

 useEffect(() => {
  let cancelled = false;

  async function run() {
    try {
      // 1) PKCE reset links look like: /auth/reset?code=XXXX
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;

        // Clean URL (optional, avoids re-consuming code)
        window.history.replaceState({}, "", url.pathname);
      } else {
        // 2) Hash reset links look like: /auth/reset#access_token=...&refresh_token=...&type=recovery
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : "";

        if (hash) {
          const params = new URLSearchParams(hash);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          const type = params.get("type");

          if (type === "recovery" && access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (error) throw error;

            // Clean URL (optional)
            window.history.replaceState({}, "", window.location.pathname);
          }
        }
      }

      // Now that we consumed the link, a session should exist (if link is valid)
      const { data } = await supabase.auth.getSession();

      if (cancelled) return;

      if (data.session) {
        setStatus("Enter a new password.");
        setReady(true);
      } else {
        setStatus("Reset link is invalid or expired. Please request a new password reset.");
        setReady(false);
      }
    } catch (e: any) {
      console.error("Reset link handling failed:", e?.message ?? e);
      if (cancelled) return;
      setStatus("Reset link is invalid or expired. Please request a new password reset.");
      setReady(false);
    }
  }

  run();

  return () => {
    cancelled = true;
  };
}, []);


  async function updatePassword() {
    if (!pw1 || pw1.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    if (pw1 !== pw2) {
      alert("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: pw1 });
    if (error) {
      alert(error.message);
      return;
    }

    setStatus("Password updated. Redirecting to map...");
    setTimeout(() => {
      window.location.href = "/map?login=1";
    }, 600);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#071018",
        color: "rgba(255,255,255,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          background: "#0b1220",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          padding: 18,
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>
          Reset password
        </div>

        <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 14 }}>
          {status}
        </div>

        {ready && (
          <>
            <label style={{ fontSize: 13, opacity: 0.85 }}>New password</label>
            <input
              type="password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              placeholder="New password"
              style={{
                width: "100%",
                padding: 11,
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.92)",
                border: "1px solid rgba(255,255,255,0.12)",
                fontSize: 14,
                fontWeight: 600,
                outline: "none",
                marginTop: 6,
                marginBottom: 12,
              }}
            />

            <label style={{ fontSize: 13, opacity: 0.85 }}>Confirm new password</label>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Confirm new password"
              style={{
                width: "100%",
                padding: 11,
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.92)",
                border: "1px solid rgba(255,255,255,0.12)",
                fontSize: 14,
                fontWeight: 600,
                outline: "none",
                marginTop: 6,
                marginBottom: 14,
              }}
            />

            <button
              onClick={updatePassword}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                background: "#1bbf8a",
                color: "#06101a",
                border: "1px solid rgba(255,255,255,0.10)",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Update password
            </button>
          </>
        )}
      </div>
    </div>
  );
}
