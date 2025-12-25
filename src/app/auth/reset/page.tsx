"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [status, setStatus] = useState<string>("Checking reset link...");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase recovery links typically include tokens in the URL hash.
    // We just verify there's *some* auth context before allowing update.
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setStatus("Enter a new password.");
        setReady(true);
        return;
      }

      // If session isn't present yet, give it a moment (some browsers delay hash parsing)
      setTimeout(async () => {
        const { data: data2 } = await supabase.auth.getSession();
        if (data2.session) {
          setStatus("Enter a new password.");
          setReady(true);
        } else {
          setStatus("Reset link is invalid or expired. Please request a new password reset.");
          setReady(false);
        }
      }, 300);
    })();
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
