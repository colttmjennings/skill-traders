"use client";

export default function AppLanding() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b1220",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        fontFamily: "system-ui",
        textAlign: "center",
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 900 }}>Skill Traders</h1>

      <p style={{ opacity: 0.85, maxWidth: 420 }}>
        Trade skills locally. No cash. Just value.
      </p>

      <button
        style={{
          width: "100%",
          maxWidth: 320,
          padding: 14,
          borderRadius: 14,
          border: "none",
          background: "#1bbf8a",
          color: "#06101a",
          fontWeight: 900,
          fontSize: 16,
          cursor: "pointer",
        }}
        onClick={() => (window.location.href = "/map")}
      >
        Find Skills Near Me
      </button>

      <button
        style={{
          width: "100%",
          maxWidth: 320,
          padding: 14,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "transparent",
          color: "white",
          fontWeight: 900,
          fontSize: 16,
          cursor: "pointer",
        }}
        onClick={() => (window.location.href = "/map?login=1")}
      >
        Log in / Sign up
      </button>
    </main>
  );
}
