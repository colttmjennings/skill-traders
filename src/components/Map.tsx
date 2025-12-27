"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { supabase } from "@/lib/supabaseClient";

type Trade = {
  id: string;
  created_at?: string;
  type: "offer" | "request" | string;
  category: string;
  title: string;
  lng: number; // IMPORTANT: lng (not "i")
  lat: number;
  user_id?: string | null;
  status?: "active" | "completed";

};

const BRAND = {
  
  bgDark: "#0f1c2e",
  accent: "#1bbf8a",
  offer: "#1bbf8a",
  request: "#3b82f6",
  pinBorder: "#0b1220",
  popupBg: "#0f1c2e",
  popupText: "#e5e7eb",
};

const CATEGORY_OPTIONS = [
  "Labor",
  "Art or Craft",
  "Mechanic",
  "Media",
  "Design",
  "Tech",
  "Other",
] as const;

const UI = {
  panelBg: "#0b1220",
  panelBorder: "rgba(255,255,255,0.10)",
  cardBg: "rgba(255,255,255,0.04)",
  inputBg: "rgba(255,255,255,0.06)",
  inputBorder: "rgba(255,255,255,0.12)",
  text: "rgba(255,255,255,0.92)",
  muted: "rgba(255,255,255,0.72)",
  buttonBg: "#1bbf8a",
  buttonText: "#06101a",
  dangerBg: "#7f1d1d",
};

const TXT = {
  h: { fontSize: 13, fontWeight: 600 as const, color: UI.text },
  label: { fontSize: 13, fontWeight: 600 as const, color: UI.muted },
  body: { fontSize: 13, fontWeight: 600 as const, color: UI.text },
};

const S = {
  input: {
    width: "100%",
    padding: 11,
    borderRadius: 12,
    background: UI.inputBg,
    color: UI.text,
    border: `1px solid ${UI.inputBorder}`,
    fontSize: 14,
    fontWeight: 600,
    outline: "none",
  } as const,

  buttonPrimary: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    background: UI.buttonBg,
    color: UI.buttonText,
    border: `1px solid ${UI.panelBorder}`,
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  } as const,

  buttonSecondary: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.08)",
    color: UI.text,
    border: `1px solid ${UI.panelBorder}`,
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  } as const,

  buttonDanger: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    background: UI.dangerBg,
    color: "white",
    border: `1px solid ${UI.panelBorder}`,
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
  } as const,
};



function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidCoord(lng: any, lat: any) {
  const Lng = Number(lng);
  const Lat = Number(lat);
  return (
    Number.isFinite(Lng) &&
    Number.isFinite(Lat) &&
    Lat >= -90 &&
    Lat <= 90 &&
    Lng >= -180 &&
    Lng <= 180
  );
}

export default function Map({
  mode,
  login,
}: {
  mode?: string | null;
  login?: string | null;
}) {



const [isMobile, setIsMobile] = useState(false);
const [panelCollapsed, setPanelCollapsed] = useState(false);


useEffect(() => {
  if (typeof window === "undefined") return;

  const mq = window.matchMedia("(max-width: 900px)");
  const apply = () => setIsMobile(mq.matches);

  apply();

  if ("addEventListener" in mq) {
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  } else {
    // Safari fallback
    // @ts-ignore
    mq.addListener(apply);
    // @ts-ignore
    return () => mq.removeListener(apply);
  }
}, []);



  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const creatingRef = useRef(false);
 

  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");

  // filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  // selection
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  // messaging (MVP)
const [messageOpen, setMessageOpen] = useState(false);
// --- AUTH (MVP) ---
const [sessionEmail, setSessionEmail] = useState<string | null>(null);
const [sessionUserId, setSessionUserId] = useState<string | null>(null);
// Right panel mode 
const [panelView, setPanelView] = useState<"main" | "profile">("main");
/* Profile state + load/save logic */
type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  skills: string[] | null;
  bio: string | null;
};

const [profileLoading, setProfileLoading] = useState(false);
const [profileSaving, setProfileSaving] = useState(false);
const [profileError, setProfileError] = useState<string>("");

const [pUsername, setPUsername] = useState("");
const [pDisplayName, setPDisplayName] = useState("");
const [pFirstName, setPFirstName] = useState("");
const [pLastName, setPLastName] = useState("");
const [pBio, setPBio] = useState("");
const [pSkillsText, setPSkillsText] = useState(""); // comma-separated

async function loadMyProfile() {
  if (!sessionUserId) return;

  setProfileLoading(true);
  setProfileError("");
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, first_name, last_name, avatar_url, skills, bio")
      .eq("id", sessionUserId)
      .single();

    if (error) {
      setProfileError(error.message);
      return;
    }

    const row = data as unknown as ProfileRow;

    setPUsername(row.username ?? "");
    setPDisplayName(row.display_name ?? "");
    setPFirstName(row.first_name ?? "");
    setPLastName(row.last_name ?? "");
    setPBio(row.bio ?? "");
    setPSkillsText((row.skills ?? []).join(", "));
  } finally {
    setProfileLoading(false);
  }
}

async function saveMyProfile() {
  if (!sessionUserId) return;

  const skills = pSkillsText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  setProfileSaving(true);
  setProfileError("");
  try {
    const { error } = await supabase.from("profiles").update({
      username: pUsername.trim() || null,
      display_name: pDisplayName.trim() || null,
      first_name: pFirstName.trim() || null,
      last_name: pLastName.trim() || null,
      bio: pBio.trim() || null,
      skills,
    }).eq("id", sessionUserId);

    if (error) {
      setProfileError(error.message);
      return;
    }
  } finally {
    setProfileSaving(false);
  }
}

