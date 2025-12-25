import Link from "next/link";

export default function Page() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(1200px 600px at 20% 10%, rgba(27,191,138,0.18), transparent 60%), radial-gradient(900px 500px at 90% 30%, rgba(59,130,246,0.14), transparent 55%), #070b14",
        color: "white",
        fontFamily: "system-ui",
      }}
    >
            {/* Top bar */}
<div
  style={{
    padding: "16px 26px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  }}
>
  {/* Left side: logo + title */}
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <img
      src="/logo.png"
      alt="Skill Traders"
      style={{
        height: 38,
        width: 38,
        display: "block",
        objectFit: "contain",
        transform: "translateY(1px)", // tiny visual nudge, optional
      }}
    />

    <div
      style={{
        fontSize: 24,
        fontWeight: 950,
        letterSpacing: 0.4,
        color: "#22d3c5",
        lineHeight: 1,
      }}
    >
      Skill Traders
    </div>

    <div
      style={{
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        opacity: 0.65,
        marginLeft: 2,
      }}
    >
      Beta
    </div>
  </div>

  {/* Right side */}
  <div style={{ fontSize: 12, opacity: 0.55, fontWeight: 800 }}>
    Trade skills locally
  </div>
</div>


      {/* Center content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 18,
        }}
      >
        <div
          style={{
            width: "min(980px, 100%)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 24,
            background: "rgba(15,28,46,0.55)",
            boxShadow: "0 22px 70px rgba(0,0,0,0.60)",
            padding: 34,
          }}
        >
          {/* Headline with emphasis */}
          <h1
            style={{
              fontSize: 50,
              fontWeight: 950,
              lineHeight: 1.05,
              margin: 0,
              letterSpacing: -0.4,
            }}
          >
            No{" "}
<span
  style={{
    opacity: 0.65,
    fontWeight: 800,
  }}
>
  cash
</span>
.
<br />
Just{" "}
<span
  style={{
    color: "#22c55e",
    fontWeight: 950,
  }}
>
  value
</span>
.

          </h1>

          <div style={{ marginTop: 18, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
  <Link href="/map?login=1" style={{ textDecoration: "none" }}>
    <button
      type="button"
      style={{
        padding: "16px 24px",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "#22c55e",
        color: "#06101a",
        fontWeight: 950,
        fontSize: 18,
        cursor: "pointer",
        boxShadow: "0 12px 34px rgba(0,0,0,0.38)",
      }}
    >
      Log in
    </button>
  </Link>

  <Link href="/map?login=1&auth=signup" style={{ textDecoration: "none" }}>
    <button
      type="button"
      style={{
        padding: "16px 24px",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.08)",
        color: "#22d3c5",
        fontWeight: 900,
        fontSize: 18,
        cursor: "pointer",
      }}
    >
      Sign up
    </button>
  </Link>
</div>




          {/* Post / Find — green text, muted background */}
          <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/map?mode=post" style={{ textDecoration: "none" }}>
              <button
                style={{
                  padding: "14px 20px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.08)",
                  color: "#22c55e",
                  fontWeight: 900,
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                Post a Skill
              </button>
            </Link>

            <Link href="/map?mode=find" style={{ textDecoration: "none" }}>
              <button
                style={{
                  padding: "14px 20px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.08)",
                  color: "#22c55e",
                  fontWeight: 900,
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                Find a Skill Near Me
              </button>
            </Link>
          </div>

          {/* Explainer */}
          <div style={{ marginTop: 18, opacity: 0.92, fontSize: 16, lineHeight: 1.7 }}>
            Post what you can offer, request what you need, and connect with people nearby.
            <br />
            <span style={{ opacity: 0.78 }}>
              Skill Traders does not handle payments — you choose the terms.
            </span>
          </div>

          {/* Info blocks */}
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 18,
                padding: 16,
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <div style={{ fontWeight: 750, marginBottom: 10, fontSize: 16 }}>
                Examples of real trades
              </div>
              <div style={{ fontSize: 16, opacity: 0.92, lineHeight: 1.75 }}>
                • Yard work ↔ website help
                <br />
                • Babysitting ↔ car detailing
                <br />
                • Excel help ↔ resume review
              </div>
            </div>

            <div
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 18,
                padding: 16,
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <div style={{ fontWeight: 750, marginBottom: 10, fontSize: 16 }}>
                Safety & control
              </div>
              <div style={{ fontSize: 16, opacity: 0.92, lineHeight: 1.75 }}>
                • Skill Traders does not handle payments
                <br />
                • Meet safely in public spaces
                <br />
                • You’re in control of who you trade with
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, fontSize: 14, opacity: 0.7 }}>
            Your feedback helps.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: 14, opacity: 0.6, fontSize: 12 }}>
        © {new Date().getFullYear()} Skill Traders
      </div>
    </div>
  );
}
