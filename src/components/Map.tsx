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
  username?: string | null;
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
function isUnder18(birthdate: string) {
  const d = new Date(birthdate);
  if (Number.isNaN(d.getTime())) return false;

  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age < 18;
}
async function uploadAvatar(file: File, userId: string) {
  const ext = file.name.split(".").pop();
  const path = `${userId}.${ext}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(path);

  return data.publicUrl;
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
  const [usernamesById, setUsernamesById] = useState<Record<string, string>>({});
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
const [reviewOpen, setReviewOpen] = useState(false);
const [revieweeSkills, setRevieweeSkills] = useState<string[]>([]);
const [reviewRating, setReviewRating] = useState(5);
const [reviewComment, setReviewComment] = useState("");
const [reviewSkill, setReviewSkill] = useState("");
const [reviewSending, setReviewSending] = useState(false);
const [activeThreadTradeId, setActiveThreadTradeId] = useState<string | null>(null);


// --- AUTH (MVP) ---
const [sessionEmail, setSessionEmail] = useState<string | null>(null);
const [sessionUserId, setSessionUserId] = useState<string | null>(null);

// Right panel mode 
const [panelView, setPanelView] = useState<"main" | "profile" | "publicProfile">("main");


// 2) When a pin is selected, load its completed_trade row (if any)
useEffect(() => {
  if (!selectedTradeId) {
    setCompletedTrade(null);
    return;
  }
  loadCompletedTrade(selectedTradeId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedTradeId]);


/* Profile state + load/save logic */
type ProfileRow = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  birthdate: string | null;
  avatar_url: string | null;
  skills: string[] | null;
  bio: string | null;
};
const [publicProfile, setPublicProfile] = useState<ProfileRow | null>(null);
const [publicSkills, setPublicSkills] = useState<string[]>([]);
type SkillRatingRow = {
  skill_key: string;
  avg_rating: number;
  review_count: number;
  tier: string | null;
};

const [publicSkillRatings, setPublicSkillRatings] = useState<SkillRatingRow[]>([]);
function tierForSkill(skill: string, ratings: any[]) {
  const row = (ratings ?? []).find(
    (r: any) => (r?.skill_key ?? "").toLowerCase() === (skill ?? "").toLowerCase()
  );
  return row?.tier ?? "NEW";
}


type CompletedTradeRow = {
  trade_id: string;
  owner_user_id: string;
  completed_by_user_id: string;
  completed_at: string | null;
  status: string | null;
  thread_message_count: number | null;
  reviews_enabled: boolean | null;
};



const [completedTrade, setCompletedTrade] = useState<CompletedTradeRow | null>(null);
const [revieweeUserId, setRevieweeUserId] = useState<string | null>(null);
const [canReview, setCanReview] = useState(false);
const [alreadyReviewed, setAlreadyReviewed] = useState(false);

useEffect(() => {
  // Default off
  setCanReview(false);
  setRevieweeUserId(null);

  if (!completedTrade) return;
  if (!sessionUserId) return;

  const owner = completedTrade.owner_user_id;
  const doer = completedTrade.completed_by_user_id;

  // Only participants can review
  if (sessionUserId !== owner && sessionUserId !== doer) return;

  // Determine who I'm reviewing (the "other" participant)
  const other = sessionUserId === owner ? doer : owner;
  if (!other) return;

  // Only allow when status looks completed
  const status = (completedTrade.status ?? "").toLowerCase();
  if (status && status !== "completed") return;
  // Must be gate-enabled (prevents “review” from showing when enabled=false)
  
  if (!completedTrade.reviews_enabled) return;

// Must be a participant
const isParticipant =
  completedTrade.owner_user_id === sessionUserId ||
  completedTrade.completed_by_user_id === sessionUserId;

if (!isParticipant) return;

// Who am I reviewing? (the other participant)
const otherUser =
  completedTrade.owner_user_id === sessionUserId
    ? completedTrade.completed_by_user_id
    : completedTrade.owner_user_id;

if (!otherUser) return;

// If I've already reviewed, don't allow again
if (alreadyReviewed) return;

setRevieweeUserId(otherUser);
setCanReview(true);

}, [completedTrade, sessionUserId]);




const [profileLoading, setProfileLoading] = useState(false);
const [profileSaving, setProfileSaving] = useState(false);
const [profileError, setProfileError] = useState<string>("");

const [pUsername, setPUsername] = useState("");
const [pFirstName, setPFirstName] = useState("");
const [pLastName, setPLastName] = useState("");
const [pBirthdate, setPBirthdate] = useState("");
const [pBio, setPBio] = useState("");
const [pAvatarUrl, setPAvatarUrl] = useState<string | null>(null);
const [pSkillsText, setPSkillsText] = useState(""); // comma-separated

async function loadMyProfile() {
  if (!sessionUserId) return;

  setProfileLoading(true);
  setProfileError("");
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, first_name, last_name, birthdate, avatar_url, skills, bio")
      .eq("id", sessionUserId)
      .single();

    if (error) {
      setProfileError(error.message);
      return;
    }

    const row = data as unknown as ProfileRow;

    setPUsername(row.username ?? "");
    setPFirstName(row.first_name ?? "");
    setPLastName(row.last_name ?? "");
    setPBirthdate(row.birthdate ?? "");
    setPBio(row.bio ?? "");
    setPAvatarUrl(row.avatar_url ?? null);
    setPSkillsText((row.skills ?? []).join(", "));
  } finally {
    setProfileLoading(false);
  }
}
async function loadPublicProfile(userId: string) {
  setPublicProfile(null);
  setPublicSkills([]);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, bio, avatar_url, skills")
    .eq("id", userId)
    .single();

  if (error || !data) return;

  setPublicProfile(data as ProfileRow);
  setPublicSkills((data.skills ?? []) as string[]);
  // Load skill rating tiers for this user
try {
  const { data: ratings, error: rErr } = await supabase
    .from("skill_rating_summary")
    .select("skill_key, avg_rating, review_count, tier")
    .eq("user_id", userId)
    .order("avg_rating", { ascending: false });

  if (rErr) console.warn("skill_rating_summary load failed:", rErr.message);
  setPublicSkillRatings((ratings ?? []) as any);
} catch {
  setPublicSkillRatings([]);
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
      first_name: pFirstName.trim() || null,
      last_name: pLastName.trim() || null,
      birthdate: pBirthdate || null,
      bio: pBio.trim() || null,
      avatar_url: pAvatarUrl,
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
  if (typeof window === "undefined") return;

  const seen = localStorage.getItem("skilltraders_seen_tutorial");
  if (!seen) {
    setShowTutorial(true);
  }
}, []);


const [msgEmail, setMsgEmail] = useState("");
const [msgBody, setMsgBody] = useState("");
const [sendingMsg, setSendingMsg] = useState(false);

const [pendingMessageTradeId, setPendingMessageTradeId] = useState<string | null>(null);


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
  if (!sessionUserId) {
  setPendingMessageTradeId(activeThreadTradeId);
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
        from_email: pUsername?.trim() ? `@${pUsername.trim()}` : "",
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
await updateReviewGate(activeThreadTradeId);
await loadCompletedTrade(activeThreadTradeId);

  } finally {
    setReplySending(false);
  }
}

async function submitReview() {
  if (!sessionUserId) return;
  if (!completedTrade) return;
  if (!revieweeUserId) return;
  if (!canReview) return;


  const rating = Math.max(1, Math.min(5, reviewRating));
  const skill = reviewSkill.trim();
  if (!skill) return;

  setReviewSending(true);

  try {
    const { error } = await supabase.rpc("submit_trade_review", {
  p_trade_id: completedTrade.trade_id,
  p_reviewee_user_id: revieweeUserId,
  p_rating: rating,
  p_comment: reviewComment || null,
  p_skill_ratings: [{ skill, rating }],
});



    if (error) {
      alert(error.message);
      return;
    }

    setReviewOpen(false);
    setReviewSkill("");
    setReviewComment("");
    setReviewRating(5);
    setCanReview(false);
        // Mark as already reviewed (prevents re-showing button)
    setAlreadyReviewed(true);

    // Close the conversation thread so it disappears
    setInboxOpen(false);
    setActiveThreadTradeId(null);

    // Refresh inbox list
    await loadInbox();
  } finally {
    setReviewSending(false);
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


/// 0) Auth session: restore + listen for changes (single source of truth)
useEffect(() => {
  let alive = true;

  const syncSession = async (session: any | null) => {
    const email = session?.user?.email ?? null;
    const uid = session?.user?.id ?? null;

    if (!alive) return;

    setSessionEmail(email);
    setSessionUserId(uid);

    if (uid) {
      // close auth UI
      if (email) setAuthEmail(email);
      setAuthOpen(false);
      setAuthSent(false);

      // ✅ Pull latest data as soon as session exists (rehydrate-safe)
      try { await loadMyProfile(); } catch {}
      try { await loadTrades(); } catch {}
      try { await loadInbox(); } catch {}
    } else {
      // signed out / no session
      setInbox([]);
    }
  };

  supabase.auth.getSession().then(({ data }) => {
  const s = data.session ?? null;
  console.log("[AUTH:getSession]", {
    uid: s?.user?.id ?? null,
    email: s?.user?.email ?? null,
    exp: (s as any)?.expires_at ?? null,
  });
  syncSession(s);
});


  const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
  const uid = session?.user?.id ?? null;
  const email = session?.user?.email ?? null;
  const exp = (session as any)?.expires_at ?? null;

  console.log("[AUTH]", event, { uid, email, exp });

  if (event === "SIGNED_OUT") {
    syncSession(null);
    return;
  }

  syncSession(session ?? null);
});


  return () => {
    alive = false;
    sub.subscription.unsubscribe();
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

async function fetchUsernamesForIds(ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean))) as string[];
  if (!unique.length) return {};

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", unique);

  if (error) return {};

  const map: Record<string, string> = {};
  (data ?? []).forEach((p: any) => {
    if (p?.id && p?.username) map[p.id] = p.username;
  });

  return map;
}

// 2.5) Load inbox (one row per thread)
async function loadInbox() {
  if (!sessionUserId) {
  setInbox([]);
  setInboxError("");
  setInboxLoading(false);
  return;
}



  setInboxLoading(true);
  setInboxError("");

  try {
    const me = sessionUserId;
if (!me) {
  setInbox([]);
  setInboxLoading(false);
  return;
}


    // Get messages that involve me (sent OR received)
    // Get hidden trade ids for ME only
const { data: hiddenRows, error: hiddenErr } = await supabase
  .from("inbox_hidden")
  .select("trade_id")
  .eq("user_id", me)
  .eq("hidden", true);

if (hiddenErr) {
  console.warn("inbox_hidden lookup failed:", hiddenErr.message);
}

const hiddenTradeIds = new Set((hiddenRows ?? []).map((r: any) => r.trade_id));

// Now fetch messages involving me (sent OR received)
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
    const rowsVisible = rows.filter((r) => r.trade_id && !hiddenTradeIds.has(r.trade_id));

    // Build username map for everyone involved in these messages
const idsToLookup = rows
  .flatMap((r) => [r.from_user_id, r.to_user_id])
  .filter(Boolean) as string[];

const nameMap = await fetchUsernamesForIds(idsToLookup);

// Merge into state (don’t wipe existing)
setUsernamesById((prev) => ({ ...prev, ...nameMap }));


    // Group by trade_id
    const byTrade = new globalThis.Map<string, any[]>();
    for (const r of rowsVisible) {
      if (!r.trade_id) continue;
      const arr = byTrade.get(r.trade_id) ?? [];
      arr.push(r);
      byTrade.set(r.trade_id, arr);
    }

    const grouped = Array.from(byTrade.entries()).map(([trade_id, msgs]) => {
      // newest first
      msgs.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const latest = msgs[0];

      // NEW if any message TO me is unread
      const hasUnread = msgs.some((m) => m.to_user_id === me && !m.read_at);

      // Pick any message that involves the other user
const otherMsg =
  msgs.find((m) => m.from_user_id && m.from_user_id !== me) ??
  msgs.find((m) => m.to_user_id && m.to_user_id !== me) ??
  latest;

// Identify the "other" user id (preferred) and keep email only as fallback
const otherUserId =
  (otherMsg?.from_user_id && otherMsg.from_user_id !== me ? otherMsg.from_user_id : null) ??
  (otherMsg?.to_user_id && otherMsg.to_user_id !== me ? otherMsg.to_user_id : null) ??
  null;

const otherEmail = otherMsg?.from_email ?? "user";

return {
  ...latest,
  trade_id,
  __hasUnread: hasUnread,
  __otherUserId: otherUserId,
  __otherEmail: otherEmail,
};
});


    // Sort threads by latest message time
    grouped.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Remove any threads where the "other" is actually me (use userId, not email)
const filtered = grouped.filter((m: any) => {
  const otherId = (m as any).__otherUserId;
  return otherId && otherId !== me;
});


    setInbox(filtered as any[]);

// Fetch usernames for inbox rows
const inboxUserIds = Array.from(
  new Set(
    filtered
      .map((m: any) => m.__otherUserId)
      .filter((id: string | null) => !!id)
  )
) as string[];

if (inboxUserIds.length) {
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", inboxUserIds);

  const map: Record<string, string> = {};
  (profs ?? []).forEach((p: any) => {
    if (p?.id && p?.username) map[p.id] = p.username;
  });

  setUsernamesById((prev) => ({ ...prev, ...map }));
}

  } catch (e: any) {
    setInboxError(e?.message ?? "unknown error");
    setInbox([]);
  } finally {
    setInboxLoading(false);
  }
}



  

// 2.6) Load one thread (conversation) for a trade
async function loadThread(tradeId: string) {
    if (!sessionUserId) return;

  setThreadLoading(true);
  try {
    const me = sessionUserId;

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
        await updateReviewGate(tradeId);
    await loadCompletedTrade(tradeId);
        const ids = Array.from(
      new Set(
        (data ?? [])
          .flatMap((m: any) => [m.from_user_id, m.to_user_id])
          .filter(Boolean)
      )
    ) as string[];

    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", ids);

      if (profs) {
        setUsernamesById((prev) => {
          const next = { ...prev };
          (profs as any[]).forEach((p) => {
            if (p?.id && p?.username) next[p.id] = p.username;
          });
          return next;
        });
      }
    }

  } finally {
    setThreadLoading(false);
  }
}
async function updateReviewGate(tradeId: string) {
  const tradeIdUuid = (tradeId ?? "").toString().trim();
  if (!tradeIdUuid) return;

  const { error } = await supabase.rpc("update_completed_trade_review_gate", {
    p_trade_id: tradeIdUuid,
  });

  // Non-fatal; don’t break the UI if it fails
  if (error) console.warn("update_review_gate failed:", error.message);
}


async function loadCompletedTrade(tradeId: string) {
  const { data, error } = await supabase
    .from("completed_trades")
    .select("trade_id, owner_user_id, completed_by_user_id, completed_at, status, thread_message_count, reviews_enabled")
    .eq("trade_id", tradeId)
    .maybeSingle();

  if (error) {
    console.warn("completed_trades lookup failed:", error.message);
    setCompletedTrade(null);
    return;
  }

  setCompletedTrade((data as any) ?? null);
 // Check if *I* already reviewed this trade (prevents duplicates)
// reviews.trade_id is UUID; only query when tradeId looks like a UUID
const tradeUuidOk =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    tradeId
  );

if (!tradeUuidOk) {
  setAlreadyReviewed(false);
} else {
  const { data: existing, error: reviewErr } = await supabase
    .from("reviews")
    .select("id")
    .eq("trade_id", tradeId)
    .eq("reviewer_user_id", sessionUserId ?? "")
    .maybeSingle();

  if (reviewErr) console.warn("reviews lookup failed:", reviewErr.message);
  setAlreadyReviewed(!!existing);
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


    // Fetch usernames for the user_ids on these trades
const ids = Array.from(new Set(clean.map((t) => t.user_id).filter(Boolean))) as string[];

if (ids.length) {
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", ids);

  const map: Record<string, string> = {};
  (profs ?? []).forEach((p: any) => {
    if (p?.id && p?.username) map[p.id] = p.username;
  });

  setUsernamesById(map);

  // Attach username onto each trade for easy rendering
  const withNames = clean.map((t) => ({
    ...t,
    username: t.user_id ? map[t.user_id] ?? null : null,
  }));

  setTrades(withNames as any);
} else {
  setTrades(clean);
}

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
// Auto-refresh map pins every 30 seconds (no Supabase Realtime)
useEffect(() => {
  const interval = setInterval(() => {
    loadTrades();
  }, 30000); // 30 seconds

  return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


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
    <div
  id="profile-link-${t.id}"
  style="
    font-size:13px;
    margin-bottom:10px;
    opacity:.85;
    cursor:pointer;
  "
>
  Posted by <b>@${escapeHtml(t.username ?? "user")}</b>
</div>


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
  const profileLink = document.getElementById(`profile-link-${t.id}`);

  if (profileLink && t.user_id) {
  const uid = t.user_id;

  profileLink.onclick = async () => {
    await loadPublicProfile(uid);
    setPanelView("publicProfile");
  };
}


  if (!btn) return;

  btn.onclick = async () => {
    setSelectedTradeId(t.id);

    if (t.user_id) {
  const uid = t.user_id;
  await loadPublicProfile(uid);
  setPanelView("publicProfile");
}


    if (!sessionUserId) {
  setPendingMessageTradeId(t.id);
  setAuthOpen(true);
  setAuthSent(false);
  return;
}


    if (!pUsername) {
  loadMyProfile();
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
if (!sessionUserId) {
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
  if (!sessionUserId) {
    setAuthOpen(true);
    setAuthSent(false);
    return;
  }

  const ok = confirm("Hide this conversation?");
  if (!ok) return;

  // 1) Find the trade_id for this message
  const { data: msgRow, error: msgErr } = await supabase
    .from("messages")
    .select("trade_id")
    .eq("id", messageId)
    .maybeSingle();

  if (msgErr) {
    alert(`Hide failed (lookup): ${msgErr.message}`);
    return;
  }

  const tradeId = (msgRow as any)?.trade_id as string | null;
  if (!tradeId) {
    alert("Hide failed: missing trade id.");
    return;
  }

  // 2) Hide thread for ME only (do NOT delete messages)
  const { error: hideErr } = await supabase
    .from("inbox_hidden")
    .upsert(
      [
        {
          user_id: sessionUserId,
          trade_id: tradeId,
          hidden: true,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "user_id,trade_id" }
    );

  if (hideErr) {
    alert(`Hide failed (inbox_hidden): ${hideErr.message}`);
    return;
  }

  // 3) Close thread UI if it’s open
  if (activeThreadTradeId === tradeId) {
    setActiveThreadTradeId(null);
    setThreadMsgs([]);
    setInboxOpen(false);
  }

  // 4) Remove locally so UI updates immediately
  setInbox((prev) => prev.filter((m: any) => m.trade_id !== tradeId));
  setThreadMsgs((prev) => prev.filter((m: any) => m.trade_id !== tradeId));

  // 5) Re-sync inbox
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

  // Auth
  setSessionEmail(null);
  setSessionUserId(null);
  setAuthOpen(false);
  setAuthSent(false);

  // Inbox / messaging
  setInbox([]);
  setInboxError("");
  setInboxLoading(false);
  setActiveThreadTradeId(null);
  setThreadMsgs([]);
  setInboxOpen(false);

  // Modals / UI
  setMessageOpen(false);

  // Trades / reviews
  setSelectedTradeId(null);
  setCompletedTrade(null);
  setCanReview(false);
  setRevieweeUserId(null);

  // Optional safety
  setStatus("");
}



async function sendMessage() {
  // Require login only when sending
  if (!sessionUserId) {
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
  from_user_id: sessionUserId,
  to_user_id: selectedTrade.user_id,
  from_email: pUsername?.trim() ? `@${pUsername.trim()}` : "",
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
    await updateReviewGate(selectedTrade.id);


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
      if (!sessionUserId) {
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

    <div style={{ marginTop: 6 }}>
      <span style={{ opacity: 0.75 }}>Bio:</span>{" "}
      <span style={{ fontWeight: 700 }}>
        {pBio?.trim() ? pBio.trim() : "—"}
      </span>
    </div>

    <div style={{ marginTop: 8 }}>
  <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>
    Skills
  </div>

  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
    {(pSkillsText
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) || []
    ).map((skill) => (
      <div
        key={skill}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.06)",
          fontSize: 12,
          fontWeight: 800,
          whiteSpace: "nowrap",
        }}
      >
        <span>{skill}</span>

        {/* Badge placeholder */}
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.18)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 900,
            opacity: 0.6,
          }}
          title="Tier badge (coming soon)"
        >
          NEW
        </span>
      </div>
    ))}
  </div>
</div>

  </div>
</div>
    {!sessionUserId ? (
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
<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
  <div
    style={{
      width: 64,
      height: 64,
      borderRadius: "50%",
      background: "#0b1220",
      border: "1px solid rgba(255,255,255,0.12)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    }}
  >
    {pAvatarUrl ? (
      <img src={pAvatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    ) : (
      <span style={{ opacity: 0.6, fontSize: 12 }}>No photo</span>
    )}
  </div>

  <label
    style={{
      fontSize: 13,
      opacity: 0.85,
      cursor: "pointer",
      textDecoration: "underline",
    }}
  >
    Change photo
    <input
      type="file"
      accept="image/*"
      style={{ display: "none" }}
      onChange={async (e) => {
        if (!e.target.files?.[0] || !sessionUserId) return;
        try {
          const url = await uploadAvatar(e.target.files[0], sessionUserId);
          setPAvatarUrl(url);
        } catch (err: any) {
          alert(err.message ?? "Avatar upload failed");
        }
      }}
    />
  </label>
</div>

        <label style={{ fontSize: 13, opacity: 0.85 }}>Username (public)</label>
        <input value={pUsername} onChange={(e) => setPUsername(e.target.value)} placeholder="e.g. coltt" style={S.input} />

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
<label style={{ fontSize: 13, opacity: 0.85 }}>Birthdate (private)</label>
<input
  type="date"
  value={pBirthdate}
  onChange={(e) => setPBirthdate(e.target.value)}
  style={S.input}
/>
{pBirthdate && isUnder18(pBirthdate) ? (
  <div
    style={{
      marginTop: 8,
      padding: 10,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.06)",
      fontSize: 13,
      opacity: 0.95,
    }}
  >
    For your safety, please meet in a safe public place when making trades.
  </div>
) : null}

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

        {panelView === "publicProfile" && publicProfile && (
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
      <div style={{ fontWeight: 900, fontSize: 15 }}>
        @{publicProfile.username}
      </div>

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

    {publicProfile.avatar_url && (
      <img
        src={publicProfile.avatar_url}
        alt="avatar"
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          objectFit: "cover",
          marginTop: 10,
          border: "1px solid rgba(255,255,255,0.18)",
        }}
      />
    )}

    <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
      {publicProfile.bio || "—"}
    </div>

    <div style={{ marginTop: 12 }}>
      <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>
        Skills
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {publicSkills.map((skill) => (
          <div
            key={skill}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            <span>{skill}</span>
            <div
  style={{
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.18)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 900,
    opacity: 0.9,
  }}
  title={`Tier ${tierForSkill(skill, publicSkillRatings)}`}
>
  {tierForSkill(skill, publicSkillRatings)}
</div>

          </div>
        ))}
      </div>
      {publicSkillRatings.length > 0 ? (
  <div style={{ marginTop: 12 }}>
    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
      Ratings (by skill)
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {publicSkillRatings.map((r) => (
        <div
          key={r.skill_key}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div>
            <div style={{ fontWeight: 900, fontSize: 13 }}>
              {r.skill_key}
            </div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {Number(r.avg_rating).toFixed(2)} ★ • {r.review_count} review{r.review_count === 1 ? "" : "s"}
            </div>
          </div>

          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.08)",
              fontWeight: 900,
              fontSize: 12,
              minWidth: 44,
              textAlign: "center",
            }}
            title={r.tier ? `Tier ${r.tier}` : "New (not enough reviews yet)"}
          >
            {r.tier ?? "NEW"}
          </div>
        </div>
      ))}
    </div>
  </div>
) : null}

    </div>
  </div>
)}

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
        if (!sessionUserId) {
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

  {!sessionUserId ? (
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
  const otherUserId = (m as any).__otherUserId as string | null;
const otherLabel = otherUserId ? `@${usernamesById[otherUserId] ?? "loading…"}` : "@user";

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
          title={`${hasUnread ? "NEW message from " : "Message from "}${otherLabel}`}
        >
          {hasUnread ? "NEW message from " : "Message from "}
          {otherLabel}
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

    // Hide this thread for ME only (do not delete messages)
  const { error: hideErr } = await supabase
    .from("inbox_hidden")
    .upsert(
      { user_id: me, trade_id: m.trade_id, hidden: true, updated_at: new Date().toISOString() },
      { onConflict: "user_id,trade_id" }
    );

  if (hideErr) {
    alert(hideErr.message);
    return;
  }

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
{canReview && revieweeUserId && !alreadyReviewed && (

  <button
    onClick={async () => {
  try {
    setRevieweeSkills([]); // reset each time
    if (!revieweeUserId) {
      setReviewOpen(true);
      return;
    }

    const { data, error } = await supabase
  .from("profiles")
  .select("skills")
  .eq("id", revieweeUserId)
  .maybeSingle();

console.log("[REVIEWEE PROFILE RAW]", { revieweeUserId, data, error });
console.log("[REVIEWEE SKILLS RAW]", {
  raw: (data as any)?.skills ?? (data as any)?.skills_offered,
});

if (error) console.warn("load reviewee skills error:", error);


    // Accept either a string[] or a comma-separated string (defensive)
    const raw = (data as any)?.skills;
    const list: string[] = Array.isArray(raw)
      ? raw
      : typeof raw === "string"
      ? raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    setRevieweeSkills(list);
    // If they haven't listed skills, default to General Trade
if (!list.length) {
  setReviewSkill("General Trade");
} else {
  // If current selection isn't in their list, reset to first option
  if (!list.includes(reviewSkill)) setReviewSkill(list[0]);
}

  } finally {
    setReviewOpen(true);
     setInboxOpen(false);
  }
}}

    style={{
      width: "100%",
      marginTop: 10,
      padding: 11,
      borderRadius: 12,
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.15)",
      color: "white",
      fontWeight: 900,
      fontSize: 14,
      cursor: "pointer",
    }}
  >
    Leave Review
  </button>
)}


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

<div
  style={{
    marginTop: 10,
    marginBottom: 10,
    padding: 10,
    borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    fontSize: 13,
    fontWeight: 650,
    opacity: 0.92,
    lineHeight: 1.35,
  }}
>
  Reviews are left <b>inside the conversation</b> after a trade is marked{" "}
  <b>Trade Completed</b>. Don’t delete the thread until both sides leave a review.
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

{selectedTrade?.username && (
  <div
    style={{
      opacity: 0.85,
      fontSize: 13,
      cursor: "pointer",
      textDecoration: "underline",
      marginTop: 6,
    }}
    onClick={async () => {
      if (!selectedTrade.user_id) return;
      await loadPublicProfile(selectedTrade.user_id);
      setPanelView("publicProfile");
    }}
  >
    Posted by @{selectedTrade.username}
  </div>
)}


  <button
    onClick={() => {
  if (!sessionUserId) {
  setPendingMessageTradeId(selectedTrade.id);
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
      cursor: sessionUserId ? "pointer" : "not-allowed",
opacity: sessionUserId ? 1 : 0.6,

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

      // completed_by_user_id should be the OTHER participant from the conversation thread
const me = (await supabase.auth.getUser()).data.user?.id ?? null;
if (!me) {
  alert("You must be signed in to complete a post.");
  return;
}

// Find the other participant from messages on this trade
let completedBy: string | null = null;

const { data: msgs, error: msgErr } = await supabase
  .from("messages")
  .select("from_user_id,to_user_id")
  .eq("trade_id", selectedTrade.id)
  .order("created_at", { ascending: false })
  .limit(50);

if (msgErr) {
  alert(`Could not read messages for this trade: ${msgErr.message}`);
  return;
}

const ids = new Set<string>();
(msgs ?? []).forEach((m: any) => {
  if (m?.from_user_id) ids.add(m.from_user_id);
  if (m?.to_user_id) ids.add(m.to_user_id);
});

// remove myself
ids.delete(me);

// pick the other participant
completedBy = Array.from(ids)[0] ?? null;

if (!completedBy) {
  alert(
    "No other participant found. Complete the trade from a conversation after messaging."
  );
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

      // 3) Update review gate + refresh completed row + refresh thread/inbox
await updateReviewGate(selectedTrade.id);
await loadCompletedTrade(selectedTrade.id);
await loadInbox();
setActiveThreadTradeId(selectedTrade.id);
await loadThread(selectedTrade.id);

// 4) Refresh UI
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
    Trade Completed
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

      <div
  style={{
    fontSize: 13,
    opacity: 0.85,
    fontWeight: 800,
    marginBottom: 10,
  }}
>
  You: @{pUsername ? pUsername : "loading…"}
</div>


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
         !sessionUserId||
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
            !sessionUserId ||
            !msgBody.trim() ||
            !selectedTrade
            ? "not-allowed"
            : "pointer",

            opacity:
            sendingMsg ||
            !sessionUserId ||
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
{reviewOpen && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: 14,
    }}
    onClick={() => setReviewOpen(false)}
  >
    <div
      style={{
        width: "min(520px, 100%)",
        background: "rgba(10,18,28,0.96)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 16,
        padding: 14,
        boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 900 }}>Leave a review</div>
        <button
          onClick={() => setReviewOpen(false)}
          style={{
            border: "none",
            background: "transparent",
            color: "rgba(255,255,255,0.8)",
            fontSize: 18,
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
        Rate the user for this completed trade.
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ fontSize: 13, opacity: 0.85 }}>Overall rating (1–5)</label>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
  {[1, 2, 3, 4, 5].map((n) => (
    <button
      key={n}
      onClick={() => setReviewRating(n)}
      style={{
        flex: 1,
        padding: "10px 0",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.18)",
        background:
          reviewRating === n
            ? "rgba(16,185,129,0.25)"
            : "rgba(255,255,255,0.08)",
        color: "white",
        fontWeight: 900,
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      {n}
    </button>
  ))}
</div>

      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ fontSize: 13, opacity: 0.85 }}>Skill (example: Plumbing)</label>
        <select
  value={reviewSkill}
  onChange={(e) => setReviewSkill(e.target.value)}
  style={{
    width: "100%",
    padding: 11,
    borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(255,255,255,0.12)",
    fontSize: 14,
    fontWeight: 700,
    outline: "none",
  }}
>
  <option value="" disabled>
    Select a skill…
  </option>

  {(revieweeSkills?.length ? revieweeSkills : ["General"]).map((s) => (
    <option key={s} value={s}>
      {s}
    </option>
  ))}
</select>
{revieweeSkills.length === 0 && (
  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
    This user hasn’t listed specific skills yet — your review will be saved as <b>General Trade</b>.
  </div>
)}


      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ fontSize: 13, opacity: 0.85 }}>Comment (optional)</label>
        <textarea
          value={reviewComment}
          onChange={(e) => setReviewComment(e.target.value)}
          placeholder="Quick note (optional)"
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
            marginTop: 6,
            resize: "vertical",
          }}
        />
      </div>

      <button
        disabled={reviewSending || !reviewSkill.trim()}
        onClick={submitReview}
        style={{
          width: "100%",
          marginTop: 12,
          padding: 12,
          borderRadius: 12,
          background: "#1bbf8a",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "#06101a",
          fontWeight: 900,
          fontSize: 15,
          cursor:
            reviewSending || !reviewSkill.trim() ? "not-allowed" : "pointer",
          opacity: reviewSending || !reviewSkill.trim() ? 0.6 : 1,
        }}
      >
        Submit review
      </button>
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
                <div
  style={{
    fontSize: 12,
    opacity: 0.7,
    cursor: "pointer",
    textDecoration: "underline",
    display: "inline-block",
  }}
  onClick={async () => {
    if (!m.from_user_id) return;
    await loadPublicProfile(m.from_user_id);
    setPanelView("publicProfile");
  }}
>
  From: @{m.from_user_id ? usernamesById[m.from_user_id] ?? "user" : "user"} •{" "}
  {new Date(m.created_at).toLocaleString()}
</div>



                <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600, whiteSpace: "pre-wrap" }}>
                  {m.body}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 2 }}>
  
</div>


              </div>
            ))}

{/* REVIEW GATE (debug-safe) */}
<div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
  <div style={{ fontSize: 12, opacity: 0.75 }}>
    Gate:{" "}
    {activeThreadTradeId
      ? `trade=${activeThreadTradeId} | completed=${completedTrade?.trade_id ?? "null"} | enabled=${String(
          completedTrade?.reviews_enabled
        )} | count=${completedTrade?.thread_message_count ?? "?"}`
      : "no active thread"}
  </div>

  {activeThreadTradeId &&
  completedTrade?.trade_id === activeThreadTradeId &&
  completedTrade?.reviews_enabled &&
  !alreadyReviewed && (
      <button
        onClick={async () => {
  try {
    setRevieweeSkills([]); // reset each time
    if (!revieweeUserId) {
      setReviewOpen(true);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("skills")
      .eq("id", revieweeUserId)
      .maybeSingle();

    if (error) console.warn("load reviewee skills error:", error);

    // Accept either a string[] or a comma-separated string (defensive)
    const raw = (data as any)?.skills;
    const list: string[] = Array.isArray(raw)
      ? raw
      : typeof raw === "string"
      ? raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    setRevieweeSkills(list);
    // If they haven't listed skills, default to General Trade
if (!list.length) {
  setReviewSkill("General Trade");
} else {
  // If current selection isn't in their list, reset to first option
  if (!list.includes(reviewSkill)) setReviewSkill(list[0]);
}

  } finally {
    setReviewOpen(true);
    setInboxOpen(false);
  }
}}
style={{
    flexShrink: 0,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 13,
    whiteSpace: "nowrap",
  }}
      >
        Leave Review
      </button>
    )}
</div>

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