// When we enter Profile view (and logged in), load profile
useEffect(() => {
  if (panelView !== "profile") return;
  if (!sessionUserId) return;
  loadMyProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [panelView, sessionUserId]);


// Listen for top-bar click (MapPage.tsx dispatches this)
useEffect(() => {
  const handler = () => setPanelView("profile");
  window.addEventListener("skilltraders:open-profile", handler as any);
  return () => window.removeEventListener("skilltraders:open-profile", handler as any);
}, []);

const [authOpen, setAuthOpen] = useState(false);
useEffect(() => {
  if (typeof window === "undefined") return;

  const sp = new URLSearchParams(window.location.search);

  // If URL says login=1, open the auth modal
  if (sp.get("login") === "1") {
    setAuthOpen(true);
    setAuthSent(false);

    // If URL says auth=signup, default to signup mode
    if (sp.get("auth") === "signup") setAuthMode("signup");
    else setAuthMode("login");
  }
}, []);

const [authEmail, setAuthEmail] = useState("");
const [authSending, setAuthSending] = useState(false);
const [authSent, setAuthSent] = useState(false);
const [authPassword, setAuthPassword] = useState("");
const [authMode, setAuthMode] = useState<"login" | "signup">("login");

const [showTutorial, setShowTutorial] = useState(false);

useEffect(() => {
  const sp = new URLSearchParams(window.location.search);

  const modeParam = sp.get("mode");
  if (modeParam === "post") setCreating(true);

  const loginParam = sp.get("login");
  if (loginParam === "1") {
    setAuthOpen(true);
    setAuthSent(false);
  }
}, []);

useEffect(() => {
  if (typeof window === "undefined") return;

  const seen = localStorage.getItem("skilltraders_seen_tutorial");
  if (!seen) {
    setShowTutorial(true);
  }
}, []);


const [msgEmail, setMsgEmail] = useState("");
const [msgBody, setMsgBody] = useState("");
const [sendingMsg, setSendingMsg] = useState(false);

// --- INBOX (MVP) ---
type MsgRow = {
  id: string;
  created_at: string;
  trade_id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  from_email: string | null;
  body: string;
  read_at: string | null;
};


const [inbox, setInbox] = useState<MsgRow[]>([]);
const [inboxLoading, setInboxLoading] = useState(false);
const [inboxError, setInboxError] = useState<string>("");

const [inboxOpen, setInboxOpen] = useState(false);
const [inboxLimit, setInboxLimit] = useState(3); 
const [activeThreadTradeId, setActiveThreadTradeId] = useState<string | null>(null);
const [threadMsgs, setThreadMsgs] = useState<MsgRow[]>([]);
const [threadLoading, setThreadLoading] = useState(false);

// --- THREAD REPLY (MVP) ---
const [replyBody, setReplyBody] = useState("");
const [replySending, setReplySending] = useState(false);

function getThreadOtherUserId(me: string, msgs: MsgRow[]) {
  // Find the most recent message that involves another user id
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    const other =
      m.from_user_id === me ? m.to_user_id :
      m.to_user_id === me ? m.from_user_id :
      null;

    if (other) return other;
  }
  return null;
}

async function sendThreadReply() {
  if (!sessionEmail) {
    setAuthOpen(true);
    setAuthSent(false);
    return;
  }
  if (!activeThreadTradeId) return;

  const me = sessionUserId;
  if (!me) return;

  const body = replyBody.trim();
  if (!body) return;

  const otherUserId = getThreadOtherUserId(me, threadMsgs);
  if (!otherUserId) {
    alert("Couldn't find who to reply to (missing user id on the other side).");
    return;
  }

  setReplySending(true);
  try {
    const { error } = await supabase.from("messages").insert([
      {
        trade_id: activeThreadTradeId,
        from_user_id: me,
        to_user_id: otherUserId,
        from_email: sessionEmail,
        body,
      },
    ]);

    if (error) {
      alert(`Reply failed: ${error.message}`);
      return;
    }

    setReplyBody("");
    await loadThread(activeThreadTradeId);
    await loadInbox();
  } finally {
    setReplySending(false);
  }
}


  // create form
  const [creating, setCreating] = useState(false);
  const [pickedLngLat, setPickedLngLat] = useState<{ lng: number; lat: number } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"offer" | "request">("offer");
  const [newCategory, setNewCategory] = useState("Other");


  const selectedTrade = useMemo(
    () => trades.find((t) => t.id === selectedTradeId) ?? null,
    [trades, selectedTradeId]
  );
  const myPins = useMemo(() => {
  if (!sessionUserId) return [];
  return trades
    .filter((t) => t.user_id === sessionUserId)
    .sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    );
}, [trades, sessionUserId]);



  const filteredTrades = useMemo(() => {
    const s = search.trim().toLowerCase();
    return trades.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (s) {
        const hay = `${t.title ?? ""} ${t.category ?? ""} ${t.type ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [trades, typeFilter, categoryFilter, search]);
  useEffect(() => {
  creatingRef.current = creating;
}, [creating]);

useEffect(() => {
  if (mapRef.current) {
    setTimeout(() => {
      mapRef.current?.resize();
    }, 50);
  }
}, [isMobile]);


// 0) Auth session: restore + listen for changes
useEffect(() => {
  let isMounted = true;

  supabase.auth.getSession().then(({ data }) => {
    if (!isMounted) return;

    const email = data.session?.user?.email ?? null;
    const uid = data.session?.user?.id ?? null;

    setSessionEmail(email);
    setSessionUserId(uid);

    if (email) {
      setAuthEmail(email);
      setAuthOpen(false);
      setAuthSent(false);
    }
  });

  const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
    const email = session?.user?.email ?? null;
    const uid = session?.user?.id ?? null;

    setSessionEmail(email);
    setSessionUserId(uid);

    if (email) {
      setAuthEmail(email);
      setAuthOpen(false);
      setAuthSent(false);
    }
  });

  return () => {
    isMounted = false;
    authListener.subscription.unsubscribe();
  };
}, []);

  // 1) Init map once
  useEffect(() => {
    if (!mapContainerRef.current) return;



    if (mapRef.current) return;

    const map = new maplibregl.Map({
  container: mapContainerRef.current,
  style: "https://tiles.openfreemap.org/styles/liberty",
  center: [-94.5786, 39.0997], // Kansas City-ish
  zoom: 10.5,
  attributionControl: false,
});


    map.addControl(new maplibregl.NavigationControl(), "top-right");

    // Click map to pick location when creating
    map.on("click", (e) => {
  if (!creatingRef.current) return;
  setPickedLngLat({ lng: e.lngLat.lng, lat: e.lngLat.lat });
});

    mapRef.current = map;
    setTimeout(() => map.resize(), 50);


    return () => {
  map.remove();
  mapRef.current = null;
};



  }, []);

  // Auto-load inbox when login state changes
useEffect(() => {
  if (sessionEmail) loadInbox();
  else setInbox([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [sessionEmail]);

// Realtime: auto-refresh inbox when new messages arrive (no page refresh needed)
useEffect(() => {
  if (!sessionUserId) return;

  const channel = supabase
    .channel(`inbox-${sessionUserId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `to_user_id=eq.${sessionUserId}`,
      },
      async (payload) => {
        console.log("✅ REALTIME INSERT RECEIVED:", payload);

        // refresh inbox list
        await loadInbox();

        // if thread is open for this trade, refresh it too
        const tradeId = (payload.new as any)?.trade_id as string | undefined;
        if (inboxOpen && tradeId && activeThreadTradeId === tradeId) {
          await loadThread(tradeId);
        }
      }
    )
    .subscribe((status) => {
      console.log("📡 Realtime status:", status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [sessionUserId, inboxOpen, activeThreadTradeId]);


  // 2.5) Load inbox (one row per thread)
async function loadInbox() {
  if (!sessionEmail) {
    setInbox([]);
    return;
  }

  setInboxLoading(true);
  setInboxError("");

  try {
    const me = sessionUserId;
    if (!me) {
      setInbox([]);
      return;
    }

    // Get messages that involve me (sent OR received)
    const { data, error } = await supabase
      .from("messages")
      .select("id, created_at, trade_id, from_user_id, to_user_id, from_email, body, read_at")
      .or(`from_user_id.eq.${me},to_user_id.eq.${me}`)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setInboxError(error.message);
      setInbox([]);
      return;
    }

    const rows = (data ?? []) as any[];

    // Group by trade_id and keep only 1 item (latest) per trade_id
    const byTrade = new globalThis.Map<string, any[]>();
for (const r of rows) {
  if (!r.trade_id) continue;
  const arr = byTrade.get(r.trade_id) ?? [];
  arr.push(r);
  byTrade.set(r.trade_id, arr);
}

const grouped = Array.from(byTrade.entries()).map(([trade_id, msgs]: [string, any[]]) => {
  // newest first
  msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const latest = msgs[0];

  // NEW if any message TO me is unread
  const hasUnread = msgs.some((m) => m.to_user_id === me && !m.read_at);

  // Find the "other person" email (someone who is NOT me)
  // Prefer the newest message where from_user_id !== me
  const otherMsg =
    msgs.find((m) => m.from_user_id && m.from_user_id !== me && m.from_email) ??
    msgs.find((m) => m.to_user_id && m.to_user_id !== me && m.from_email);

  const otherEmail = otherMsg?.from_email ?? "user";

  return {
    ...latest,
    trade_id,
    __hasUnread: hasUnread,
    __otherEmail: otherEmail,
  };
});

// Sort threads by latest message time
grouped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

// IMPORTANT: remove any threads where the "otherEmail" is actually me (prevents self rows)
const filtered = grouped.filter((m: any) => {
  const other = (m as any).__otherEmail;
  return other && other !== sessionEmail;
});

setInbox(filtered as any[]);

  } catch (e: any) {
    setInboxError(e?.message ?? "unknown error");
    setInbox([]);
  } finally {
    setInboxLoading(false);
  }
}


  

// 2.6) Load one thread (conversation) for a trade
async function loadThread(tradeId: string) {
  if (!sessionEmail) return;

  setThreadLoading(true);
  try {
    const me = (await supabase.auth.getUser()).data.user?.id;
    if (!me) return;

    const { data, error } = await supabase
      .from("messages")
      .select("id, created_at, trade_id, from_user_id, to_user_id, from_email, body, read_at")
      .eq("trade_id", tradeId)
      .or(`from_user_id.eq.${me},to_user_id.eq.${me}`)
      .order("created_at", { ascending: true });

    if (error) {
      alert(`Thread load failed: ${error.message}`);
      setThreadMsgs([]);
      return;
    }

    setThreadMsgs((data ?? []) as any[]);
  } finally {
    setThreadLoading(false);
  }
}

// Load trades for map
async function loadTrades() {
  setLoading(true);
  setStatus("");

  try {
    const { data, error } = await supabase
  .from("trades")
  .select("id, created_at, type, category, title, lng, lat, user_id, status")
  .not("lng", "is", null)
  .not("lat", "is", null)
  .order("created_at", { ascending: false })
  .limit(500);


    if (error) {
      setStatus(error.message);
      setTrades([]);
      return;
    }

    const clean: Trade[] = (data ?? [])
      .map((row: any) => ({
        id: String(row.id),
        created_at: row.created_at,
        type: row.type ?? "offer",
        category: row.category ?? "General",
        title: row.title ?? "Untitled",
        lng: Number(row.lng),
        lat: Number(row.lat),
        user_id: row.user_id ?? null,
        status: row.status ?? "active",
      }))
      .filter((t) => isValidCoord(t.lng, t.lat));

    setTrades(clean);
  } catch (e: any) {
    setStatus(e?.message ?? "unknown error");
    setTrades([]);
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    loadTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Auto-refresh map pins every 30 seconds (no Supabase Realtime)
useEffect(() => {
  const interval = setInterval(() => {
    loadTrades();
  }, 30000); // 30 seconds

  return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  // Auto-load inbox when session appears (no manual refresh needed)
useEffect(() => {
  if (!sessionEmail) {
    setInbox([]);
    setInboxError("");
    return;
  }

  setInboxLimit(3); // reset the list each time you log in
  loadInbox();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [sessionEmail]);


  // 3) Render markers whenever filteredTrades changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    filteredTrades.forEach((t) => {
      if (t.lng == null || t.lat == null) return;
if (!isValidCoord(t.lng, t.lat)) return;


      const el = document.createElement("div");
el.style.width = "28px";
el.style.height = "28px";
el.style.cursor = "pointer";

// Choose color by type
const fill = t.type === "request" ? BRAND.request : BRAND.offer;

// Upright SVG pin (no rotation = no lean)
el.innerHTML = `
<svg width="36" height="36" viewBox="0 0 24 24" fill="none">
  <path
    d="M12 22s7-6.2 7-12A7 7 0 0 0 5 10c0 5.8 7 12 7 12z"
    fill="${fill}"
    stroke="${BRAND.pinBorder}"
    stroke-width="1.8"
  />
  <circle cx="12" cy="10" r="3.6" fill="white" />
</svg>
`;


// drop shadow
(el.firstElementChild as SVGElement).style.filter =
  "drop-shadow(0 6px 12px rgba(0,0,0,0.45))";


      const marker = new maplibregl.Marker({
  element: el,
  anchor: "bottom",
});


      const lng = Number(t.lng);
      const lat = Number(t.lat);

      if (
        !Number.isFinite(lng) ||
        !Number.isFinite(lat) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        console.warn("Skipping invalid coords:", { id: t.id, lng: t.lng, lat: t.lat });
        return;
      }

      const popup = new maplibregl.Popup({ offset: 22, closeButton: false }).setHTML(
  `<div style="
    font-family: system-ui;
    min-width: 220px;
    background: ${BRAND.popupBg};
    color: ${BRAND.popupText};
    padding: 12px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  ">
    <div style="font-weight:900; font-size:16px; margin-bottom:6px;">
      ${escapeHtml(t.title ?? "Untitled")}
    </div>

    <div style="opacity:.9; font-size:13px; margin-bottom:10px;">
      ${escapeHtml(t.type)} • ${escapeHtml(t.category ?? "Other")}
    </div>

    <button
      id="msg-btn-${t.id}"
      style="
        width:100%;
        padding:10px 12px;
        border-radius:12px;
        border:1px solid rgba(255,255,255,0.15);
        background:#1bbf8a;
        color:#06101a;
        font-weight:900;
        font-size:14px;
        cursor:pointer;
      "
    >
      Message
    </button>
  </div>`
);

// Attach handler when the popup is opened
popup.on("open", () => {
  const btn = document.getElementById(`msg-btn-${t.id}`);
  if (!btn) return;

  btn.onclick = () => {
  setSelectedTradeId(t.id);

  if (!sessionEmail) {
    setAuthOpen(true);
    setAuthSent(false);
    return;
  }

  setMessageOpen(true);
};

});

marker.setLngLat([lng, lat]).setPopup(popup).addTo(map);


      el.addEventListener("click", () => {
        setSelectedTradeId(t.id);
      });

      markersRef.current.push(marker);
    });
  }, [filteredTrades]);

  async function createTrade() {
    if (!pickedLngLat) {
      alert("Click on the map to pick a location first.");
      return;
    }
    if (!newTitle.trim()) {
      alert("Please enter a title.");
      return;
    }

    // Require login to post
if (!sessionEmail) {
  setAuthOpen(true);
  setAuthSent(false);
  return;
}

    try {
      const payload = {
  title: newTitle.trim(),
  type: newType,
  category: newCategory.trim() || "General",
  lng: pickedLngLat.lng,
  lat: pickedLngLat.lat,
  user_id: (await supabase.auth.getUser()).data.user?.id,
};


      const { data, error } = await supabase
        .from("trades")
        .insert([payload])
        .select("id, created_at, type, category, title, lng, lat, user_id")
        .single();

      if (error) {
        alert(`Insert failed: ${error.message}`);
        return;
      }

      // Add it to local list immediately
      await loadTrades();

const added: Trade = {
  id: String((data as any).id),
  created_at: (data as any).created_at,
  type: (data as any).type,
  category: (data as any).category,
  title: (data as any).title,
  lng: Number((data as any).lng),
  lat: Number((data as any).lat),
  user_id: (data as any).user_id ?? null, // ✅ THIS IS THE FIX
};

setTrades((prev) => [added, ...prev]); // ✅ also fix the spread typo
setSelectedTradeId(added.id);


      // reset create mode
      setCreating(false);
      setPickedLngLat(null);
      setNewTitle("");
      setNewType("offer");
      setNewCategory("Other");

    } catch (e: any) {
      alert(`Insert failed: ${e?.message ?? "unknown error"}`);
    }
  }

  async function deleteTrade(tradeId: string) {
  if (!confirm("Remove this post?")) return;

  try {
    // IMPORTANT: select() makes Supabase return the deleted rows
    // so we can confirm if anything was actually deleted.
    const { data, error } = await supabase
      .from("trades")
      .delete()
      .eq("id", tradeId)
      .select("id");

    if (error) {
      console.error("Delete failed:", error);
      alert(`Delete failed: ${error.message}`);
      return;
    }

    const deletedCount = (data ?? []).length;

    if (deletedCount === 0) {
  alert("You can only delete your own post.");
  return;
}


    // update UI
    setTrades((prev) => prev.filter((t) => t.id !== tradeId));
    setSelectedTradeId(null);

    // optional: re-pull from DB to stay in sync
    // await loadTrades();

  } catch (e: any) {
    console.error("Delete crashed:", e);
    alert(`Delete failed: ${e?.message ?? "unknown error"}`);
  }
}

async function deleteMessage(messageId: string) {
  if (!sessionEmail) return;

  const ok = confirm("Delete this message?");
  if (!ok) return;

  const { error } = await supabase.from("messages").delete().eq("id", messageId);

  if (error) {
    alert(`Delete failed: ${error.message}`);
    return;
  }

  // remove locally so UI updates immediately
  setInbox((prev) => prev.filter((m) => m.id !== messageId));
  setThreadMsgs((prev) => prev.filter((m) => m.id !== messageId));
  await loadInbox();

}
async function requestPasswordReset() {
  if (authSending) return;
  if (!authEmail.trim()) {
    alert("Enter your email first.");
    return;
  }

  try {
    setAuthSending(true);
    // send reset email that redirects to your hosted reset page
    const { error } = await supabase.auth.resetPasswordForEmail(authEmail.trim(), {
      redirectTo: "https://skill-traders.com/auth/reset",
    });

    if (error) alert(error.message);
    else alert("Password reset email sent. Check your inbox.");
  } finally {
    setAuthSending(false);
  }
}

async function doAuth(mode: "login" | "signup") {
  if (authSending) return;
  if (!authEmail.trim()) return;
  if (!authPassword) return;

  try {
    setAuthSending(true);
    setAuthSent(false);
    setAuthMode(mode);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });

      if (error) alert(error.message);
      else setAuthOpen(false);
    } else {
      const { error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
      });

      if (error) alert(error.message);
      else setAuthSent(true);
    }
  } finally {
    setAuthSending(false);
  }
}

async function logout() {
  await supabase.auth.signOut();
  setSessionEmail(null);
  setSessionUserId(null);
  setAuthOpen(false);
  setAuthSent(false);
  setInbox([]);
  setThreadMsgs([]);
}


async function sendMessage() {
  // Require login only when sending
  if (!sessionEmail) {
    setAuthOpen(true);
    setAuthSent(false);
    setSendingMsg(false);
    return;
  }

  if (!selectedTrade) return;
  if (!selectedTrade.user_id) {
  alert("This post has no owner yet. Ask them to repost it.");
  return;
}


  const body = msgBody.trim();
  if (!body) {
    alert("Please type a message.");
    return;
  }

  setSendingMsg(true);
  try {
    const { error } = await supabase.from("messages").insert([
      {
  trade_id: selectedTrade.id,
  from_user_id: (await supabase.auth.getUser()).data.user?.id,
  to_user_id: selectedTrade.user_id,
  from_email: sessionEmail,
  body: body,
}


    ]);

    if (error) {
      alert(`Message failed: ${error.message}`);
      return;
    }

    setStatus("Message sent ✅");
setTimeout(() => setStatus(""), 1200);
    setMessageOpen(false);
    setMsgBody("");
  } catch (e: any) {
    alert(`Message failed: ${e?.message ?? "unknown error"}`);
  } finally {
    setSendingMsg(false);
  }
}


  return (
  <div
    style={{
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      height: "100%",
      minHeight: 0,
    }}
  >
      {/* MAP */}
      <div
      onClick={() => {
  if (panelCollapsed) {
    setPanelCollapsed(false);
    setTimeout(() => mapRef.current?.resize(), 80);
  }
}}

  style={{
    flex: panelCollapsed ? "0 0 auto" : isMobile ? "0 0 auto" : 1,
    position: "relative",
    height: isMobile ? (panelCollapsed ? "64px" : "45vh") : "100%",
    width: !isMobile ? (panelCollapsed ? 96 : undefined) : undefined,
    minWidth: !isMobile ? (panelCollapsed ? 96 : undefined) : undefined,
    overflow: panelCollapsed ? "hidden" : "visible",
  }}
>

{showTutorial && (
  <div
    style={{
      position: "absolute",
      top: 12,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 20,
      background: "#0f1c2e",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: 14,
      padding: "12px 14px",
      color: "rgba(255,255,255,0.95)",
      maxWidth: 420,
      width: "calc(100% - 24px)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
    }}
  >
    <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6 }}>
      New here?
    </div>

    <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.4 }}>
      Click <b>Create Post</b>, then click on the map to place your pin.
      <br />
      Choose whether you are <b>offering</b> or <b>requesting</b> a skill.
    </div>

    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
      <button
        onClick={() => {
          localStorage.setItem("skilltraders_seen_tutorial", "1");
          setShowTutorial(false);
        }}
        style={{
          padding: "6px 10px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.15)",
          background: "rgba(255,255,255,0.08)",
          color: "white",
          fontWeight: 900,
          cursor: "pointer",
          fontSize: 12,
        }}
      >
        Got it
      </button>
    </div>
  </div>
)}
{/* Collapse / Expand Map Button */}
<button
  onClick={() => {
    setPanelCollapsed((v: boolean) => !v);

    setTimeout(() => {
      mapRef.current?.resize();
    }, 80);
  }}
  style={{
    position: "absolute",
    zIndex: 25,
    top: 12,

    // keep button visible when map collapses on desktop
    right: panelCollapsed && !isMobile ? undefined : 12,
    left: panelCollapsed && !isMobile ? 6 : undefined,

    padding: panelCollapsed && !isMobile ? "10px 8px" : "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(15,28,46,0.92)",
    color: "rgba(255,255,255,0.95)",
    fontWeight: 900,
    cursor: "pointer",
    backdropFilter: "blur(6px)",
    whiteSpace: "nowrap",
  }}
>
  {panelCollapsed ? "Show Map" : "Hide Map"}
</button>



        <div ref={mapContainerRef} style={{ position: "absolute", inset: 0 }} />

        
      </div>

      {/* RIGHT PANEL */}
<div
  style={{
    width: isMobile ? "100%" : (panelCollapsed ? "calc(100% - 96px)" : 360),
    borderLeft: isMobile ? "none" : `1px solid ${UI.panelBorder}`,
    background: UI.panelBg,
    color: UI.text,
    fontFamily: "system-ui",
    display: "flex",
    flexDirection: "column",
    padding: isMobile ? 10 : 14,
    gap: 12,
    overflow: "auto",
    fontSize: 15,
    height: isMobile ? (panelCollapsed ? "calc(100vh - 64px)" : "55vh") : "100%",
    borderTop: isMobile ? `1px solid ${UI.panelBorder}` : undefined,
    fontWeight: 500,
    lineHeight: 1.45,
  }}
>
<div style={{ display: "flex", gap: 8, marginBottom: 10 }}>

  <button
    onClick={() => setPanelView("main")}
    style={{
      flex: 1,
      padding: 10,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.12)",
      background: panelView === "main" ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)",
      color: "white",
      fontWeight: 900,
      cursor: "pointer",
      fontSize: 13,
    }}
  >
    Map Tools
  </button>

  <button
    onClick={() => {
      if (!sessionEmail) {
        setAuthOpen(true);
        setAuthSent(false);
        return;
      }
      setPanelView("profile");
    }}
    style={{
      flex: 1,
      padding: 10,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.12)",
      background: panelView === "profile" ? "rgba(27,191,138,0.25)" : "rgba(255,255,255,0.05)",
      color: "white",
      fontWeight: 900,
      cursor: "pointer",
      fontSize: 13,
    }}
  >
    Profile
  </button>
</div>

{panelView === "profile" ? (
  <div
    style={{
      padding: 12,
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.04)",
      marginBottom: 12,
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ fontWeight: 900 }}>Your Profile</div>
      <button
        onClick={() => setPanelView("main")}
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.06)",
          color: "white",
          fontWeight: 900,
          cursor: "pointer",
          fontSize: 12,
        }}
      >
        Close
      </button>
    </div>
{/* Profile Preview (READ) */}
<div
  style={{
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
  }}
>
  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6, opacity: 0.95 }}>
    Preview
  </div>

  <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.4 }}>
    <div>
      <span style={{ opacity: 0.75 }}>Username:</span>{" "}
      <span style={{ fontWeight: 800 }}>
        {pUsername?.trim() ? `@${pUsername.trim()}` : "—"}
      </span>
    </div>

    <div>
      <span style={{ opacity: 0.75 }}>Display:</span>{" "}
      <span style={{ fontWeight: 800 }}>
        {pDisplayName?.trim() ? pDisplayName.trim() : "—"}
      </span>
    </div>

    <div style={{ marginTop: 6 }}>
      <span style={{ opacity: 0.75 }}>Bio:</span>{" "}
      <span style={{ fontWeight: 700 }}>
        {pBio?.trim() ? pBio.trim() : "—"}
      </span>
    </div>

    <div style={{ marginTop: 6 }}>
      <span style={{ opacity: 0.75 }}>Skills:</span>{" "}
      <span style={{ fontWeight: 800 }}>
        {pSkillsText?.trim() ? pSkillsText.trim() : "—"}
      </span>
    </div>
  </div>
</div>
    {!sessionEmail ? (
      <div style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
        Log in to edit your profile.
      </div>
    ) : profileLoading ? (
      <div style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>Loading…</div>
    ) : (
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {profileError ? (
          <div style={{ fontSize: 13, opacity: 0.9 }}>Error: {profileError}</div>
        ) : null}

        <label style={{ fontSize: 13, opacity: 0.85 }}>Username (public)</label>
        <input value={pUsername} onChange={(e) => setPUsername(e.target.value)} placeholder="e.g. coltt" style={S.input} />

        <label style={{ fontSize: 13, opacity: 0.85 }}>Display name (public)</label>
        <input value={pDisplayName} onChange={(e) => setPDisplayName(e.target.value)} placeholder="e.g. Coltt" style={S.input} />

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, opacity: 0.85 }}>First name</label>
            <input value={pFirstName} onChange={(e) => setPFirstName(e.target.value)} style={S.input} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, opacity: 0.85 }}>Last name</label>
            <input value={pLastName} onChange={(e) => setPLastName(e.target.value)} style={S.input} />
          </div>
        </div>

        <label style={{ fontSize: 13, opacity: 0.85 }}>Skills (comma separated)</label>
        <input value={pSkillsText} onChange={(e) => setPSkillsText(e.target.value)} placeholder="Mechanic, Tattoo Artist, Knitting" style={S.input} />

        <label style={{ fontSize: 13, opacity: 0.85 }}>Bio</label>
        <textarea
          value={pBio}
          onChange={(e) => setPBio(e.target.value)}
          rows={5}
          style={{
            width: "100%",
            padding: 11,
            borderRadius: 12,
            background: UI.inputBg,
            color: UI.text,
            border: `1px solid ${UI.inputBorder}`,
            fontSize: 14,
            fontWeight: 600,
            outline: "none",
            resize: "vertical",
          }}
        />

        <button
          onClick={saveMyProfile}
          disabled={profileSaving}
          style={{
  ...S.buttonPrimary,
  opacity: profileSaving ? 0.7 : 1,
  cursor: profileSaving ? "not-allowed" : "pointer",
}}

        >
          {profileSaving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    )}
  </div>
) : null}

        
        {isMobile && (
  <div
    style={{
      width: 44,
      height: 5,
      borderRadius: 999,
      background: "rgba(255,255,255,0.25)",
      margin: "4px auto 10px",
    }}
  />
)}
{panelView === "main" && (
  <>


{/* Inbox (MVP) */}
<div
  style={{
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
  }}
>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <div style={{ fontWeight: 900 }}>Inbox</div>

    <button
      onClick={() => {
        if (!sessionEmail) {
          setAuthOpen(true);
          setAuthSent(false);
          return;
        }
        loadInbox();
      }}
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        color: "white",
        fontWeight: 900,
        cursor: "pointer",
        fontSize: 12,
      }}
    >
      Refresh
    </button>
  </div>

  {!sessionEmail ? (
    <div style={{ marginTop: 8, opacity: 0.85, fontSize: 13 }}>
      Log in to view messages.
    </div>
  ) : (
    <div style={{ marginTop: 10 }}>
      {inboxLoading ? (
        <div style={{ opacity: 0.8, fontSize: 13 }}>Loading…</div>
      ) : inboxError ? (
        <div style={{ opacity: 0.9, fontSize: 13 }}>Error: {inboxError}</div>
      ) : inbox.length === 0 ? (
        <div style={{ opacity: 0.8, fontSize: 13 }}>No messages yet.</div>
      ) : (
  <div>
    <div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 8,
    overflowX: "hidden",
  }}
>

      {inbox.slice(0, inboxLimit).map((m) => {
  const otherEmail = (m as any).__otherEmail ?? m.from_email ?? "user";
  const hasUnread = !!(m as any).__hasUnread;

  return (
    <div
      key={m.id}
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 10,
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        marginTop: 10,
        minWidth: 0,
        overflowX: "hidden",
      }}
    >
      <button
        onClick={async () => {
          await loadThread(m.trade_id);

          // mark as read (only messages sent TO me in this trade)
          const me = sessionUserId;
          if (me) {
            await supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("trade_id", m.trade_id)
              .eq("to_user_id", me)
              .is("read_at", null);
          }

          await loadInbox(); // refresh inbox so colors update
          setActiveThreadTradeId(m.trade_id);
          setInboxOpen(true);
        }}
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: "left",
          background: "transparent",
          border: "none",
          padding: 0,
          color: "inherit",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: 13,
            opacity: 0.95,
            color: hasUnread ? "#1bbf8a" : "rgba(255,255,255,0.92)",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={`${hasUnread ? "NEW message from " : "Message from "}${otherEmail}`}
        >
          {hasUnread ? "NEW message from " : "Message from "}
          {otherEmail}
        </div>

        <div
          style={{
            fontSize: 13,
            opacity: 0.85,
            marginTop: 4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {m.body}
        </div>

        <div style={{ fontSize: 11, opacity: 0.65, marginTop: 6 }}>
          {new Date(m.created_at).toLocaleString()}
        </div>
      </button>

      <button
        onClick={async (e) => {
  e.stopPropagation();

  const me = sessionUserId;
  if (!me) return;

  // Delete the entire conversation (thread)
  await supabase
    .from("messages")
    .delete()
    .eq("trade_id", m.trade_id)
    .or(`from_user_id.eq.${me},to_user_id.eq.${me}`);

  // If this thread is open, close it
  if (activeThreadTradeId === m.trade_id) {
    setActiveThreadTradeId(null);
    setThreadMsgs([]);
    setInboxOpen(false);
  }

  // Refresh inbox so row disappears
  await loadInbox();
}}

        style={{
          flexShrink: 0,
          padding: "6px 10px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.15)",
          background: "#7f1d1d",
          color: "white",
          fontWeight: 900,
          cursor: "pointer",
          fontSize: 12,
          height: 32,
          marginTop: 2,
          whiteSpace: "nowrap",
        }}
        title="Delete message"
      >
        Delete
      </button>
    </div>
  );
})}

<div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
  <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 8, opacity: 0.9 }}>
    Reply
  </div>

  <textarea
    value={replyBody}
    onChange={(e) => setReplyBody(e.target.value)}
    placeholder="Write a reply…"
    disabled={replySending}
    rows={4}
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
      resize: "vertical",
    }}
  />

  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
    <button
      onClick={() => {
  setReplyBody("");
  setActiveThreadTradeId(null);
  setThreadMsgs([]);
}}

      disabled={replySending}
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 12,
        background: "rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(255,255,255,0.10)",
        fontWeight: 900,
        cursor: replySending ? "not-allowed" : "pointer",
      }}
    >
      Close Thread
    </button>

    <button
      onClick={sendThreadReply}
      disabled={replySending || !replyBody.trim()}
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 12,
        background: "#1bbf8a",
        color: "#06101a",
        border: "1px solid rgba(255,255,255,0.10)",
        fontWeight: 900,
        cursor: replySending || !replyBody.trim() ? "not-allowed" : "pointer",
        opacity: replySending || !replyBody.trim() ? 0.65 : 1,
      }}
    >
      {replySending ? "Sending..." : "Send Reply"}
    </button>
  </div>
</div>

    </div>

    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
      <button
  onClick={() => setInboxLimit((v) => (v >= 999 ? 3 : 999))}
  style={{
    padding: "6px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 12,
    height: 32,
    whiteSpace: "nowrap",
  }}
>
  {inboxLimit >= 999 ? "Hide" : "Show"}
</button>

    </div>
  </div>
)}

    </div>
  )}
</div>


        {/* Filters */}
        <div style={{ fontWeight: 600, fontSize: 14 }}>Filters</div>

        <label style={{ fontSize: 13, opacity: 0.85 }}>Type</label>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 10,
            background: "#111827",
            color: "white",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <option value="all">All</option>
<option value="offer">I am offering</option>
<option value="request">I am requesting</option>

        </select>

        <label style={{ fontSize: 13, opacity: 0.85 }}>Category</label>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 10,
            background: "#111827",
            color: "white",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <option value="all">All</option>
{CATEGORY_OPTIONS.map((c) => (
  <option key={c} value={c}>
    {c}
  </option>
))}

        </select>

        <label style={{ fontSize: 13, opacity: 0.85 }}>Search</label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="e.g., moving, tattoo, logo…"
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 10,
            background: UI.inputBg,
            border: `1px solid ${UI.inputBorder}`,
            color: UI.text,

          }}
        />

        {/* Create Trade */}
        
        {!creating ? (
          <button
            onClick={() => {
              setCreating(true);
              setPickedLngLat(null);
            }}
            style={S.buttonPrimary}
          >
            Create Post
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Create instruction */}
<div
  style={{
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 4,
  }}
>
  Create a Trade
</div>

<div
  style={{
    padding: "10px 12px",
    borderRadius: 10,
    background: "#1bbf8a",
    color: "#04201a",
    fontSize: 15,
    fontWeight: 700,
  }}
>
  {pickedLngLat
    ? `Location selected ✓`
    : "Click on the MAP to pick a location"}
</div>


            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title (what are you offering/requesting?)"
              style={S.input}

            />

            <select
  value={newType}
  onChange={(e) => setNewType(e.target.value as any)}
  style={S.input}
>
  <option value="offer">I am offering</option>
  <option value="request">I am requesting</option>
</select>


            <select
  value={newCategory}
  onChange={(e) => setNewCategory(e.target.value)}
  style={{
    width: "100%",
    padding: 10,
    borderRadius: 10,
    background: "#111827",
    color: "white",
    border: "1px solid rgba(255,255,255,0.08)",
    fontSize: 15,
  }}
>
  {CATEGORY_OPTIONS.map((c) => (
    <option key={c} value={c}>
      {c}
    </option>
  ))}
</select>


            <button
              onClick={createTrade}
              style={S.buttonPrimary}
            >
              Create Trade
            </button>

            <button
              onClick={() => {
                setCreating(false);
                setPickedLngLat(null);
              }}
              style={S.buttonSecondary}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Selected trade */}
        <div style={{ marginTop: 10, fontWeight: 600, fontSize: 14 }}>Selected</div>
        {!selectedTrade ? (
          <div style={{ fontSize: 12, opacity: 0.75 }}>Click a pin to see details.</div>
        ) : (
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 12,
              padding: 12,
              background: "#0f172a",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedTrade.title}</div>
            <div style={{ opacity: 0.9, fontSize: 14, marginTop: 6 }}>
  {selectedTrade.type} • {selectedTrade.category}
</div>

            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: selectedTrade.user_id === sessionUserId ? 8 : 0 }}>

  <button
    onClick={() => {
  if (!sessionEmail) {
    setAuthOpen(true);
    setAuthSent(false);
    return;
  }

  setMessageOpen(true);
}}

    style={{
      width: "100%",
      padding: 11,
      borderRadius: 12,
      background: "#1bbf8a",
      border: "1px solid rgba(255,255,255,0.15)",
      color: "#06101a",
      fontWeight: 900,
      fontSize: 15,
      cursor: sessionEmail ? "pointer" : "not-allowed",
opacity: sessionEmail ? 1 : 0.6,

    }}
  >
    Message
  </button>
{selectedTrade.user_id === sessionUserId && (

  <button
    onClick={() => deleteTrade(selectedTrade.id)}
    style={{
      width: "100%",
      padding: 11,
      borderRadius: 12,
      background: "#7f1d1d",
      border: "1px solid rgba(255,255,255,0.15)",
      color: "white",
      fontWeight: 900,
      fontSize: 15,
      cursor: "pointer",
    }}
  >
    Remove Post
  </button>
  )}

  {selectedTrade.user_id === sessionUserId && selectedTrade.status !== "completed" && (
  <button
    onClick={async () => {
      const ownerId = selectedTrade.user_id;

      if (!ownerId || ownerId !== sessionUserId) {
        alert("Only the owner can complete this post.");
        return;
      }

      const completedBy =
        (await supabase.auth.getUser()).data.user?.id ?? null;

      if (!completedBy) {
        alert("You must be signed in to complete a post.");
        return;
      }

      // 1) Archive into completed_trades
      const { error: insertErr } = await supabase
        .from("completed_trades")
        .insert([
          {
            trade_id: selectedTrade.id,
            original_created_at: selectedTrade.created_at ?? null,
            type: selectedTrade.type ?? null,
            category: selectedTrade.category ?? null,
            title: selectedTrade.title ?? null,
            lng: selectedTrade.lng ?? null,
            lat: selectedTrade.lat ?? null,
            owner_user_id: ownerId,
            completed_by_user_id: completedBy,
          },
        ]);

      if (insertErr) {
        alert(`Archive failed: ${insertErr.message}`);
        return;
      }

      // 2) Delete from active trades
      const { error: delErr } = await supabase
        .from("trades")
        .delete()
        .eq("id", selectedTrade.id);

      if (delErr) {
        alert(`Delete failed: ${delErr.message}`);
        return;
      }

      // 3) Refresh UI
      setSelectedTradeId(null);
      await loadTrades();
    }}
    style={{
      width: "100%",
      padding: 11,
      borderRadius: 12,
      background: "#334155",
      border: "1px solid rgba(255,255,255,0.15)",
      color: "white",
      fontWeight: 900,
      fontSize: 15,
      cursor: "pointer",
    }}
  >
    Mark Completed
  </button>
)}


</div>

{/* My Pins */}
{sessionUserId && (
  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${UI.panelBorder}` }}>
    <div style={{ fontWeight: 900, marginBottom: 8 }}>My Pins</div>

    {myPins.length === 0 ? (
      <div style={{ fontSize: 13, opacity: 0.8 }}>You haven’t posted any pins yet.</div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {myPins
          .filter((t) => t.id !== selectedTrade.id)
          .slice(0, 8)
          .map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTradeId(t.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: 10,
                borderRadius: 12,
                border: `1px solid ${UI.panelBorder}`,
                background: "rgba(255,255,255,0.04)",
                color: "white",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 2 }}>
                {t.title}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {t.type} • {t.category}
              </div>
            </button>
          ))}
      </div>
    )}
  </div>
)}


          </div>
        )}

        {/* List */}
        <div style={{ marginTop: 10, fontWeight: 600, fontSize: 14 }}>
          Visible pins ({filteredTrades.length})
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredTrades.slice(0, 40).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelectedTradeId(t.id);
                const map = mapRef.current;
                if (map && isValidCoord(t.lng, t.lat)) {
                  map.flyTo({ center: [t.lng, t.lat], zoom: Math.max(map.getZoom(), 12) });
                }
              }}
              style={{
                textAlign: "left",
                borderRadius: 12,
                padding: 10,
                border: "1px solid rgba(255,255,255,0.10)",
                background: selectedTradeId === t.id ? "#111827" : "#0b0b0f",
                color: "white",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                {t.type === "offer" ? "🟢" : "🔴"} {t.category}
              </div>
              <div style={{ opacity: 0.85, fontSize: 13 }}>{t.title}</div>
            </button>
          ))}

          {filteredTrades.length === 0 && (
            <div style={{ fontSize: 12, opacity: 0.7 }}>No matches.</div>
          )}
                </div>

    </>
)}

      </div>



            {/* MESSAGE MODAL (MVP) */}
      {messageOpen && (
  <div
    onClick={() => {
      if (sendingMsg) return;
      setMessageOpen(false);
    }}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.65)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: 16,
      fontFamily: "system-ui",
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "min(520px, 100%)",
        background: "#0b1220",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        padding: 16,
        color: "rgba(255,255,255,0.92)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>
        Message {selectedTrade ? `"${selectedTrade.title}"` : ""}
      </div>

      <label style={{ fontSize: 13, opacity: 0.85 }}>Your email</label>
      <input
        value={sessionEmail ?? ""}
        placeholder="you@email.com"
        disabled={true}
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
          marginBottom: 10,
        }}
      />

      <label style={{ fontSize: 13, opacity: 0.85 }}>Message</label>
      <textarea
        value={msgBody}
        onChange={(e) => setMsgBody(e.target.value)}
        placeholder="Tell them what you’d like to trade, timing, location, etc."
        disabled={sendingMsg}
        rows={6}
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
          resize: "vertical",
        }}
      />


      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button
          onClick={() => {
            if (sendingMsg) return;
            setMessageOpen(false);
          }}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 12,
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(255,255,255,0.10)",
            fontWeight: 900,
            cursor: sendingMsg ? "not-allowed" : "pointer",
          }}
        >
          Cancel
        </button>

        <button
          onClick={sendMessage}
          disabled={
         sendingMsg ||
         !sessionEmail ||
         !msgBody.trim() ||
         !selectedTrade
}

          style={{
            flex: 1,
            padding: 12,
            borderRadius: 12,
            background: "#1bbf8a",
            color: "#06101a",
            border: "1px solid rgba(255,255,255,0.10)",
            fontWeight: 900,
            cursor:
             sendingMsg ||
            !sessionEmail ||
            !msgBody.trim() ||
            !selectedTrade
            ? "not-allowed"
            : "pointer",

            opacity:
            sendingMsg ||
            !sessionEmail ||
            !msgBody.trim() ||
            !selectedTrade
            ? 0.6
            : 1,

          }}
        >
          {sendingMsg ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  </div>
)}

{/* INBOX MODAL (MVP) */}
{inboxOpen && (
  <div
    onClick={() => setInboxOpen(false)}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.65)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10001,
      padding: 16,
      fontFamily: "system-ui",
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "min(720px, 100%)",
        background: "#0b1220",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        padding: 16,
        color: "rgba(255,255,255,0.92)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 900 }}>
          Conversation
        </div>

        <button
          onClick={() => setInboxOpen(false)}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            fontWeight: 900,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Close
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        {threadLoading ? (
          <div style={{ opacity: 0.8, fontSize: 13 }}>Loading…</div>
        ) : threadMsgs.length === 0 ? (
          <div style={{ opacity: 0.8, fontSize: 13 }}>No messages in this thread yet.</div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxHeight: "60vh",
              overflow: "auto",
              paddingRight: 6,
            }}
          >
            {threadMsgs.map((m) => (
              <div
                key={m.id}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {m.from_email ? `From: ${m.from_email} • ` : ""}
                  {new Date(m.created_at).toLocaleString()}
                </div>

                <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600, whiteSpace: "pre-wrap" }}>
                  {m.body}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 2 }}>
  
</div>


              </div>
            ))}

            <div
  style={{
    marginTop: 14,
    borderTop: "1px solid rgba(255,255,255,0.10)",
    paddingTop: 12,
  }}
>
  <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 8, opacity: 0.9 }}>
    Reply
  </div>

  <textarea
    value={replyBody}
    onChange={(e) => setReplyBody(e.target.value)}
    placeholder="Write a reply…"
    disabled={replySending}
    rows={4}
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
      resize: "vertical",
    }}
  />

  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
    <button
      onClick={() => setInboxOpen(false)}
      disabled={replySending}
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 12,
        background: "rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(255,255,255,0.10)",
        fontWeight: 900,
        cursor: replySending ? "not-allowed" : "pointer",
      }}
    >
      Close
    </button>

    <button
      onClick={sendThreadReply}
      disabled={replySending || !replyBody.trim()}
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 12,
        background: "#1bbf8a",
        color: "#06101a",
        border: "1px solid rgba(255,255,255,0.10)",
        fontWeight: 900,
        cursor: replySending || !replyBody.trim() ? "not-allowed" : "pointer",
        opacity: replySending || !replyBody.trim() ? 0.65 : 1,
      }}
    >
      {replySending ? "Sending..." : "Send Reply"}
    </button>
  </div>
</div>

          </div>
        )}
      </div>
    </div>
  </div>
)}

{/* AUTH MODAL (Magic Link) */}
{authOpen && (
  <div
    onClick={() => {
      if (authSending) return;
      setAuthOpen(false);
    }}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.65)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000,
      padding: 16,
      fontFamily: "system-ui",
    }}
  >
<div
  onClick={(e) => e.stopPropagation()}
  style={{
    width: "min(520px, 100%)",
    background: "#0b1220",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 16,
    color: "rgba(255,255,255,0.92)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
  }}
>
  <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>
    Login required
  </div>

  <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 10 }}>
    Log in with your email and password.
  </div>

  <label style={{ fontSize: 13, opacity: 0.85 }}>Email</label>
  <input
    value={authEmail}
    onChange={(e) => setAuthEmail(e.target.value)}
    placeholder="you@realemail.com"
    disabled={authSending}
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
      marginBottom: 10,
    }}
  />
    <label style={{ fontSize: 13, opacity: 0.85 }}>Password</label>
  <input
    type="password"
    value={authPassword}
    onChange={(e) => setAuthPassword(e.target.value)}
    placeholder="Your password"
    disabled={authSending}
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
      marginBottom: 10,
    }}
  />
<div style={{ display: "flex", gap: 10, marginTop: 10, marginBottom: 2 }}>
  <button
    type="button"
    onClick={() => doAuth("login")}
disabled={authSending || !authEmail.trim() || !authPassword}

    style={{
      flex: 1,
      padding: 10,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.10)",
      background: authMode === "login" ? "#1bbf8a" : "rgba(255,255,255,0.08)",
      color: authMode === "login" ? "#06101a" : "rgba(255,255,255,0.92)",
      fontWeight: 900,
      cursor: "pointer",
    }}
  >
    Log in
  </button>

  <button
    type="button"
    onClick={() => doAuth("signup")}
    disabled={authSending || !authEmail.trim() || !authPassword}


    style={{
      flex: 1,
      padding: 10,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.10)",
      background: authMode === "signup" ? "#1bbf8a" : "rgba(255,255,255,0.08)",
      color: authMode === "signup" ? "#06101a" : "rgba(255,255,255,0.92)",
      fontWeight: 900,
      cursor: "pointer",
    }}
  >
    Sign up
  </button>
</div>
<button
  type="button"
  onClick={requestPasswordReset}
  disabled={authSending || !authEmail.trim()}
  style={{
    marginTop: 10,
    width: "100%",
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.88)",
    fontWeight: 800,
    cursor: authSending || !authEmail.trim() ? "not-allowed" : "pointer",
    opacity: authSending || !authEmail.trim() ? 0.7 : 1,
  }}
>
  Forgot password?
</button>



  {authSent && (
  <div
    style={{
      fontSize: 13,
      marginTop: 6,
      marginBottom: 10,
      color: "#1bbf8a",
      fontWeight: 800,
    }}
  >
    Account created — you can log in now.
  </div>
)}


  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
    <button
      onClick={() => {
        if (authSending) return;
        setAuthOpen(false);
      }}
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 12,
        background: "rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(255,255,255,0.10)",
        fontWeight: 900,
        cursor: authSending ? "not-allowed" : "pointer",
      }}
    >
      Cancel
    </button>

    
  </div>
</div>

  </div>
)}


    </div>
    
  );
}
