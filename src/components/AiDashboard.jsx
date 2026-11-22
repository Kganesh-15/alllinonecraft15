import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls, Html, Sparkles as DreiSparkles, Float as DreiFloat, Stars as DreiStars } from "@react-three/drei";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import ProjectsPanel, { ProjectWorkspace, TemplatesGallery, CommunityFeed } from "./ProjectsPanel";
import PlotCraftFX from "./PlotCraftFX";
import PlotCraftDesign from "./PlotCraftDesign";
import * as PlotCraftHeroModule from "./PlotCraftHero";
const PlotCraftHero = PlotCraftHeroModule.default ?? PlotCraftHeroModule.PlotCraftHero;
import { WorkspaceShortcuts, WorkspaceWelcome, WorkspaceRecent, WorkspaceGroup } from "./PlotCraftWorkspace";
import VfxToolPanel from "./PlotCraftVfxTools";
import {
  Sparkles,
  Plus,
  Search,
  LogOut,
  LogIn,
  Image as ImageIcon,
  Video,
  BookOpen,
  Volume2,
  VolumeX,
  Loader2,
  LockKeyhole,
  X,
  Trash2,
  ChevronRight,
  Play,
  Pause,
  Download,
  Droplet,
  Star,
  Heart,
  BookOpenCheck,
  Bot,
  Compass,
  ExternalLink,
  Info,
  HelpCircle,
  Award,
  Palette,
  FileText,
  MessageSquare,
  Menu,
  Home,
  ChevronLeft,
  Code2,
  Phone,
  Mail,
  Rocket,
  Cpu,
  CheckCircle2,
  Copy,
  Gamepad2,
  Brain,
  Calculator,
  Trophy,
  RotateCcw,
  Lightbulb,
  Grid3x3,
  Pencil,
  Eraser,
  PaintBucket,
  Smile,
  Undo2,
  Save,
  Flame,
  CalendarDays,
  Square,
  Circle,
  Users,
  Mic,
  FolderOpen,
  Clapperboard,
  Wand2,
  Layers,
  ArrowUpRight,
  Crown,
  Box,
  Film,
  PenTool,
  Scissors,
  Music2,
  Sofa,
  FlaskConical,
  Brush,
  Upload,
  Check,
  ArrowLeft,
  Redo2,
  Grid,
  Type,
  User,
  Wrench,
  Orbit,
  ArrowRight,
  Zap,
  HardDrive,
  MousePointer2,
  ChevronDown,
  Gauge,
  Music,
  SlidersHorizontal,
  SkipBack,
  Camera,
  ZoomIn,
  ZoomOut,
  Shapes,
  Blend,
  Repeat,
  LayoutGrid,
  Eye,
  EyeOff,
  Send,
  Paperclip,
  AlertTriangle,
  ShieldCheck,
  History,
  Cloud,
  RefreshCw,
} from "lucide-react";

/* ===== Stand-ins for modules that were not uploaded (services/ and sub-components).
   Replace each one with your real implementation when you have the file. ===== */
const API_BASE = (typeof window !== "undefined" && window.PLOTCRAFT_API_BASE) ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : "http://localhost:5000");
const TOKEN_KEY = "plotcraft_auth_token";
const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || null; } catch { return null; } };
const setToken = (token) => { try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY); } catch {} };
const apiRequest = async (path, options = {}) => {
  const headers = { ...(options.body && !(options.body instanceof Blob) ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = options.raw ? response : await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.message || `Request failed (${response.status})`);
    err.status = response.status;
    throw err;
  }
  return data;
};
const waitForJob = async (path, jobId, onProgress, pagesKey = "pages") => {
  let offset = 0;
  for (let attempt = 0; attempt < 900; attempt++) {
    const data = await apiRequest(`${path}/${encodeURIComponent(jobId)}${path.includes("stories/status") ? `?from=${offset}` : ""}`);
    onProgress?.(data.message || "Working…");
    if (data[pagesKey]?.length) offset += data[pagesKey].length;
    if (data.status === "done") return data;
    if (data.status === "error") {
      const err = new Error(data.message || "Generation stopped.");
      err.canContinue = path.includes("stories/status");
      err.jobId = jobId;
      err.pages = data.pages || [];
      throw err;
    }
    await new Promise(resolve => setTimeout(resolve, 1800));
  }
  throw new Error("The job is taking longer than expected. Please check again.");
};
const generateStory = async (payload, { onProgress } = {}) => {
  const start = await apiRequest("/api/stories/start", { method: "POST", body: JSON.stringify(payload) });
  const allPages = [];
  for (let attempt = 0; attempt < 900; attempt++) {
    const status = await apiRequest(`/api/stories/status/${encodeURIComponent(start.jobId)}?from=${allPages.length}`);
    onProgress?.(status.message || "Writing story…");
    allPages.push(...(status.pages || []));
    if (status.status === "done") return { jobId: start.jobId, pages: allPages };
    if (status.status === "error") { const e = new Error(status.message || "Story generation stopped."); e.canContinue = true; e.jobId = start.jobId; e.pages = allPages; throw e; }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  const e = new Error("Story generation is still running. Continue in a moment."); e.canContinue = true; e.jobId = start.jobId; e.pages = allPages; throw e;
};
const continueStory = async (jobId, existingPages = [], { onProgress } = {}) => {
  await apiRequest(`/api/stories/continue/${encodeURIComponent(jobId)}`, { method: "POST", body: "{}" });
  const allPages = [...existingPages];
  for (let attempt = 0; attempt < 900; attempt++) {
    const status = await apiRequest(`/api/stories/status/${encodeURIComponent(jobId)}?from=${allPages.length}`);
    onProgress?.(status.message || "Continuing story…");
    allPages.push(...(status.pages || []));
    if (status.status === "done") return { jobId, pages: allPages };
    if (status.status === "error") { const e = new Error(status.message || "Story generation stopped."); e.canContinue = true; e.jobId = jobId; e.pages = allPages; throw e; }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  const e = new Error("Story is still running. Continue in a moment."); e.canContinue = true; e.jobId = jobId; e.pages = allPages; throw e;
};
const generateImageWithInfo = async (prompt, { style } = {}) => {
  const data = await apiRequest("/api/generate-image", { method: "POST", body: JSON.stringify({ prompt, style }) });
  return { imageUrl: data.imageUrl, provider: data.provider, style: data.style };
};
const generateVideo = async (prompt, { onProgress } = {}) => {
  const start = await apiRequest("/api/generate-video", { method: "POST", body: JSON.stringify({ prompt }) });
  for (let i = 0; i < 900; i++) {
    const data = await apiRequest(`/api/video-status/${encodeURIComponent(start.jobId)}`);
    onProgress?.(data.message || "Rendering video…");
    if (data.status === "done" && data.videoUrl) return data.videoUrl;
    if (data.status === "error") throw new Error(data.message || "Video generation failed.");
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error("Video generation is still running. Please try again shortly.");
};
const registerUser = async ({ name, email, password }) => {
  const data = await apiRequest("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
  setToken(data.token); return data.user;
};
const loginUser = async ({ email, password }) => {
  const data = await apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  setToken(data.token); return data.user;
};
const logoutUser = async () => { try { await apiRequest("/api/auth/logout", { method: "POST", body: "{}" }); } finally { setToken(null); } };
const fetchMe = async () => { if (!getToken()) return null; try { const data = await apiRequest("/api/auth/me"); return data.user || null; } catch { setToken(null); return null; } };
const stopSpeaking = () => { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {} };

/* Built-in help answers, used when no chat server is configured (API_BASE). */
function localReply(q) {
  const t = (q || "").toLowerCase();
  if (/^(hi|hello|hey|hai|namaste|hyy?)\b/.test(t)) return "Hi! Nenu PlotCraft AI assistant. Story, image, video, ya studio lo em help kavali?";
  if (/story|katha|kathalu|plot/.test(t)) return "Story kosam: Story tab open cheyyandi, genre and characters select cheyyandi, tarvata Generate click cheyyandi.";
  if (/video/.test(t)) return "Video kosam: Video tab open cheyyandi, prompt rayandi, duration select cheyyandi, tarvata Generate. Login avasaram.";
  if (/image|photo|picture|prompt/.test(t)) return "Image kosam: Image tab lo subject, style, lighting, background details ivvandi. Detailed prompt tho results baguntayi.";
  if (/studio|edit|animation|theme|font|icon/.test(t)) return "Studio lo Art, Characters, Animate, Video, Design, Write, Learn categories unnayi. Theme picker lo mee nachina style select cheyyochu.";
  if (/feature|enti|em undi|what can/.test(t)) return "Ee app lo Story generation, Image/Video creation, PlotCraft Pro studio, games, Drawing studio, mariyu profile unnayi.";
  if (/login|sign|account/.test(t)) return "Login / Sign Up sidebar lo undi. Login ayyaka image/video lantivi use cheyyochu.";
  return "Nakku ee question ki exact answer ledu. Story, image, video, studio, ya login gurinchi inka clear ga adagandi, nenu help chestaanu.";
}

/* chat + image + saved-chat services (stand-ins until services/openai and services/api are added) */
const chatAI = async ({ messages = [], file } = {}) => {
  const data = await apiRequest("/api/chat", { method: "POST", body: JSON.stringify({ messages, file }) });
  return data.reply || "The assistant returned an empty response.";
};
const generateImage = async (prompt) => {
  const data = await apiRequest("/api/generate-image", { method: "POST", body: JSON.stringify({ prompt }) });
  if (!data.imageUrl) throw new Error("The image engine returned no image.");
  return data.imageUrl;
};
const listChats = async () => { const data = await apiRequest("/api/chats"); return data.chats || []; };
const getChat = async (id) => { const data = await apiRequest(`/api/chats/${encodeURIComponent(id)}`); return data.chat || null; };
const saveChat = async (id, messages) => apiRequest(`/api/chats/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ messages }) });
const deleteChat = async (id) => apiRequest(`/api/chats/${encodeURIComponent(id)}`, { method: "DELETE" });

const Placeholder = ({ title, icon }) => (
  <div className="pc-fade-up" style={{ padding: 28, textAlign: "center", opacity: 0.85 }}>
    <div style={{ fontSize: 34 }}>{icon}</div>
    <div style={{ fontWeight: 600, marginTop: 8 }}>{title} — coming soon</div>
  </div>
);
/* ===== AI chat (AiSearch.jsx) ===== */
// import ReadAloudButton from "./ReadAloudButton";

/* ---------- tiny markdown renderer (no dependencies, no innerHTML) ---------- */
const renderInline = (text) =>
  text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded-md bg-black/10 font-mono text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });

function Markdown({ text }) {
  const lines = text.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(
        <pre key={blocks.length} className="my-3 p-4 rounded-2xl bg-black/80 text-green-200 text-xs font-mono overflow-x-auto leading-relaxed">
          {code.join("\n")}
        </pre>
      );
      continue;
    }

    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const size = ["text-xl", "text-lg", "text-base", "text-sm"][h[1].length - 1];
      blocks.push(
        <h3 key={blocks.length} className={`${size} font-extrabold mt-5 mb-1.5`}>
          {renderInline(h[2])}
        </h3>
      );
      i++;
      continue;
    }

    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ""));
        i++;
      }
      const Tag = ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={blocks.length} className={`my-2 pl-6 space-y-1 ${ordered ? "list-decimal" : "list-disc"}`}>
          {items.map((it, k) => (
            <li key={k}>{renderInline(it)}</li>
          ))}
        </Tag>
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^\s*([-*]|\d+\.)\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={blocks.length} className="my-2">
        {renderInline(para.join(" "))}
      </p>
    );
  }

  return <div className="text-sm leading-7">{blocks}</div>;
}

/* ---------- story verdict ---------- */
const VERDICTS = {
  ORIGINAL: {
    label: "Original imagination",
    note: "No existing story matched this.",
    icon: ShieldCheck,
    cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
  },
  EXISTING: {
    label: "Already exists",
    note: "This matches a story that is already out there.",
    icon: BookOpen,
    cls: "bg-amber-500/15 text-amber-500 border-amber-500/40",
  },
  INSPIRED: {
    label: "Inspired by an existing story",
    note: "Original in parts, but it borrows from a known work.",
    icon: Lightbulb,
    cls: "bg-sky-500/15 text-sky-500 border-sky-500/40",
  },
  UNSURE: {
    label: "Couldn't verify",
    note: "Not enough to say for certain.",
    icon: HelpCircle,
    cls: "bg-slate-500/15 text-slate-400 border-slate-500/40",
  },
};

// The server asks the model to start story replies with:
//   VERDICT: EXISTING | CONFIDENCE: 90
//   SOURCE: The Tortoise and the Hare (Aesop's Fables)
const parseVerdict = (raw) => {
  const m = raw.match(/^\s*VERDICT:\s*([A-Za-z]+)\s*(?:\|\s*CONFIDENCE:\s*(\d+))?/i);
  if (!m) return { body: raw };
  const key = m[1].toUpperCase();
  if (!VERDICTS[key]) return { body: raw };
  const src = raw.match(/^\s*SOURCE:\s*(.*)$/im);
  const body = raw
    .replace(/^\s*VERDICT:.*$/im, "")
    .replace(/^\s*SOURCE:.*$/im, "")
    .trim();
  return {
    verdict: key,
    confidence: m[2] ? Math.min(100, Number(m[2])) : null,
    source: src ? src[1].trim() : "",
    body,
  };
};

/* ---------- file helpers ---------- */
const TEXT_EXT = /\.(js|jsx|ts|tsx|json|py|java|c|cpp|cs|go|rb|php|html|css|scss|md|txt|csv|xml|yml|yaml|sql|sh|env|ini|log)$/i;
const MAX_TEXT_BYTES = 300 * 1024;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const readFile = (file) =>
  new Promise((resolve, reject) => {
    const isImage = file.type.startsWith("image/");
    const isText = file.type.startsWith("text/") || TEXT_EXT.test(file.name) || file.type === "application/json";

    if (!isImage && !isText) return reject(new Error("Unsupported file. Attach a code/text file or an image."));
    if (isImage && file.size > MAX_IMAGE_BYTES) return reject(new Error("Image is too large (max 4 MB)."));
    if (isText && file.size > MAX_TEXT_BYTES) return reject(new Error("File is too large (max 300 KB)."));

    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, kind: isImage ? "image" : "text", content: reader.result });
    reader.onerror = () => reject(new Error("Could not read the file."));
    if (isImage) reader.readAsDataURL(file);
    else reader.readAsText(file);
  });

const IMAGE_RE = /^\s*(\/image|image:|draw\b|(generate|create|make|paint)\s+(me\s+)?(an?\s+)?(image|picture|illustration)\b)/i;

const SUGGESTIONS = [
  { text: "Is 'The Tortoise and the Hare' an original story?", icon: BookOpen },
  { text: "Check my idea: a robot who is afraid of the dark", icon: Lightbulb },
  { text: "Draw a tiny dragon learning to fly, storybook style", icon: ImageIcon, image: true },
  { text: "Attach a code file and I'll find the errors in it", icon: Paperclip, attach: true },
];

/* ---------- capsule opening animation + look of the chat ---------- */
// All keyframe names start with "pcx" so they never clash with other components.
const CHAT_CSS = `
@keyframes pcxCapsuleIn { 0% { opacity: 0; transform: scale(.4) rotate(-8deg) } 60% { opacity: 1; transform: scale(1.07) rotate(1deg) } 100% { opacity: 1; transform: scale(1) rotate(0) } }
@keyframes pcxMark { 0% { opacity: 0; transform: rotate(-200deg) scale(.2) } 100% { opacity: 1; transform: none } }
@keyframes pcxTagline { 0%, 55% { opacity: 0; transform: translateY(6px) } 100% { opacity: 1; transform: none } }
@keyframes pcxGlow { 0%, 100% { filter: drop-shadow(0 0 16px rgba(217,70,239,.45)) } 50% { filter: drop-shadow(0 0 40px rgba(139,92,246,.9)) } }
@keyframes pcxShake { 0%, 100% { transform: translateX(0) } 20% { transform: translateX(-3px) } 40% { transform: translateX(3px) } 60% { transform: translateX(-2px) } 80% { transform: translateX(2px) } }
@keyframes pcxUp { to { transform: translateY(-100%) } }
@keyframes pcxDown { to { transform: translateY(100%) } }
@keyframes pcxSeam { 0% { opacity: 0; transform: scaleX(0) } 25% { opacity: 1 } 65% { opacity: 1; transform: scaleX(1) } 100% { opacity: 0; transform: scaleX(1.15) } }
@keyframes pcxReveal { from { opacity: 0; transform: scale(.965); filter: blur(8px) } to { opacity: 1; transform: none; filter: blur(0) } }
@keyframes pcxRise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
@keyframes pcxFloat { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
@keyframes pcxDrift { 0%, 100% { transform: translate(0, 0) scale(1) } 50% { transform: translate(34px, -22px) scale(1.15) } }

.pcx-stage { background: radial-gradient(ellipse at center, #3b0764 0%, #14072f 45%, #07030f 100%); }
.pcx-capsule-glow { animation: pcxGlow 2.2s ease-in-out infinite; }
.pcx-capsule { animation: pcxCapsuleIn 1s cubic-bezier(.2,.9,.3,1.2) both; }
.pcx-mark { display: inline-flex; animation: pcxMark 1s ease-out .15s both; }
.pcx-tagline { animation: pcxTagline 1.1s ease-out both; }
.pcx-half-top { animation: pcxShake .3s linear .9s, pcxUp .95s cubic-bezier(.76,0,.24,1) 1.2s forwards; }
.pcx-half-bottom { animation: pcxShake .3s linear .9s, pcxDown .95s cubic-bezier(.76,0,.24,1) 1.2s forwards; }
.pcx-seam { height: 2px; background: linear-gradient(90deg, transparent, #fff 20%, #f0abfc 50%, #fff 80%, transparent); box-shadow: 0 0 26px 7px rgba(244,114,182,.85); animation: pcxSeam 1s ease-out 1.05s both; }
.pcx-rise { animation: pcxRise .4s ease-out both; }
.pcx-float { animation: pcxFloat 4.5s ease-in-out infinite; }
.pcx-aurora-a { animation: pcxDrift 14s ease-in-out infinite; }
.pcx-aurora-b { animation: pcxDrift 18s ease-in-out -6s infinite reverse; }

@media (prefers-reduced-motion: reduce) {
  .pcx-capsule-glow, .pcx-capsule, .pcx-mark, .pcx-tagline, .pcx-half-top, .pcx-half-bottom, .pcx-seam,
  .pcx-rise, .pcx-float, .pcx-aurora-a, .pcx-aurora-b { animation: none !important; }
}
`;

// The capsule drawing. It is rendered twice (top half and bottom half) and the two copies line up exactly.
function CapsuleArt() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
      <div className="pcx-capsule-glow">
        <div className="pcx-capsule rounded-full p-[3px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400">
          <div className="rounded-full bg-[#0d0524] pl-5 pr-9 py-4 flex items-center gap-4">
            <span className="pcx-mark">
              <PlotCraftLogo size={60} />
            </span>
            <span className="text-3xl font-black tracking-tight text-white whitespace-nowrap">
              Plot<span className="bg-gradient-to-r from-fuchsia-400 to-amber-300 bg-clip-text text-transparent">Chat</span>
            </span>
          </div>
        </div>
      </div>
      <p className="pcx-tagline text-[11px] tracking-[0.35em] uppercase text-violet-200/80">AI Story Studio</p>
    </div>
  );
}

// 1) the capsule logo pops in  2) it cracks in the middle  3) the top half flies up, the bottom half flies down
// 4) the whole chat is revealed. Click anywhere to skip.
function CapsuleIntro({ onDone }) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const t = setTimeout(() => doneRef.current(), 2350);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="absolute inset-0 z-30 overflow-hidden cursor-pointer" onClick={() => doneRef.current()} aria-hidden="true">
      <div className="pcx-half-top absolute inset-x-0 top-0 h-1/2 overflow-hidden">
        <div className="pcx-stage absolute inset-x-0 top-0 h-[200%]">
          <CapsuleArt />
        </div>
      </div>
      <div className="pcx-half-bottom absolute inset-x-0 bottom-0 h-1/2 overflow-hidden">
        <div className="pcx-stage absolute inset-x-0 bottom-0 h-[200%]">
          <CapsuleArt />
        </div>
      </div>
      <div className="pcx-seam absolute left-0 right-0 z-10" style={{ top: "calc(50% - 1px)" }} />
    </div>
  );
}

let chatUid = 0;
const nextId = () => `m${Date.now()}_${chatUid++}`;
const newChatId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Guests: chats are kept on this device. Logged-in users: chats are kept on the server (their account).
const GUEST_KEY = "plotcraft_guest_chats";
const readGuestChats = () => {
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
  } catch {
    return [];
  }
};
const writeGuestChats = (chats) => {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(chats.slice(0, 30)));
  } catch {
    /* storage full or unavailable */
  }
};
const chatTitle = (messages) => {
  const first = messages.find((m) => m.role === "user");
  return (first?.content || "New chat").slice(0, 60);
};
// generated pictures are big, so only the text of an image message is saved
const stripImages = (messages) => messages.map(({ imageUrl, ...rest }) => rest);

function AiSearch({ currentStyle, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [imageMode, setImageMode] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(null); // null | "chat" | "image"
  const [fileError, setFileError] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const fileInputRef = useRef(null);
  const endRef = useRef(null);

  // ----- saved chats -----
  const [chatId, setChatId] = useState(newChatId);
  const [chatList, setChatList] = useState([]);
  const [showHistory, setShowHistory] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  const [saveStatus, setSaveStatus] = useState(""); // "", "saved", "error"
  const lastSaved = useRef(""); // what is already stored, so opening an old chat does not re-save it
  const userId = currentUser?.id || null;

  // opening animation: plays every time this tab is opened (skipped for people who turned animations off)
  const [intro, setIntro] = useState(() => {
    try {
      if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "done";
    } catch {
      /* matchMedia unavailable */
    }
    return "playing";
  });

  const refreshList = async () => {
    try {
      if (userId) {
        setChatList(await listChats());
      } else {
        setChatList(
          readGuestChats()
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt }))
        );
      }
    } catch {
      setChatList([]);
    }
  };

  // load the list again whenever someone logs in or out, and start a clean chat
  useEffect(() => {
    lastSaved.current = "";
    setMessages([]);
    setChatId(newChatId());
    refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // auto-save a moment after the answer has finished
  useEffect(() => {
    if (loading || messages.length === 0) return;
    const toSave = stripImages(messages);
    const signature = JSON.stringify(toSave);
    if (signature === lastSaved.current) return;
    const timer = setTimeout(async () => {
      try {
        if (userId) {
          await saveChat(chatId, toSave);
        } else {
          const others = readGuestChats().filter((c) => c.id !== chatId);
          writeGuestChats([{ id: chatId, title: chatTitle(toSave), messages: toSave, updatedAt: Date.now() }, ...others]);
        }
        lastSaved.current = signature;
        setSaveStatus("saved");
        refreshList();
      } catch {
        setSaveStatus("error");
      }
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading]);

  const openChat = async (id) => {
    if (loading) return;
    try {
      let chat;
      if (userId) chat = await getChat(id);
      else chat = readGuestChats().find((c) => c.id === id);
      if (!chat) return;
      lastSaved.current = JSON.stringify(stripImages(chat.messages));
      setChatId(chat.id);
      setMessages(chat.messages);
      setSaveStatus("");
      setFile(null);
      if (typeof window !== "undefined" && window.innerWidth < 768) setShowHistory(false);
    } catch {
      setSaveStatus("error");
    }
  };

  const removeChat = async (id) => {
    try {
      if (userId) await deleteChat(id);
      else writeGuestChats(readGuestChats().filter((c) => c.id !== id));
    } catch {
      /* ignore */
    }
    if (id === chatId) newChat();
    refreshList();
  };

  const regenerateImage = async (m) => {
    if (loading) return;
    setLoading("image");
    try {
      const url = await generateImage(m.content);
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, imageUrl: url } : x)));
    } catch (err) {
      add({ role: "assistant", kind: "text", error: true, content: err?.message || "Image generation failed." });
    } finally {
      setLoading(null);
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const add = (msg) => setMessages((prev) => [...prev, { id: nextId(), ...msg }]);

  const handleFile = async (e) => {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    setFileError("");
    try {
      setFile(await readFile(picked));
    } catch (err) {
      setFileError(err.message);
    }
  };

  const runImage = async (prompt, shown) => {
    add({ role: "user", kind: "text", content: shown || prompt });
    setLoading("image");
    try {
      const url = await generateImage(prompt);
      add({ role: "assistant", kind: "image", imageUrl: url, content: prompt });
    } catch (err) {
      add({ role: "assistant", kind: "text", error: true, content: err?.message || "Image generation failed." });
    } finally {
      setLoading(null);
    }
  };

  const runChat = async (text, attached) => {
    const history = messages
      .filter((m) => !m.error)
      .slice(-12)
      .map((m) => ({
        role: m.role,
        content: m.kind === "image" ? `[Generated an image of: ${m.content}]` : m.raw || m.content,
      }));

    add({ role: "user", kind: "text", content: text || `Check ${attached.name} for errors`, fileName: attached?.name });
    setLoading("chat");
    try {
      const raw = await chatAI({
        messages: [...history, { role: "user", content: text || "Find every error and bug in the attached file." }],
        file: attached || undefined,
      });
      const parsed = parseVerdict(raw);
      add({ role: "assistant", kind: "text", raw, ask: text, ...parsed, content: parsed.body });
    } catch (err) {
      add({
        role: "assistant",
        kind: "text",
        error: true,
        content: err?.message || "Something went wrong. Is the server running on port 5000?",
      });
    } finally {
      setLoading(null);
    }
  };

  const send = (override) => {
    const text = (override ?? input).trim();
    if (loading) return;
    if (!text && !file) return;

    const wantsImage = !file && (imageMode || IMAGE_RE.test(text));
    setInput("");
    setFileError("");

    if (wantsImage) {
      const prompt = text.replace(IMAGE_RE, "").trim() || text;
      setImageMode(false);
      runImage(prompt, text);
    } else {
      const attached = file;
      setFile(null);
      runChat(text, attached);
    }
  };

  const copyText = async (m) => {
    try {
      await navigator.clipboard.writeText(m.content);
      setCopiedId(m.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const downloadImage = async (url) => {
    try {
      // works for data URLs and for normal image links
      const blob = await (await fetch(url)).blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "plotchat_image.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(url, "_blank", "noopener");
    }
  };

  const newChat = () => {
    lastSaved.current = "";
    setChatId(newChatId());
    setSaveStatus("");
    setMessages([]);
    setInput("");
    setFile(null);
    setImageMode(false);
    setFileError("");
  };

  const pickSuggestion = (s) => {
    if (s.attach) return fileInputRef.current?.click();
    if (s.image) {
      setImageMode(false);
      return send(s.text);
    }
    send(s.text);
  };

  return (
    <div className="rounded-[2rem] p-[1.5px] bg-gradient-to-br from-violet-500/70 via-fuchsia-500/40 to-amber-400/70 shadow-[0_24px_80px_-24px_rgba(168,85,247,0.6)]">
      <style>{CHAT_CSS}</style>
      <div className={`relative flex h-[calc(100vh-9.5rem)] min-h-[480px] rounded-[1.9rem] overflow-hidden ${currentStyle.bgCard}`}>
        {/* soft moving light behind everything */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="pcx-aurora-a absolute -top-24 -left-20 w-80 h-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="pcx-aurora-b absolute -bottom-28 -right-16 w-96 h-96 rounded-full bg-violet-500/20 blur-3xl" />
        </div>

        {intro === "playing" && <CapsuleIntro onDone={() => setIntro("done")} />}

        <div
          className="relative z-10 flex flex-1 min-w-0"
          style={intro === "playing" ? { animation: "pcxReveal .9s ease-out 1.2s both" } : undefined}
        >
      {/* saved chats */}
      <aside className={`${showHistory ? "flex" : "hidden"} w-56 shrink-0 flex-col border-r border-black/10 bg-black/[0.03]`}>
        <div className="p-3 border-b border-black/10">
          <button
            onClick={newChat}
            className={`w-full px-3 py-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-purple-500/30 hover:scale-[1.02] transition ${currentStyle.btnPrimary}`}
          >
            <Plus className="w-3.5 h-3.5" /> New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 px-2 py-1">Your chats</p>
          {chatList.length === 0 ? (
            <p className="text-[11px] opacity-50 px-2">Chats you have will be saved here.</p>
          ) : (
            chatList.map((c) => (
              <div
                key={c.id}
                onClick={() => openChat(c.id)}
                className={`group flex items-center justify-between gap-1 px-3 py-2 rounded-full text-xs cursor-pointer transition ${
                  c.id === chatId ? "bg-gradient-to-r from-violet-500/25 to-fuchsia-500/20 font-bold" : "hover:bg-black/5"
                }`}
              >
                <span className="truncate">{c.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeChat(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 cursor-pointer"
                  title="Delete chat"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
        <p className="text-[10px] opacity-60 p-3 border-t border-black/10 flex items-start gap-1.5 leading-snug">
          {userId ? <Cloud className="w-3 h-3 shrink-0 mt-0.5" /> : <HardDrive className="w-3 h-3 shrink-0 mt-0.5" />}
          {userId ? "Saved to your account. Open them on any device." : "Saved on this device only. Log in to keep them on your account."}
        </p>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
      {/* top bar (capsule shaped, like the logo) */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between gap-3 pl-2 pr-2 py-2 rounded-full bg-black/5 border border-black/10 backdrop-blur">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="p-2 rounded-full hover:bg-black/10 cursor-pointer"
              title="Saved chats"
            >
              <History className="w-4 h-4" />
            </button>
            <PlotCraftLogo size={28} />
            <span className="font-black text-sm tracking-tight">
              Plot<span className={currentStyle.logoTheme}>Chat</span>
            </span>
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] opacity-60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> online
            </span>
            {saveStatus === "saved" && <span className="text-[10px] opacity-50">Saved</span>}
            {saveStatus === "error" && <span className="text-[10px] text-red-500">Could not save</span>}
          </div>
          <button
            onClick={newChat}
            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:scale-[1.03] transition ${currentStyle.btnSecondary}`}
          >
            <Plus className="w-3.5 h-3.5" /> New chat
          </button>
        </div>
      </div>

      {/* conversation */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        {messages.length === 0 && !loading ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto gap-7">
            <div className="pcx-float">
              <div className="rounded-full p-[2px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 shadow-[0_0_40px_rgba(168,85,247,0.45)]">
                <div className="rounded-full bg-[#0d0524] pl-3 pr-6 py-2.5 flex items-center gap-2.5">
                  <PlotCraftLogo size={38} />
                  <span className="text-lg font-black text-white tracking-tight">
                    Plot<span className="bg-gradient-to-r from-fuchsia-400 to-amber-300 bg-clip-text text-transparent">Chat</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 bg-clip-text text-transparent">
                Hello! What story shall we explore?
              </h1>
              <p className="text-xs opacity-60 max-w-md mx-auto leading-relaxed">
                Paste a story or an idea and I'll tell you if it already exists or is truly original. I can also draw it, or check a file for errors.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {SUGGESTIONS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.text}
                    onClick={() => pickSuggestion(s)}
                    style={{ animationDelay: `${(intro === "playing" ? 1.5 : 0.1) + i * 0.08}s` }}
                    className={`pcx-rise group text-left p-4 rounded-3xl text-xs leading-relaxed flex items-start gap-3 transition cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/20 ${currentStyle.btnSecondary}`}
                  >
                    <span className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 text-white flex items-center justify-center group-hover:scale-110 transition">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="pt-1.5">{s.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-7">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="pcx-rise flex justify-end">
                  <div className="max-w-[85%] space-y-1.5">
                    {m.fileName && (
                      <div className="flex justify-end">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1.5 ${currentStyle.badgeBg}`}>
                          <FileText className="w-3 h-3" /> {m.fileName}
                        </span>
                      </div>
                    )}
                    <div className={`${currentStyle.userBubble || "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white"} rounded-3xl rounded-br-lg px-4 py-2.5 text-sm whitespace-pre-wrap break-words shadow-lg shadow-purple-500/25`}>
                      {m.content}
                    </div>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="pcx-rise flex gap-3">
                  <div className="shrink-0 mt-1">
                    <PlotCraftLogo size={30} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {m.error ? (
                      <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{m.content}</span>
                      </div>
                    ) : m.kind === "image" && !m.imageUrl ? (
                      <div className="p-3 rounded-2xl bg-black/5 text-xs flex flex-wrap items-center gap-3">
                        <ImageIcon className="w-4 h-4 opacity-60" />
                        <span className="opacity-70 max-w-md truncate">Image not kept in history: "{m.content}"</span>
                        <button
                          onClick={() => regenerateImage(m)}
                          disabled={!!loading}
                          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${currentStyle.btnSecondary}`}
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Create again
                        </button>
                      </div>
                    ) : m.kind === "image" ? (
                      <div className="space-y-2">
                        <img src={m.imageUrl} alt={m.content} className="w-full max-w-xl rounded-2xl shadow-lg" />
                        <button
                          onClick={() => downloadImage(m.imageUrl)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${currentStyle.btnSecondary}`}
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-3xl rounded-tl-lg bg-black/[0.04] border border-black/10 px-4 py-3">
                        {m.verdict && (
                          <div className={`mb-3 p-4 rounded-2xl border ${VERDICTS[m.verdict].cls}`}>
                            <div className="flex items-center gap-2 font-extrabold text-sm">
                              {React.createElement(VERDICTS[m.verdict].icon, { className: "w-4 h-4" })}
                              {VERDICTS[m.verdict].label}
                              {m.confidence !== null && m.confidence !== undefined && (
                                <span className="ml-auto text-[11px] font-bold opacity-80">{m.confidence}% sure</span>
                              )}
                            </div>
                            <p className="text-xs mt-1 opacity-90">{VERDICTS[m.verdict].note}</p>
                            {m.source && m.source.toLowerCase() !== "none found" && m.source.toLowerCase() !== "none" && (
                              <p className="text-xs mt-2 font-semibold">Found in: {m.source}</p>
                            )}
                          </div>
                        )}
                        <Markdown text={m.content} />
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <button
                            onClick={() => copyText(m)}
                            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/10 transition cursor-pointer"
                            title="Copy"
                          >
                            {copiedId === m.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <ReadAloudButton
                            text={m.verdict ? `${VERDICTS[m.verdict].label}. ${m.content}` : m.content}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${currentStyle.btnSecondary}`}
                          />
                          {m.verdict && m.ask && (
                            <button
                              disabled={!!loading}
                              onClick={() => runImage(`Children's storybook illustration of this story: ${m.ask.slice(0, 400)}`, "Draw this story")}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${currentStyle.btnSecondary}`}
                            >
                              <ImageIcon className="w-3.5 h-3.5" /> Draw this story
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {loading && (
              <div className="flex gap-3">
                <div className="shrink-0 mt-1 animate-pulse">
                  <PlotCraftLogo size={30} />
                </div>
                <div className="flex-1 min-w-0">
                  {loading === "image" ? (
                    <div className="w-full max-w-xl aspect-video rounded-2xl bg-black/10 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-7 h-7 animate-spin text-purple-500" />
                      <p className="text-xs opacity-70">Creating your image…</p>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-4 py-3 rounded-full bg-black/5 border border-black/10">
                      {[0, 150, 300].map((d) => (
                        <span key={d} className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* composer */}
      <div className="px-4 md:px-8 pb-5 pt-2">
        <div className="max-w-3xl mx-auto space-y-2">
          {(file || fileError) && (
            <div className="flex flex-wrap items-center gap-2">
              {file && (
                <span className={`pl-3 pr-1.5 py-1 rounded-full text-xs flex items-center gap-2 ${currentStyle.badgeBg}`}>
                  {file.kind === "image" ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                  <span className="max-w-[200px] truncate">{file.name}</span>
                  <button onClick={() => setFile(null)} className="p-1 rounded-full hover:bg-black/10 cursor-pointer" title="Remove file">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {fileError && <span className="text-xs text-red-500">{fileError}</span>}
            </div>
          )}

          <div className={`flex items-end gap-1.5 pl-3 pr-2 py-2 rounded-[1.75rem] border border-white/10 shadow-[0_12px_40px_-16px_rgba(168,85,247,0.55)] focus-within:ring-2 focus-within:ring-fuchsia-500/50 transition ${currentStyle.bgInput}`}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.js,.jsx,.ts,.tsx,.json,.py,.java,.c,.cpp,.cs,.go,.rb,.php,.html,.css,.scss,.md,.txt,.csv,.xml,.yml,.yaml,.sql,.sh,.log"
              onChange={handleFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-full hover:bg-black/10 transition cursor-pointer shrink-0"
              title="Attach a file to check for errors"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setImageMode((v) => !v)}
              className={`px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                imageMode ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-fuchsia-500/40" : "hover:bg-black/10"
              }`}
              title="Generate an image with OpenAI"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Create image</span>
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={Math.min(5, Math.max(1, input.split("\n").length))}
              placeholder={
                imageMode
                  ? "Describe the image you want…"
                  : file
                  ? "What should I check? (optional)"
                  : "Paste a story or ask anything…"
              }
              className="flex-1 bg-transparent outline-none resize-none text-sm py-2.5 min-w-0"
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={!!loading || (!input.trim() && !file)}
              className={`p-3 rounded-full shrink-0 transition cursor-pointer disabled:opacity-40 hover:scale-105 shadow-lg shadow-purple-500/30 ${currentStyle.btnPrimary}`}
              title="Send"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-center opacity-50">
            Story checks come from the AI's knowledge and can be wrong. Treat them as a strong hint, not proof.
          </p>
        </div>
      </div>
      </div>
        </div>
      </div>
    </div>
  );
}

const fetchStats = async () => (await apiRequest("/api/stats")).stats;

const useAboutCountUp = (target, run) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run || target == null) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setValue(target); return; }
    const start = performance.now();
    const duration = 1400;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(target * (1 - Math.pow(1 - t, 4))); // ease-out
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return value;
};

function AboutStat({ label, value, decimals = 0, run }) {
  const v = useAboutCountUp(value, run);
  return (
    <div className="group relative text-center p-5 rounded-3xl bg-white/5 dark:bg-black/20 border border-white/10 dark:border-white/5 backdrop-blur-xl hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-purple-500/10 hover:border-purple-500/30 transition-all duration-500">
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <p className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-500 bg-clip-text text-transparent tracking-tight">
        {value == null ? "—" : v.toFixed(decimals)}
      </p>
      <p className="text-[11px] font-semibold opacity-70 mt-1.5 uppercase tracking-wider">{label}</p>
    </div>
  );
}

const ABOUT_FEATURES = [
  {
    id: "story",
    icon: BookOpen,
    title: "Story & Writing",
    text: "Give a title and a hero's name, pick a genre, and get a complete story. Open it as a full page, listen to it, or download it.",
    tip: "Try: 'The Clever Rabbit and the Lion' with the hero 'Felix'.",
  },
  {
    id: "chat",
    icon: MessageSquare,
    title: "AI Chat & Story Check",
    text: "Paste a story or idea and PlotChat tells you whether it already exists or is original. It can also review files for errors. Every chat is saved to your account.",
    tip: "Try: 'Is Cinderella an original story?'",
  },
  {
    id: "image",
    icon: ImageIcon,
    title: "AI Image Generator",
    text: "Turn a scene into a storybook-style picture in 2D or 3D style, then download it.",
    tip: "Describe the scene in one or two sentences.",
  },
  {
    id: "video",
    icon: Video,
    title: "AI Video Generator",
    text: "Describe a scene and get a short AI video clip that plays right here. Free video engines can be busy, so a render can take a few minutes.",
    tip: "Short clips take a minute or two when the engines are free.",
  },
  {
    id: "projects",
    icon: FolderOpen,
    title: "Projects",
    text: "Keep your work in one place. Rename, duplicate, share with a link, or move to Trash. Trashed projects stay for 30 days before they are deleted for good. Notes autosave as you type.",
    tip: "Workspace → Projects in the sidebar.",
  },
  {
    id: "templates",
    icon: LayoutGrid,
    title: "Templates",
    text: "Start from ready-made layouts for Instagram posts, posters, banners and flyers, or from a story chapter outline. Using one creates a new project for you.",
    tip: "Create → Templates in the sidebar.",
  },
  {
    id: "voice",
    icon: Volume2,
    title: "Read Aloud",
    text: "Every story and answer can be read aloud in any language your device has a voice for, including mixed English and Telugu.",
    tip: "Tap the Read aloud button under any answer.",
  },
  {
    id: "community",
    icon: Users,
    title: "Community",
    text: "Publish your projects to the community feed, get likes and comments, and climb the creator leaderboard.",
    tip: "Community → Community Feed in the sidebar.",
  },
  {
    id: "themes",
    icon: Palette,
    title: "Themes & Dream Mode",
    text: "Eight moods, each with its own look, plus a soft Dream Mode that changes the layout and moves the logo.",
    tip: "Pick a theme from Appearance & Theme at the bottom of the sidebar.",
  },
  {
    id: "search",
    icon: Search,
    title: "Search & Favorites",
    text: "Can't find a tool? Type in the 'Search tools...' box at the top of the sidebar. Star the tools you use most and they stay at the top.",
    tip: "Try typing 'video' in the search box.",
  },
];

const ABOUT_FAQ = [
  { q: "Is PlotCraft free?", a: "Yes. Free accounts get a daily AI limit (20 AI generations per day by default). The free AI engines also get busy at times, so heavy use may need to wait a little." },
  { q: "Are my chats and projects private?", a: "Yes. Chats and projects belong to your account and only you can open them. A project is visible to others only if you share its link or publish it to the Community." },
  { q: "Can the AI be wrong about whether a story already exists?", a: "Yes. It checks using what it knows, so treat the answer as a strong hint, not proof." },
  { q: "Why do I need an account?", a: "To save chats and projects across devices, create images and videos, publish to the Community, and leave a review." },
];

function AboutPage({ currentStyle }) {
  const [active, setActive] = useState("story");
  const [open, setOpen] = useState(0);
  const [stats, setStats] = useState(undefined); // undefined = loading, null = failed
  const [inView, setInView] = useState(false);
  const statsRef = useRef(null);

  useEffect(() => {
    let alive = true;
    fetchStats().then((s) => alive && setStats(s)).catch(() => alive && setStats(null));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const feature = ABOUT_FEATURES.find((f) => f.id === active) || ABOUT_FEATURES[0];
  const FIcon = feature.icon;
  const num = (key) => (stats && typeof stats[key] === "number" ? stats[key] : null);

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8 pb-12">
      <style>{`
        @keyframes aboutSlideUp { 0% { opacity: 0; transform: translateY(24px) scale(0.98); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes aboutFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes aboutFloat { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-10px) rotate(1deg); } }
        @keyframes aboutGlow { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.08); } }
        .about-slide { animation: aboutSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .about-float { animation: aboutFloat 6s ease-in-out infinite; }
        .about-glow { animation: aboutGlow 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .about-slide, .about-float, .about-glow { animation: none !important; }
        }
      `}</style>

      {/* Hero */}
      <section className={`relative overflow-hidden p-8 md:p-14 rounded-[2.5rem] text-center ${currentStyle.bgCard} border border-white/10 shadow-2xl backdrop-blur-2xl about-slide`}>
        <div className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-purple-500/30 blur-[90px] about-glow pointer-events-none" />
        <div className="absolute -bottom-28 -right-16 w-80 h-80 rounded-full bg-pink-500/30 blur-[90px] about-glow pointer-events-none" style={{ animationDelay: "2.5s" }} />

        <div className="relative space-y-6 z-10">
          <div className="flex justify-center">
            <div className="about-float p-3 rounded-3xl bg-white/5 border border-white/10 shadow-xl backdrop-blur-md">
              <PlotCraftLogo size={76} />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold tracking-wide uppercase shadow-sm">
            <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "4s" }} />
            AI Storytelling & Media Studio
          </div>

          <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Where every <span className={currentStyle.logoTheme}>story</span> comes alive
          </h2>

          <p className="text-sm md:text-base opacity-75 max-w-xl mx-auto leading-relaxed font-medium">
            PlotCraft helps students, teachers, parents and young storytellers write stories, check originality,
            turn scenes into pictures and videos, and organize their work in projects.
          </p>
        </div>
      </section>

      {/* Real numbers from the server */}
      <section ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AboutStat label="Stories written" value={num("stories")} run={inView} />
        <AboutStat label="Creators" value={num("creators")} run={inView} />
        <AboutStat label="Chats saved" value={num("chats")} run={inView} />
        <AboutStat label="Average rating" value={num("rating")} decimals={1} run={inView} />
      </section>
      <p className="text-center text-[11px] opacity-50 -mt-2">
        {stats === undefined && "Live statistics loading..."}
        {stats === null && "Statistics abhi load avvaledu. Konchem tarvata try cheyyandi."}
        {stats && `${stats.reviews ?? 0} reviews · numbers are live from the server`}
      </p>

      {/* Feature explorer */}
      <section className={`p-6 md:p-10 rounded-[2.5rem] ${currentStyle.bgCard} border border-white/10 shadow-xl backdrop-blur-xl space-y-6 about-slide`} style={{ animationDelay: "0.15s" }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <h3 className="font-extrabold text-lg tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
            Explore what you can do
          </h3>
          <span className="text-xs opacity-50 font-medium">Click a feature to learn more</span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {ABOUT_FEATURES.map((f) => {
            const Icon = f.icon;
            const isActive = active === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActive(f.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 scale-105 border border-purple-400/30"
                    : `${currentStyle.btnSecondary} hover:scale-[1.02] border border-transparent`
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "opacity-70"}`} />
                {f.title}
              </button>
            );
          })}
        </div>

        <div key={feature.id} className="p-6 rounded-3xl bg-black/10 dark:bg-black/30 border border-white/5 flex flex-col md:flex-row gap-5 items-start animate-[aboutFade_0.4s_cubic-bezier(0.16,1,0.3,1)]">
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-600 text-white shadow-lg shadow-purple-600/30 shrink-0">
            <FIcon className="w-6 h-6" />
          </div>
          <div className="space-y-2.5">
            <h4 className="font-extrabold text-base tracking-wide text-purple-400 dark:text-purple-300">{feature.title}</h4>
            <p className="text-xs md:text-sm leading-relaxed opacity-85 font-normal">{feature.text}</p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] font-semibold">
              <Sparkles className="w-3 h-3" /> {feature.tip}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={`p-6 md:p-10 rounded-[2.5rem] ${currentStyle.bgCard} border border-white/10 shadow-xl backdrop-blur-xl space-y-4 about-slide`} style={{ animationDelay: "0.3s" }}>
        <h3 className="font-extrabold text-lg tracking-tight mb-4">Frequently Asked Questions</h3>
        <div className="space-y-3">
          {ABOUT_FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isOpen ? "bg-white/10 dark:bg-white/5 border-purple-500/30 shadow-lg" : "bg-black/5 border-white/5 hover:border-white/10"}`}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 text-xs md:text-sm font-bold cursor-pointer transition-colors"
                >
                  <span className="tracking-tight">{item.q}</span>
                  <div className={`p-1.5 rounded-full bg-white/10 transition-transform duration-300 ${isOpen ? "rotate-180 bg-purple-500 text-white" : ""}`}>
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  </div>
                </button>
                <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-xs md:text-sm opacity-75 leading-relaxed font-normal">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer card */}
      <section className={`p-6 rounded-[2rem] ${currentStyle.bgCard} border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-4 text-xs font-medium backdrop-blur-xl about-slide`} style={{ animationDelay: "0.45s" }}>
        <span className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-pink-500/10 text-pink-500">
            <Heart className="w-4 h-4 fill-pink-500" />
          </span>
          Designed and developed with passion by <strong className="font-bold tracking-wide">K.Ganesh</strong>
        </span>
        <span className="px-3.5 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-500 font-bold flex items-center gap-1.5 shadow-sm">
          <Star className="w-3.5 h-3.5 fill-yellow-400" /> Version 4.0
        </span>
      </section>
    </div>
  );
}

const USAGE_STEPS = [
  { id: "01", icon: BookOpenCheck, title: "Story & Writing", tagline: "Create epic tales instantly!", text: "Sidebar → Create → Story & Writing. Enter a title and hero name, choose a genre, and click Generate Story. Read the full page, listen to it, or download it.", gradient: "from-pink-500 via-rose-500 to-orange-500", glowColor: "group-hover:shadow-[0_0_35px_rgba(244,63,94,0.4)]", badge: "Most Popular" },
  { id: "02", icon: Bot, title: "AI Chat Assistant", tagline: "Smart chat & file analysis", text: "Sidebar → AI Tools → AI Chat. Check whether your story idea is original or inspired, ask complex questions, or attach code files to find bugs.", gradient: "from-purple-600 via-indigo-600 to-blue-500", glowColor: "group-hover:shadow-[0_0_35px_rgba(147,51,234,0.4)]", badge: "Super Smart" },
  { id: "03", icon: Cloud, title: "Auto-Saved Chats", tagline: "Never lose your thoughts", text: "Every conversation is saved. Log in and your chats sync to all your devices. Open old chats anytime from the chat list.", gradient: "from-emerald-500 via-teal-600 to-cyan-500", glowColor: "group-hover:shadow-[0_0_35px_rgba(20,184,166,0.4)]", badge: "Secure" },
  { id: "04", icon: Volume2, title: "Read Aloud Voice", tagline: "Listen to your stories", text: "Click the Read Aloud button under any story or answer. It speaks in the language of the text, handling mixed English and Telugu smoothly.", gradient: "from-amber-500 via-yellow-500 to-lime-500", glowColor: "group-hover:shadow-[0_0_35px_rgba(245,158,11,0.4)]", badge: "Audio FX" },
  { id: "05", icon: Wand2, title: "Image & AI Video", tagline: "Bring imagination to life", text: "Sidebar → AI Tools → AI Image Generator or AI Video Generator. Sign in and describe a scene. Generation can take a minute or two.", gradient: "from-cyan-500 via-sky-600 to-blue-600", glowColor: "group-hover:shadow-[0_0_35px_rgba(6,182,212,0.4)]", badge: "Creative" },
  { id: "06", icon: FolderOpen, title: "Projects & Templates", tagline: "Keep your work organized", text: "Workspace → Projects keeps your work in one place: rename, duplicate, share with a link, or move to Trash (kept 30 days). Create → Templates gives you ready-made layouts to start from.", gradient: "from-indigo-500 via-violet-600 to-purple-600", glowColor: "group-hover:shadow-[0_0_35px_rgba(99,102,241,0.4)]", badge: "Workspace" },
  { id: "07", icon: Search, title: "Search & Favorites", tagline: "Find any tool in seconds", text: "Type in 'Search tools...' at the top of the sidebar, for example 'video'. Star the tools you use most and they stay at the top of the sidebar.", gradient: "from-sky-500 via-cyan-600 to-teal-500", glowColor: "group-hover:shadow-[0_0_35px_rgba(14,165,233,0.4)]", badge: "Power User" },
  { id: "08", icon: Palette, title: "Themes & Dream Mode", tagline: "Customize your vibe", text: "Pick a theme from Appearance & Theme at the bottom of the sidebar. Turn on Dream Mode for a soft, immersive layout.", gradient: "from-fuchsia-500 via-pink-600 to-rose-600", glowColor: "group-hover:shadow-[0_0_35px_rgba(217,70,239,0.4)]", badge: "Aesthetic" },
  { id: "09", icon: Star, title: "Community & Ratings", tagline: "Share your work and your love", text: "Community → Community Feed shows published projects. Community → Top Rated lets you leave a rating after you log in. Your review and story count are shown to visitors.", gradient: "from-yellow-400 via-amber-500 to-orange-500", glowColor: "group-hover:shadow-[0_0_35px_rgba(251,191,36,0.4)]", badge: "Community" }
];


function UsagePage({ currentStyle }) {
  const [clickedCard, setClickedCard] = useState(null);

  const isLightMode = 
    !currentStyle?.bgMain?.includes("slate-950") && 
    !currentStyle?.bgMain?.includes("black") && 
    !currentStyle?.bgMain?.includes("emerald") && 
    !currentStyle?.bgMain?.includes("blue") && 
    !currentStyle?.bgMain?.includes("slate-900") &&
    !currentStyle?.bgMain?.includes("indigo");

  const cardRefs = useRef([]);

  useEffect(() => {
    const cards = cardRefs.current.filter(Boolean);
    if (!cards.length) return;

    // Find the actual scrolling container used by AiDashboard.
    // UsagePage itself is not the scroller; AiDashboard uses overflow-y-auto.
    const findScrollParent = (element) => {
      let parent = element?.parentElement;

      while (parent) {
        const style = window.getComputedStyle(parent);
        const canScroll =
          /(auto|scroll)/.test(style.overflowY) &&
          parent.scrollHeight > parent.clientHeight;

        if (canScroll) return parent;
        parent = parent.parentElement;
      }

      return window;
    };

    const scrollParent = findScrollParent(cards[0]);
    let ticking = false;

    const revealCards = () => {
      const viewportTop =
        scrollParent === window
          ? 0
          : scrollParent.getBoundingClientRect().top;

      const viewportBottom =
        scrollParent === window
          ? window.innerHeight
          : scrollParent.getBoundingClientRect().bottom;

      cards.forEach((card) => {
        if (card.classList.contains("usage-card-visible")) return;

        const rect = card.getBoundingClientRect();
        const visibleTop = Math.max(rect.top, viewportTop);
        const visibleBottom = Math.min(rect.bottom, viewportBottom);
        const visibleHeight = visibleBottom - visibleTop;

        // Trigger when a meaningful portion of the card enters the scroll area.
        if (visibleHeight >= Math.min(100, rect.height * 0.18)) {
          card.classList.add("usage-card-visible");
        }
      });

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(revealCards);
        ticking = true;
      }
    };

    // Reveal the first visible cards immediately.
    revealCards();

    scrollParent.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      scrollParent.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ticking = false;
    };
  }, [currentStyle?.bgMain]);



  return (
    <div className={`w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-10 space-y-8 relative overflow-hidden ${isLightMode ? "text-slate-950" : "text-white"}`}>
      <style>{`
        .usage-card {
          opacity: 0;
          transform: translate3d(0, 70px, 0) scale(0.82);
          filter: blur(5px);
          transition:
            opacity 1050ms cubic-bezier(0.16, 1, 0.3, 1),
            transform 1050ms cubic-bezier(0.16, 1, 0.3, 1),
            filter 1050ms cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform, filter;
        }

        .usage-card-visible {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
          filter: blur(0);
        }

        .usage-card:hover {
          transform: translate3d(0, -7px, 0) scale(1.015);
        }

        .usage-header {
          animation: usageHeaderIn 850ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .usage-footer {
          animation: usageFooterIn 900ms cubic-bezier(0.22, 1, 0.36, 1) 250ms both;
        }

        @keyframes usageHeaderIn {
          from {
            opacity: 0;
            transform: translate3d(0, -24px, 0) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @keyframes usageFooterIn {
          from {
            opacity: 0;
            transform: translate3d(0, 35px, 0) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .usage-card,
          .usage-header,
          .usage-footer {
            animation: none !important;
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
          }
        }
      `}</style>
      
      {/* Header Banner */}
      <div className={`usage-header relative overflow-hidden rounded-[2.5rem] p-8 md:p-12 ${currentStyle?.bgCard || 'bg-slate-900/90'} border ${isLightMode ? 'border-slate-300 shadow-xl bg-white text-slate-900' : 'border-white/20 shadow-2xl text-white'} backdrop-blur-xl`}>
        {/* Background Glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${isLightMode ? 'bg-purple-100 border border-purple-300 text-purple-900' : 'bg-purple-500/20 border border-purple-400/40 text-purple-200'} text-xs font-black tracking-wide shadow-sm`}>
              <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" /> PlotCraft Guide & Masterclass
            </div>
            
            {/* New Color Theme Text */}
            <h1 className={`text-3xl md:text-5xl font-black tracking-tight ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
              How to Use <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">PlotCraft</span>
            </h1>
            
            <p className={`text-sm md:text-base ${isLightMode ? 'text-slate-700 font-bold' : 'text-slate-300 font-medium'} max-w-2xl leading-relaxed`}>
              Discover how to easily master all features to build incredible stories, generate stunning AI images, and produce cinematic videos!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className={`flex items-center gap-3 ${isLightMode ? 'bg-slate-100 border border-slate-300 shadow-md text-slate-900' : 'bg-black/40 border border-white/20 shadow-xl text-white'} p-4 rounded-2xl backdrop-blur-md`}>
              <div className="p-3 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-lg">
                <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: "15s" }} />
              </div>
              <div>
                <div className={`text-xs ${isLightMode ? 'text-purple-700 font-black' : 'text-pink-300 font-bold'}`}>Total Steps</div>
                <div className={`text-lg font-black ${isLightMode ? 'text-slate-900' : 'text-amber-300'}`}>{String(USAGE_STEPS.length).padStart(2, "0")} Super Features</div>
              </div>
            </div>

            {/* Smooth Experience Badge */}
            <div className={`px-5 py-4 rounded-2xl flex items-center gap-2.5 ${
              isLightMode
                ? "bg-white border border-slate-300 text-purple-800 shadow-md"
                : "bg-white/10 border border-white/20 text-white shadow-xl"
            } backdrop-blur-md`}>
              <Sparkles className="w-5 h-5 text-pink-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider">
                Smooth Guide
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {USAGE_STEPS.map((step, idx) => {
          const IconComponent = step.icon;
          const isFeatured = idx === 0;
          const isSelected = clickedCard === step.title;

          return (
            <div 
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              key={step.title}
              onClick={() => setClickedCard(step.title)}
              style={{ transitionDelay: `${idx * 110}ms` }}
              className={`usage-card group relative rounded-[2.2rem] p-7 ${currentStyle?.bgCard || 'bg-slate-900/70'} border ${isLightMode ? 'border-slate-300 hover:border-purple-600 shadow-lg bg-white text-slate-900' : 'border-white/15 hover:border-pink-500/50 shadow-xl text-white'} transition-[border-color,box-shadow] duration-300 flex flex-col justify-between cursor-pointer ${step.glowColor} ${isFeatured ? 'lg:col-span-2' : ''} ${isSelected ? 'ring-2 ring-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.3)]' : ''}`}
            >
              {/* Top Row: Icon + Badge */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className={`p-4 rounded-2xl bg-gradient-to-r ${step.gradient} text-white shadow-xl transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full ${isLightMode ? 'bg-slate-100 border border-slate-300 text-slate-900' : 'bg-white/10 border border-white/20 text-amber-300'} text-xs font-black shadow-sm`}>
                      {step.id}
                    </span>
                    <span className={`px-3 py-1 rounded-full ${isLightMode ? 'bg-purple-100 border border-purple-200 text-purple-900' : 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/30 text-pink-300'} text-[11px] font-black`}>
                      {step.badge}
                    </span>
                  </div>
                </div>

                {/* Title & Tagline with updated vibrant colors */}
                <div className="space-y-1.5">
                  <h3 className={`text-lg md:text-xl font-black ${isLightMode ? 'text-slate-950' : 'text-white'} group-hover:text-pink-400 transition-colors duration-300`}>
                    {step.title}
                  </h3>
                  <p className={`text-xs font-black ${isLightMode ? 'text-purple-800' : 'text-pink-300'} tracking-wider uppercase`}>
                    {step.tagline}
                  </p>
                </div>

                {/* Description */}
                <p className={`text-xs md:text-sm ${isLightMode ? 'text-slate-800 font-semibold' : 'text-slate-200 font-medium'} leading-relaxed`}>
                  {step.text}
                </p>
              </div>

              {/* Bottom Footer */}
              <div className={`pt-6 mt-6 border-t ${isLightMode ? 'border-slate-200 text-slate-600' : 'border-white/10 text-slate-400'} flex items-center justify-between text-xs transition-colors`}>
                <span className={`flex items-center gap-1.5 font-black ${isLightMode ? 'text-purple-800' : 'text-amber-300'}`}>
                  <Zap className={`w-3.5 h-3.5 ${isLightMode ? 'text-purple-600' : 'text-amber-400 fill-amber-400'}`} /> Tap to interact
                </span>
                <span className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300 ${isLightMode ? 'text-purple-800 font-black' : 'text-pink-400 font-black'}`}>
                  Explore <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Callout */}
      <div className={`usage-footer p-6 rounded-[2.2rem] ${isLightMode ? 'bg-purple-50 border border-purple-200 text-slate-900 shadow-md' : 'bg-gradient-to-r from-purple-950/70 via-pink-950/70 to-slate-950/90 border border-pink-500/30 text-white shadow-2xl'} text-center space-y-3`}>
        <div className={`inline-flex items-center justify-center p-3 rounded-full ${isLightMode ? 'bg-purple-200 text-purple-800' : 'bg-pink-500/20 text-amber-300'} mb-1 shadow-md`}>
          <Flame className={`w-5 h-5 ${isLightMode ? 'text-purple-700' : 'text-amber-400 fill-amber-400'} animate-bounce`} />
        </div>
        <h4 className={`text-base font-black ${isLightMode ? 'text-slate-950' : 'text-white'}`}>Ready to create your first masterpiece?</h4>
        <p className={`text-xs ${isLightMode ? 'text-slate-700 font-bold' : 'text-slate-300 font-medium'} max-w-md mx-auto`}>
          Bring your imagination to life. Head to Create → Story & Writing or AI Tools → AI Chat and start your journey!
        </p>
      </div>

    </div>
  );
}
// Real backend helpers. `api` is the dashboard's apiRequest (it sends the login token automatically).
const fetchReviews = (api) => api("/api/reviews");
const postReview = (api, form) =>
  api("/api/reviews", { method: "POST", body: JSON.stringify({ rating: form.rating, comment: form.comment }) });
const deleteReview = (api, id) => api(`/api/reviews/${encodeURIComponent(id)}`, { method: "DELETE" });
const fetchMyStories = async (api) => (await api("/api/my-stories")).stories || [];
const deleteMyStory = (api, id) => api(`/api/my-stories/${encodeURIComponent(id)}`, { method: "DELETE" });

const REVIEW_SHOWCASE = [
  { title: "Magical Enchanted Forest", genre: "Fantasy", img: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop", badge: "Epic Tale" },
  { title: "Neon Cyber City 2099", genre: "Sci-Fi", img: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop", badge: "Futuristic" },
  { title: "Dragon & Crystal Castle", genre: "Adventure", img: "https://images.unsplash.com/photo-1514539079130-25950c84af65?w=600&auto=format&fit=crop", badge: "Best Seller" },
  { title: "Deep Underwater Kingdom", genre: "Mystery", img: "https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=600&auto=format&fit=crop", badge: "Deep Dive" },
  { title: "Interstellar Space Odyssey", genre: "Sci-Fi", img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop", badge: "Masterpiece" },
  { title: "Steampunk Airship Haven", genre: "Steampunk", img: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop", badge: "3D HD" },
  { title: "Floating Celestial Islands", genre: "Fantasy", img: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop", badge: "Dreamscape" },
  { title: "Cyberpunk Hacker Den", genre: "Cyberpunk", img: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop", badge: "Underground" },
  { title: "Mystical Phoenix Realm", genre: "Mythology", img: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop", badge: "Legendary" },
  { title: "Quantum Portal Gateway", genre: "Sci-Fi", img: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop", badge: "Futuristic" },
  { title: "Elven Tree Sanctuary", genre: "Fantasy", img: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop", badge: "Nature" },
  { title: "Neon Mecha Mech Warrior", genre: "Mecha", img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop", badge: "Action 3D" },
  { title: "Lost Temple of Ancients", genre: "Adventure", img: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop", badge: "Mystery" },
  { title: "Bioluminescent Deep Abyss", genre: "Sci-Fi", img: "https://images.unsplash.com/photo-1551244072-5d12893278ab?w=600&auto=format&fit=crop", badge: "Neon HD" },
  { title: "Starlight Galaxy Nebula", genre: "Cosmos", img: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&auto=format&fit=crop", badge: "Universe" }
];

function ReviewStars({ value, size = "w-4 h-4" }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= value ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-slate-400 opacity-40"}`} />
      ))}
    </div>
  );
}

function ReviewsSection({ currentStyle, currentUser, onRequireLogin, onOpenStory, api }) {
  const [reviews, setReviews] = useState([]);
  const [average, setAverage] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ rating: 5, comment: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [myStories, setMyStories] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const load = async () => {
    try {
      const data = await fetchReviews(api);
      setReviews(data.reviews);
      setAverage(data.average);
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    }
  };

  useEffect(() => {
    load();
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 400); // Capsule split opening delay
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setMyStories([]);
      return;
    }
    fetchMyStories(api).then(setMyStories).catch(() => setMyStories([]));
  }, [currentUser]);

  const mine = currentUser ? reviews.find((r) => r.userId === currentUser.id) : null;

  const openModal = () => {
    if (!currentUser) return onRequireLogin();
    setForm(mine ? { rating: mine.rating, comment: mine.comment } : { rating: 5, comment: "" });
    setFormError("");
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.comment.trim()) return setFormError("Please write a few words about your experience.");
    setSaving(true);
    try {
      await postReview(api, form);
      setShowModal(false);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await deleteReview(api, id);
      await load();
    } catch {}
  };

  const removeStory = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteMyStory(api, id);
      setMyStories(await fetchMyStories(api));
    } catch {}
  };

  const doubledReviews = reviews.length > 0 ? [...reviews, ...reviews, ...reviews] : [];

  return (
    <div className="relative w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-10 space-y-12 text-slate-100 bg-slate-950 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
      
      {/* ---------- CAPSULE SPLIT INTRO OVERLAY ---------- */}
      <div
        className={`absolute inset-0 z-50 pointer-events-none flex items-center justify-center transition-opacity duration-700 ${
          isOpen ? "opacity-0" : "opacity-100"
        }`}
      >
        {/* Top Half Capsule */}
        <div
          className={`absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 border-b border-purple-500/30 flex flex-col items-center justify-end pb-4 transition-transform duration-1000 ease-[cubic-bezier(0.77,0,0.175,1)] shadow-2xl ${
            isOpen ? "-translate-y-full" : "translate-y-0"
          }`}
        >
          <div className="flex items-center gap-3 px-8 py-4 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg">
            <Rocket className="w-6 h-6 text-pink-400 animate-spin" />
            <span className="text-xl font-black tracking-wider bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent">
              CREATOR UNIVERSE
            </span>
          </div>
        </div>

        {/* Bottom Half Capsule */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-tr from-slate-950 via-purple-950 to-indigo-950 border-t border-purple-500/30 flex flex-col items-center justify-start pt-4 transition-transform duration-1000 ease-[cubic-bezier(0.77,0,0.175,1)] shadow-2xl ${
            isOpen ? "translate-y-full" : "translate-y-0"
          }`}
        >
          <p className="text-xs tracking-widest text-purple-300/60 uppercase font-semibold">Unleashing Gallery & Community...</p>
        </div>
      </div>

      <style>{`
        @keyframes scrollMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: scrollMarquee 45s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
        .animate-fadeIn { animation: rcFadeIn 0.3s ease both; }
        @keyframes rcFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] p-8 md:p-12 bg-slate-900/90 text-white border border-white/15 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs font-black tracking-wide shadow-sm">
              <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" /> Community Masterpiece Hub
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Explore & <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">Showcase</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-300 font-medium max-w-2xl leading-relaxed">
              Immerse yourself in top-tier creator stories, HD/3D visual artwork galleries, and trusted community feedback.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md shadow-xl">
            <div className="p-3 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-lg">
              <Star className="w-6 h-6 text-amber-300 fill-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="text-xs text-pink-300 font-bold">Community Trust</div>
              <div className="text-lg font-black text-amber-300">{average.toFixed(1)} / 5.0 Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Creations Section */}
      {currentUser && (
        <section className="relative overflow-hidden rounded-[2.5rem] p-6 md:p-8 bg-slate-900/80 text-white border border-purple-500/40 shadow-2xl space-y-6">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-semibold shadow-sm">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" /> Personal Library
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                My Story Creations <span className="text-cyan-400 font-bold">({myStories.length})</span>
              </h3>
            </div>
            <p className="text-xs text-slate-300 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/20">Click any card to read or delete your tale!</p>
          </div>

          {myStories.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 relative z-10">
              <Sparkles className="w-8 h-8 text-cyan-400 mx-auto animate-pulse" />
              <p className="text-sm font-semibold text-white">No stories created yet while logged in.</p>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">Head over to the Story Hub, generate your first tale, and it will automatically sync here!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
              {myStories.slice(0, 9).map((st) => (
                <div
                  key={st.id}
                  onClick={() => onOpenStory({ title: st.title, heroName: st.heroName, genre: st.genre, storyText: st.storyText })}
                  className="group text-left p-5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-3 shadow-xl relative overflow-hidden text-white"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform"></div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase tracking-wider border border-cyan-500/40">
                        {st.genre || "Epic"}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(st.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors line-clamp-1">{st.title}</h4>
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{st.storyText}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-700 flex items-center justify-between text-xs">
                    <span className="text-cyan-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Read Immersive →
                    </span>
                    <button
                      onClick={(e) => removeStory(e, st.id)}
                      title="Delete story"
                      className="p-1.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-600 hover:text-white transition-all duration-200 cursor-pointer shadow-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Inspiration Marquee Section */}
      <section className="space-y-6 overflow-hidden">
        <div className="flex items-center justify-between px-2">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Award className="w-3.5 h-3.5 text-amber-400" /> Inspiration
            </div>
            <h3 className="text-2xl font-black tracking-tight text-white">Inspiration Gallery</h3>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">Sample visuals for inspiration</span>
        </div>

        <div className="w-full relative py-2 overflow-hidden">
          <div className="animate-marquee flex gap-6">
            {[...REVIEW_SHOWCASE, ...REVIEW_SHOWCASE, ...REVIEW_SHOWCASE].map((item, idx) => (
              <div 
                key={idx} 
                className="w-[300px] sm:w-[340px] rounded-[2rem] overflow-hidden border border-white/10 bg-slate-900 shadow-xl flex flex-col hover:border-pink-500/50 transition-all duration-500 group shrink-0"
              >
                <div className="relative h-44 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 opacity-70"></div>
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                  <span className="absolute top-3 right-3 z-20 px-3 py-1 rounded-full bg-slate-900/90 text-amber-300 text-[11px] font-black tracking-wider uppercase border border-amber-400/50 shadow-2xl">
                    {item.badge}
                  </span>
                </div>
                <div className="p-4 flex items-center justify-between bg-slate-900 relative z-20">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">{item.genre}</span>
                    <h4 className="font-bold text-sm text-white group-hover:text-pink-300 transition-colors line-clamp-1">{item.title}</h4>
                  </div>
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-inner">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Reviews Marquee Section */}
      <section className="rounded-[2.5rem] p-6 md:p-8 bg-slate-900/90 border border-white/10 shadow-2xl space-y-6 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs font-semibold">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" /> Community Love
            </div>
            <h3 className="text-2xl font-black tracking-tight text-white">What Creators Say</h3>
            {reviews.length > 0 && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-3xl font-black bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent">
                  {average.toFixed(1)}
                </span>
                <div className="space-y-0.5">
                  <ReviewStars value={Math.round(average)} size="w-4 h-4" />
                  <p className="text-xs text-slate-400 font-medium">Trusted by {reviews.length} passionate {reviews.length === 1 ? "storyteller" : "storytellers"}</p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={openModal}
            className="px-6 py-3 text-xs font-bold rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white shadow-xl hover:shadow-[0_0_25px_rgba(236,72,153,0.4)] transition-all duration-300 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {mine ? "Edit Your Review" : currentUser ? "Write a Review" : "Log In to Review"}
          </button>
        </div>

        {!loadError && reviews.length === 0 && (
          <p className="text-xs text-slate-400 p-4 rounded-xl bg-white/5 border border-white/10">No reviews yet. Modati review nuvve ivvandi!</p>
        )}

        {loadError && (
          <p className="text-xs text-red-400 p-4 rounded-xl bg-red-500/10 border border-red-500/20">Could not load reviews: {loadError}</p>
        )}

        <div className="w-full relative py-2 overflow-hidden">
          <div className={reviews.length >= 4 ? "animate-marquee flex gap-6" : "flex flex-wrap gap-6"}>
            {(reviews.length >= 4 ? doubledReviews : reviews).map((rev, idx) => (
              <div
                key={`${rev.id}-${idx}`}
                className="w-[320px] sm:w-[360px] p-6 rounded-[2rem] bg-white/5 border border-white/10 hover:border-white/25 transition-all duration-300 shadow-xl shrink-0 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center text-sm font-bold shadow-md shrink-0">
                        {rev.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-white truncate">{rev.name}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                          <BookOpen className="w-3 h-3" /> Storyteller
                        </div>
                      </div>
                    </div>
                    <ReviewStars value={rev.rating} size="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed italic bg-black/20 p-4 rounded-2xl border border-white/5">
                    "{rev.comment}"
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium text-purple-300">
                    {rev.storyCount > 0 ? `${rev.storyCount} ${rev.storyCount === 1 ? "story" : "stories"} created` : "PlotCraft Enthusiast"}
                  </span>
                  {currentUser && rev.userId === currentUser.id && (
                    <button 
                      onClick={() => remove(rev.id)} 
                      className="text-red-400 hover:text-red-300 flex items-center gap-1 font-bold cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Review Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg p-8 rounded-[2.5rem] bg-slate-900 border border-white/15 space-y-6 relative shadow-2xl text-white">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-slate-300 hover:text-white hover:bg-white/25 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-400" /> Share Your Thoughts
              </div>
              <h3 className="text-2xl font-black tracking-tight">
                {mine ? "Edit Your Review" : "Rate PlotCraft"}
              </h3>
              <p className="text-xs text-slate-400">
                Posting as <span className="text-purple-400 font-bold">{currentUser?.name || "Creator"}</span>. Your review will be visible to all visitors.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Select Rating</label>
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setForm({ ...form, rating: n })}
                      className="p-1 cursor-pointer hover:scale-125 transition-transform"
                      aria-label={`${n} stars`}
                    >
                      <Star className={`w-8 h-8 ${n <= form.rating ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" : "text-slate-400 opacity-40"}`} />
                    </button>
                  ))}
                  <span className="ml-auto text-sm font-bold text-amber-400 px-3 py-1 rounded-xl bg-amber-400/10">
                    {form.rating}.0 / 5.0
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Your Experience & Feedback</label>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  placeholder="What do you love about PlotCraft? How has it helped your storytelling?"
                  className="w-full p-4 text-xs rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none shadow-inner"
                />
              </div>

              {formError && (
                <p className="text-xs text-red-400 p-3 rounded-xl bg-red-500/10 border border-red-500/20">{formError}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white text-xs font-bold shadow-xl hover:shadow-[0_0_30px_rgba(236,72,153,0.4)] transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {mine ? "Update Review" : "Submit Review"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
function FallingBackground() { return null; }
function PlotCraftLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-label="PlotCraft logo" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="pcLogoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a855f7" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#pcLogoGrad)" />
      <path d="M14 34V14h10a8 8 0 0 1 0 16H14" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="34" cy="14" r="3" fill="#fde047" />
    </svg>
  );
}
function ReadAloudButton() { return null; }
function FreeVideoHelper() { return null; }
function StoryViewer() { return null; }

/* ===== Home: PlotCraft World. Living 3D island: idle rotation, drag/zoom, hover glow, camera fly-to, effects and sound. ===== */
const HERO_CSS = `
@keyframes heroRise { from{opacity:0; transform:translateY(40px)} to{opacity:1; transform:none} }
@keyframes heroGradient { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes welcomeIn { from{opacity:0; transform:translate(-50%,-12px)} to{opacity:1; transform:translate(-50%,0)} }
.home-bg { background: linear-gradient(120deg, var(--pc-hero-a), var(--pc-hero-b), var(--pc-hero-c), var(--pc-hero-d), var(--pc-hero-a)); background-size: 300% 300%; animation: heroGradient 16s ease infinite; }
.world-rise { animation: heroRise .9s cubic-bezier(.2,.8,.2,1) both; }
.world-nav-btn { padding:8px 14px; border-radius:999px; font-weight:700; font-size:13px; background: var(--pc-card); color: var(--pc-text); border:1px solid rgba(127,127,127,.3); transition: transform .2s ease, background .2s ease, border-color .2s ease; }
.world-nav-btn:hover { transform: translateY(-2px); border-color: var(--pc-accent); }
.world-sign { white-space:nowrap; padding:4px 12px; border-radius:999px; background: var(--pc-card); color: var(--pc-text); font-weight:800; font-size:13px; box-shadow: 0 6px 16px -6px rgba(0,0,0,.25); border:1px solid rgba(127,127,127,.25); }
.world-tip { white-space:nowrap; padding:6px 12px; border-radius:12px; background: var(--pc-card); color: var(--pc-text); font-size:12px; font-weight:600; box-shadow: 0 10px 24px -10px rgba(0,0,0,.35); border:1px solid rgba(127,127,127,.25); }
.world-flash { position:absolute; inset:0; background: radial-gradient(circle at 50% 50%, #ffffff, #fbe7ff 70%); opacity:0; pointer-events:none; transition: opacity .35s ease; border-radius:24px; }
.world-flash.on { opacity:1; }
.world-welcome { position:absolute; left:50%; top:12px; transform: translate(-50%,0); z-index:5; padding:8px 18px; border-radius:999px; background: var(--pc-card); color: var(--pc-text); font-weight:800; font-size:14px; box-shadow: 0 10px 30px -10px rgba(0,0,0,.3); animation: welcomeIn .6s ease both; transition: opacity .8s ease; pointer-events:none; }
.world-welcome.hide { opacity:0; }
.world-mute { padding:6px 12px; border-radius:999px; font-size:12px; font-weight:700; background: var(--pc-card); color: var(--pc-text); border:1px solid rgba(127,127,127,.3); }
@media (prefers-reduced-motion: reduce) { .home-bg, .world-rise, .world-welcome { animation: none !important; } }
`;

const WORLD_NAV = [
  { label: "Art", go: "studio:art" },
  { label: "Music", go: "tools:audio" },
  { label: "Video", go: "tools:video" },
  { label: "Design", go: "studio:graphic" },
  { label: "DIY", go: "tools:pdf" },
  { label: "AI Chat", go: "tab:search" },
];

const WORLD_HOUSES = [
  { key: "music", label: "Music", desc: "Audio editor: trim, speed, export", icon: "🎵", wall: "#ddd6fe", roof: "#c4b5fd", accent: "#a78bfa", slot: -2, go: "tools:audio", fx: "notes" },
  { key: "art", label: "Art", desc: "Brush, layers, fill and shapes", icon: "🎨", wall: "#fdf2f8", roof: "#f9a8d4", accent: "#f472b6", slot: -1, go: "studio:art", fx: "sparkles" },
  { key: "video", label: "Video", desc: "Trim, speed and WebM export", icon: "🎬", wall: "#ecfdf5", roof: "#a7f3d0", accent: "#34d399", slot: 0, go: "tools:video", fx: "screen" },
  { key: "design", label: "Design", desc: "Graphic themes and designs", icon: "📐", wall: "#fdf4ff", roof: "#f5d0fe", accent: "#e879f9", slot: 1, go: "studio:graphic", fx: "hologram" },
  { key: "diy", label: "DIY", desc: "Image to PDF tools", icon: "🧵", wall: "#fffbeb", roof: "#fde68a", accent: "#fbbf24", slot: 2, go: "tools:pdf", fx: "ring" },
];

const houseAngle = (slot) => slot * 0.55;
const housePos = (slot) => { const a = houseAngle(slot); return [Math.sin(a) * 2.2, 0, Math.cos(a) * 2.2]; };

/* Synthesized chime (no audio files). Starts only after the user has interacted with the page. */
function playChime(soundRef, freq = 880, dur = 0.18) {
  if (!soundRef.current.on) return;
  try {
    if (!soundRef.current.ctx) soundRef.current.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = soundRef.current.ctx;
    if (ctx.state === "suspended") ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  } catch (e) { /* sound is optional */ }
}

/* ---------- building effects ---------- */
function SpinFx({ kind, color, hover }) {
  const ref = useRef();
  useFrame((s) => {
    if (!ref.current) return;
    const t = s.clock.elapsedTime;
    ref.current.rotation.y = t * (hover ? 1.8 : 0.6);
    ref.current.position.y = 1.9 + Math.sin(t * 1.4) * 0.08;
  });
  if (kind === "ring") {
    return (
      <mesh ref={ref}>
        <torusGeometry args={[0.45, 0.04, 12, 48]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hover ? 1.2 : 0.5} />
      </mesh>
    );
  }
  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[0.3, 0.3, 0.6, 24, 1, true]} />
      <meshStandardMaterial color={color} transparent opacity={0.28} emissive={color} emissiveIntensity={0.8} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function AnimatedScreen({ color }) {
  const mat = useRef();
  useFrame((s) => {
    if (mat.current) mat.current.color.setHSL((s.clock.elapsedTime * 0.08) % 1, 0.7, 0.75);
  });
  return (
    <mesh position={[0, 0.45, 0.43]}>
      <planeGeometry args={[0.55, 0.3]} />
      <meshBasicMaterial ref={mat} color={color} />
    </mesh>
  );
}

function HouseEffect({ kind, color, hover }) {
  if (kind === "sparkles") {
    return <Sparkles count={28} scale={[1.8, 2, 1.8]} size={4} speed={0.5} color={color} position={[0, 0.9, 0]} />;
  }
  if (kind === "notes") {
    return (
      <>
        <Float speed={2} floatIntensity={0.8}>
          <mesh position={[0.55, 1.35, 0.25]}>
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
          </mesh>
        </Float>
        <Float speed={2.6} floatIntensity={0.9}>
          <mesh position={[-0.5, 1.5, 0.3]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
          </mesh>
        </Float>
      </>
    );
  }
  if (kind === "screen") return <AnimatedScreen color={color} />;
  return <SpinFx kind={kind} color={color} hover={hover} />;
}

function GroundGlow({ color, hover }) {
  const m = useRef();
  useFrame((s) => {
    if (!m.current) return;
    const p = 0.5 + 0.5 * Math.sin(s.clock.elapsedTime * 2.2);
    m.current.material.opacity = hover ? 0.9 : 0.22 + p * 0.18;
    m.current.scale.setScalar(hover ? 1.15 : 1 + p * 0.05);
  });
  return (
    <mesh ref={m} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.62, 0.82, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} />
    </mesh>
  );
}

function GlowPath({ slot, active }) {
  const [x, , z] = housePos(slot);
  const len = Math.hypot(x, z);
  const m = useRef();
  useFrame((s) => {
    if (!m.current) return;
    const p = 0.5 + 0.5 * Math.sin(s.clock.elapsedTime * 3 - slot);
    m.current.material.emissiveIntensity = active ? 1.6 : 0.25 + p * 0.25;
  });
  return (
    <mesh ref={m} position={[x / 2, 0.01, z / 2]} rotation={[0, Math.atan2(x, z), 0]}>
      <boxGeometry args={[0.08, 0.02, len]} />
      <meshStandardMaterial color="#fbcfe8" emissive="#f0abfc" emissiveIntensity={0.3} />
    </mesh>
  );
}

function WorldHouse({ data, hovered, onHover, onPick, soundRef }) {
  const pos = housePos(data.slot);
  const isHover = hovered === data.key;
  const ref = useRef();
  useFrame(() => {
    if (!ref.current) return;
    const target = isHover ? 0.2 : 0;
    ref.current.position.y += (target - ref.current.position.y) * 0.12;
  });
  return (
    <group
      ref={ref}
      position={pos}
      rotation={[0, -pos[0] * 0.25, 0]}
      onPointerOver={(e) => { e.stopPropagation(); onHover(data.key); document.body.style.cursor = "pointer"; playChime(soundRef, 660, 0.12); }}
      onPointerOut={() => { onHover(null); document.body.style.cursor = "auto"; }}
      onClick={(e) => { e.stopPropagation(); onPick(data); }}
    >
      <GroundGlow color={data.accent} hover={isHover} />
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.9, 0.8, 0.8]} />
        <meshStandardMaterial color={data.wall} roughness={0.6} emissive={data.accent} emissiveIntensity={isHover ? 0.35 : 0} />
      </mesh>
      <mesh position={[0, 1.0, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.85, 0.6, 4]} />
        <meshStandardMaterial color={data.roof} roughness={0.5} emissive={data.accent} emissiveIntensity={isHover ? 0.3 : 0} />
      </mesh>
      <mesh position={[0, 0.3, 0.41]}>
        <boxGeometry args={[0.22, 0.42, 0.04]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.26, 0.55, 0.41]}>
        <boxGeometry args={[0.14, 0.14, 0.03]} />
        <meshStandardMaterial color="#fef9c3" emissive="#fde68a" emissiveIntensity={isHover ? 1.2 : 0.5} />
      </mesh>
      <mesh position={[0.26, 0.55, 0.41]}>
        <boxGeometry args={[0.14, 0.14, 0.03]} />
        <meshStandardMaterial color="#fef9c3" emissive="#fde68a" emissiveIntensity={isHover ? 1.2 : 0.5} />
      </mesh>
      <HouseEffect kind={data.fx} color={data.accent} hover={isHover} />
      <Html position={[0, 1.6, 0]} center distanceFactor={9} style={{ pointerEvents: "none" }}>
        <div className="world-sign" style={{ transform: isHover ? "scale(1.12)" : "scale(1)", transition: "transform .3s ease" }}>
          {data.icon} {data.label}
        </div>
      </Html>
      {isHover && (
        <Html position={[0, 2.3, 0]} center distanceFactor={9} style={{ pointerEvents: "none" }}>
          <div className="world-tip">{data.desc}</div>
        </Html>
      )}
    </group>
  );
}

function WorldIsland({ hovered, onHover, onPick, soundRef }) {
  const flowers = [[-1.2, 0.1, 1.9], [1.1, 0.1, 2.1], [-2.2, 0.1, 0.6], [2.3, 0.1, 0.5], [0.4, 0.1, -2.1], [-0.7, 0.1, -1.8], [1.9, 0.1, -1.1]];
  return (
    <group>
      <mesh position={[0, -0.7, 0]} receiveShadow>
        <cylinderGeometry args={[3.4, 2.4, 1.2, 64]} />
        <meshStandardMaterial color="#f5e6d8" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.3, 64]} />
        <meshStandardMaterial color="#bbf7d0" roughness={1} />
      </mesh>
      {WORLD_HOUSES.map(h => (
        <GlowPath key={`p${h.key}`} slot={h.slot} active={hovered === h.key} />
      ))}
      {WORLD_HOUSES.map(h => (
        <WorldHouse key={h.key} data={h} hovered={hovered} onHover={onHover} onPick={onPick} soundRef={soundRef} />
      ))}
      {flowers.map((f, i) => (
        <mesh key={i} position={f}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshStandardMaterial color={i % 2 ? "#fbcfe8" : "#ffffff"} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- sky, weather and atmosphere ---------- */
function DriftCloud({ position, scale, speed, range }) {
  const g = useRef();
  useFrame((s) => {
    if (g.current) g.current.position.x = position[0] + Math.sin(s.clock.elapsedTime * speed) * range;
  });
  return (
    <group ref={g} position={position} scale={scale}>
      <mesh><sphereGeometry args={[1, 24, 24]} /><meshStandardMaterial color="#ffffff" roughness={1} /></mesh>
      <mesh position={[0.8, -0.15, 0.1]} scale={0.7}><sphereGeometry args={[1, 20, 20]} /><meshStandardMaterial color="#ffffff" roughness={1} /></mesh>
      <mesh position={[-0.7, -0.1, -0.1]} scale={0.6}><sphereGeometry args={[1, 20, 20]} /><meshStandardMaterial color="#ffffff" roughness={1} /></mesh>
    </group>
  );
}

function Birds() {
  const g = useRef();
  useFrame((s) => { if (g.current) g.current.rotation.y = s.clock.elapsedTime * 0.25; });
  return (
    <group ref={g} position={[0, 2.6, 0]}>
      {[0, 1, 2].map(i => (
        <group key={i} position={[Math.cos(i * 2.1) * 3.5, Math.sin(i) * 0.3, Math.sin(i * 2.1) * 3.5]}>
          <mesh rotation={[0, 0, 0.4]}><boxGeometry args={[0.5, 0.04, 0.12]} /><meshStandardMaterial color="#6b3f8f" /></mesh>
          <mesh rotation={[0, 0, -0.4]}><boxGeometry args={[0.5, 0.04, 0.12]} /><meshStandardMaterial color="#6b3f8f" /></mesh>
        </group>
      ))}
    </group>
  );
}

function LightRays() {
  return (
    <group position={[0, 4, 0]}>
      {[-2, 0, 2].map((x, i) => (
        <mesh key={i} position={[x, -1.5, -2]} rotation={[0, 0, x * 0.15]}>
          <coneGeometry args={[1.2, 6, 24, 1, true]} />
          <meshBasicMaterial color="#fff7d6" transparent opacity={0.09} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function WorldRainbow() {
  const colors = ["#fda4af", "#fdba74", "#fde68a", "#bbf7d0", "#a5b4fc", "#e9d5ff"];
  return (
    <group position={[0, 0.2, -4]}>
      {colors.map((c, i) => (
        <mesh key={c} position={[0, 0, -i * 0.05]}>
          <torusGeometry args={[4.2 - i * 0.18, 0.13, 12, 96, Math.PI]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  );
}

function Guide() {
  const g = useRef();
  const arm = useRef();
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (g.current) g.current.position.y = 0.05 + Math.sin(t * 2) * 0.04;
    if (arm.current) arm.current.rotation.z = Math.sin(t * 3) * 0.5;
  });
  return (
    <group ref={g} position={[0, 0.05, 0.2]} scale={0.6}>
      <mesh position={[0, 0.5, 0]}><capsuleGeometry args={[0.18, 0.4, 8, 16]} /><meshStandardMaterial color="#c4b5fd" /></mesh>
      <mesh position={[0, 1.05, 0]}><sphereGeometry args={[0.2, 24, 24]} /><meshStandardMaterial color="#fde68a" /></mesh>
      <mesh ref={arm} position={[0.25, 0.6, 0]}><boxGeometry args={[0.1, 0.4, 0.1]} /><meshStandardMaterial color="#c4b5fd" /></mesh>
    </group>
  );
}

/* Moves the camera toward a target each frame (intro and click fly-to). */
function CameraRig({ flyRef, controlsRef }) {
  const { camera } = useThree();
  useFrame(() => {
    const f = flyRef.current;
    const c = controlsRef.current;
    if (!f || !c) return;
    camera.position.lerp(f.pos, 0.06);
    c.target.lerp(f.look, 0.06);
    c.update();
    if (camera.position.distanceTo(f.pos) < 0.08) {
      flyRef.current = null;
      if (f.done) f.done();
    }
  });
  return null;
}

function WorldScene({ onGo, soundRef }) {
  const [hovered, setHovered] = useState(null);
  const [flying, setFlying] = useState(false);
  const [flash, setFlash] = useState(false);
  const controlsRef = useRef();
  const flyRef = useRef(null);

  // Welcome camera move: starts far away and glides in.
  useEffect(() => {
    flyRef.current = { pos: new THREE.Vector3(0, 3.2, 8.5), look: new THREE.Vector3(0, 0.8, 0), done: null };
  }, []);

  const pick = (data) => {
    if (flying) return;
    playChime(soundRef, 990, 0.25);
    const [hx, , hz] = housePos(data.slot);
    setFlying(true);
    flyRef.current = {
      pos: new THREE.Vector3(hx * 0.55, 1.4, hz * 0.55 + 1.2),
      look: new THREE.Vector3(hx, 0.8, hz),
      done: () => {
        setFlash(true);
        setTimeout(() => onGo(data.go), 380);
      },
    };
  };

  return (
    <>
      <Canvas shadows camera={{ position: [0, 9, 22], fov: 40 }} style={{ width: "100%", height: "min(70vh, 600px)" }}>
        <fog attach="fog" args={["#fbe7ff", 12, 30]} />
        <hemisphereLight args={["#ffffff", "#f5d0fe", 0.75]} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[5, 9, 5]} intensity={1.1} castShadow />
        <pointLight position={[0, 4, 0]} color="#fde68a" intensity={0.6} distance={12} />
        <Sparkles count={70} scale={[12, 5, 12]} size={3} speed={0.3} color="#f9a8d4" position={[0, 1.5, 0]} />
        <WorldRainbow />
        <LightRays />
        <Birds />
        <DriftCloud position={[-6, 2.6, -3]} scale={1.1} speed={0.15} range={0.8} />
        <DriftCloud position={[6, 1.8, -2]} scale={0.9} speed={0.2} range={0.6} />
        <DriftCloud position={[0, -2.4, 0]} scale={3.2} speed={0.05} range={0.2} />
        <WorldIsland hovered={hovered} onHover={setHovered} onPick={pick} soundRef={soundRef} />
        <Guide />
        <CameraRig flyRef={flyRef} controlsRef={controlsRef} />
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          minDistance={1.2}
          maxDistance={16}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.1}
          autoRotate={!hovered && !flying}
          autoRotateSpeed={0.5}
        />
      </Canvas>
      <div className={`world-flash ${flash ? "on" : ""}`} />
    </>
  );
}

/* ===== PlotCraft Village: space -> Earth -> clouds -> gate -> village (15 houses, 5 streets) ===== */
const VG_EARTH = { c: [0, -42, -10], r: 16 };
const VG_KEYS = [
  { t: 0, p: [0, 8, 60], l: [0, -8, -10] },
  { t: 2.4, p: [0, -14, 20], l: [0, -40, -10] },
  { t: 4.2, p: [3, -22, 4], l: [0, -28, -4] },
  { t: 6.0, p: [0, 6, 18], l: [0, 0, 0] },
  { t: 8.0, p: [0, 2.6, 13], l: [0, 1.4, 8.5] },
  { t: 9.8, p: [0, 2.4, 21], l: [0, 1.8, 0] },
];
const VG_END = VG_KEYS[VG_KEYS.length - 1];
const VG_STREETS = ["Creator", "Workspace", "Knowledge", "AI District", "Community"];
const VG_HOUSES = [
  { st: 0, i: 0, label: "Story House", icon: "📖", desc: "Story Kingdom: write and generate stories", go: "tab:story", wall: "#1e3a8a", roof: "#1e40af", accent: "#fde68a", shape: "tower", fx: "books" },
  { st: 0, i: 1, label: "Art House", icon: "🎨", desc: "Art studio: brush, layers, fill", go: "studio:art", wall: "#ffffff", roof: "#f9a8d4", accent: "#f472b6", shape: "box", fx: "crystal" },
  { st: 0, i: 2, label: "Video House", icon: "🎬", desc: "Video editor: trim, speed, export", go: "tools:video", wall: "#334155", roof: "#0f172a", accent: "#facc15", shape: "box", fx: "screen" },
  { st: 1, i: 0, label: "Projects", icon: "💼", desc: "Saved projects vault", go: "tab:pro", wall: "#ffffff", roof: "#93c5fd", accent: "#38bdf8", shape: "box", fx: "holo" },
  { st: 1, i: 1, label: "Archive", icon: "🗄️", desc: "Files and records", go: "tab:history", wall: "#a16207", roof: "#78350f", accent: "#fbbf24", shape: "round", fx: "glow" },
  { st: 1, i: 2, label: "History Hall", icon: "🕰️", desc: "Your history archive", go: "tab:history", wall: "#f5f5f4", roof: "#a8a29e", accent: "#f59e0b", shape: "tower", fx: "ring" },
  { st: 2, i: 0, label: "Library", icon: "📚", desc: "Magical library", go: "tab:games", wall: "#451a03", roof: "#292524", accent: "#fdba74", shape: "tower", fx: "books" },
  { st: 2, i: 1, label: "Puzzle Academy", icon: "🧩", desc: "Sudoku and memory games", go: "tab:games", wall: "#86efac", roof: "#166534", accent: "#4ade80", shape: "box", fx: "ring" },
  { st: 2, i: 2, label: "Math Observatory", icon: "➗", desc: "Quick math", go: "tab:games", wall: "#f8fafc", roof: "#fde68a", accent: "#facc15", shape: "dome", fx: "glow" },
  { st: 3, i: 0, label: "AI Chat Center", icon: "💬", desc: "Chat with AI", go: "tab:search", wall: "#0f172a", roof: "#1e293b", accent: "#38bdf8", shape: "round", fx: "holo" },
  { st: 3, i: 1, label: "Image Lab", icon: "🖼️", desc: "AI image generation", go: "studio:art", wall: "#e0f2fe", roof: "#7dd3fc", accent: "#a78bfa", shape: "box", fx: "crystal" },
  { st: 3, i: 2, label: "Video Factory", icon: "🎞️", desc: "AI video tools", go: "tools:video", wall: "#312e81", roof: "#1e1b4b", accent: "#22d3ee", shape: "dome", fx: "screen" },
  { st: 4, i: 0, label: "Plaza", icon: "👥", desc: "Community plaza", go: "tab:search", wall: "#fef3c7", roof: "#fb923c", accent: "#fdba74", shape: "box", fx: "glow" },
  { st: 4, i: 1, label: "Top Creators", icon: "🏆", desc: "Top rated creators", go: "tab:story", wall: "#fdf2f8", roof: "#f472b6", accent: "#f9a8d4", shape: "tower", fx: "crystal" },
  { st: 4, i: 2, label: "Discover", icon: "🔍", desc: "Information center", go: "tab:history", wall: "#ecfeff", roof: "#67e8f9", accent: "#22d3ee", shape: "box", fx: "holo" },
];

const vgStreetAngle = (st) => -Math.PI / 2 + (st * Math.PI * 2) / VG_STREETS.length;
const vgHousePos = (h) => {
  const a = vgStreetAngle(h.st);
  const R = 3.4 + h.i * 2.0;
  const side = h.st % 2 === 0 ? 1.1 : -1.1;
  return [Math.cos(a) * R - Math.sin(a) * side, 0, Math.sin(a) * R + Math.cos(a) * side];
};
const vgSmooth = (u) => u * u * (3 - 2 * u);

function VgEarth() {
  const earth = useRef();
  const clouds = useRef();
  useFrame((s) => {
    if (earth.current) earth.current.rotation.y = s.clock.elapsedTime * 0.05;
    if (clouds.current) clouds.current.rotation.y = s.clock.elapsedTime * 0.08;
  });
  const land = [[0.4, 0.6, 0.7], [-0.6, 0.2, 0.8], [0.2, -0.5, 0.85], [-0.2, 0.9, 0.3], [0.7, -0.2, 0.6]];
  return (
    <group position={VG_EARTH.c}>
      <mesh ref={earth}>
        <sphereGeometry args={[VG_EARTH.r, 48, 48]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.8} />
        {land.map((d, i) => {
          const n = Math.hypot(d[0], d[1], d[2]);
          const p = [(d[0] / n) * VG_EARTH.r * 1.01, (d[1] / n) * VG_EARTH.r * 1.01, (d[2] / n) * VG_EARTH.r * 1.01];
          return null;
        })}
      </mesh>
      {land.map((d, i) => {
        const n = Math.hypot(d[0], d[1], d[2]);
        const k = VG_EARTH.r * 1.02;
        return (
          <mesh key={i} position={[(d[0] / n) * k, (d[1] / n) * k, (d[2] / n) * k]} scale={[3.2, 2.2, 0.4]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial color="#4ade80" roughness={0.9} />
          </mesh>
        );
      })}
      <mesh ref={clouds}>
        <sphereGeometry args={[VG_EARTH.r + 0.6, 48, 48]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.35} roughness={1} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[VG_EARTH.r + 1.4, 48, 48]} />
        <meshBasicMaterial color="#93c5fd" transparent opacity={0.18} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function VgFx({ kind, color, hover }) {
  const ref = useRef();
  useFrame((s) => {
    if (!ref.current) return;
    const t = s.clock.elapsedTime;
    ref.current.rotation.y = t * (hover ? 1.6 : 0.5);
    ref.current.position.y = 2.2 + Math.sin(t * 1.3) * 0.1;
  });
  if (kind === "books") {
    return (
      <group ref={ref} position={[0, 2.0, 0]}>
        {[0, 1, 2].map(i => (
          <mesh key={i} position={[Math.cos(i * 2.1) * 0.7, Math.sin(i) * 0.1, Math.sin(i * 2.1) * 0.7]} rotation={[0.4, i, 0]}>
            <boxGeometry args={[0.2, 0.05, 0.14]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
          </mesh>
        ))}
      </group>
    );
  }
  if (kind === "crystal") {
    return (
      <mesh ref={ref}>
        <octahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hover ? 1.4 : 0.7} />
      </mesh>
    );
  }
  if (kind === "holo") {
    return (
      <mesh ref={ref}>
        <cylinderGeometry args={[0.35, 0.35, 0.7, 24, 1, true]} />
        <meshStandardMaterial color={color} transparent opacity={0.28} emissive={color} emissiveIntensity={0.8} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    );
  }
  if (kind === "ring") {
    return (
      <mesh ref={ref}>
        <torusGeometry args={[0.42, 0.04, 12, 40]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hover ? 1.2 : 0.5} />
      </mesh>
    );
  }
  if (kind === "screen") {
    return <VgScreen color={color} />;
  }
  return null;
}

function VgScreen({ color }) {
  const mat = useRef();
  useFrame((s) => {
    if (mat.current) mat.current.color.setHSL((s.clock.elapsedTime * 0.07) % 1, 0.7, 0.72);
  });
  return (
    <mesh position={[0, 0.7, 0.47]}>
      <planeGeometry args={[0.6, 0.3]} />
      <meshBasicMaterial ref={mat} color={color} />
    </mesh>
  );
}

function VgHouse({ h, hovered, setHovered, onPick, soundRef }) {
  const pos = vgHousePos(h);
  const ry = Math.atan2(-pos[0], -pos[2]);
  const key = `v${h.st}-${h.i}`;
  const isHover = hovered === key;
  const glow = isHover ? 0.35 : 0.05;

  let body;
  let roof;
  if (h.shape === "tower") {
    body = <mesh position={[0, 1.0, 0]} castShadow><cylinderGeometry args={[0.45, 0.5, 2.0, 18]} /><meshStandardMaterial color={h.wall} emissive={h.accent} emissiveIntensity={glow} roughness={0.6} /></mesh>;
    roof = <mesh position={[0, 2.5, 0]}><coneGeometry args={[0.6, 0.9, 18]} /><meshStandardMaterial color={h.roof} emissive={h.accent} emissiveIntensity={glow} /></mesh>;
  } else if (h.shape === "round") {
    body = <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.7, 0.75, 1.0, 26]} /><meshStandardMaterial color={h.wall} emissive={h.accent} emissiveIntensity={glow} roughness={0.6} /></mesh>;
    roof = <mesh position={[0, 1.0, 0]}><sphereGeometry args={[0.7, 26, 14, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={h.roof} emissive={h.accent} emissiveIntensity={glow} /></mesh>;
  } else if (h.shape === "dome") {
    body = <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[1.1, 1.0, 1.0]} /><meshStandardMaterial color={h.wall} emissive={h.accent} emissiveIntensity={glow} roughness={0.6} /></mesh>;
    roof = <mesh position={[0, 1.0, 0]}><sphereGeometry args={[0.6, 26, 14, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={h.roof} emissive={h.accent} emissiveIntensity={glow} /></mesh>;
  } else {
    body = <mesh position={[0, 0.6, 0]} castShadow><boxGeometry args={[1.0, 1.2, 0.9]} /><meshStandardMaterial color={h.wall} emissive={h.accent} emissiveIntensity={glow} roughness={0.6} /></mesh>;
    roof = <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.85, 0.7, 4]} /><meshStandardMaterial color={h.roof} emissive={h.accent} emissiveIntensity={glow} /></mesh>;
  }

  return (
    <group
      position={pos}
      rotation={[0, ry, 0]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(key); document.body.style.cursor = "pointer"; playChime(soundRef, 660, 0.12); }}
      onPointerOut={() => { setHovered(null); document.body.style.cursor = "auto"; }}
      onClick={(e) => { e.stopPropagation(); onPick(h); }}
    >
      <GroundGlow color={h.accent} hover={isHover} />
      {body}
      {roof}
      <mesh position={[0, 0.35, 0.47]}>
        <boxGeometry args={[0.26, 0.5, 0.05]} />
        <meshStandardMaterial color="#fff7ed" />
      </mesh>
      <mesh position={[-0.3, 0.8, 0.48]}>
        <boxGeometry args={[0.16, 0.16, 0.03]} />
        <meshStandardMaterial color="#fef9c3" emissive="#fde68a" emissiveIntensity={isHover ? 1.4 : 0.6} />
      </mesh>
      <mesh position={[0.3, 0.8, 0.48]}>
        <boxGeometry args={[0.16, 0.16, 0.03]} />
        <meshStandardMaterial color="#fef9c3" emissive="#fde68a" emissiveIntensity={isHover ? 1.4 : 0.6} />
      </mesh>
      <VgFx kind={h.fx} color={h.accent} hover={isHover} />
      {isHover && (
        <Html position={[0, 3.4, 0]} center distanceFactor={14} style={{ pointerEvents: "none" }}>
          <div className="world-tip">{h.icon} {h.label}</div>
        </Html>
      )}
    </group>
  );
}

function VgPath({ st }) {
  const a = vgStreetAngle(st);
  return (
    <mesh position={[Math.cos(a) * 4.8, 0.02, Math.sin(a) * 4.8]} rotation={[0, Math.atan2(Math.cos(a), Math.sin(a)), 0]} receiveShadow>
      <boxGeometry args={[1.3, 0.04, 9.4]} />
      <meshStandardMaterial color="#e7e5e4" roughness={1} />
    </mesh>
  );
}

function VgRiver() {
  const bridges = [0.9, 3.9];
  return (
    <group>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[8.8, 0.36, 12, 96]} />
        <meshStandardMaterial color="#38bdf8" emissive="#7dd3fc" emissiveIntensity={0.25} transparent opacity={0.9} />
      </mesh>
      {bridges.map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 8.8, 0.25, Math.sin(a) * 8.8]} rotation={[0, -a, 0]} castShadow>
          <boxGeometry args={[1.6, 0.18, 1.0]} />
          <meshStandardMaterial color="#a8a29e" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function VgClockTower() {
  const hands = useRef();
  const crystal = useRef();
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (hands.current) hands.current.rotation.z = -t * 0.3;
    if (crystal.current) {
      crystal.current.rotation.y = t * 0.8;
      crystal.current.position.y = 6.3 + Math.sin(t * 1.5) * 0.15;
    }
  });
  return (
    <group>
      <mesh position={[0, 1.8, 0]} castShadow><cylinderGeometry args={[0.9, 1.1, 3.6, 24]} /><meshStandardMaterial color="#f5f5f4" roughness={0.6} /></mesh>
      <mesh position={[0, 4.95, 0]}><cylinderGeometry args={[0.85, 0.9, 1.4, 24]} /><meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={0.25} /></mesh>
      <mesh position={[0, 5.9, 0]}><coneGeometry args={[1.0, 1.2, 24]} /><meshStandardMaterial color="#60a5fa" roughness={0.4} /></mesh>
      <group position={[0, 4.95, 0.92]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.55, 0.55, 0.05, 32]} /><meshStandardMaterial color="#fffbeb" emissive="#fde68a" emissiveIntensity={0.4} /></mesh>
        <group ref={hands} position={[0, 0, 0.03]}>
          <mesh position={[0, 0.22, 0]}><boxGeometry args={[0.06, 0.44, 0.02]} /><meshStandardMaterial color="#78350f" /></mesh>
        </group>
      </group>
      <mesh ref={crystal} position={[0, 6.3, 0]}>
        <octahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial color="#38bdf8" emissive="#22d3ee" emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

function VgWindmill({ position }) {
  const blades = useRef();
  useFrame((s) => { if (blades.current) blades.current.rotation.z = s.clock.elapsedTime * 0.9; });
  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]} castShadow><cylinderGeometry args={[0.35, 0.5, 2.4, 14]} /><meshStandardMaterial color="#fef3c7" /></mesh>
      <mesh position={[0, 2.5, 0]}><coneGeometry args={[0.5, 0.6, 14]} /><meshStandardMaterial color="#b45309" /></mesh>
      <group ref={blades} position={[0, 2.4, 0.5]}>
        {[0, 1, 2, 3].map(i => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]} position={[0, 0.75, 0]}>
            <boxGeometry args={[0.18, 1.5, 0.04]} />
            <meshStandardMaterial color="#fef9c3" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function VgFountain({ position }) {
  const water = useRef();
  useFrame((s) => {
    if (water.current) water.current.scale.y = 1 + Math.sin(s.clock.elapsedTime * 3) * 0.25;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[1.0, 1.1, 0.3, 32]} /><meshStandardMaterial color="#e7e5e4" /></mesh>
      <mesh ref={water} position={[0, 0.35, 0]}><cylinderGeometry args={[0.85, 0.85, 0.12, 32]} /><meshStandardMaterial color="#7dd3fc" transparent opacity={0.8} /></mesh>
      <mesh position={[0, 0.8, 0]}><cylinderGeometry args={[0.08, 0.1, 0.9, 12]} /><meshStandardMaterial color="#e7e5e4" /></mesh>
      <mesh position={[0, 1.35, 0]}><sphereGeometry args={[0.18, 16, 16]} /><meshStandardMaterial color="#bae6fd" emissive="#38bdf8" emissiveIntensity={0.5} /></mesh>
    </group>
  );
}

function VgTrees() {
  const spots = [[-5.6, -2.8], [-6.4, 1.2], [5.8, 3.4], [6.9, -1.6], [-3.1, 5.9], [2.7, -6.1], [-1.2, -7.4], [4.4, 6.1], [-7.2, -4.4], [7.4, 2.4]];
  return (
    <group>
      {spots.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.12, 0.16, 1.0, 8]} /><meshStandardMaterial color="#92400e" /></mesh>
          <mesh position={[0, 1.4, 0]}><sphereGeometry args={[0.65, 16, 14]} /><meshStandardMaterial color={i % 3 === 0 ? "#f9a8d4" : "#86efac"} roughness={0.9} /></mesh>
        </group>
      ))}
    </group>
  );
}

function VgLanterns() {
  const pts = [];
  VG_STREETS.forEach((_, st) => {
    const a = vgStreetAngle(st);
    [2.2, 4.8, 7.4].forEach((r, k) => {
      const side = k % 2 ? 1.6 : -1.6;
      pts.push([Math.cos(a) * r - Math.sin(a) * side, Math.sin(a) * r + Math.cos(a) * side]);
    });
  });
  return (
    <group>
      {pts.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.04, 0.05, 1.4, 8]} /><meshStandardMaterial color="#44403c" /></mesh>
          <mesh position={[0, 1.5, 0]}><sphereGeometry args={[0.14, 12, 12]} /><meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={1.2} /></mesh>
        </group>
      ))}
    </group>
  );
}

function VgVillager({ angle, phase, color }) {
  const g = useRef();
  useFrame((s) => {
    if (!g.current) return;
    const d = 2.5 + ((Math.sin(s.clock.elapsedTime * 0.4 + phase) + 1) / 2) * 4;
    g.current.position.set(Math.cos(angle) * d, 0, Math.sin(angle) * d);
    g.current.rotation.y = -angle + (Math.cos(s.clock.elapsedTime * 0.4 + phase) > 0 ? 0 : Math.PI);
  });
  return (
    <group ref={g}>
      <mesh position={[0, 0.35, 0]}><capsuleGeometry args={[0.1, 0.22, 6, 10]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 0.7, 0]}><sphereGeometry args={[0.1, 12, 12]} /><meshStandardMaterial color="#fde68a" /></mesh>
    </group>
  );
}

function VgButterflies() {
  const g = useRef();
  useFrame((s) => { if (g.current) g.current.rotation.y = s.clock.elapsedTime * 0.3; });
  return (
    <group ref={g}>
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={i} position={[Math.cos(i * 1.3) * 4.2, 1.6 + Math.sin(i * 2) * 0.4, Math.sin(i * 1.3) * 4.2]}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshStandardMaterial color={i % 2 ? "#f0abfc" : "#fde68a"} emissive="#fbcfe8" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function VgGate() {
  return (
    <group position={[0, 0, 8.4]}>
      <mesh position={[-2.2, 1.6, 0]} castShadow><boxGeometry args={[0.7, 3.2, 0.7]} /><meshStandardMaterial color="#d6d3d1" roughness={0.7} /></mesh>
      <mesh position={[2.2, 1.6, 0]} castShadow><boxGeometry args={[0.7, 3.2, 0.7]} /><meshStandardMaterial color="#d6d3d1" roughness={0.7} /></mesh>
      <mesh position={[0, 3.2, 0]} rotation={[0, 0, 0]}><torusGeometry args={[2.2, 0.28, 12, 40, Math.PI]} /><meshStandardMaterial color="#e7e5e4" /></mesh>
      <mesh position={[0, 2.2, 0.1]}>
        <boxGeometry args={[4.4, 0.25, 0.25]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.8} />
      </mesh>
      <Html position={[0, 4.6, 0]} center distanceFactor={12} style={{ pointerEvents: "none" }}>
        <div className="vg-gate-title">PLOTCRAFT</div>
      </Html>
    </group>
  );
}

function VgVillage() {
  return (
    <group>
      <mesh position={[0, -0.6, 0]} receiveShadow><cylinderGeometry args={[10, 10.6, 1.2, 64]} /><meshStandardMaterial color="#86efac" roughness={1} /></mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[9.6, 64]} /><meshStandardMaterial color="#bbf7d0" roughness={1} /></mesh>
      {VG_STREETS.map((_, st) => <VgPath key={st} st={st} />)}
      <VgRiver />
      <VgClockTower />
      <VgWindmill position={[-7.8, 0, -5.2]} />
      <VgFountain position={[3.4, 0, -3.4]} />
      <VgTrees />
      <VgLanterns />
      <VgVillager angle={0.4} phase={0} color="#f472b6" />
      <VgVillager angle={2.2} phase={1.5} color="#60a5fa" />
      <VgVillager angle={4.1} phase={3} color="#34d399" />
      <VgButterflies />
      <VgGate />
    </group>
  );
}

function VgIntroRig({ skipRef, onDone }) {
  const { camera } = useThree();
  const start = useRef(null);
  const finished = useRef(false);
  useFrame((s) => {
    if (finished.current) return;
    if (start.current === null) start.current = s.clock.elapsedTime;
    const t = skipRef.current ? VG_END.t : s.clock.elapsedTime - start.current;
    if (t >= VG_END.t) {
      finished.current = true;
      camera.position.set(...VG_END.p);
      camera.lookAt(...VG_END.l);
      onDone();
      return;
    }
    for (let i = 0; i < VG_KEYS.length - 1; i++) {
      const a = VG_KEYS[i];
      const b = VG_KEYS[i + 1];
      if (t <= b.t) {
        const u = vgSmooth(Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))));
        camera.position.set(
          a.p[0] + (b.p[0] - a.p[0]) * u,
          a.p[1] + (b.p[1] - a.p[1]) * u,
          a.p[2] + (b.p[2] - a.p[2]) * u,
        );
        camera.lookAt(
          a.l[0] + (b.l[0] - a.l[0]) * u,
          a.l[1] + (b.l[1] - a.l[1]) * u,
          a.l[2] + (b.l[2] - a.l[2]) * u,
        );
        break;
      }
    }
  });
  return null;
}

function VgCinematic({ onGo, soundRef }) {
  const [hovered, setHovered] = useState(null);
  const [introDone, setIntroDone] = useState(false);
  const [flying, setFlying] = useState(false);
  const [flash, setFlash] = useState(false);
  const [sky, setSky] = useState(true);
  const skipRef = useRef(false);
  const controlsRef = useRef();
  const flyRef = useRef(null);

  const skipIntro = () => { skipRef.current = true; };

  const pickHouse = (h) => {
    if (!introDone || flying) return;
    playChime(soundRef, 990, 0.22);
    setFlying(true);
    const hp = vgHousePos(h);
    const len = Math.hypot(hp[0], hp[2]) || 1;
    const dx = hp[0] / len;
    const dz = hp[2] / len;
    flyRef.current = {
      pos: new THREE.Vector3(hp[0] + dx * 1.8, 1.6, hp[2] + dz * 1.8),
      look: new THREE.Vector3(hp[0], 0.9, hp[2]),
      speed: 0.07,
      done: () => {
        setFlash(true);
        setTimeout(() => onGo(h.go), 380);
      },
    };
  };

  return (
    <>
      <Canvas shadows camera={{ position: [0, 8, 60], fov: 45 }} style={{ width: "100%", height: "min(72vh, 640px)" }}>
        <fog attach="fog" args={["#e0f2fe", 26, 72]} />
        <hemisphereLight args={["#ffffff", "#f5d0fe", 0.8]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[8, 14, 6]} intensity={1.2} castShadow />
        <DreiStars radius={120} depth={60} count={2500} factor={4} fade speed={0.5} />
        <VgEarth />
        <VgVillage />
        {VG_HOUSES.map(h => (
          <VgHouse key={`v${h.st}-${h.i}`} h={h} hovered={hovered} setHovered={setHovered} onPick={pickHouse} soundRef={soundRef} />
        ))}
        <DriftCloud position={[-7, 3.2, -4]} scale={1.1} speed={0.12} range={1} />
        <DriftCloud position={[7, 2.6, -3]} scale={0.9} speed={0.16} range={0.8} />
        <VgIntroRig skipRef={skipRef} onDone={() => { setIntroDone(true); setSky(false); }} />
        <CameraRig flyRef={flyRef} controlsRef={controlsRef} />
        <OrbitControls
          ref={controlsRef}
          enabled={introDone && !flying}
          enablePan={false}
          target={[0, 1.4, 0]}
          minDistance={4}
          maxDistance={22}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.1}
          autoRotate={false}
        />
      </Canvas>

      {!introDone && (
        <button type="button" className="vg-skip" onClick={skipIntro}>Skip intro →</button>
      )}
      {introDone && (
        <div className="vg-hint">Drag: look around · Scroll: zoom · House meeda hover / click</div>
      )}
      <div className={`world-flash ${flash ? "on" : ""}`} />
    </>
  );
}

function HomeHero({ onOpen, onTab, onTools }) {
  const dispatch = (go) => {
    const [kind, id] = go.split(":");
    if (kind === "studio") onOpen && onOpen(id);
    else if (kind === "tools") onTools && onTools(id);
    else onTab && onTab(id);
  };

  const shortcuts = [
    { icon: "✍️", title: "Story Studio", detail: "Turn an idea into a story", go: "tab:story", tone: "from-rose-100 to-orange-50" },
    { icon: "🎨", title: "Art Studio", detail: "Draw, paint and create", go: "studio:art", tone: "from-violet-100 to-pink-50" },
    { icon: "🎬", title: "Video Studio", detail: "Edit clips and motion", go: "studio:video", tone: "from-sky-100 to-indigo-50" },
    { icon: "🪄", title: "Creative Tools", detail: "Explore more ways to create", go: "tools:audio", tone: "from-emerald-100 to-teal-50" },
    { icon: "💬", title: "AI Chat", detail: "Ask, plan and brainstorm", go: "tab:search", tone: "from-amber-100 to-yellow-50" },
  ];

  return (
    <section className="pc-home-hub w-full space-y-6" aria-label="PlotCraft home">
      <style>{`
        .pc-home-hub { color:var(--pc-text); }
        .pc-home-hero { position:relative; isolation:isolate; min-height:390px; overflow:hidden; border:1px solid rgba(148,163,184,.25); border-radius:30px; background:linear-gradient(120deg,#241b45 0%,#48316e 48%,#23465d 100%); box-shadow:0 24px 70px -38px rgba(35,24,65,.65); }
        .pc-home-hero video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:.62; z-index:-2; }
        .pc-home-hero:before { content:""; position:absolute; inset:0; z-index:-1; background:linear-gradient(90deg,rgba(24,20,47,.88),rgba(34,28,62,.55) 56%,rgba(27,42,63,.35)); }
        .pc-home-copy { max-width:690px; }
        .pc-home-pill { display:inline-flex; align-items:center; gap:8px; border:1px solid rgba(255,255,255,.28); background:rgba(255,255,255,.12); color:white; border-radius:999px; padding:7px 12px; font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; backdrop-filter:blur(12px); }
        .pc-home-shortcut { min-height:132px; border:1px solid rgba(148,163,184,.22); transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease; }
        .pc-home-shortcut:hover { transform:translateY(-4px); box-shadow:0 18px 34px -24px rgba(50,40,90,.45); border-color:rgba(139,92,246,.45); }
        .plotcraft-shell[data-theme="standard"] .pc-home-shortcut { background:rgba(255,255,255,.94); color:#172033; }
        .plotcraft-shell[data-theme="world"] .pc-home-shortcut { background:rgba(255,255,255,.86); color:#34264f; }
        @media (prefers-reduced-motion:reduce) { .pc-home-shortcut { transition:none; } .pc-home-shortcut:hover { transform:none; } }
      `}</style>

      <PlotCraftHero
        onStart={() => dispatch("tab:story")}
        onChat={() => dispatch("tab:search")}
      />

      <div className="flex items-end justify-between gap-3">
        <div><p className="text-[11px] font-black uppercase tracking-[.18em] opacity-55">Your workspace</p><h2 className="mt-1 text-xl sm:text-2xl font-black">Pick up where creativity starts</h2></div>
        <span className="hidden sm:block text-xs opacity-55">Choose a studio to get started</span>
      </div>
      <WorkspaceShortcuts items={shortcuts} onPick={dispatch} />
    </section>
  );
}

/* Shows runtime errors on screen instead of a blank area, so the real cause is visible. */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error(`[${this.props.label}]`, err, info); }
  render() {
    const e = this.state.err;
    if (!e) return this.props.children;
    return (
      <div style={{ padding: 16, margin: "8px 0", border: "1px solid #f87171", borderRadius: 12, background: "rgba(248,113,113,.12)", color: "#dc2626", fontSize: 12, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
        <b>{this.props.label} error:</b>
        {"\n"}{String(e?.message || e)}
        {"\n"}{String(e?.stack || "").split("\n").slice(1, 7).join("\n")}
      </div>
    );
  }
}

/* ===== Upgrade layer: smooth transitions, hover/press feedback, focus rings, scrollbars ===== */
const UPGRADE_CSS = `
@keyframes pcPageIn { from { opacity: 0; transform: translateY(14px) scale(.995); } to { opacity: 1; transform: none; } }
.pc-page { animation: pcPageIn .45s cubic-bezier(.2,.8,.2,1) both; }
.plotcraft-shell button, .plotcraft-shell [role="button"] { transition: transform .2s cubic-bezier(.2,.8,.2,1), background-color .25s ease, box-shadow .25s ease, filter .25s ease; }
.plotcraft-shell button:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
.plotcraft-shell button:active:not(:disabled) { transform: translateY(0) scale(.98); }
.plotcraft-shell { transition: background-color .5s ease, color .5s ease; }
.plotcraft-shell[data-theme="standard"] { color:#172033; }
.plotcraft-shell[data-theme="standard"] input, .plotcraft-shell[data-theme="standard"] textarea { color:#172033; }

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Orbitron:wght@400;700;900&family=Audiowide&family=Nunito:wght@400;700;900&family=Poppins:wght@400;600;800&family=Fredoka:wght@400;600;700&family=Quicksand:wght@400;600;700&family=Playfair+Display:wght@400;700;900&display=swap');
:root { --pc-font: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif; --pc-ease: cubic-bezier(.2,.8,.2,1); }
.plotcraft-shell, .plotcraft-shell button, .plotcraft-shell input, .plotcraft-shell textarea, .plotcraft-shell select, .pcp-root, .pcp-root button, .pcp-root input { font-family: var(--pc-font); }
.plotcraft-shell svg { stroke-width: 2; }
.plotcraft-shell[data-theme="world"] { --pc-font: 'Fredoka', sans-serif; --pc-text: #6b3f8f; --pc-muted: #9b7bb8; --pc-hero-a: #fdf4ff; --pc-hero-b: #ede9fe; --pc-hero-c: #fce7f3; --pc-hero-d: #e0f2fe; --pc-card: rgba(255,255,255,.75); --pc-accent: #d8a4f0; }
.plotcraft-shell[data-theme="world"]::before { content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 0; background: radial-gradient(circle at 15% 15%, rgba(255,255,255,.95), transparent 38%), radial-gradient(circle at 85% 25%, rgba(255,255,255,.85), transparent 35%), radial-gradient(circle at 50% 95%, rgba(255,255,255,.95), transparent 45%); }
.plotcraft-shell[data-theme="world"] h1, .plotcraft-shell[data-theme="world"] h2, .plotcraft-shell[data-theme="world"] h3 { letter-spacing: .3px; }
.plotcraft-shell { font-family: var(--pc-font); color: var(--pc-text); --pc-font: 'Inter', 'Segoe UI', system-ui, sans-serif; --pc-text: #f1f5f9; --pc-muted: #cbd5e1; --pc-hero-a: #1e1b4b; --pc-hero-b: #4c1d95; --pc-hero-c: #be185d; --pc-hero-d: #0e7490; --pc-card: rgba(255,255,255,.1); --pc-accent: #a855f7; }
.plotcraft-shell[data-theme="standard"] { --pc-font: 'Inter', 'Segoe UI', system-ui, sans-serif; --pc-text: #172033; --pc-muted: #475569; --pc-hero-a: #f8fafc; --pc-hero-b: #eef2ff; --pc-hero-c: #fdf2f8; --pc-hero-d: #eff6ff; --pc-card: rgba(255,255,255,.96); --pc-accent: #6d28d9; }
.plotcraft-shell[data-theme="standard"] .nav-stagger-item p { color:#64748b; }
.plotcraft-shell[data-theme="standard"] select, .plotcraft-shell[data-theme="standard"] option { color:#172033; background:#fff; }
.plotcraft-shell[data-theme="world"] select, .plotcraft-shell[data-theme="world"] option { color:#34264f; background:#fff; }
.plotcraft-shell[data-theme="rgbclr"] { --pc-font: 'Orbitron', sans-serif; --pc-text: #f8fafc; --pc-muted: #e0e7ff; --pc-hero-a: #0f0020; --pc-hero-b: #3b0764; --pc-hero-c: #831843; --pc-hero-d: #0e7490; --pc-card: rgba(255,255,255,.08); --pc-accent: #d946ef; }
.plotcraft-shell[data-theme="cyberpunk"] { --pc-font: 'Audiowide', sans-serif; --pc-text: #e0f7fa; --pc-muted: #67e8f9; --pc-hero-a: #0a0f1f; --pc-hero-b: #0e3a4a; --pc-hero-c: #4c0519; --pc-hero-d: #0c4a6e; --pc-card: rgba(6,182,212,.08); --pc-accent: #06b6d4; }
.plotcraft-shell[data-theme="emerald"] { --pc-font: 'Nunito', sans-serif; --pc-text: #064e3b; --pc-muted: #065f46; --pc-hero-a: #ecfdf5; --pc-hero-b: #d1fae5; --pc-hero-c: #ccfbf1; --pc-hero-d: #f0fdfa; --pc-card: rgba(255,255,255,.8); --pc-accent: #059669; }
.plotcraft-shell[data-theme="sunset"] { --pc-font: 'Poppins', sans-serif; --pc-text: #7c2d12; --pc-muted: #9a3412; --pc-hero-a: #fff7ed; --pc-hero-b: #ffedd5; --pc-hero-c: #ffe4e6; --pc-hero-d: #fef3c7; --pc-card: rgba(255,255,255,.8); --pc-accent: #ea580c; }
.plotcraft-shell[data-theme="party"] { --pc-font: 'Fredoka', sans-serif; --pc-text: #4a044e; --pc-muted: #6b21a8; --pc-hero-a: #fdf2f8; --pc-hero-b: #fae8ff; --pc-hero-c: #ede9fe; --pc-hero-d: #fce7f3; --pc-card: rgba(255,255,255,.8); --pc-accent: #db2777; }
.plotcraft-shell[data-theme="rainy"] { --pc-font: 'Quicksand', sans-serif; --pc-text: #0c4a6e; --pc-muted: #075985; --pc-hero-a: #f0f9ff; --pc-hero-b: #e0f2fe; --pc-hero-c: #e0e7ff; --pc-hero-d: #f8fafc; --pc-card: rgba(255,255,255,.8); --pc-accent: #0284c7; }
.plotcraft-shell[data-theme="dream"] { --pc-font: 'Playfair Display', serif; --pc-text: #f5f3ff; --pc-muted: #ddd6fe; --pc-hero-a: #1e1b4b; --pc-hero-b: #4c1d95; --pc-hero-c: #701a75; --pc-hero-d: #1e3a8a; --pc-card: rgba(255,255,255,.1); --pc-accent: #8b5cf6; }
html { scroll-behavior: smooth; }
@keyframes pcFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes pcPop { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
.pc-fade-up { animation: pcFadeUp .5s var(--pc-ease) both; }
.pc-pop { animation: pcPop .3s var(--pc-ease) both; }
button, a, [role="button"], input, select, textarea {
  transition: transform .2s var(--pc-ease), background-color .25s ease, box-shadow .25s ease,
              border-color .25s ease, color .25s ease, opacity .25s ease;
}
button:hover:not(:disabled) { transform: translateY(-1px); }
button:active:not(:disabled) { transform: translateY(0) scale(.98); }
:focus-visible { outline: 2px solid #a78bfa; outline-offset: 2px; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: rgba(124,58,237,.45); border-radius: 999px; }
::-webkit-scrollbar-thumb:hover { background: rgba(124,58,237,.7); }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
`;

function useUpgradeStyles() {
  useEffect(() => {
    if (document.getElementById("pc-upgrade-css")) return;
    const style = document.createElement("style");
    style.id = "pc-upgrade-css";
    style.textContent = UPGRADE_CSS;
    document.head.appendChild(style);
  }, []);
}

/* ===== PlotCraft Pro studio (merged from PlotCraftPro.jsx) ===== */


// ===== Video engine (merged) =====
// Shared engine for KineVideoStudio: presets, animation math, canvas renderer, WebM export.

const PRESETS = {
  none: "", cinematic: "contrast(1.18) saturate(1.25) brightness(.96)", vivid: "saturate(1.75) contrast(1.12)",
  noir: "grayscale(1) contrast(1.3)", warm: "sepia(.45) saturate(1.3)", cool: "hue-rotate(180deg) saturate(1.2)",
  fade: "contrast(.85) brightness(1.1) saturate(.8)", vintage: "sepia(.7) contrast(1.1) brightness(.95)",
  matte: "contrast(.92) saturate(.82) brightness(1.04)", bleach: "contrast(1.35) saturate(.45) brightness(1.08)",
  tealOrange: "sepia(.18) saturate(1.45) hue-rotate(325deg) contrast(1.12)", pastel: "saturate(.72) brightness(1.12) contrast(.9)",
  drama: "contrast(1.55) saturate(1.1) brightness(.88)", film: "sepia(.22) contrast(1.12) saturate(.9)",
  arctic: "hue-rotate(190deg) saturate(.85) brightness(1.08)", golden: "sepia(.32) saturate(1.4) brightness(1.08)",
  dreamy: "blur(.35px) saturate(1.2) brightness(1.1)", cyber: "hue-rotate(255deg) saturate(1.6) contrast(1.2)",
  monochrome: "grayscale(1)", fadedFilm: "sepia(.25) contrast(.82) brightness(1.12)", punch: "saturate(2) contrast(1.25)",
  forest: "hue-rotate(25deg) saturate(1.25)", rose: "sepia(.12) hue-rotate(300deg) saturate(1.25)"
};
const ADJ = { b: 1, c: 1, s: 1, h: 0, blur: 0 };
const uid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}.${Math.floor((s % 1) * 10)}`;
const dur = (c) => Math.max(0.1, (c.end - c.start) / (c.speed || 1));
const cssFilter = (c) => {
  const a = { ...ADJ, ...(c.adj || {}) };
  return `${PRESETS[c.filter || "none"] || ""} brightness(${a.b}) contrast(${a.c}) saturate(${a.s}) hue-rotate(${a.h}deg) blur(${a.blur}px)`;
};
const FONTS = {
  Sans: "Inter, system-ui, sans-serif", Serif: "Georgia, serif", Display: "Impact, 'Arial Black', sans-serif",
  Script: "'Brush Script MT', cursive", Mono: "ui-monospace, Menlo, monospace",
};
const ANIMS = ["none", "fade", "slideUp", "slideLeft", "pop", "bounce", "typewriter"];
const TRANS = ["none", "fade", "slide", "zoom", "wipe", "blur", "dissolve", "push", "circle", "dip-black", "dip-white", "glitch"];
const FX = ["vignette", "letterbox", "scanlines", "grain", "flash", "light-leak", "chromatic", "film-dust", "flicker", "glow", "pixelate", "strobe", "lens-flare", "rgb-split", "soft-focus"];
const rect = [[0, 0], [1, 0], [1, 1], [0, 1]];
const SHAPES = {
  circle: null, rect, bar: rect, triangle: [[0.5, 0], [1, 1], [0, 1]],
  star: Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 0.22 : 0.5; return [0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)]; }),
};
const poly = (pts) => `polygon(${pts.map(([x, y]) => `${x * 100}% ${y * 100}%`).join(",")})`;
const shapeAspect = (s) => (s === "bar" ? 5.5 : 1);
const THEMES = {
  Neon: { bg: { type: "anim", c1: "#12002b", c2: "#ff2bd6" }, filter: "vivid", fx: ["vignette", "scanlines"] },
  "Retro VHS": { bg: { type: "solid", c1: "#1a1a2e", c2: "#1a1a2e" }, filter: "vintage", fx: ["grain", "scanlines"] },
  Cinema: { bg: { type: "solid", c1: "#000000", c2: "#000000" }, filter: "cinematic", fx: ["letterbox", "vignette"] },
  "Sunset Party": { bg: { type: "gradient", c1: "#ff9a3c", c2: "#ff3cac" }, filter: "vivid", fx: ["flash"] },
  Minimal: { bg: { type: "solid", c1: "#f1f5f9", c2: "#f1f5f9" }, filter: "none", fx: [] },
  Ocean: { bg: { type: "anim", c1: "#023e8a", c2: "#00b4d8" }, filter: "cool", fx: ["vignette"] },
  Documentary: { bg: { type: "solid", c1: "#101820", c2: "#101820" }, filter: "matte", fx: ["grain"] },
  "Product Film": { bg: { type: "gradient", c1: "#0f172a", c2: "#334155" }, filter: "punch", fx: ["glow"] },
  Travel: { bg: { type: "anim", c1: "#075985", c2: "#0f766e" }, filter: "golden", fx: ["light-leak"] },
  Pastel: { bg: { type: "gradient", c1: "#fbcfe8", c2: "#bfdbfe" }, filter: "pastel", fx: [] },
  Thriller: { bg: { type: "solid", c1: "#09090b", c2: "#18181b" }, filter: "drama", fx: ["vignette", "flicker"] },
  Wedding: { bg: { type: "gradient", c1: "#fce7f3", c2: "#fef3c7" }, filter: "dreamy", fx: ["glow"] },
  Gaming: { bg: { type: "anim", c1: "#111827", c2: "#7e22ce" }, filter: "cyber", fx: ["scanlines", "rgb-split"] },
  Sports: { bg: { type: "solid", c1: "#052e16", c2: "#14532d" }, filter: "punch", fx: ["flash"] },
  Editorial: { bg: { type: "solid", c1: "#f8fafc", c2: "#e2e8f0" }, filter: "monochrome", fx: ["letterbox"] },
  "Night City": { bg: { type: "anim", c1: "#020617", c2: "#1e1b4b" }, filter: "arctic", fx: ["chromatic", "lens-flare"] },
};

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
function locateClip(clips, t) {
  let acc = 0;
  for (const c of clips) {
    const d = dur(c);
    if (t < acc + d || c === clips[clips.length - 1]) return { clip: c, local: clamp(t - acc, 0, d), at: acc };
    acc += d;
  }
  return { clip: null, local: 0, at: 0 };
}
function bgCss(bg, t) {
  if (!bg || bg.type === "solid") return bg?.c1 || "#000";
  return `linear-gradient(${bg.type === "anim" ? (t * 30) % 360 : 135}deg, ${bg.c1}, ${bg.c2})`;
}

/** Motion for a layer at time t: opacity, offset (% of stage), scale, typed characters. */
function animState(o, t) {
  const d = o.animDur || 0.6;
  const p = clamp(Math.min((t - o.start) / d, (o.end - t) / d));
  const e = 1 - (1 - p) ** 3;
  const r = { op: 1, dx: 0, dy: 0, sc: 1, chars: null };
  if (o.anim === "fade") r.op = p;
  else if (o.anim === "slideUp") { r.op = e; r.dy = (1 - e) * 10; }
  else if (o.anim === "slideLeft") { r.op = e; r.dx = -(1 - e) * 20; }
  else if (o.anim === "pop") { r.op = clamp(p * 3); r.sc = p < 1 ? 0.3 + 0.7 * e + Math.sin(p * Math.PI) * 0.18 : 1; }
  else if (o.anim === "bounce") { r.dy = -Math.abs(Math.sin((t - o.start) * 4)) * 3; r.op = clamp(p * 3); }
  else if (o.anim === "typewriter") r.chars = Math.floor(clamp((t - o.start) / (d * 2.5)) * (o.text || "").length);
  return r;
}

/** Incoming-clip transition at clip-local time. */
function transState(clip, local) {
  const r = { op: 1, tx: 0, sc: 1, inset: 0, blur: 0 };
  const tr = clip.trans;
  if (!tr || tr.type === "none" || local >= tr.d) return r;
  const p = clamp(local / tr.d); const e = 1 - (1 - p) ** 3;
  if (tr.type === "fade") r.op = p;
  else if (tr.type === "slide") r.tx = (1 - e) * 100;
  else if (tr.type === "zoom") { r.op = p; r.sc = 0.6 + 0.4 * e; }
  else if (tr.type === "wipe") r.inset = (1 - p) * 100;
  else if (tr.type === "blur") { r.op = p; r.blur = (1 - p) * 14; }
  return r;
}

function drawFx(g, W, H, o, t) {
  g.save();
  if (o.fxType === "vignette") { const r = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95); r.addColorStop(0, "rgba(0,0,0,0)"); r.addColorStop(1, "rgba(0,0,0,.7)"); g.fillStyle = r; g.fillRect(0, 0, W, H); }
  if (o.fxType === "letterbox") { g.fillStyle = "#000"; g.fillRect(0, 0, W, H * 0.12); g.fillRect(0, H * 0.88, W, H * 0.12); }
  if (o.fxType === "scanlines") { g.fillStyle = "rgba(0,0,0,.18)"; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1.5); }
  if (o.fxType === "grain") { g.fillStyle = "rgba(255,255,255,.1)"; for (let i = 0; i < 500; i++) g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  if (o.fxType === "flash") { g.fillStyle = `rgba(255,255,255,${clamp(1 - (t - o.start) / 0.5) * 0.9})`; g.fillRect(0, 0, W, H); }
  g.restore();
}

/** Draws one composed frame (used for PNG export and full video render). */
function drawFrame(g, W, H, t, S) {
  const { clips, overlays, bg, vids, imgs } = S;
  if (bg && bg.type !== "solid") { const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, bg.c1); gr.addColorStop(1, bg.c2); g.fillStyle = gr; } else g.fillStyle = bg?.c1 || "#000";
  g.fillRect(0, 0, W, H);
  const { clip, local } = locateClip(clips, t);
  const v = clip && vids[clip.id];
  if (clip && v && v.videoWidth) {
    const tr = transState(clip, local); const z = tr.sc * (clip.zoom || 1);
    g.save();
    if (tr.inset) { g.beginPath(); g.rect(0, 0, W * (1 - tr.inset / 100), H); g.clip(); }
    g.globalAlpha = tr.op; g.filter = (cssFilter(clip) + (tr.blur ? ` blur(${tr.blur}px)` : "")).trim() || "none";
    g.translate(W / 2 + (tr.tx / 100) * W, H / 2); g.scale(z, z);
    const s = Math.min(W / v.videoWidth, H / v.videoHeight);
    g.drawImage(v, (-v.videoWidth * s) / 2, (-v.videoHeight * s) / 2, v.videoWidth * s, v.videoHeight * s);
    g.restore();
  }
  overlays.forEach((o) => {
    if (t < o.start || t > o.end) return;
    if (o.kind === "fx") return drawFx(g, W, H, o, t);
    const a = animState(o, t); const cx = ((o.x + a.dx) / 100) * W; const cy = ((o.y + a.dy) / 100) * H;
    g.save(); g.globalAlpha = (o.opacity ?? 1) * a.op; g.translate(cx, cy); g.scale(a.sc, a.sc);
    if (o.kind === "text") {
      const fs = (o.size / 360) * H; g.font = `${o.bold ? "800" : "500"} ${fs}px ${FONTS[o.font] || FONTS.Sans}`;
      const txt = a.chars != null ? o.text.slice(0, a.chars) : o.text; const w = g.measureText(o.text).width;
      g.textAlign = "center"; g.textBaseline = "middle";
      if (o.bg) { g.fillStyle = o.bg; g.fillRect(-w / 2 - fs * 0.5, -fs * 0.65, w + fs, fs * 1.3); }
      g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 6; g.fillStyle = o.color; g.fillText(txt, 0, 0);
    } else if (o.kind === "shape") {
      const w = (o.size / 100) * W; const h = w / shapeAspect(o.shape); g.fillStyle = o.color; g.beginPath();
      const pts = SHAPES[o.shape];
      if (!pts) g.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      else pts.forEach(([px, py], i) => g[i ? "lineTo" : "moveTo"]((px - 0.5) * w, (py - 0.5) * h));
      g.fill();
    } else if (o.kind === "image" && imgs[o.src]) {
      const im = imgs[o.src]; const w = (o.size / 100) * W; g.drawImage(im, -w / 2, (-w * im.height) / im.width / 2, w, (w * im.height) / im.width);
    }
    g.restore();
  });
}

/** Renders the whole timeline (videos + songs + layers) in real time into a WebM file. */
async function renderProject({ clips, overlays, audio, bg, total, onProgress }) {
  const W = 1280; const H = 720; const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d"); const ac = new (window.AudioContext || window.webkitAudioContext)(); const dest = ac.createMediaStreamDestination();
  const mk = (tag, url) => new Promise((res) => { const e = document.createElement(tag); e.preload = "auto"; e.playsInline = true; e.onloadedmetadata = () => res(e); e.onerror = () => res(e); e.src = url; });
  const vids = {}; for (const cl of clips) { const v = await mk("video", cl.url); const gn = ac.createGain(); gn.gain.value = cl.muted ? 0 : cl.volume ?? 1; ac.createMediaElementSource(v).connect(gn).connect(dest); vids[cl.id] = v; }
  const auds = {}; for (const a of audio) { const e = await mk("audio", a.url); const gn = ac.createGain(); ac.createMediaElementSource(e).connect(gn).connect(dest); auds[a.id] = { e, gn }; }
  const imgs = {}; for (const o of overlays) if (o.kind === "image" && o.src && !imgs[o.src]) imgs[o.src] = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = o.src; });
  const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
  const rec = new MediaRecorder(new MediaStream([...c.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]), mime ? { mimeType: mime } : undefined);
  const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise((r) => { rec.onstop = r; });
  await ac.resume(); rec.start(250);
  const t0 = performance.now(); let active = null;
  await new Promise((resolve) => {
    const frame = () => {
      const t = (performance.now() - t0) / 1000; if (t >= total) return resolve();
      const { clip } = locateClip(clips, t);
      if (clip && clip.id !== active) { Object.values(vids).forEach((v) => v.pause()); active = clip.id; const v = vids[clip.id]; v.currentTime = clip.start; v.playbackRate = clip.speed || 1; v.play().catch(() => {}); }
      audio.forEach((a) => {
        const { e, gn } = auds[a.id]; const l = t - a.start; const len = a.out - a.in;
        if (l >= 0 && l < len) { if (e.paused) { e.currentTime = a.in + l; e.play().catch(() => {}); } gn.gain.value = (a.volume ?? 1) * Math.min(1, a.fadeIn ? l / a.fadeIn : 1, a.fadeOut ? (len - l) / a.fadeOut : 1); } else if (!e.paused) e.pause();
      });
      drawFrame(g, W, H, t, { clips, overlays, bg, vids, imgs }); onProgress?.(t / total); requestAnimationFrame(frame);
    };
    frame();
  });
  rec.stop(); await stopped;
  Object.values(vids).forEach((v) => v.pause()); Object.values(auds).forEach(({ e }) => e.pause()); ac.close();
  return new Blob(chunks, { type: mime || "video/webm" });
}

// ===== Landing (clean home) =====
const PCP_ANIM_CSS = `
@keyframes pcp-rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
.pcp-rise { animation: pcp-rise .45s both; }
@media (prefers-reduced-motion: reduce) { .pcp-rise { animation: none; } }
`;
const SHORT = { art: "Art", model: "Characters", animation: "Animate", video: "Video", graphic: "Graphic", diy: "DIY", music: "Music", writing: "Write", design: "Design", learn: "Learn", files: "Files" };
const GROUPS = [
  ["Create", ["art", "model", "animation", "graphic"]],
  ["Video & audio", ["video", "music"]],
  ["Make & write", ["writing", "diy", "design"]],
  ["Learn & files", ["learn", "files"]],
];

const LEGAL_TEXT = {
  privacy: {
    title: "Privacy Policy",
    body: [
      "PlotCraft AI saves your projects on this device using your browser's local storage. We do not upload your stories, drawings or videos to our servers unless you choose an AI feature that sends a prompt.",
      "AI prompts you send may be processed by our AI provider to generate results. Do not enter passwords or sensitive personal data into prompts.",
      "You can delete any project from the Projects list at any time. Clearing your browser data removes all locally saved work.",
      "Questions? Contact: [add your support email here]",
    ],
  },
  terms: {
    title: "Terms of Use",
    body: [
      "By using PlotCraft AI you agree to use it lawfully and not to generate or share content that is illegal, harmful, or infringes others' rights.",
      "You own the content you create. You are responsible for checking that any uploaded media you use is yours or licensed for your use.",
      "AI output may be inaccurate. Review it before relying on it. The service is provided as is, without warranties.",
      "We may update these terms; continued use means you accept the updated terms.",
      "Questions? Contact: [add your support email here]",
    ],
  },
};

function LegalModal({ kind, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const doc = LEGAL_TEXT[kind];
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={doc.title}>
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0e1528] p-6 text-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-white">{doc.title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-300 hover:bg-white/10">✕</button>
        </div>
        <div className="space-y-3 text-sm leading-relaxed">
          {doc.body.map((para, i) => <p key={i}>{para}</p>)}
        </div>
      </div>
    </div>
  );
}

function ProLanding({ categories, search, setSearch, onOpen, projects = [], onOpenProject, onDeleteProject, currentUser, onBack, toast, proTheme, onTheme, themeName = "standard" }) {
  const q = search.trim();
  const byId = Object.fromEntries(categories.map((c) => [c.id, c]));
  const recent = [...projects].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 6);
  const iconOf = (id) => (CATEGORIES.find((c) => c.id === id) || CATEGORIES[0]).Icon;
  const quick = [["Edit a video", "video", Film], ["Animate something", "animation", Wand2], ["Open any file", "files", FileText]];
  const shown = GROUPS.map(([name, ids]) => [name, ids.map((id) => byId[id]).filter(Boolean)]).filter(([, list]) => list.length);

  const [legal, setLegal] = useState(null);
  return (
    <div className="pcp-landing min-h-screen w-full overflow-x-hidden" data-theme={themeName}>
      <style>{PCP_ANIM_CSS + `
        .pcp-landing { --home-bg:#101827; --home-surface:#182337; --home-surface2:#202d43; --home-text:#f1f5f9; --home-muted:#a8b4c7; --home-line:rgba(255,255,255,.11); --home-hero-a:#6d28d9; --home-hero-b:#c026d3; background:var(--home-bg)!important; color:var(--home-text)!important; transition:background .25s ease,color .25s ease; }
        .pcp-landing[data-theme="standard"] { --home-bg:#f4f6fb; --home-surface:#ffffff; --home-surface2:#f8fafc; --home-text:#172033; --home-muted:#64748b; --home-line:#dce3ed; --home-hero-a:#e9eefe; --home-hero-b:#fce7f3; }
        .pcp-landing[data-theme="world"] { --home-bg:#fbf7ff; --home-surface:rgba(255,255,255,.92); --home-surface2:#f5edff; --home-text:#39264f; --home-muted:#806b96; --home-line:#e9dcf5; --home-hero-a:#ead7ff; --home-hero-b:#fce1ef; }
        .pcp-landing[data-theme="emerald"] { --home-bg:#ecfdf5; --home-surface:#ffffff; --home-surface2:#dff7ec; --home-text:#064e3b; --home-muted:#397663; --home-line:#b9e7d4; --home-hero-a:#059669; --home-hero-b:#0f766e; }
        .pcp-landing[data-theme="sunset"] { --home-bg:#fff7ed; --home-surface:#ffffff; --home-surface2:#ffedd5; --home-text:#7c2d12; --home-muted:#a45c3c; --home-line:#fed7aa; --home-hero-a:#ea580c; --home-hero-b:#db2777; }
        .pcp-landing[data-theme="party"] { --home-bg:#fff1f8; --home-surface:#ffffff; --home-surface2:#fae8ff; --home-text:#701a50; --home-muted:#985b86; --home-line:#f3cce5; --home-hero-a:#db2777; --home-hero-b:#9333ea; }
        .pcp-landing[data-theme="rainy"] { --home-bg:#eff8ff; --home-surface:#ffffff; --home-surface2:#e0f2fe; --home-text:#0c3e5d; --home-muted:#527b96; --home-line:#c6e2f3; --home-hero-a:#0369a1; --home-hero-b:#4f46e5; }
        .pcp-landing[data-theme="dream"], .pcp-landing[data-theme="rgbclr"], .pcp-landing[data-theme="cyberpunk"] { --home-bg:#0b1020; --home-surface:#151d32; --home-surface2:#202944; --home-text:#f8fafc; --home-muted:#b9c4d8; --home-line:rgba(255,255,255,.13); }
        .pcp-landing .pcp-rise h1,.pcp-landing .pcp-rise h2,.pcp-landing .pcp-rise h3,.pcp-landing .pcp-rise p,.pcp-landing .pcp-rise span { color:inherit; }
        .pcp-landing .sticky { background:color-mix(in srgb,var(--home-bg) 88%,transparent)!important; border-color:var(--home-line)!important; }
        .pcp-landing input { color:var(--home-text)!important; background:var(--home-surface2)!important; border-color:var(--home-line)!important; }
        .pcp-landing input::placeholder { color:var(--home-muted)!important; }
        .pcp-landing section:not(:first-child) h2 { color:var(--home-muted)!important; }
        .pcp-landing .group.rounded-2xl, .pcp-landing button.group.flex.flex-col { background:var(--home-surface)!important; color:var(--home-text)!important; border-color:var(--home-line)!important; }
        .pcp-landing .pcp-rise.rounded-3xl{border:1px solid var(--home-line)!important;box-shadow:0 18px 50px -34px rgba(15,23,42,.35);backdrop-filter:blur(14px);transition:transform .28s cubic-bezier(.2,.8,.2,1),box-shadow .28s ease,border-color .28s ease}
        .pcp-landing .pcp-rise.rounded-3xl:hover{transform:translateY(-5px);box-shadow:0 24px 54px -32px rgba(15,23,42,.38);border-color:color-mix(in srgb,var(--home-hero-a) 45%,var(--home-line))!important}
        .pcp-landing button.group.flex.flex-col{min-height:190px;padding:20px!important;border-radius:22px!important;box-shadow:0 10px 28px -22px rgba(15,23,42,.3);transition:transform .25s ease,box-shadow .25s ease}
        .pcp-landing button.group.flex.flex-col:hover{transform:translateY(-4px) scale(1.008);box-shadow:0 20px 40px -25px rgba(15,23,42,.35)}
        .pcp-landing .pcp-rise{animation:pcp-rise .55s cubic-bezier(.2,.75,.25,1) both}
        @media(prefers-reduced-motion:reduce){.pcp-landing .pcp-rise,.pcp-landing button.group.flex.flex-col{animation:none;transition:none}.pcp-landing .pcp-rise.rounded-3xl:hover,.pcp-landing button.group.flex.flex-col:hover{transform:none}}
        .pcp-landing .group.flex.flex-col span:nth-of-type(3), .pcp-landing .group.flex.items-center button span:nth-child(2) { color:var(--home-muted)!important; }
        .pcp-landing .pcp-rise.rounded-3xl { background:linear-gradient(120deg,var(--home-hero-a),var(--home-hero-b))!important; }
        .pcp-landing[data-theme="standard"] .pcp-rise.rounded-3xl, .pcp-landing[data-theme="world"] .pcp-rise.rounded-3xl, .pcp-landing[data-theme="emerald"] .pcp-rise.rounded-3xl, .pcp-landing[data-theme="sunset"] .pcp-rise.rounded-3xl, .pcp-landing[data-theme="party"] .pcp-rise.rounded-3xl, .pcp-landing[data-theme="rainy"] .pcp-rise.rounded-3xl { color:var(--home-text)!important; }
        .pcp-landing[data-theme="standard"] .pcp-rise.rounded-3xl p, .pcp-landing[data-theme="world"] .pcp-rise.rounded-3xl p, .pcp-landing[data-theme="emerald"] .pcp-rise.rounded-3xl p, .pcp-landing[data-theme="sunset"] .pcp-rise.rounded-3xl p, .pcp-landing[data-theme="party"] .pcp-rise.rounded-3xl p, .pcp-landing[data-theme="rainy"] .pcp-rise.rounded-3xl p { color:var(--home-text)!important; opacity:.86; }
        .pcp-landing .text-slate-400 { color:var(--home-muted)!important; }
        .pcp-landing .text-white { color:#fff!important; }
        .pcp-landing[data-theme="standard"] .pcp-rise.rounded-3xl .text-white,
        .pcp-landing[data-theme="world"] .pcp-rise.rounded-3xl .text-white,
        .pcp-landing[data-theme="emerald"] .pcp-rise.rounded-3xl .text-white,
        .pcp-landing[data-theme="sunset"] .pcp-rise.rounded-3xl .text-white,
        .pcp-landing[data-theme="party"] .pcp-rise.rounded-3xl .text-white,
        .pcp-landing[data-theme="rainy"] .pcp-rise.rounded-3xl .text-white { color:var(--home-text)!important; }
      `}</style>

      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#070b17]/85 backdrop-blur">
        <div className="flex w-full items-center gap-3 px-4 py-3 sm:px-8 xl:px-12 2xl:px-16">
          <button type="button" onClick={onBack} aria-label="Back" title="Back to PlotCraft" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"><ArrowLeft className="h-4 w-4" /></button>
          <span className="hidden text-sm font-black tracking-tight sm:block">PlotCraft AI</span>
          <label className="relative flex min-w-0 flex-1 items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search studios and tools" className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:border-violet-400 focus:outline-none" />
          </label>
          <ThemePicker value={proTheme} onChange={onTheme} />
        </div>
      </div>

      <div className="w-full space-y-10 px-4 py-8 sm:px-8 xl:px-12 2xl:px-16">
        {!q && <WorkspaceWelcome quick={quick} onOpen={onOpen} name={currentUser?.name} />}

        {!q && recent.length > 0 && (
          <WorkspaceRecent items={recent} iconOf={iconOf} shortOf={(id) => SHORT[id] || id} onOpenProject={onOpenProject} onDeleteProject={onDeleteProject} />
        )}

        {shown.map(([name, list], gi) => (
          <WorkspaceGroup key={name} name={name} list={list} index={gi} onOpen={onOpen} />
        ))}
        <footer className="border-t border-white/10 pt-8 text-xs text-slate-400">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span>© {new Date().getFullYear()} PlotCraft AI</span>
            <nav className="flex flex-wrap gap-5">
              <button type="button" onClick={() => setLegal("privacy")} className="hover:text-white">Privacy Policy</button>
              <button type="button" onClick={() => setLegal("terms")} className="hover:text-white">Terms of Use</button>
            </nav>
          </div>
        </footer>
        {legal && <LegalModal kind={legal} onClose={() => setLegal(null)} />}
        {shown.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No studio matches "{q}".</p>}
      </div>

      {toast && <div className="pointer-events-none fixed bottom-4 right-4 z-50 rounded-xl border border-white/10 bg-[#0e1528] px-4 py-2.5 text-xs font-bold text-white shadow-xl">{toast}</div>}
    </div>
  );
}

// ===== Video studio (merged) =====

const TOOLS = [
  ["media", Film, "Media"], ["audio", Music, "Music"], ["text", Type, "Text"], ["gfx", Shapes, "Graphics"],
  ["trans", Blend, "Transition"], ["fx", Sparkles, "Effects"], ["theme", Palette, "Themes"],
  ["filter", Wand2, "Filters"], ["adjust", SlidersHorizontal, "Adjust"], ["speed", Gauge, "Speed"],
  ["keys", Orbit, "Keyframes"], ["beat", Music2, "Beat"], ["captions", Type, "Captions"], ["export", Download, "Export"],
];
const KIND_COLOR = { text: "bg-amber-400/90", shape: "bg-pink-400/90", image: "bg-cyan-300/90", fx: "bg-violet-400/90" };

function Slider({ label, value, min, max, step = 0.01, onChange, unit = "" }) {
  return (
    <label className="block text-[11px] font-bold text-slate-300">
      <span className="flex justify-between"><span>{label}</span><span className="text-violet-300">{Number(value).toFixed(2)}{unit}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-violet-500" />
    </label>
  );
}
const Pills = ({ items, value, onPick }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.map((k) => (
      <button key={k} type="button" onClick={() => onPick(k)} className={`rounded-lg border px-2 py-1.5 text-[11px] font-bold capitalize ${value === k ? "border-violet-400 bg-violet-500/20" : "border-white/10 bg-white/5"}`}>{k}</button>
    ))}
  </div>
);

const makeThumbs = (url, d, n = 8) => new Promise((resolve) => {
  const v = document.createElement("video"); v.muted = true; v.preload = "auto"; v.src = url;
  const c = document.createElement("canvas"); c.width = 96; c.height = 54; const g = c.getContext("2d"); const out = []; let i = 0;
  const fail = setTimeout(() => resolve(out), 6000);
  const next = () => { if (i >= n) { clearTimeout(fail); resolve(out); return; } v.currentTime = Math.min(Math.max(0, d - 0.05), (d * (i + 0.5)) / n); };
  v.onseeked = () => { try { g.drawImage(v, 0, 0, 96, 54); out.push(c.toDataURL("image/jpeg", 0.5)); } catch { /* frame unavailable */ } i += 1; next(); };
  v.onloadeddata = next; v.onerror = () => { clearTimeout(fail); resolve(out); };
});
const pickThumbs = (c) => {
  const th = c.thumbs || []; if (!th.length) return [];
  const d = c.srcDur || c.end; const inside = th.filter((_, i) => { const tt = (d * (i + 0.5)) / th.length; return tt >= c.start && tt <= c.end; });
  return inside.length ? inside : [th[Math.min(th.length - 1, Math.floor((c.start / d) * th.length))]];
};
const makePeaks = async (url, n = 240) => {
  try {
    const ab = await (await fetch(url)).arrayBuffer(); const ac = new (window.AudioContext || window.webkitAudioContext)(); const b = await ac.decodeAudioData(ab); ac.close();
    const d = b.getChannelData(0); const step = Math.floor(d.length / n) || 1;
    return Array.from({ length: n }, (_, i) => { let m = 0; for (let j = 0; j < step; j += 16) m = Math.max(m, Math.abs(d[i * step + j] || 0)); return Math.round(m * 100) / 100; });
  } catch { return []; }
};
const peakSlice = (a) => { const p = a.peaks || []; if (!p.length || !a.srcDur) return []; return p.slice(Math.floor((a.in / a.srcDur) * p.length), Math.max(Math.floor((a.in / a.srcDur) * p.length) + 1, Math.ceil((a.out / a.srcDur) * p.length))); };

function KineVideoStudio({ clips, overlays, audio = [], settings = {}, patchProject, notify, themeName = "standard" }) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [tool, setTool] = useState("media");
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!full) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setFull(false); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [full]);
  const [selClip, setSelClip] = useState(null);
  const [selOv, setSelOv] = useState(null);
  const [selAud, setSelAud] = useState(null);
  const [pps, setPps] = useState(48);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [prog, setProg] = useState(null);
  const vref = useRef(null); const stage = useRef(null); const fileRef = useRef(null);
  const audRef = useRef(null); const imgRef = useRef(null); const audEls = useRef({}); const imgCache = useRef({});

  const bg = settings.videoBg || { type: "solid", c1: "#000000", c2: "#222222" };
  const clipTotal = useMemo(() => clips.reduce((n, c) => n + dur(c), 0), [clips]);
  const audTotal = audio.reduce((n, a) => Math.max(n, a.start + a.out - a.in), 0);
  const total = clipTotal || audTotal;
  const loc = locateClip(clips, t); const cur = loc.clip;
  const clip = clips.find((c) => c.id === selClip) || cur;
  const ov = overlays.find((o) => o.id === selOv);
  const song = audio.find((a) => a.id === selAud);
  const sh = stage.current?.clientHeight || 360;

  const snap = { clips, overlays, audio };
  const commit = (next) => { setPast((p) => [...p.slice(-40), snap]); setFuture([]); patchProject(next); };
  const restore = (s) => patchProject({ videoClips: s.clips, videoOverlays: s.overlays, videoAudio: s.audio });
  const undo = () => { const p = past[past.length - 1]; if (!p) return; setFuture((f) => [snap, ...f]); setPast(past.slice(0, -1)); restore(p); };
  const redo = () => { const f = future[0]; if (!f) return; setPast((p) => [...p, snap]); setFuture(future.slice(1)); restore(f); };
  const setClips = (videoClips) => commit({ videoClips });
  const setOverlays = (videoOverlays) => commit({ videoOverlays });
  const setAudio = (videoAudio) => commit({ videoAudio });
  const editClip = (id, patch) => setClips(clips.map((c) => (c.id === id ? { ...c, ...patch, adj: patch.adj ? { ...ADJ, ...c.adj, ...patch.adj } : c.adj } : c)));
  const editOv = (id, patch) => setOverlays(overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const editAud = (id, patch) => setAudio(audio.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const probe = (tag, url) => new Promise((res) => { const e = document.createElement(tag); e.preload = "metadata"; e.onloadedmetadata = () => res(e.duration || 5); e.onerror = () => res(5); e.src = url; });
  const importVideos = async (files) => {
    const added = [];
    for (const f of Array.from(files || [])) {
      if (!f.type.startsWith("video/")) continue;
      const url = URL.createObjectURL(f); const d = await probe("video", url); const thumbs = await makeThumbs(url, d);
      added.push({ id: uid("clip"), name: f.name, url, thumbs, start: 0, end: d, srcDur: d, speed: 1, volume: 1, muted: false, zoom: 1, filter: "none", adj: { ...ADJ }, trans: { type: added.length || clips.length ? "fade" : "none", d: 0.6 } });
    }
    if (!added.length) return notify("Choose video files.");
    setClips([...clips, ...added]); setSelClip(added[0].id); notify(`Imported ${added.length} clip(s). Clips merge in order on the timeline.`);
  };
  const importSongs = async (files) => {
    const added = []; let at = audio.reduce((n, a) => Math.max(n, a.start + a.out - a.in), 0);
    for (const f of Array.from(files || [])) {
      if (!f.type.startsWith("audio/")) continue;
      const url = URL.createObjectURL(f); const d = await probe("audio", url); const peaks = await makePeaks(url);
      added.push({ id: uid("aud"), name: f.name, url, peaks, start: at, in: 0, out: d, srcDur: d, volume: 1, fadeIn: 0.5, fadeOut: 1 }); at += d;
    }
    if (!added.length) return notify("Choose audio files.");
    setAudio([...audio, ...added]); setSelAud(added[0].id); notify(`Added ${added.length} song(s).`);
  };
  const importLogo = (file) => {
    if (!file?.type.startsWith("image/")) return notify("Choose an image.");
    const o = base("image", { src: URL.createObjectURL(file), x: 88, y: 12, size: 14, anim: "pop" }); setOverlays([...overlays, o]); setSelOv(o.id);
  };

  // playback clock
  useEffect(() => {
    if (!playing) return undefined;
    let raf; let last = performance.now();
    const tick = (now) => { const dt = (now - last) / 1000; last = now; setT((p) => { const n = p + dt; if (n >= total) { setPlaying(false); return total; } return n; }); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [playing, total]);

  // video sync
  const want = cur ? cur.start + loc.local * (cur.speed || 1) : 0;
  useEffect(() => {
    const v = vref.current; if (!v || !cur) return;
    if (v.dataset.cid !== cur.id) { v.dataset.cid = cur.id; v.src = cur.url; }
    v.playbackRate = cur.speed || 1; v.volume = cur.volume ?? 1; v.muted = Boolean(cur.muted);
    if (!playing || Math.abs(v.currentTime - want) > 0.35) { try { v.currentTime = want; } catch { /* not ready */ } }
    if (playing) v.play().catch(() => {}); else v.pause();
  }, [cur?.id, cur?.speed, cur?.volume, cur?.muted, playing, Math.floor(t * 4)]); // eslint-disable-line react-hooks/exhaustive-deps

  // song engine (mix any number of overlapping songs)
  useEffect(() => {
    audio.forEach((a) => { if (!audEls.current[a.id]) { const e = new Audio(a.url); e.preload = "auto"; audEls.current[a.id] = e; } });
    Object.keys(audEls.current).forEach((id) => { if (!audio.find((a) => a.id === id)) { audEls.current[id].pause(); delete audEls.current[id]; } });
  }, [audio]);
  useEffect(() => () => Object.values(audEls.current).forEach((e) => e.pause()), []);
  useEffect(() => {
    audio.forEach((a) => {
      const e = audEls.current[a.id]; if (!e) return;
      const l = t - a.start; const len = a.out - a.in;
      if (playing && l >= 0 && l < len) {
        e.volume = Math.max(0, Math.min(1, (a.volume ?? 1) * Math.min(1, a.fadeIn ? l / a.fadeIn : 1, a.fadeOut ? (len - l) / a.fadeOut : 1)));
        if (Math.abs(e.currentTime - (a.in + l)) > 0.45) e.currentTime = a.in + l;
        if (e.paused) e.play().catch(() => {});
      } else if (!e.paused) e.pause();
    });
  }, [playing, Math.floor(t * 4), audio]); // eslint-disable-line react-hooks/exhaustive-deps

  // image cache for PNG export
  useEffect(() => { overlays.forEach((o) => { if (o.kind === "image" && o.src && !imgCache.current[o.src]) { const i = new Image(); i.src = o.src; imgCache.current[o.src] = i; } }); }, [overlays]);

  const split = () => {
    if (!cur) return notify("Import a clip first.");
    const at = cur.start + loc.local * cur.speed;
    if (at - cur.start < 0.2 || cur.end - at < 0.2) return notify("Move the playhead inside the clip to split.");
    const b = { ...cur, id: uid("clip"), start: at, trans: { type: "none", d: 0.6 } };
    setClips(clips.flatMap((c) => (c.id === cur.id ? [{ ...cur, end: at }, b] : [c]))); setSelClip(b.id); notify("Clip split.");
  };
  const removeClip = () => { if (!clip) return; setClips(clips.filter((c) => c.id !== clip.id)); setSelClip(null); };
  const dupClip = () => { if (!clip) return; const i = clips.findIndex((c) => c.id === clip.id); const n = [...clips]; n.splice(i + 1, 0, { ...clip, id: uid("clip") }); setClips(n); };
  const move = (d) => { if (!clip) return; const i = clips.findIndex((c) => c.id === clip.id); const j = i + d; if (j < 0 || j >= clips.length) return; const n = [...clips]; [n[i], n[j]] = [n[j], n[i]]; setClips(n); };

  // layers
  const base = (kind, extra) => ({ id: uid("ov"), kind, x: 50, y: 50, size: 18, color: "#ffffff", opacity: 1, start: t, end: t + 4, anim: "fade", animDur: 0.6, ...extra });
  const addLayers = (list) => { setOverlays([...overlays, ...list]); setSelOv(list[0].id); };
  const addText = () => addLayers([base("text", { text: "Your text", size: 30, y: 80, bold: true, font: "Sans", anim: "slideUp" })]);
  const addShape = (shape) => addLayers([base("shape", { shape, color: "#7c3aed", size: shape === "bar" ? 40 : 16, anim: "pop" })]);
  const addFx = (fxType) => { const o = base("fx", { fxType, x: 0, y: 0, end: Math.max(t + 1, total || t + 5), anim: "none" }); setOverlays([...overlays, o]); setSelOv(o.id); };
  const lowerThird = () => addLayers([
    base("shape", { shape: "bar", x: 30, y: 84, size: 50, color: "#7c3aed", anim: "slideLeft" }),
    base("text", { text: "YOUR NAME", x: 30, y: 82, size: 28, font: "Display", bold: true, anim: "slideLeft" }),
    base("text", { text: "Role or caption", x: 30, y: 87.5, size: 15, font: "Sans", anim: "slideLeft" }),
  ]);
  const bigTitle = () => addLayers([base("text", { text: "BIG TITLE", y: 45, size: 72, font: "Display", bold: true, anim: "pop", end: t + 3 })]);
  const subscribe = () => addLayers([base("text", { text: "SUBSCRIBE", x: 84, y: 10, size: 20, bold: true, bg: "#e11d48", font: "Sans", anim: "bounce" })]);
  const applyTheme = (th) => {
    const keep = overlays.filter((o) => o.kind !== "fx"); const span = Math.max(total, 5);
    const fxs = th.fx.map((fxType) => base("fx", { fxType, x: 0, y: 0, start: 0, end: span, anim: "none" }));
    commit({ videoClips: clips.map((c) => ({ ...c, filter: th.filter })), videoOverlays: [...keep, ...fxs], settings: { videoBg: th.bg } });
    notify("Theme applied.");
  };

  useEffect(() => {
    const key = (e) => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.code === "Space") { e.preventDefault(); setPlaying((p) => !p); }
      if (e.key === "s" || e.key === "S") split();
      if (e.key === "Delete") removeClip();
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  });

  const dragOnStage = (e, o) => {
    e.preventDefault(); setSelOv(o.id); const r = stage.current.getBoundingClientRect();
    const mv = (ev) => patchProject({ videoOverlays: overlays.map((x) => (x.id === o.id ? { ...x, x: Math.min(98, Math.max(2, ((ev.clientX - r.left) / r.width) * 100)), y: Math.min(98, Math.max(2, ((ev.clientY - r.top) / r.height) * 100)) } : x)) });
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };
  const dragLane = (e, id, kind) => {
    e.stopPropagation(); if (kind === "a") { setSelAud(id); setTool("audio"); } else { setSelOv(id); setTool((tl) => (tl === "gfx" || tl === "fx" ? tl : "text")); }
    const arr = kind === "a" ? audio : overlays; const it = arr.find((i) => i.id === id); const x0 = e.clientX; const s0 = it.start; const len = kind === "a" ? it.out - it.in : it.end - it.start; let moved = false;
    const mv = (ev) => { moved = true; const ns = Math.max(0, s0 + (ev.clientX - x0) / pps); const upd = arr.map((i) => (i.id === id ? (kind === "a" ? { ...i, start: ns } : { ...i, start: ns, end: ns + len }) : i)); patchProject(kind === "a" ? { videoAudio: upd } : { videoOverlays: upd }); };
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); if (moved) setPast((p) => [...p.slice(-40), snap]); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };
  const scrub = (e) => {
    const el = e.currentTarget; const at = (ev) => Math.max(0, Math.min(total, (ev.clientX - el.getBoundingClientRect().left + el.scrollLeft) / pps));
    setT(at(e)); setPlaying(false);
    const mv = (ev) => setT(at(ev)); const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };

  const exportFrame = () => {
    const v = vref.current; const c = document.createElement("canvas"); c.width = 1280; c.height = 720;
    drawFrame(c.getContext("2d"), 1280, 720, t, { clips, overlays, bg, vids: cur && v ? { [cur.id]: v } : {}, imgs: imgCache.current });
    const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = `frame_${fmt(t)}.png`; a.click();
  };
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ clips: clips.map(({ url, ...c }) => c), overlays: overlays.map(({ src, ...o }) => o), audio: audio.map(({ url, ...a }) => a), bg, total }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "video-project.json"; a.click();
  };
  const render = async () => {
    if (!clips.length) return notify("Import at least one video."); setPlaying(false); setProg(0);
    try {
      const blob = await renderProject({ clips, overlays, audio, bg, total, onProgress: setProg });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "plotcraft-video.webm"; a.click(); notify("Video rendered and downloaded.");
    } catch (err) { notify(`Render failed: ${err.message || err}`); }
    setProg(null);
  };

  const btn = "inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/10 disabled:opacity-40";
  const trS = cur ? transState(cur, loc.local) : null;
  const vStyle = cur ? { filter: `${cssFilter(cur)} blur(${trS.blur}px)`, opacity: trS.op, transform: `translateX(${trS.tx}%) scale(${trS.sc * (cur.zoom || 1)})`, clipPath: trS.inset ? `inset(0 ${trS.inset}% 0 0)` : undefined } : {};

  const renderLayer = (o) => {
    if (t < o.start || t > o.end) return null;
    if (o.kind === "fx") return null;
    const a = animState(o, t);
    const st = { left: `${o.x + a.dx}%`, top: `${o.y + a.dy}%`, opacity: (o.opacity ?? 1) * a.op, transform: `translate(-50%,-50%) scale(${a.sc})` };
    const ring = selOv === o.id ? "outline outline-1 outline-dashed outline-violet-400" : "";
    let inner;
    if (o.kind === "text") inner = <span style={{ fontFamily: FONTS[o.font] || FONTS.Sans, fontSize: (o.size / 360) * sh, color: o.color, fontWeight: o.bold ? 800 : 500, background: o.bg || "transparent", padding: ".15em .5em", textShadow: "0 2px 6px rgba(0,0,0,.6)", whiteSpace: "nowrap" }}>{a.chars != null ? o.text.slice(0, a.chars) : o.text}</span>;
    else if (o.kind === "shape") inner = <div style={{ width: `${(o.size / 100) * (stage.current?.clientWidth || 640)}px`, aspectRatio: shapeAspect(o.shape), background: o.color, borderRadius: o.shape === "circle" ? "50%" : 0, clipPath: SHAPES[o.shape] && o.shape !== "rect" && o.shape !== "bar" ? poly(SHAPES[o.shape]) : undefined }} />;
    else inner = <img alt="" src={o.src} draggable={false} style={{ width: `${(o.size / 100) * (stage.current?.clientWidth || 640)}px` }} />;
    return <div key={o.id} onPointerDown={(e) => dragOnStage(e, o)} style={st} className={`absolute cursor-move select-none ${ring}`}>{inner}</div>;
  };
  const fxLayer = (o) => {
    if (o.kind !== "fx" || t < o.start || t > o.end) return null;
    const s = { position: "absolute", inset: 0, pointerEvents: "none" };
    if (o.fxType === "vignette") s.background = "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,.7) 100%)";
    if (o.fxType === "letterbox") s.background = "linear-gradient(#000 12%, transparent 12%, transparent 88%, #000 88%)";
    if (o.fxType === "scanlines") s.background = "repeating-linear-gradient(transparent 0 2px, rgba(0,0,0,.2) 2px 4px)";
    if (o.fxType === "grain") { s.opacity = 0.18; s.backgroundImage = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")"; s.backgroundPosition = `${(t * 997) % 160}px ${(t * 613) % 160}px`; }
    if (o.fxType === "flash") { s.background = "#fff"; s.opacity = Math.max(0, 1 - (t - o.start) / 0.5) * 0.9; }
    return <div key={o.id} style={s} />;
  };

  const layerEditor = ov && (
    <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
      <p className="text-[11px] font-black capitalize">{ov.kind === "fx" ? `Effect · ${ov.fxType}` : `${ov.kind} layer`}</p>
      {ov.kind === "text" && (<>
        <input value={ov.text} onChange={(e) => editOv(ov.id, { text: e.target.value })} className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-xs" />
        <Pills items={Object.keys(FONTS)} value={ov.font} onPick={(font) => editOv(ov.id, { font })} />
      </>)}
      {ov.kind === "shape" && <Pills items={Object.keys(SHAPES)} value={ov.shape} onPick={(shape) => editOv(ov.id, { shape })} />}
      {ov.kind !== "fx" && (<>
        <Slider label={ov.kind === "text" ? "Size" : "Width %"} value={ov.size} min={ov.kind === "text" ? 10 : 3} max={ov.kind === "text" ? 120 : 100} step={1} onChange={(size) => editOv(ov.id, { size })} />
        <Slider label="Opacity" value={ov.opacity ?? 1} min={0.1} max={1} onChange={(opacity) => editOv(ov.id, { opacity })} />
        <div className="flex items-center gap-2">
          {ov.kind !== "image" && <input type="color" value={ov.color} onChange={(e) => editOv(ov.id, { color: e.target.value })} className="h-8 w-10 rounded" />}
          {ov.kind === "text" && <><button type="button" className={btn} onClick={() => editOv(ov.id, { bold: !ov.bold })}>Bold</button><input type="color" title="Box colour" value={ov.bg || "#000000"} onChange={(e) => editOv(ov.id, { bg: e.target.value })} className="h-8 w-10 rounded" /><button type="button" className={btn} onClick={() => editOv(ov.id, { bg: "" })}>No box</button></>}
        </div>
        <p className="text-[10px] font-bold text-slate-400">Motion</p>
        <Pills items={ANIMS} value={ov.anim} onPick={(anim) => editOv(ov.id, { anim })} />
        <Slider label="Motion speed (s)" value={ov.animDur || 0.6} min={0.2} max={2} onChange={(animDur) => editOv(ov.id, { animDur })} />
      </>)}
      <Slider label="Starts (s)" value={ov.start} min={0} max={Math.max(1, total)} step={0.1} onChange={(start) => editOv(ov.id, { start })} />
      <Slider label="Ends (s)" value={ov.end} min={0} max={Math.max(1, total + 5)} step={0.1} onChange={(end) => editOv(ov.id, { end })} />
      <div className="flex gap-1.5">
        <button type="button" className={btn} onClick={() => { const n = { ...ov, id: uid("ov"), x: Math.min(95, ov.x + 4), y: Math.min(95, ov.y + 4) }; setOverlays([...overlays, n]); setSelOv(n.id); }}><Copy className="h-3.5 w-3.5" /> Duplicate</button>
        <button type="button" className={`${btn} hover:!bg-rose-500/20`} onClick={() => { setOverlays(overlays.filter((o) => o.id !== ov.id)); setSelOv(null); }}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
      </div>
    </div>
  );

  return (
    <div data-theme={themeName} className={`kine-editor flex flex-col text-slate-100 ${full ? "fixed inset-0 z-[120] h-[100dvh] w-screen bg-[#0b1122]" : "min-h-[calc(100dvh-6rem)] w-full"}`} style={{"--k-bg":"var(--pcp-bg)","--k-surface":"var(--pcp-surface)","--k-panel":"var(--pcp-surface2)"}}>
      <style>{`
        .kine-editor{background:var(--k-bg)!important;color:inherit;box-shadow:0 24px 70px -42px rgba(15,23,42,.65);border-color:color-mix(in srgb,var(--a) 22%,transparent)!important}
        .kine-editor>div{border-color:color-mix(in srgb,currentColor 12%,transparent)!important}
        .kine-editor .bg-black\/90{background:radial-gradient(ellipse at center,#202a3c,#050914 72%)!important}
        .kine-editor [class*="border-white/"]{border-color:color-mix(in srgb,currentColor 14%,transparent)!important}
        .kine-editor [class*="bg-white/5"],.kine-editor [class*="bg-white/[0.03]"]{background:color-mix(in srgb,var(--k-panel) 78%,transparent)!important}
        .kine-editor [class*="text-slate-400"],.kine-editor [class*="text-slate-500"]{color:color-mix(in srgb,currentColor 62%,#94a3b8)!important}
        .kine-editor[data-theme="standard"],.kine-editor[data-theme="world"],.kine-editor[data-theme="emerald"],.kine-editor[data-theme="sunset"],.kine-editor[data-theme="party"],.kine-editor[data-theme="rainy"]{color:#172033!important}
        .kine-editor[data-theme="standard"] [class*="text-slate-200"],.kine-editor[data-theme="world"] [class*="text-slate-200"],.kine-editor[data-theme="emerald"] [class*="text-slate-200"],.kine-editor[data-theme="sunset"] [class*="text-slate-200"],.kine-editor[data-theme="party"] [class*="text-slate-200"],.kine-editor[data-theme="rainy"] [class*="text-slate-200"]{color:#172033!important}
        .kine-editor[data-theme="standard"] .bg-\[\#070c18\],.kine-editor[data-theme="world"] .bg-\[\#070c18\],.kine-editor[data-theme="emerald"] .bg-\[\#070c18\],.kine-editor[data-theme="sunset"] .bg-\[\#070c18\],.kine-editor[data-theme="party"] .bg-\[\#070c18\],.kine-editor[data-theme="rainy"] .bg-\[\#070c18\]{background:var(--k-panel)!important}
        .kine-editor button{transition:all .18s ease}
        .kine-editor button:focus-visible{outline:2px solid var(--a);outline-offset:2px}
      `}</style>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div className="flex gap-2">
          <button type="button" className={btn} onClick={undo} disabled={!past.length}><Undo2 className="h-3.5 w-3.5" /> Undo</button>
          <button type="button" className={btn} onClick={redo} disabled={!future.length}><Redo2 className="h-3.5 w-3.5" /> Redo</button>
        </div>
        <span className="text-[11px] font-bold text-slate-400">{clips.length} clips · {audio.length} songs · {overlays.length} layers · {fmt(total)}</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={() => setFull((f) => !f)} title="Full screen (Esc to exit)">{full ? "⤡ Exit full screen" : "⤢ Full screen"}</button>
          <button type="button" className={btn} onClick={exportFrame}><Camera className="h-3.5 w-3.5" /> Frame</button>
          <button type="button" className={btn} onClick={exportJSON}>Project</button>
          <button type="button" disabled={prog !== null} onClick={render} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-black text-white hover:bg-violet-500 disabled:opacity-70">
            {prog !== null ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Rendering {Math.round(prog * 100)}%</> : <><Download className="h-3.5 w-3.5" /> Render video</>}
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 content-start lg:grid-cols-[minmax(300px,380px)_1fr]">
        <div className="flex flex-wrap gap-2 border-b border-white/10 p-3 lg:col-span-2">
          {TOOLS.map(([id, Icon, label]) => (
            <button key={id} type="button" onClick={() => setTool(id)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${tool === id ? "border-violet-400 bg-violet-600 text-white" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}><Icon className="h-4 w-4" />{label}</button>
          ))}
        </div>

        <div className="min-h-0 space-y-3 overflow-y-auto p-4 lg:max-h-[calc(100dvh-16rem)] lg:border-r lg:border-white/10">
          <input ref={fileRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => { importVideos(e.target.files); e.target.value = ""; }} />
          <input ref={audRef} type="file" accept="audio/*" multiple className="hidden" onChange={(e) => { importSongs(e.target.files); e.target.value = ""; }} />
          <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { importLogo(e.target.files[0]); e.target.value = ""; }} />

          {tool === "media" && (<>
            <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-violet-400/50 bg-violet-500/10 py-6 text-xs font-black text-violet-200 hover:bg-violet-500/20"><Upload className="h-4 w-4" /> Import videos (merge many)</button>
            {clip && (<>
              <p className="truncate text-xs font-black">{clip.name}</p>
              <Slider label="Trim start (s)" value={clip.start} min={0} max={Math.max(0.2, clip.end - 0.2)} step={0.1} onChange={(v) => editClip(clip.id, { start: v })} />
              <Slider label="Trim end (s)" value={clip.end} min={clip.start + 0.2} max={clip.srcDur || clip.end} step={0.1} onChange={(v) => editClip(clip.id, { end: v })} />
              <Slider label="Zoom" value={clip.zoom || 1} min={1} max={3} unit="×" onChange={(v) => editClip(clip.id, { zoom: v })} />
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className={btn} onClick={split}><Scissors className="h-3.5 w-3.5" /> Split</button>
                <button type="button" className={btn} onClick={dupClip}><Copy className="h-3.5 w-3.5" /> Duplicate</button>
                <button type="button" className={btn} onClick={() => move(-1)}>← Move</button>
                <button type="button" className={btn} onClick={() => move(1)}>Move →</button>
                <button type="button" className={`${btn} hover:!bg-rose-500/20`} onClick={removeClip}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
              <p className="text-[10px] text-slate-400">Clips play back to back as one merged video. Set a transition per clip, then press Render video.</p>
            </>)}
          </>)}

          {tool === "audio" && (<>
            <button type="button" onClick={() => audRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-400/50 bg-emerald-500/10 py-5 text-xs font-black text-emerald-200 hover:bg-emerald-500/20"><Music className="h-4 w-4" /> Import songs (mix many)</button>
            {audio.map((a) => (
              <button key={a.id} type="button" onClick={() => setSelAud(a.id)} className={`block w-full truncate rounded-lg border px-2.5 py-2 text-left text-[11px] font-bold ${selAud === a.id ? "border-emerald-400 bg-emerald-500/15" : "border-white/10 bg-white/5"}`}>♪ {a.name}</button>
            ))}
            {song && (<>
              <Slider label="Volume" value={song.volume ?? 1} min={0} max={1} onChange={(v) => editAud(song.id, { volume: v })} />
              <Slider label="Starts on timeline (s)" value={song.start} min={0} max={Math.max(10, total)} step={0.1} onChange={(v) => editAud(song.id, { start: v })} />
              <Slider label="Song trim start (s)" value={song.in} min={0} max={Math.max(0.2, song.out - 0.2)} step={0.1} onChange={(v) => editAud(song.id, { in: v })} />
              <Slider label="Song trim end (s)" value={song.out} min={song.in + 0.2} max={song.srcDur} step={0.1} onChange={(v) => editAud(song.id, { out: v })} />
              <Slider label="Fade in (s)" value={song.fadeIn || 0} min={0} max={5} onChange={(v) => editAud(song.id, { fadeIn: v })} />
              <Slider label="Fade out (s)" value={song.fadeOut || 0} min={0} max={5} onChange={(v) => editAud(song.id, { fadeOut: v })} />
              <button type="button" className={`${btn} hover:!bg-rose-500/20`} onClick={() => { setAudio(audio.filter((a) => a.id !== song.id)); setSelAud(null); }}><Trash2 className="h-3.5 w-3.5" /> Remove song</button>
            </>)}
            {clip && (<div className="space-y-2 border-t border-white/10 pt-3">
              <p className="text-[11px] font-black">Selected clip sound</p>
              <Slider label="Clip volume" value={clip.volume ?? 1} min={0} max={1} onChange={(v) => editClip(clip.id, { volume: v })} />
              <button type="button" className={btn} onClick={() => editClip(clip.id, { muted: !clip.muted })}>{clip.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />} {clip.muted ? "Unmute" : "Mute clip"}</button>
            </div>)}
          </>)}

          {tool === "text" && (<>
            <button type="button" onClick={addText} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-xs font-black text-white"><Plus className="h-4 w-4" /> Add text</button>
            <div className="grid grid-cols-2 gap-1.5"><button type="button" className={btn} onClick={bigTitle}>Big title</button><button type="button" className={btn} onClick={lowerThird}>Name lower-third</button></div>
            {layerEditor || <p className="text-[11px] text-slate-400">Add text, or tap a layer on the timeline.</p>}
          </>)}

          {tool === "gfx" && (<>
            <p className="text-[11px] font-black">Motion graphics</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" className={btn} onClick={lowerThird}>Name lower-third</button>
              <button type="button" className={btn} onClick={subscribe}>Subscribe badge</button>
              <button type="button" className={btn} onClick={bigTitle}>Big title</button>
              <button type="button" className={btn} onClick={() => imgRef.current?.click()}><ImageIcon className="h-3.5 w-3.5" /> Logo / image</button>
            </div>
            <p className="text-[11px] font-black">Shapes</p>
            <div className="flex flex-wrap gap-1.5">{Object.keys(SHAPES).map((s) => <button key={s} type="button" className={`${btn} capitalize`} onClick={() => addShape(s)}>{s}</button>)}</div>
            {layerEditor}
          </>)}

          {tool === "trans" && clip && (<>
            <p className="text-[11px] font-black">Transition into this clip</p>
            <Pills items={TRANS} value={clip.trans?.type || "none"} onPick={(type) => editClip(clip.id, { trans: { d: 0.6, ...clip.trans, type } })} />
            <Slider label="Duration (s)" value={clip.trans?.d || 0.6} min={0.2} max={2} onChange={(d) => editClip(clip.id, { trans: { type: "fade", ...clip.trans, d } })} />
            <button type="button" className={btn} onClick={() => setClips(clips.map((c, i) => (i ? { ...c, trans: { type: clip.trans?.type || "fade", d: clip.trans?.d || 0.6 } } : c)))}>Apply to all clips</button>
          </>)}
          {tool === "fx" && (<>
            <p className="text-[11px] font-black">Add effect at playhead</p>
            <div className="flex flex-wrap gap-1.5">{FX.map((f) => <button key={f} type="button" className={`${btn} capitalize`} onClick={() => addFx(f)}>{f}</button>)}</div>
            {layerEditor}
          </>)}

          {tool === "theme" && (<>
            <p className="text-[11px] font-black">One-tap themes</p>
            <div className="grid grid-cols-2 gap-1.5">{Object.entries(THEMES).map(([n, th]) => (
              <button key={n} type="button" onClick={() => applyTheme(th)} className="overflow-hidden rounded-lg border border-white/10 text-left text-[11px] font-bold">
                <span className="block h-8" style={{ background: bgCss(th.bg, 20) }} /><span className="block px-2 py-1.5">{n}</span>
              </button>))}</div>
            <p className="text-[11px] font-black">Background</p>
            <Pills items={["solid", "gradient", "anim"]} value={bg.type} onPick={(type) => patchProject({ settings: { videoBg: { ...bg, type } } })} />
            <div className="flex items-center gap-2">
              <input type="color" value={bg.c1} onChange={(e) => patchProject({ settings: { videoBg: { ...bg, c1: e.target.value } } })} className="h-8 w-10 rounded" />
              <input type="color" value={bg.c2} onChange={(e) => patchProject({ settings: { videoBg: { ...bg, c2: e.target.value } } })} className="h-8 w-10 rounded" />
              <span className="text-[10px] text-slate-400">Shows behind clips and transitions.</span>
            </div>
          </>)}

          {tool === "filter" && clip && <Pills items={Object.keys(PRESETS)} value={clip.filter} onPick={(filter) => editClip(clip.id, { filter })} />}
          {tool === "adjust" && clip && (() => { const a = { ...ADJ, ...clip.adj }; const set = (k) => (v) => editClip(clip.id, { adj: { [k]: v } }); return (<>
            <Slider label="Brightness" value={a.b} min={0.4} max={1.8} onChange={set("b")} />
            <Slider label="Contrast" value={a.c} min={0.4} max={1.8} onChange={set("c")} />
            <Slider label="Saturation" value={a.s} min={0} max={2.5} onChange={set("s")} />
            <Slider label="Hue" value={a.h} min={-180} max={180} step={1} unit="°" onChange={set("h")} />
            <Slider label="Blur" value={a.blur} min={0} max={8} step={0.1} unit="px" onChange={set("blur")} />
            <button type="button" className={btn} onClick={() => editClip(clip.id, { adj: { ...ADJ } })}>Reset</button></>); })()}
          {tool === "speed" && clip && (<>
            <div className="grid grid-cols-3 gap-1.5">{[0.25, 0.5, 1, 2, 3, 4].map((s) => <button key={s} type="button" onClick={() => editClip(clip.id, { speed: s })} className={`rounded-lg border py-2 text-[11px] font-black ${clip.speed === s ? "border-violet-400 bg-violet-500/20" : "border-white/10 bg-white/5"}`}>{s}×</button>)}</div>
            <Slider label="Custom speed" value={clip.speed} min={0.25} max={4} unit="×" onChange={(v) => editClip(clip.id, { speed: v })} />
          </>)}
          {["keys", "beat", "captions", "export"].includes(tool) && (
            <VfxToolPanel tool={tool} clip={clip} editClip={editClip} totalSec={clips.reduce((s, c) => s + (c.end - c.start) / (c.speed || 1), 0)} />
          )}
          {!clip && ["trans", "filter", "adjust", "speed"].includes(tool) && <p className="text-[11px] text-slate-400">Import and select a clip first.</p>}
        </div>

        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="grid min-h-[320px] flex-1 place-items-center bg-black/90 p-3 lg:min-h-[420px]">
            <div ref={stage} className="relative aspect-video overflow-hidden rounded-lg" style={{ background: bgCss(bg, t), width: "min(100%, max(280px, calc((100vh - 28rem) * 1.7778)))" }}>
              {cur ? <video ref={vref} playsInline onLoadedMetadata={(e) => { e.currentTarget.currentTime = want; }} className="h-full w-full object-contain" style={vStyle} />
                : <button type="button" onClick={() => fileRef.current?.click()} className="absolute inset-0 grid place-items-center text-xs font-bold text-slate-300"><span className="text-center"><Film className="mx-auto mb-2 h-8 w-8" />Import videos to start editing</span></button>}
              {overlays.map(renderLayer)}
              {overlays.map(fxLayer)}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 border-y border-white/10 py-2">
            <button type="button" className={btn} onClick={() => { setT(0); setPlaying(false); }}><SkipBack className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => { if (t >= total) setT(0); setPlaying((p) => !p); }} disabled={!total} className="grid h-10 w-10 place-items-center rounded-full bg-violet-600 text-white disabled:opacity-40">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
            <button type="button" className={btn} onClick={split} disabled={!cur}><Scissors className="h-3.5 w-3.5" /> Split</button>
            <span className="w-24 text-center text-[11px] font-bold tabular-nums text-slate-300">{fmt(t)} / {fmt(total)}</span>
            <button type="button" className={btn} onClick={() => setPps((p) => Math.max(16, p - 12))}><ZoomOut className="h-3.5 w-3.5" /></button>
            <button type="button" className={btn} onClick={() => setPps((p) => Math.min(140, p + 12))}><ZoomIn className="h-3.5 w-3.5" /></button>
          </div>

        </div>
      </div>
      <div className="h-[250px] shrink-0 overflow-y-auto border-t border-white/10">
          <div className="relative overflow-x-auto bg-[#070c18] p-2" onPointerDown={scrub}>
            <div className="relative" style={{ width: Math.max(total, 10) * pps + 80, minHeight: 190 }}>
              <div className="relative h-5 border-b border-white/10 text-[9px] text-slate-500">
                {Array.from({ length: Math.ceil(Math.max(total, 10)) + 1 }, (_, i) => <span key={i} className="absolute top-0 border-l border-white/15 pl-1" style={{ left: i * pps }}>{i}s</span>)}
              </div>
              <div className="relative mt-2 h-12">
                {clips.reduce((acc, c) => {
                  const w = dur(c) * pps;
                  acc.nodes.push(
                    <button key={c.id} type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => { setSelClip(c.id); setSelOv(null); }}
                      className={`absolute top-0 h-full overflow-hidden rounded-lg border px-2 text-left text-[10px] font-bold text-white ${clip?.id === c.id ? "border-white bg-sky-500" : "border-sky-300/40 bg-sky-600/80"}`} style={{ left: acc.x, width: w - 2 }}>
                      {c.thumbs?.length ? <span className="absolute inset-0 flex opacity-60">{pickThumbs(c).map((src, i) => <img key={i} alt="" src={src} draggable={false} className="h-full min-w-0 flex-1 object-cover" />)}</span> : null}
                      <span className="relative block truncate drop-shadow">{c.name}</span><span className="relative text-sky-100 drop-shadow">{c.speed}× {c.trans?.type !== "none" && c.trans ? `· ${c.trans.type}` : ""}</span>
                    </button>);
                  acc.x += w; return acc;
                }, { x: 0, nodes: [] }).nodes}
              </div>
              <div className="relative mt-1.5 h-8">
                {audio.map((a) => (
                  <button key={a.id} type="button" onPointerDown={(e) => dragLane(e, a.id, "a")} className={`absolute top-0 h-full cursor-grab truncate rounded-md px-2 text-left text-[10px] font-bold text-emerald-950 ${selAud === a.id ? "bg-emerald-300 ring-2 ring-white" : "bg-emerald-400/90"}`} style={{ left: a.start * pps, width: Math.max(24, (a.out - a.in) * pps) }}>
                    {peakSlice(a).length ? <svg viewBox={`0 0 ${peakSlice(a).length} 1`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-60">{peakSlice(a).map((p, i) => <rect key={i} x={i} y={0.5 - p / 2} width={0.75} height={Math.max(0.05, p)} fill="#064e3b" />)}</svg> : null}
                    <span className="relative">♪ {a.name}</span></button>
                ))}
              </div>
              <div className="relative mt-1.5 h-24">
                {overlays.map((o, i) => (
                  <button key={o.id} type="button" onPointerDown={(e) => dragLane(e, o.id, "o")} className={`absolute h-5 cursor-grab truncate rounded-md px-2 text-left text-[10px] font-bold text-slate-900 ${KIND_COLOR[o.kind]} ${selOv === o.id ? "ring-2 ring-white" : ""}`} style={{ left: o.start * pps, top: (i % 4) * 22, width: Math.max(24, (o.end - o.start) * pps) }}>
                    {o.kind === "text" ? `T ${o.text}` : o.kind === "fx" ? `✦ ${o.fxType}` : o.kind}
                  </button>
                ))}
              </div>
              <span className="pointer-events-none absolute bottom-0 top-0 w-0.5 bg-white shadow-[0_0_6px_#fff]" style={{ left: t * pps }}><span className="absolute -left-1.5 -top-0.5 h-3 w-3 rounded-full bg-white" /></span>
            </div>
          </div>
          <p className="px-3 py-1.5 text-[10px] text-slate-500">Space play · S split · Delete clip · drag song/layer blocks to move them · render keeps the tab in front.</p>
      </div>
    </div>
  );
}


// ===== Animation Studio (pose keyframes, easing, onion skin, motion path, WebM export) =====
const A_EASE = {
  linear: (p) => p, easeIn: (p) => p ** 3, easeOut: (p) => 1 - (1 - p) ** 3,
  easeInOut: (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2),
  bounce: (p) => { const n = 7.5625; const d = 2.75; if (p < 1 / d) return n * p * p; if (p < 2 / d) { p -= 1.5 / d; return n * p * p + 0.75; } if (p < 2.5 / d) { p -= 2.25 / d; return n * p * p + 0.9375; } p -= 2.625 / d; return n * p * p + 0.984375; },
  elastic: (p) => (p === 0 || p === 1 ? p : 2 ** (-10 * p) * Math.sin((p * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  back: (p) => 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2,
};
const A_EMOJI = ["🚀", "⭐", "🦸", "🐱", "🐶", "🧙", "🤖", "🎈", "⚽", "🌟", "🦊", "🐉", "🚗", "✈️", "🌈", "🔥"];
const A_SHAPES = ["circle", "rect", "triangle", "star"];
const lerp = (a, b, p) => a + (b - a) * p;
const aPose = (o, t) => {
  const k = [...o.keys].sort((a, b) => a.t - b.t);
  if (!k.length) return { x: 50, y: 50, s: 1, r: 0, o: 1 };
  if (t <= k[0].t) return k[0];
  const last = k[k.length - 1]; if (t >= last.t) return last;
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i]; const b = k[i + 1];
    if (t >= a.t && t <= b.t) { const p = A_EASE[a.e || "easeInOut"]((t - a.t) / (b.t - a.t || 1)); return { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), s: lerp(a.s, b.s, p), r: lerp(a.r, b.r, p), o: lerp(a.o, b.o, p) }; }
  }
  return last;
};
const A_DEFAULT = {
  duration: 4, fps: 24, bg: { c1: "#0f172a", c2: "#312e81" }, grid: true,
  objects: [
    { id: "o1", name: "Rocket", kind: "emoji", glyph: "🚀", color: "#ffffff", size: 16, keys: [{ t: 0, x: 12, y: 72, s: 1, r: -20, o: 1, e: "easeInOut" }, { t: 2, x: 50, y: 35, s: 1.3, r: 10, o: 1, e: "easeInOut" }, { t: 4, x: 88, y: 18, s: 1, r: 30, o: 1, e: "easeInOut" }] },
    { id: "o2", name: "Star", kind: "emoji", glyph: "⭐", color: "#ffffff", size: 10, keys: [{ t: 0, x: 70, y: 70, s: 1, r: 0, o: 1, e: "bounce" }, { t: 1.5, x: 70, y: 55, s: 1.5, r: 180, o: 1, e: "elastic" }, { t: 3, x: 70, y: 70, s: 1, r: 360, o: 1, e: "linear" }] },
  ],
};
const A_IMAGE_CACHE = new Map();
function aDrawObj(g, o, p, W, H, alpha = 1) {
  g.save(); g.globalAlpha = Math.max(0, Math.min(1, alpha * p.o)); g.translate((p.x / 100) * W, (p.y / 100) * H); g.rotate((p.r * Math.PI) / 180); g.scale(p.s, p.s);
  const sz = (o.size / 100) * H; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = o.color;
  if (o.kind === "emoji") { g.font = `${sz}px serif`; g.fillText(o.glyph, 0, 0); }
  else if (o.kind === "text") { g.font = `800 ${sz}px sans-serif`; g.fillText(o.text || "Text", 0, 0); }
  else if (o.kind === "image" && o.src) {
    const image = A_IMAGE_CACHE.get(o.src);
    if (image?.complete && image.naturalWidth) g.drawImage(image, -sz * 1.2, -sz * 0.8, sz * 2.4, sz * 1.6);
  } else {
    g.beginPath();
    if (o.shape === "circle") g.arc(0, 0, sz / 2, 0, Math.PI * 2);
    else if (o.shape === "rect") g.rect(-sz / 2, -sz / 2, sz, sz);
    else if (o.shape === "triangle") { g.moveTo(0, -sz / 2); g.lineTo(sz / 2, sz / 2); g.lineTo(-sz / 2, sz / 2); g.closePath(); }
    else for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? sz * 0.22 : sz * 0.5; g[i ? "lineTo" : "moveTo"](r * Math.cos(a), r * Math.sin(a)); }
    g.fill();
  }
  g.restore();
}
function aDrawScene(g, W, H, sc, t, ui = {}) {
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, sc.bg.c1); gr.addColorStop(1, sc.bg.c2); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (ui.grid && sc.grid) { g.strokeStyle = "rgba(255,255,255,.07)"; g.lineWidth = 1; for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo((W / 10) * i, 0); g.lineTo((W / 10) * i, H); g.stroke(); g.beginPath(); g.moveTo(0, (H / 10) * i); g.lineTo(W, (H / 10) * i); g.stroke(); } }
  sc.objects.forEach((o) => {
    if (ui.path && ui.sel === o.id) { g.fillStyle = "rgba(255,255,255,.55)"; for (let s = 0; s <= sc.duration; s += 0.1) { const p = aPose(o, s); g.beginPath(); g.arc((p.x / 100) * W, (p.y / 100) * H, 2.5, 0, 7); g.fill(); } }
    if (ui.onion && ui.sel === o.id) { aDrawObj(g, o, aPose(o, Math.max(0, t - 0.3)), W, H, 0.25); aDrawObj(g, o, aPose(o, Math.min(sc.duration, t + 0.3)), W, H, 0.25); }
    aDrawObj(g, o, aPose(o, t), W, H);
    if (ui.sel === o.id && ui.ui) { const p = aPose(o, t); const r = ((o.size / 100) * H * p.s) / 2 + 6; g.strokeStyle = "#a78bfa"; g.setLineDash([6, 4]); g.lineWidth = 1.5; g.strokeRect((p.x / 100) * W - r, (p.y / 100) * H - r, r * 2, r * 2); g.setLineDash([]); }
  });
}

function AnimStudio({ scene, patchProject, notify }) {
  const sc = scene || A_DEFAULT;
  const [t, setT] = useState(0); const [playing, setPlaying] = useState(false); const [loop, setLoop] = useState(true);
  const [sel, setSel] = useState(sc.objects[0]?.id || null); const [selKey, setSelKey] = useState(null);
  const [onion, setOnion] = useState(true); const [path, setPath] = useState(true); const [pps, setPps] = useState(90);
  const [past, setPast] = useState([]); const [future, setFuture] = useState([]); const [prog, setProg] = useState(null);
  const cv = useRef(null);
  const imageInput = useRef(null);
  const [imageRefresh, setImageRefresh] = useState(0);
  const addImageObject = async (file) => {
    if (!file || !file.type.startsWith("image/")) return notify("Choose an image file.");
    const src = await new Promise((resolve,reject) => { const r = new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file); });
    const image = new Image();
    image.onload = () => setImageRefresh(v => v + 1);
    image.src = src;
    A_IMAGE_CACHE.set(src, image);
    addObj({ name:file.name, kind:"image", src, size:28 });
  };
  const obj = sc.objects.find((o) => o.id === sel); const pose = obj ? aPose(obj, t) : null;
  const commit = (next) => { setPast((p) => [...p.slice(-40), sc]); setFuture([]); patchProject({ animScene: next }); };
  const live = (next) => patchProject({ animScene: next });
  const undo = () => { const p = past[past.length - 1]; if (!p) return; setFuture((f) => [sc, ...f]); setPast(past.slice(0, -1)); live(p); };
  const redo = () => { const f = future[0]; if (!f) return; setPast((p) => [...p, sc]); setFuture(future.slice(1)); live(f); };
  const mapObj = (id, fn, isLive) => (isLive ? live : commit)({ ...sc, objects: sc.objects.map((o) => (o.id === id ? fn(o) : o)) });
  const setPose = (id, patch, isLive) => mapObj(id, (o) => {
    const cur = aPose(o, t); const i = o.keys.findIndex((k) => Math.abs(k.t - t) < 0.04);
    if (i >= 0) return { ...o, keys: o.keys.map((k, j) => (j === i ? { ...k, ...patch } : k)) };
    return { ...o, keys: [...o.keys, { ...cur, t: Math.round(t * 100) / 100, e: "easeInOut", ...patch }].sort((a, b) => a.t - b.t) };
  }, isLive);
  const addObj = (props) => { const o = { id: `o${Date.now().toString(36)}`, name: props.name || "Object", kind: "emoji", color: "#ffffff", size: 14, keys: [{ t: 0, x: 50, y: 50, s: 1, r: 0, o: 1, e: "easeInOut" }], ...props }; commit({ ...sc, objects: [...sc.objects, o] }); setSel(o.id); };
  const PRESETS_A = {
    Bounce: (b) => [{ dt: 0 }, { dt: 0.3, y: b.y - 20, e: "easeOut" }, { dt: 0.6, y: b.y, e: "bounce" }],
    Spin: (b) => [{ dt: 0 }, { dt: 1, r: b.r + 360 }],
    Pulse: (b) => [{ dt: 0 }, { dt: 0.4, s: b.s * 1.4 }, { dt: 0.8 }],
    "Fade in": () => [{ dt: 0, o: 0 }, { dt: 0.7, o: 1 }],
    "Slide in": (b) => [{ dt: 0, x: -10 }, { dt: 0.8, x: b.x, e: "back" }],
    Shake: (b) => [0, 1, 2, 3, 4].map((i) => ({ dt: i * 0.1, x: b.x + (i % 2 ? -3 : 3) * (i === 4 ? 0 : 1), e: "linear" })),
  };
  const applyPreset = (name) => {
    if (!obj) return; const b = aPose(obj, t);
    const add = PRESETS_A[name](b).map(({ dt, ...rest }) => ({ ...b, ...rest, t: Math.round((t + dt) * 100) / 100, e: rest.e || "easeInOut" }));
    mapObj(obj.id, (o) => ({ ...o, keys: [...o.keys.filter((k) => !add.some((a) => Math.abs(a.t - k.t) < 0.04)), ...add].sort((a, b2) => a.t - b2.t) }));
    notify(`${name} added at ${t.toFixed(1)}s`);
  };

  useEffect(() => { // draw
    const c = cv.current; if (!c) return; aDrawScene(c.getContext("2d"), c.width, c.height, sc, t, { sel, onion, path, grid: true, ui: !playing });
  }, [sc, t, sel, onion, path, playing, imageRefresh]);
  useEffect(() => {
    if (!playing) return undefined; let raf; let last = performance.now();
    const tick = (now) => { const dt = (now - last) / 1000; last = now; setT((p) => { const n = p + dt; if (n >= sc.duration) { if (loop) return 0; setPlaying(false); return sc.duration; } return n; }); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [playing, loop, sc.duration]);
  useEffect(() => {
    const key = (e) => { if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; if (e.code === "Space") { e.preventDefault(); setPlaying((p) => !p); } if (e.key === "k" || e.key === "K") obj && setPose(obj.id, {}); };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  });

  const stageDown = (e) => {
    const c = cv.current; const r = c.getBoundingClientRect(); const px = (ev) => [((ev.clientX - r.left) / r.width) * 100, ((ev.clientY - r.top) / r.height) * 100];
    const [mx, my] = px(e); const hit = [...sc.objects].reverse().find((o) => { const p = aPose(o, t); const rad = ((o.size / 100) * 720 * p.s) / 2 + 10; return Math.hypot(((mx - p.x) / 100) * 1280, ((my - p.y) / 100) * 720) < rad; });
    if (!hit) { setSel(null); return; }
    setSel(hit.id); setPast((p) => [...p.slice(-40), sc]); setFuture([]);
    const mv = (ev) => { const [x, y] = px(ev); setPose(hit.id, { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }, true); };
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };
  const scrub = (e) => {
    const el = e.currentTarget; const at = (ev) => Math.max(0, Math.min(sc.duration, (ev.clientX - el.getBoundingClientRect().left + el.scrollLeft - 110) / pps));
    setT(at(e)); setPlaying(false); const mv = (ev) => setT(at(ev)); const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };
  const dragKey = (e, o, i) => {
    e.stopPropagation(); setSel(o.id); setSelKey(i); const x0 = e.clientX; const t0 = o.keys[i].t; setPast((p) => [...p.slice(-40), sc]);
    const mv = (ev) => { const nt = Math.max(0, Math.min(sc.duration, Math.round((t0 + (ev.clientX - x0) / pps) * 20) / 20)); live({ ...sc, objects: sc.objects.map((x) => (x.id === o.id ? { ...x, keys: x.keys.map((k, j) => (j === i ? { ...k, t: nt } : k)) } : x)) }); setT(nt); };
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };
  const dl = (href, name) => { const a = document.createElement("a"); a.href = href; a.download = name; a.click(); };
  const exportPNG = () => { const c = document.createElement("canvas"); c.width = 1280; c.height = 720; aDrawScene(c.getContext("2d"), 1280, 720, sc, t, {}); dl(c.toDataURL("image/png"), "frame.png"); };
  const exportWebM = async () => {
    setPlaying(false); setProg(0);
    try {
      const c = document.createElement("canvas"); c.width = 1280; c.height = 720; const g = c.getContext("2d");
      const mime = ["video/webm;codecs=vp9", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(c.captureStream(sc.fps), mime ? { mimeType: mime } : undefined); const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const stopped = new Promise((r) => { rec.onstop = r; }); rec.start(200); const t0 = performance.now();
      await new Promise((res) => { const f = () => { const tt = (performance.now() - t0) / 1000; if (tt >= sc.duration) return res(); aDrawScene(g, 1280, 720, sc, tt, {}); setProg(tt / sc.duration); requestAnimationFrame(f); }; f(); });
      rec.stop(); await stopped; dl(URL.createObjectURL(new Blob(chunks, { type: "video/webm" })), "animation.webm"); notify("Animation exported.");
    } catch (err) { notify(`Export failed: ${err.message || err}`); }
    setProg(null);
  };

  const btn = "inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/10 disabled:opacity-40";
  const Sl = ({ label, v, min, max, step = 0.01, on }) => (
    <label className="block text-[11px] font-bold text-slate-300"><span className="flex justify-between"><span>{label}</span><span className="text-violet-300">{Number(v).toFixed(1)}</span></span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => on(Number(e.target.value))} className="mt-1 w-full accent-violet-500" /></label>
  );
  const key = obj && selKey != null ? obj.keys[selKey] : null;

  return (
    <div className="flex min-h-[720px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1122] text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div className="flex gap-2"><button type="button" className={btn} onClick={undo} disabled={!past.length}><Undo2 className="h-3.5 w-3.5" /> Undo</button><button type="button" className={btn} onClick={redo} disabled={!future.length}><Redo2 className="h-3.5 w-3.5" /> Redo</button></div>
        <span className="text-[11px] font-bold text-slate-400">{sc.objects.length} objects · {sc.duration}s · {sc.fps} fps</span>
        <div className="flex gap-2"><button type="button" className={btn} onClick={exportPNG}>PNG</button>
          <button type="button" className={btn} onClick={() => dl(URL.createObjectURL(new Blob([JSON.stringify(sc, null, 2)], { type: "application/json" })), "animation.json")}>JSON</button>
          <button type="button" disabled={prog !== null} onClick={exportWebM} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-70">{prog !== null ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {Math.round(prog * 100)}%</> : <><Download className="h-3.5 w-3.5" /> Export video</>}</button></div>
      </div>
      <div className="grid flex-1 lg:grid-cols-[250px_1fr_250px]">
        <div className="max-h-[560px] space-y-2.5 overflow-y-auto border-b border-white/10 p-3 lg:border-b-0 lg:border-r">
          <p className="text-[11px] font-black">Add to stage</p>
          <input ref={imageInput} type="file" accept="image/*" className="hidden" onChange={e => { addImageObject(e.target.files?.[0]); e.target.value=""; }} />
          <button type="button" className={`${btn} mb-1 w-full justify-center border-violet-400/40 bg-violet-500/10`} onClick={() => imageInput.current?.click()}><ImageIcon className="h-3.5 w-3.5"/> Import your own photo / picture</button>
          <div className="flex flex-wrap gap-1">{A_EMOJI.map((g) => <button key={g} type="button" onClick={() => addObj({ name: g, glyph: g })} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-base hover:bg-white/10">{g}</button>)}</div>
          <div className="flex flex-wrap gap-1.5">{A_SHAPES.map((s) => <button key={s} type="button" className={`${btn} capitalize`} onClick={() => addObj({ name: s, kind: "shape", shape: s, color: "#a78bfa" })}>{s}</button>)}<button type="button" className={btn} onClick={() => addObj({ name: "Text", kind: "text", text: "Hello!", size: 12 })}><Type className="h-3.5 w-3.5" /> Text</button></div>
          <p className="pt-1 text-[11px] font-black">Layers</p>
          {sc.objects.map((o) => <button key={o.id} type="button" onClick={() => { setSel(o.id); setSelKey(null); }} className={`block w-full truncate rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-bold ${sel === o.id ? "border-violet-400 bg-violet-500/15" : "border-white/10 bg-white/5"}`}>{o.kind === "emoji" ? o.glyph : "◆"} {o.name}</button>)}
          <div className="space-y-2 border-t border-white/10 pt-2.5">
            <Sl label="Duration (s)" v={sc.duration} min={1} max={20} step={0.5} on={(v) => commit({ ...sc, duration: v })} />
            <Sl label="Export FPS" v={sc.fps} min={12} max={60} step={1} on={(v) => commit({ ...sc, fps: v })} />
            <div className="flex items-center gap-2"><input type="color" value={sc.bg.c1} onChange={(e) => commit({ ...sc, bg: { ...sc.bg, c1: e.target.value } })} className="h-8 w-10 rounded" /><input type="color" value={sc.bg.c2} onChange={(e) => commit({ ...sc, bg: { ...sc.bg, c2: e.target.value } })} className="h-8 w-10 rounded" /><span className="text-[10px] text-slate-400">Background</span></div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="grid flex-1 place-items-center bg-black/90 p-3"><canvas ref={cv} width={1280} height={720} onPointerDown={stageDown} className="aspect-video w-full max-w-3xl cursor-move rounded-lg" /></div>
          <div className="flex flex-wrap items-center justify-center gap-2 border-y border-white/10 py-2">
            <button type="button" className={btn} onClick={() => { setT(0); setPlaying(false); }}><SkipBack className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => setPlaying((p) => !p)} className="grid h-10 w-10 place-items-center rounded-full bg-violet-600 text-white">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
            <button type="button" className={btn} onClick={() => obj && setPose(obj.id, {})} disabled={!obj}>◆ Key (K)</button>
            <button type="button" className={`${btn} ${loop ? "!border-violet-400" : ""}`} onClick={() => setLoop(!loop)}><Repeat className="h-3.5 w-3.5" /> Loop</button>
            <button type="button" className={`${btn} ${onion ? "!border-violet-400" : ""}`} onClick={() => setOnion(!onion)}>Onion</button>
            <button type="button" className={`${btn} ${path ? "!border-violet-400" : ""}`} onClick={() => setPath(!path)}>Path</button>
            <span className="w-24 text-center text-[11px] font-bold tabular-nums text-slate-300">{t.toFixed(2)} / {sc.duration}s</span>
            <button type="button" className={btn} onClick={() => setPps((p) => Math.max(40, p - 15))}><ZoomOut className="h-3.5 w-3.5" /></button><button type="button" className={btn} onClick={() => setPps((p) => Math.min(220, p + 15))}><ZoomIn className="h-3.5 w-3.5" /></button>
          </div>
          <div className="overflow-x-auto bg-[#070c18] p-2" onPointerDown={scrub}>
            <div className="relative" style={{ width: sc.duration * pps + 150, minHeight: 60 + sc.objects.length * 30 }}>
              <div className="relative ml-[110px] h-5 border-b border-white/10 text-[9px] text-slate-500">{Array.from({ length: Math.ceil(sc.duration) + 1 }, (_, i) => <span key={i} className="absolute border-l border-white/15 pl-1" style={{ left: i * pps }}>{i}s</span>)}</div>
              {sc.objects.map((o, r) => (
                <div key={o.id} className="relative mt-1 h-7">
                  <span className={`absolute left-0 top-0 w-[104px] truncate rounded-md px-2 py-1 text-[10px] font-bold ${sel === o.id ? "bg-violet-600 text-white" : "bg-white/5 text-slate-300"}`}>{o.name}</span>
                  <div className="absolute left-[110px] right-0 top-1 h-5 rounded bg-white/[0.04]">
                    {o.keys.map((k, i) => <button key={i} type="button" title={`${k.t}s · ${k.e}`} onPointerDown={(e) => dragKey(e, o, i)} className={`absolute top-0.5 h-4 w-4 -translate-x-1/2 rotate-45 cursor-grab rounded-sm ${sel === o.id && selKey === i ? "bg-amber-300 ring-2 ring-white" : "bg-amber-400"}`} style={{ left: k.t * pps }} />)}
                  </div>
                </div>
              ))}
              <span className="pointer-events-none absolute bottom-0 top-0 w-0.5 bg-white shadow-[0_0_6px_#fff]" style={{ left: 110 + t * pps }} />
            </div>
          </div>
          <p className="px-3 py-1.5 text-[10px] text-slate-500">Drag objects on stage to set poses at the playhead · drag ◆ to retime · Space play · K add keyframe.</p>
        </div>

        <div className="max-h-[600px] space-y-2.5 overflow-y-auto border-t border-white/10 p-3 lg:border-l lg:border-t-0">
          {obj ? (<>
            <input value={obj.name} onChange={(e) => mapObj(obj.id, (o) => ({ ...o, name: e.target.value }), true)} className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-bold" />
            {obj.kind === "text" && <input value={obj.text} onChange={(e) => mapObj(obj.id, (o) => ({ ...o, text: e.target.value }), true)} className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs" />}
            <Sl label="Size" v={obj.size} min={4} max={50} step={1} on={(v) => mapObj(obj.id, (o) => ({ ...o, size: v }), true)} />
            {obj.kind !== "emoji" && <input type="color" value={obj.color} onChange={(e) => mapObj(obj.id, (o) => ({ ...o, color: e.target.value }), true)} className="h-8 w-12 rounded" />}
            <p className="text-[11px] font-black">Pose at {t.toFixed(2)}s</p>
            <Sl label="X %" v={pose.x} min={-10} max={110} step={0.5} on={(v) => setPose(obj.id, { x: v }, true)} />
            <Sl label="Y %" v={pose.y} min={-10} max={110} step={0.5} on={(v) => setPose(obj.id, { y: v }, true)} />
            <Sl label="Scale" v={pose.s} min={0.1} max={4} on={(v) => setPose(obj.id, { s: v }, true)} />
            <Sl label="Rotation °" v={pose.r} min={-720} max={720} step={1} on={(v) => setPose(obj.id, { r: v }, true)} />
            <Sl label="Opacity" v={pose.o} min={0} max={1} on={(v) => setPose(obj.id, { o: v }, true)} />
            <p className="text-[11px] font-black">Motion presets</p>
            <div className="flex flex-wrap gap-1.5">{Object.keys(PRESETS_A).map((p) => <button key={p} type="button" className={btn} onClick={() => applyPreset(p)}>{p}</button>)}</div>
            {key && (<div className="space-y-1.5 rounded-xl border border-white/10 p-2">
              <p className="text-[11px] font-black">Keyframe easing</p>
              <div className="flex flex-wrap gap-1">{Object.keys(A_EASE).map((e) => <button key={e} type="button" onClick={() => mapObj(obj.id, (o) => ({ ...o, keys: o.keys.map((k, j) => (j === selKey ? { ...k, e } : k)) }))} className={`rounded-md border px-1.5 py-1 text-[10px] font-bold ${key.e === e ? "border-violet-400 bg-violet-500/20" : "border-white/10"}`}>{e}</button>)}</div>
              <button type="button" className={`${btn} hover:!bg-rose-500/20`} onClick={() => { mapObj(obj.id, (o) => ({ ...o, keys: o.keys.filter((_, j) => j !== selKey) })); setSelKey(null); }}><Trash2 className="h-3.5 w-3.5" /> Delete key</button>
            </div>)}
            <div className="flex gap-1.5">
              <button type="button" className={btn} onClick={() => { const n = { ...obj, id: `o${Date.now().toString(36)}`, name: `${obj.name} copy`, keys: obj.keys.map((k) => ({ ...k, x: k.x + 5, y: k.y + 5 })) }; commit({ ...sc, objects: [...sc.objects, n] }); setSel(n.id); }}><Copy className="h-3.5 w-3.5" /> Duplicate</button>
              <button type="button" className={`${btn} hover:!bg-rose-500/20`} onClick={() => { commit({ ...sc, objects: sc.objects.filter((o) => o.id !== obj.id) }); setSel(null); }}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
            </div>
          </>) : <p className="text-[11px] text-slate-400">Select an object on the stage or add one from the left.</p>}
        </div>
      </div>
    </div>
  );
}

// ===== Files Editor: images, text/JSON/CSV/SVG, audio, video & PDF in one place =====
const F_TEXT_EXT = ["txt", "md", "json", "csv", "tsv", "js", "jsx", "ts", "tsx", "css", "html", "htm", "xml", "yml", "yaml", "py", "java", "c", "cpp", "sql", "log", "ini", "env", "svg"];
const fKind = (f) => {
  const e = (f.name.split(".").pop() || "").toLowerCase();
  if (f.type.startsWith("image/") && e !== "svg") return "image";
  if (f.type.startsWith("audio/")) return "audio";
  if (f.type.startsWith("video/")) return "video";
  if (f.type === "application/pdf" || e === "pdf") return "pdf";
  if (f.type.startsWith("text/") || f.type.includes("json") || F_TEXT_EXT.includes(e)) return "text";
  return "other";
};
const fDownload = (blobOrUrl, name) => { const a = document.createElement("a"); a.href = typeof blobOrUrl === "string" ? blobOrUrl : URL.createObjectURL(blobOrUrl); a.download = name; a.click(); };
const fBtn = "inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/10 disabled:opacity-40";
const fSize = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function encodeWav(buf) {
  const ch = buf.numberOfChannels; const len = buf.length; const dv = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const w = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); dv.setUint32(4, 36 + len * ch * 2, true); w(8, "WAVEfmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, ch, true);
  dv.setUint32(24, buf.sampleRate, true); dv.setUint32(28, buf.sampleRate * ch * 2, true); dv.setUint16(32, ch * 2, true); dv.setUint16(34, 16, true); w(36, "data"); dv.setUint32(40, len * ch * 2, true);
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c)); let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, data[c][i])); dv.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return new Blob([dv], { type: "audio/wav" });
}

function FileImage({ file, notify }) {
  const base = useRef(null); const pv = useRef(null); const hist = useRef([]);
  if (!base.current && typeof document !== "undefined") base.current = document.createElement("canvas");
  const A0 = { b: 1, c: 1, s: 1, h: 0, blur: 0, gray: 0, sepia: 0, invert: 0 };
  const [, setVer] = useState(0); const bump = () => setVer((v) => v + 1);
  const [adj, setAdj] = useState(A0); const [texts, setTexts] = useState([]); const [selT, setSelT] = useState(null);
  const [crop, setCrop] = useState(null); const [cropOn, setCropOn] = useState(false); const [fmt, setFmt] = useState("png"); const [q, setQ] = useState(0.92); const [rs, setRs] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const im = new Image();
    im.onload = () => { const m = Math.min(1, 4096 / Math.max(im.width, im.height)); const c = base.current; c.width = Math.round(im.width * m); c.height = Math.round(im.height * m); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); hist.current = []; setRs({ w: c.width, h: c.height }); bump(); };
    im.src = file.url;
  }, [file.url]);
  const filter = `brightness(${adj.b}) contrast(${adj.c}) saturate(${adj.s}) hue-rotate(${adj.h}deg) blur(${adj.blur}px) grayscale(${adj.gray}) sepia(${adj.sepia}) invert(${adj.invert})`;
  const paint = (c) => {
    const b = base.current; c.width = b.width; c.height = b.height; const g = c.getContext("2d"); g.filter = filter; g.drawImage(b, 0, 0); g.filter = "none";
    texts.forEach((t) => { g.font = `800 ${(t.size * b.height) / 100}px sans-serif`; g.fillStyle = t.color; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(t.text, (t.x / 100) * b.width, (t.y / 100) * b.height); });
  };
  useEffect(() => {
    const c = pv.current; if (!c || !base.current.width) return; paint(c);
    if (cropOn && crop) { const g = c.getContext("2d"); g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(0, 0, c.width, c.height); g.save(); g.beginPath(); g.rect(crop.x, crop.y, crop.w, crop.h); g.clip(); g.filter = filter; g.drawImage(base.current, 0, 0); g.restore(); g.strokeStyle = "#fff"; g.setLineDash([8, 6]); g.lineWidth = Math.max(2, c.width / 400); g.strokeRect(crop.x, crop.y, crop.w, crop.h); }
  });
  const apply = (fn) => {
    const b = base.current; hist.current.push(b.toDataURL()); if (hist.current.length > 15) hist.current.shift();
    const n = document.createElement("canvas"); fn(n, b); b.width = n.width; b.height = n.height; b.getContext("2d").drawImage(n, 0, 0); setRs({ w: b.width, h: b.height }); setCrop(null); setCropOn(false); bump();
  };
  const rotate = (d) => apply((n, b) => { n.width = b.height; n.height = b.width; const g = n.getContext("2d"); g.translate(n.width / 2, n.height / 2); g.rotate((d * Math.PI) / 2); g.drawImage(b, -b.width / 2, -b.height / 2); });
  const flip = (h) => apply((n, b) => { n.width = b.width; n.height = b.height; const g = n.getContext("2d"); g.translate(h ? n.width : 0, h ? 0 : n.height); g.scale(h ? -1 : 1, h ? 1 : -1); g.drawImage(b, 0, 0); });
  const resize = () => apply((n, b) => { n.width = Math.max(1, rs.w); n.height = Math.max(1, rs.h); n.getContext("2d").drawImage(b, 0, 0, n.width, n.height); });
  const doCrop = () => crop && crop.w > 4 && apply((n, b) => { n.width = Math.round(crop.w); n.height = Math.round(crop.h); n.getContext("2d").drawImage(b, crop.x, crop.y, crop.w, crop.h, 0, 0, n.width, n.height); });
  const bake = () => { apply((n) => paint(n)); setAdj(A0); setTexts([]); setSelT(null); notify("Edits applied."); };
  const undo = () => { const u = hist.current.pop(); if (!u) return notify("Nothing to undo."); const im = new Image(); im.onload = () => { const b = base.current; b.width = im.width; b.height = im.height; b.getContext("2d").drawImage(im, 0, 0); setRs({ w: b.width, h: b.height }); bump(); }; im.src = u; };
  const exportImg = () => {
    const c = document.createElement("canvas"); paint(c); let out = c;
    if (fmt === "jpg") { out = document.createElement("canvas"); out.width = c.width; out.height = c.height; const g = out.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(c, 0, 0); }
    out.toBlob((bl) => fDownload(bl, `${file.name.replace(/\.[^.]+$/, "")}-edited.${fmt}`), `image/${fmt === "jpg" ? "jpeg" : fmt}`, q);
  };
  const cropDown = (e) => {
    if (!cropOn) return; const c = pv.current; const r = c.getBoundingClientRect(); const k = c.width / r.width; const p = (ev) => [(ev.clientX - r.left) * k, (ev.clientY - r.top) * k]; const [x0, y0] = p(e);
    const mv = (ev) => { const [x, y] = p(ev); setCrop({ x: Math.max(0, Math.min(x0, x)), y: Math.max(0, Math.min(y0, y)), w: Math.min(c.width, Math.abs(x - x0)), h: Math.min(c.height, Math.abs(y - y0)) }); };
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); }; window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };
  const T = texts.find((t) => t.id === selT); const setT = (p) => setTexts(texts.map((t) => (t.id === selT ? { ...t, ...p } : t)));
  const set = (k) => (v) => setAdj({ ...adj, [k]: v });
  return (
    <div className="grid gap-0 lg:grid-cols-[1fr_300px]">
      <div className="grid min-h-[460px] place-items-center bg-black/80 p-3"><canvas ref={pv} onPointerDown={cropDown} className={`max-h-[560px] max-w-full rounded ${cropOn ? "cursor-crosshair" : ""}`} style={{ background: "repeating-conic-gradient(#2a2a2a 0 25%, #333 0 50%) 0 0/16px 16px" }} /></div>
      <div className="max-h-[620px] space-y-3 overflow-y-auto border-t border-white/10 p-3 lg:border-l lg:border-t-0">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={fBtn} onClick={() => rotate(-1)}>⟲ 90°</button><button type="button" className={fBtn} onClick={() => rotate(1)}>⟳ 90°</button>
          <button type="button" className={fBtn} onClick={() => flip(true)}>Flip H</button><button type="button" className={fBtn} onClick={() => flip(false)}>Flip V</button>
          <button type="button" className={fBtn} onClick={undo}><Undo2 className="h-3.5 w-3.5" /> Undo</button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={`${fBtn} ${cropOn ? "!border-violet-400" : ""}`} onClick={() => { setCropOn(!cropOn); setCrop(null); }}>Crop</button>
          {cropOn && <button type="button" className={fBtn} onClick={doCrop} disabled={!crop}>Apply crop</button>}
          <span className="text-[10px] text-slate-400">{cropOn ? "Drag on the image" : `${rs.w} × ${rs.h}px`}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold">
          <input type="number" value={rs.w} onChange={(e) => { const w = Number(e.target.value); const b = base.current; setRs({ w, h: Math.round((w * b.height) / b.width) }); }} className="w-20 rounded-lg border border-white/15 bg-white/5 px-2 py-1" />×
          <input type="number" value={rs.h} onChange={(e) => setRs({ ...rs, h: Number(e.target.value) })} className="w-20 rounded-lg border border-white/15 bg-white/5 px-2 py-1" />
          <button type="button" className={fBtn} onClick={resize}>Resize</button>
        </div>
        <p className="text-[11px] font-black">Adjust</p>
        <Slider label="Brightness" value={adj.b} min={0.3} max={2} onChange={set("b")} /><Slider label="Contrast" value={adj.c} min={0.3} max={2} onChange={set("c")} />
        <Slider label="Saturation" value={adj.s} min={0} max={3} onChange={set("s")} /><Slider label="Hue" value={adj.h} min={-180} max={180} step={1} onChange={set("h")} />
        <Slider label="Blur" value={adj.blur} min={0} max={12} step={0.2} onChange={set("blur")} />
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={fBtn} onClick={() => setAdj({ ...A0, gray: 1 })}>B&amp;W</button><button type="button" className={fBtn} onClick={() => setAdj({ ...A0, sepia: 0.8 })}>Sepia</button>
          <button type="button" className={fBtn} onClick={() => setAdj({ ...A0, invert: 1 })}>Invert</button><button type="button" className={fBtn} onClick={() => setAdj({ ...A0, c: 1.25, s: 1.35 })}>Vivid</button>
          <button type="button" className={fBtn} onClick={() => setAdj(A0)}>Reset</button><button type="button" className={fBtn} onClick={bake}>Apply to image</button>
        </div>
        <p className="text-[11px] font-black">Text</p>
        <button type="button" className={fBtn} onClick={() => { const t = { id: `t${Date.now()}`, text: "Your text", x: 50, y: 50, size: 10, color: "#ffffff" }; setTexts([...texts, t]); setSelT(t.id); }}><Plus className="h-3.5 w-3.5" /> Add text</button>
        {T && (<div className="space-y-2 rounded-xl border border-white/10 p-2">
          <input value={T.text} onChange={(e) => setT({ text: e.target.value })} className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs" />
          <Slider label="X %" value={T.x} min={0} max={100} step={1} onChange={(x) => setT({ x })} /><Slider label="Y %" value={T.y} min={0} max={100} step={1} onChange={(y) => setT({ y })} /><Slider label="Size" value={T.size} min={2} max={40} step={1} onChange={(size) => setT({ size })} />
          <div className="flex items-center gap-2"><input type="color" value={T.color} onChange={(e) => setT({ color: e.target.value })} className="h-8 w-10 rounded" /><button type="button" className={fBtn} onClick={() => { setTexts(texts.filter((t) => t.id !== T.id)); setSelT(null); }}><Trash2 className="h-3.5 w-3.5" /></button></div>
        </div>)}
        <p className="text-[11px] font-black">Export</p>
        <Pills items={["png", "jpg", "webp"]} value={fmt} onPick={setFmt} />
        {fmt !== "png" && <Slider label="Quality" value={q} min={0.3} max={1} onChange={setQ} />}
        <button type="button" onClick={exportImg} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-xs font-black text-white"><Download className="h-4 w-4" /> Download image</button>
      </div>
    </div>
  );
}

const csvParse = (t, d) => { const rows = []; let row = []; let cell = ""; let q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; } else if (c === '"') q = true; else if (c === d) { row.push(cell); cell = ""; } else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; } else if (c !== "\r") cell += c; } row.push(cell); rows.push(row); return rows; };
const csvOut = (rows, d) => rows.map((r) => r.map((c) => (/[",\n]/.test(c) || c.includes(d) ? `"${c.replace(/"/g, '""')}"` : c)).join(d)).join("\n");

function FileTextTool({ file, text, setText, notify }) {
  const ext = (file.name.split(".").pop() || "").toLowerCase(); const delim = ext === "tsv" ? "\t" : ",";
  const [find, setFind] = useState(""); const [rep, setRep] = useState(""); const [table, setTable] = useState(false); const gut = useRef(null);
  const lines = text.split("\n").length; const words = (text.trim().match(/\S+/g) || []).length; const hits = find ? text.split(find).length - 1 : 0;
  const isJson = ext === "json"; let jsonErr = ""; if (isJson) { try { JSON.parse(text || "null"); } catch (e) { jsonErr = e.message; } }
  const tx = (fn) => setText(fn(text));
  const rows = table ? csvParse(text, delim).slice(0, 300) : [];
  const setCell = (r, c, v) => { const all = csvParse(text, delim); all[r][c] = v; setText(csvOut(all, delim)); };
  return (
    <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
      <div className="min-h-[460px]">
        {table ? (
          <div className="max-h-[600px] overflow-auto p-2"><table className="w-full border-collapse text-xs"><tbody>{rows.map((r, i) => (<tr key={i}>{r.map((c, j) => <td key={j} className="border border-white/10 p-0"><input value={c} onChange={(e) => setCell(i, j, e.target.value)} className={`w-full min-w-[90px] bg-transparent px-2 py-1.5 ${i === 0 ? "font-black" : ""}`} /></td>)}</tr>))}</tbody></table></div>
        ) : (
          <div className="flex h-[600px] font-mono text-[12.5px] leading-6">
            <pre ref={gut} className="w-12 shrink-0 select-none overflow-hidden border-r border-white/10 bg-white/[0.03] py-3 pr-2 text-right text-slate-500">{Array.from({ length: lines }, (_, i) => i + 1).join("\n")}</pre>
            <textarea value={text} spellCheck={false} onChange={(e) => setText(e.target.value)} onScroll={(e) => { gut.current.scrollTop = e.target.scrollTop; }} className="h-full flex-1 resize-none bg-transparent p-3 outline-none" style={{ whiteSpace: "pre", overflow: "auto" }} />
          </div>
        )}
      </div>
      <div className="space-y-3 border-t border-white/10 p-3 lg:border-l lg:border-t-0">
        <p className="text-[11px] text-slate-400">{lines} lines · {words} words · {text.length} chars</p>
        {isJson && <p className={`text-[11px] font-bold ${jsonErr ? "text-rose-400" : "text-emerald-400"}`}>{jsonErr ? `Invalid JSON: ${jsonErr}` : "Valid JSON"}</p>}
        <p className="text-[11px] font-black">Find &amp; replace</p>
        <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find" className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs" />
        <input value={rep} onChange={(e) => setRep(e.target.value)} placeholder="Replace with" className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs" />
        <div className="flex items-center gap-2"><button type="button" className={fBtn} disabled={!hits} onClick={() => { setText(text.split(find).join(rep)); notify(`Replaced ${hits}.`); }}>Replace all</button><span className="text-[10px] text-slate-400">{hits} matches</span></div>
        <p className="text-[11px] font-black">Quick actions</p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={fBtn} onClick={() => tx((t) => t.toUpperCase())}>UPPER</button><button type="button" className={fBtn} onClick={() => tx((t) => t.toLowerCase())}>lower</button>
          <button type="button" className={fBtn} onClick={() => tx((t) => t.split("\n").map((l) => l.trim()).join("\n"))}>Trim lines</button>
          <button type="button" className={fBtn} onClick={() => tx((t) => t.split("\n").sort().join("\n"))}>Sort lines</button>
          <button type="button" className={fBtn} onClick={() => tx((t) => [...new Set(t.split("\n"))].join("\n"))}>Unique lines</button>
          <button type="button" className={fBtn} onClick={() => tx((t) => t.replace(/\n{3,}/g, "\n\n"))}>Squash blanks</button>
          {isJson && <><button type="button" className={fBtn} onClick={() => { try { setText(JSON.stringify(JSON.parse(text), null, 2)); } catch { notify("Fix the JSON first."); } }}>Format JSON</button>
            <button type="button" className={fBtn} onClick={() => { try { setText(JSON.stringify(JSON.parse(text))); } catch { notify("Fix the JSON first."); } }}>Minify</button></>}
          {(ext === "csv" || ext === "tsv") && <button type="button" className={`${fBtn} ${table ? "!border-violet-400" : ""}`} onClick={() => setTable(!table)}>{table ? "Text view" : "Table view"}</button>}
        </div>
        <button type="button" onClick={() => fDownload(new Blob([text], { type: "text/plain" }), file.name)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-xs font-black text-white"><Download className="h-4 w-4" /> Download file</button>
      </div>
    </div>
  );
}

function FileAudioTool({ file, notify }) {
  const [buf, setBuf] = useState(null); const [st, setSt] = useState(0); const [en, setEn] = useState(0);
  const [gain, setGain] = useState(1); const [fi, setFi] = useState(0); const [fo, setFo] = useState(0); const [rev, setRev] = useState(false); const [norm, setNorm] = useState(false); const [playing, setPlaying] = useState(false);
  const cv = useRef(null); const ac = useRef(null); const srcN = useRef(null);
  useEffect(() => {
    let dead = false; ac.current = ac.current || new (window.AudioContext || window.webkitAudioContext)();
    fetch(file.url).then((r) => r.arrayBuffer()).then((ab) => ac.current.decodeAudioData(ab)).then((b) => { if (!dead) { setBuf(b); setSt(0); setEn(b.duration); } }).catch(() => notify("Could not decode this audio file."));
    return () => { dead = true; srcN.current?.stop?.(); };
  }, [file.url]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const c = cv.current; if (!c || !buf) return; const g = c.getContext("2d"); const W = c.width; const H = c.height; g.clearRect(0, 0, W, H);
    const d = buf.getChannelData(0); const step = Math.floor(d.length / W) || 1; g.fillStyle = "#64748b";
    for (let x = 0; x < W; x++) { let mx = 0; for (let i = 0; i < step; i += 8) mx = Math.max(mx, Math.abs(d[x * step + i] || 0)); g.fillRect(x, H / 2 - mx * H / 2, 1, Math.max(1, mx * H)); }
    g.fillStyle = "rgba(124,58,237,.28)"; g.fillRect((st / buf.duration) * W, 0, ((en - st) / buf.duration) * W, H);
  }, [buf, st, en]);
  const process = () => {
    const sr = buf.sampleRate; const s = Math.floor(st * sr); const len = Math.max(1, Math.floor(en * sr) - s); const out = new AudioBuffer({ numberOfChannels: buf.numberOfChannels, length: len, sampleRate: sr }); let peak = 0; const chans = [];
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c).slice(s, s + len); if (rev) d.reverse();
      for (let i = 0; i < len; i++) { let f = 1; if (fi && i / sr < fi) f = i / sr / fi; if (fo && (len - i) / sr < fo) f = Math.min(f, (len - i) / sr / fo); d[i] *= gain * f; peak = Math.max(peak, Math.abs(d[i])); }
      chans.push(d);
    }
    const k = norm && peak > 0 ? 0.98 / peak : 1; chans.forEach((d, c) => { if (k !== 1) for (let i = 0; i < len; i++) d[i] *= k; out.copyToChannel(d, c); });
    return out;
  };
  const play = () => {
    if (playing) { srcN.current?.stop(); setPlaying(false); return; }
    const s = ac.current.createBufferSource(); s.buffer = process(); s.connect(ac.current.destination); s.onended = () => setPlaying(false); ac.current.resume(); s.start(); srcN.current = s; setPlaying(true);
  };
  if (!buf) return <p className="p-6 text-xs text-slate-400">Decoding audio…</p>;
  return (
    <div className="space-y-3 p-4">
      <canvas ref={cv} width={1000} height={140} className="h-36 w-full rounded-xl border border-white/10 bg-black/40" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider label="Trim start (s)" value={st} min={0} max={Math.max(0.1, en - 0.1)} step={0.05} onChange={setSt} /><Slider label="Trim end (s)" value={en} min={st + 0.1} max={buf.duration} step={0.05} onChange={setEn} />
        <Slider label="Volume" value={gain} min={0} max={3} onChange={setGain} /><div />
        <Slider label="Fade in (s)" value={fi} min={0} max={Math.max(0.1, (en - st) / 2)} onChange={setFi} /><Slider label="Fade out (s)" value={fo} min={0} max={Math.max(0.1, (en - st) / 2)} onChange={setFo} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={`${fBtn} ${rev ? "!border-violet-400" : ""}`} onClick={() => setRev(!rev)}>Reverse</button>
        <button type="button" className={`${fBtn} ${norm ? "!border-violet-400" : ""}`} onClick={() => setNorm(!norm)}>Normalize</button>
        <button type="button" className={fBtn} onClick={play}>{playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} {playing ? "Stop" : "Preview edit"}</button>
        <span className="text-[11px] text-slate-400">{(en - st).toFixed(1)}s of {buf.duration.toFixed(1)}s</span>
        <button type="button" onClick={() => fDownload(encodeWav(process()), `${file.name.replace(/\.[^.]+$/, "")}-edited.wav`)} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white"><Download className="h-4 w-4" /> Export WAV</button>
      </div>
    </div>
  );
}


function MultiTrackAudioStudio({ notify, project, patchProject }) {
  const [tracks, setTracks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [master, setMaster] = useState(0.9);
  const [mode, setMode] = useState("sequence");
  const inputRef = useRef(null);
  const selectedTrack = tracks.find(t => t.id === selected) || tracks[0] || null;
  const update = (id, patch) => setTracks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  const importFiles = async (files) => {
    const added = [];
    for (const file of Array.from(files || [])) {
      if (!file.type.startsWith("audio/")) continue;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
        await ctx.close();
        const duration = buffer.duration;
        const url = URL.createObjectURL(file);
        const start = mode === "sequence" ? tracks.reduce((m, t) => Math.max(m, t.start + (t.out - t.in) / (t.speed || 1)), 0) : 0;
        added.push({ id: `mix_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, name: file.name, file, url, buffer, duration, in: 0, out: duration, start, volume: 1, fadeIn: 0, fadeOut: 0, speed: 1, pan: 0, muted: false, solo: false });
      } catch { notify(`Could not decode ${file.name}. Try MP3, WAV, or OGG.`); }
    }
    if (added.length) {
      setTracks(prev => [...prev, ...added]);
      setSelected(added[0].id);
      notify(`${added.length} audio track(s) imported. Trim and arrange them, then export one mixed WAV.`);
    }
  };
  const move = (id, dir) => setTracks(prev => { const i = prev.findIndex(t => t.id === id), j = i + dir; if (i < 0 || j < 0 || j >= prev.length) return prev; const n=[...prev]; [n[i],n[j]]=[n[j],n[i]]; return n; });
  const remove = (id) => { setTracks(prev => prev.filter(t => t.id !== id)); if (selected === id) setSelected(null); };
  const exportMix = async () => {
    if (!tracks.length) return notify("Import at least one song first.");
    setBusy(true);
    try {
      const active = tracks.filter(t => !t.muted && (!tracks.some(x => x.solo) || t.solo));
      if (!active.length) throw new Error("All tracks are muted.");
      const sampleRate = 44100;
      const totalSeconds = Math.max(...active.map(t => t.start + (t.out - t.in) / (t.speed || 1)));
      const frameCount = Math.max(1, Math.ceil(totalSeconds * sampleRate));
      const ctx = new OfflineAudioContext(2, frameCount, sampleRate);
      active.forEach(t => {
        const src = ctx.createBufferSource();
        const cutLength = Math.max(1, Math.floor((t.out - t.in) * t.buffer.sampleRate));
        const cut = ctx.createBuffer(t.buffer.numberOfChannels, cutLength, t.buffer.sampleRate);
        for (let c = 0; c < t.buffer.numberOfChannels; c++) cut.copyToChannel(t.buffer.getChannelData(c).slice(Math.floor(t.in*t.buffer.sampleRate), Math.floor(t.in*t.buffer.sampleRate)+cutLength), c);
        src.buffer = cut; src.playbackRate.value = t.speed || 1;
        const gain = ctx.createGain(); gain.gain.value = (t.volume ?? 1) * master;
        const fadeIn = Math.max(0, t.fadeIn || 0), fadeOut = Math.max(0, t.fadeOut || 0), duration = (t.out-t.in)/(t.speed||1);
        gain.gain.setValueAtTime(0, t.start);
        gain.gain.linearRampToValueAtTime((t.volume ?? 1)*master, t.start + Math.min(fadeIn, duration/2));
        if (fadeOut > 0) { gain.gain.setValueAtTime((t.volume ?? 1)*master, Math.max(t.start, t.start+duration-fadeOut)); gain.gain.linearRampToValueAtTime(0, t.start+duration); }
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (pan) { pan.pan.value = t.pan || 0; src.connect(gain).connect(pan).connect(ctx.destination); }
        else src.connect(gain).connect(ctx.destination);
        src.start(t.start, 0);
      });
      const rendered = await ctx.startRendering();
      fDownload(encodeToolWav(rendered), "plotcraft-mix.wav");
      notify("Mixed audio exported as WAV.");
    } catch (e) { notify(e.message || "Audio mix export failed."); }
    finally { setBusy(false); }
  };
  const playTrack = (track) => { const a = new Audio(track.url); a.currentTime = track.in; a.volume = Math.min(1, track.volume); a.playbackRate = track.speed || 1; a.play().catch(() => notify("Playback was blocked by the browser.")); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-500/15 via-violet-500/10 to-cyan-500/10 p-4">
        <div><p className="text-lg font-black text-white">Multitrack Audio Workstation</p><p className="mt-1 text-xs text-slate-400">Import multiple songs, trim each one, arrange, blend and export a single mix.</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold" onClick={() => inputRef.current?.click()}><Upload className="mr-1 inline h-4 w-4"/>Import songs</button>
          <button type="button" disabled={busy || !tracks.length} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50" onClick={exportMix}>{busy ? "Mixing…" : "Render & export WAV"}</button>
        </div>
        <input ref={inputRef} type="file" accept="audio/*" multiple className="hidden" onChange={e => { importFiles(e.target.files); e.target.value=""; }}/>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_260px]">
        <Panel title="Track timeline" subtitle={`${tracks.length} tracks · ${tracks.filter(t=>!t.muted).length} active`}>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-300">Arrangement</span>
            <Pills items={["sequence","overlap"]} value={mode} onPick={setMode}/>
            <span className="text-slate-500">{mode === "sequence" ? "New imports append after the previous track" : "New imports start together for a layered mix"}</span>
          </div>
          <div className="space-y-2">
            {tracks.map((t,i) => <div key={t.id} className={`rounded-xl border p-3 ${selectedTrack?.id===t.id ? "border-violet-400 bg-violet-500/10":"border-white/10 bg-white/[0.03]"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={()=>setSelected(t.id)} className="min-w-0 flex-1 truncate text-left text-xs font-black text-white">{i+1}. {t.name}</button>
                <button type="button" className="rounded-lg border border-white/10 px-2 py-1 text-[10px]" onClick={()=>move(t.id,-1)}>↑</button>
                <button type="button" className="rounded-lg border border-white/10 px-2 py-1 text-[10px]" onClick={()=>move(t.id,1)}>↓</button>
                <button type="button" className="rounded-lg border border-white/10 px-2 py-1 text-[10px]" onClick={()=>playTrack(t)}>Preview</button>
                <button type="button" className="rounded-lg border border-rose-400/30 px-2 py-1 text-[10px] text-rose-300" onClick={()=>remove(t.id)}>Remove</button>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-950"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500" style={{width:`${Math.max(8,((t.out-t.in)/Math.max(1,t.duration))*100)}%`}}/></div>
              <div className="mt-1 flex justify-between text-[10px] text-slate-500"><span>In {fmtSec(t.in)} · Out {fmtSec(t.out)}</span><span>Starts {fmtSec(t.start)}</span></div>
            </div>)}
            {!tracks.length && <div className="rounded-xl border border-dashed border-white/20 p-8 text-center text-xs text-slate-400">Choose two or more audio files to build a real multitrack mix.</div>}
          </div>
        </Panel>
        <Panel title="Track inspector" subtitle="10+ practical editing controls">
          {selectedTrack ? <div className="space-y-3 text-xs">
            <p className="truncate font-black text-white">{selectedTrack.name}</p>
            <Slider label="Trim in" value={selectedTrack.in} min={0} max={Math.max(0,selectedTrack.out-0.1)} step={0.05} onChange={v=>update(selectedTrack.id,{in:v})}/>
            <Slider label="Trim out" value={selectedTrack.out} min={selectedTrack.in+0.1} max={selectedTrack.duration} step={0.05} onChange={v=>update(selectedTrack.id,{out:v})}/>
            <Slider label="Timeline start" value={selectedTrack.start} min={0} max={180} step={0.1} onChange={v=>update(selectedTrack.id,{start:v})}/>
            <Slider label="Volume" value={selectedTrack.volume} min={0} max={1} onChange={v=>update(selectedTrack.id,{volume:v})}/>
            <Slider label="Pan" value={selectedTrack.pan} min={-1} max={1} onChange={v=>update(selectedTrack.id,{pan:v})}/>
            <Slider label="Playback speed" value={selectedTrack.speed} min={0.5} max={2} step={0.05} unit="×" onChange={v=>update(selectedTrack.id,{speed:v})}/>
            <Slider label="Fade in" value={selectedTrack.fadeIn} min={0} max={Math.min(10,selectedTrack.out-selectedTrack.in)} onChange={v=>update(selectedTrack.id,{fadeIn:v})}/>
            <Slider label="Fade out" value={selectedTrack.fadeOut} min={0} max={Math.min(10,selectedTrack.out-selectedTrack.in)} onChange={v=>update(selectedTrack.id,{fadeOut:v})}/>
            <label className="flex items-center gap-2"><input type="checkbox" checked={selectedTrack.muted} onChange={e=>update(selectedTrack.id,{muted:e.target.checked})}/>Mute track</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={selectedTrack.solo} onChange={e=>update(selectedTrack.id,{solo:e.target.checked})}/>Solo track</label>
            <button type="button" className="w-full rounded-lg border border-white/10 px-3 py-2 font-bold" onClick={()=>update(selectedTrack.id,{in:0,out:selectedTrack.duration,start:0,volume:1,fadeIn:0,fadeOut:0,speed:1,pan:0,muted:false,solo:false})}>Reset track settings</button>
          </div> : <p className="text-xs text-slate-400">Select a track to edit its trim, timing, volume, pan, speed and fades.</p>}
          <div className="mt-4 border-t border-white/10 pt-3"><Slider label="Master volume" value={master} min={0} max={1} onChange={setMaster}/><p className="mt-2 text-[10px] leading-5 text-slate-500">Export uses browser Web Audio rendering. WAV is supported here; MP3 encoding requires an additional encoder.</p></div>
        </Panel>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{["Multi-import","Trim & split","Sequence / overlap","Fade & pan","WAV mixdown"].map(x=><div key={x} className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center text-[10px] font-bold text-slate-300">{x}</div>)}</div>
    </div>
  );
}

const DIY_TEMPLATES = [
  ["paper-flower","Paper flowers","Paper · Scissors · Glue"],["gift-box","Gift box","Cardstock · Ruler · Tape"],["bookmark","Layered bookmark","Paper · Ribbon · Punch"],["origami","Origami animals","Square paper"],["wall-art","Geometric wall art","Canvas · Paint"],["bead-bracelet","Bead bracelet","Cord · Beads"],["clay-tray","Air-dry clay tray","Clay · Water"],["macrame","Mini macramé","Cotton cord"],["candle-label","Candle label","Sticker paper"],["scrapbook","Scrapbook page","Album · Photos"],["felt-toy","Felt soft toy","Felt · Thread"],["plant-pot","Decorated planter","Pot · Acrylic paint"]
];
function DIYWorkbench({ project, patchProject, notify }) {
  const [kind,setKind]=useState("paper-flower"); const [material,setMaterial]=useState("Cardstock"); const [difficulty,setDifficulty]=useState("Beginner");
  const [notes,setNotes]=useState(project.content||""); const [steps,setSteps]=useState(["Plan the design and measure materials","Cut or shape the main pieces","Assemble carefully and let it set","Decorate, inspect and finish"]);
  const [size,setSize]=useState("A4"); const [showGrid,setShowGrid]=useState(true);
  const template=DIY_TEMPLATES.find(x=>x[0]===kind)||DIY_TEMPLATES[0];
  const exportGuide=()=>{const body=`${template[1]}\nMaterial: ${material}\nDifficulty: ${difficulty}\nPaper size: ${size}\n\nMaterials: ${template[2]}\n\nSteps:\n${steps.map((s,i)=>`${i+1}. ${s}`).join("\n")}\n\nNotes:\n${notes}`; fDownload(new Blob([body],{type:"text/plain;charset=utf-8"}),`${kind}-craft-guide.txt`);};
  return <div className="space-y-4">
    <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-500/15 to-cyan-500/10 p-4"><h3 className="text-lg font-black text-white">Maker Lab · DIY & Handmade</h3><p className="mt-1 text-xs text-slate-400">Build project plans, printable guides, material lists and custom craft layouts.</p></div>
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <Panel title="Craft library" subtitle="12 starter projects — select one to customise">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{DIY_TEMPLATES.map(([id,title,mat],i)=><button key={id} type="button" onClick={()=>setKind(id)} className={`rounded-xl border p-3 text-left ${kind===id?"border-emerald-400 bg-emerald-500/15":"border-white/10 bg-white/[0.03]"}`}><span className="text-xl">{["🌸","🎁","🔖","🦢","🖼️","📿","🏺","🧶","🏷️","📒","🧸","🪴"][i]}</span><span className="mt-2 block text-xs font-black text-white">{title}</span><span className="mt-1 block text-[10px] text-slate-500">{mat}</span></button>)}</div>
      </Panel>
      <Panel title="Project settings"><div className="space-y-3 text-xs">
        <label className="block font-bold">Material<select value={material} onChange={e=>setMaterial(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-white">{["Cardstock","Origami paper","Felt","Cotton cord","Air-dry clay","Wood","Fabric","Recycled materials","Sticker paper"].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="block font-bold">Difficulty<select value={difficulty} onChange={e=>setDifficulty(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-white">{["Beginner","Intermediate","Advanced"].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="block font-bold">Page / pattern size<select value={size} onChange={e=>setSize(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-white">{["A4","A3","Letter","Square 20cm"].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={showGrid} onChange={e=>setShowGrid(e.target.checked)}/>Show cutting grid</label>
        <button type="button" className="w-full rounded-xl bg-emerald-600 px-3 py-2 font-black text-white" onClick={exportGuide}><Download className="mr-1 inline h-4 w-4"/>Export craft guide</button>
      </div></Panel>
    </div>
    <Panel title={`${template[1]} · Work plan`} subtitle={`Suggested materials: ${template[2]}`}>
      <div className={`grid gap-3 ${showGrid?"sm:grid-cols-2":""}`}><div className="rounded-xl bg-white p-4 text-slate-900" style={{backgroundImage:showGrid?"linear-gradient(#94a3b8 1px,transparent 1px),linear-gradient(90deg,#94a3b8 1px,transparent 1px)":"none",backgroundSize:"20px 20px"}}>
        <div className="mb-3 flex items-center justify-between"><strong className="text-sm">{template[1]}</strong><span className="text-[10px]">{size}</span></div><div className="grid grid-cols-2 gap-2">{["Measure","Cut","Fold","Join","Decorate","Finish"].map((x,i)=><div key={x} className="grid h-20 place-items-center rounded-lg border-2 border-dashed border-slate-400 text-xs font-black">{i+1}. {x}</div>)}</div>
      </div><div className="space-y-2">{steps.map((step,i)=><div key={i} className="flex gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-500/20 text-xs font-black text-emerald-300">{i+1}</span><input value={step} onChange={e=>setSteps(p=>p.map((x,j)=>j===i?e.target.value:x))} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-xs text-white"/></div>)}<textarea rows={3} value={notes} onChange={e=>{setNotes(e.target.value);patchProject({content:e.target.value});}} placeholder="Measurements, custom notes, safety reminders..." className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white"/></div></div>
    </Panel>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{["12 project templates","Custom materials","Editable steps","Printable guide","Cut / fold planning","Size presets","Difficulty modes","Project notes","Grid preview","TXT export","Reusable checklist","Craft workspace"].map(x=><div key={x} className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-center text-[10px] font-bold text-slate-300">{x}</div>)}</div>
  </div>;
}

const INTERIOR_ITEMS = [
  ["🛋️","Sofa"],["🪑","Chair"],["🛏️","Bed"],["🪟","Window"],["🚪","Door"],["🪴","Plant"],["💡","Lamp"],["🧶","Rug"],["🗄️","Cabinet"],["📺","TV"],["🖼️","Wall Art"],["🪞","Mirror"],["🍽️","Dining Table"],["🧊","Fridge"],["🧺","Storage"],["🛁","Bathtub"],["🚿","Shower"],["🚽","Toilet"],["🧸","Decor"],["👗","Wardrobe"],["🪟","Curtain"],["📚","Bookshelf"],["🧑‍💻","Desk"],["🪵","Coffee Table"]
];
function InteriorPlanner({ project, patchProject }) {
  const [view,setView]=useState("2D"); const [room,setRoom]=useState("Living room"); const [floor,setFloor]=useState("#d8c5a5"); const [wall,setWall]=useState("#f2eee7"); const [grid,setGrid]=useState(true);
  const items=project.sceneItems||[]; const [selected,setSelected]=useState(items[0]?.id||null); const [drag,setDrag]=useState(null);
  const active=items.find(x=>x.id===selected);
  const add=(emoji,label)=>{const n={id:makeId("room"),kind:label,emoji,x:50+(items.length*29)%360,y:50+(items.length*23)%220,rot:0,scale:1,color:"#ffffff"};patchProject({sceneItems:[...items,n]});setSelected(n.id);};
  const update=(id,p)=>patchProject({sceneItems:(project.sceneItems||[]).map(x=>x.id===id?{...x,...p}:x)});
  const preset=(name)=>{setRoom(name);patchProject({sceneItems: name==="Bedroom"?[{id:makeId("r"),kind:"Bed",emoji:"🛏️",x:130,y:130,rot:0,scale:1},{id:makeId("r"),kind:"Wardrobe",emoji:"👗",x:310,y:80,rot:0,scale:1},{id:makeId("r"),kind:"Lamp",emoji:"💡",x:330,y:230,rot:0,scale:1}]:name==="Kitchen"?[{id:makeId("r"),kind:"Fridge",emoji:"🧊",x:70,y:80,rot:0,scale:1},{id:makeId("r"),kind:"Dining Table",emoji:"🍽️",x:210,y:140,rot:0,scale:1},{id:makeId("r"),kind:"Cabinet",emoji:"🗄️",x:330,y:80,rot:0,scale:1}]:[{id:makeId("r"),kind:"Sofa",emoji:"🛋️",x:100,y:160,rot:0,scale:1},{id:makeId("r"),kind:"Coffee Table",emoji:"🪵",x:230,y:200,rot:0,scale:1},{id:makeId("r"),kind:"Plant",emoji:"🪴",x:350,y:80,rot:0,scale:1}]});setSelected(null);};
  return <div className="space-y-4">
    <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-rose-500/15 via-amber-500/10 to-violet-500/10 p-4"><h3 className="text-lg font-black text-white">Home & Fashion Design Lab</h3><p className="mt-1 text-xs text-slate-400">Create a 2D floor plan or switch to an isometric 3D-style room preview. Place, move, rotate and scale furniture.</p></div>
    <div className="flex flex-wrap items-center gap-2"><Pills items={["2D","3D"]} value={view} onPick={setView}/><Pills items={["Living room","Bedroom","Kitchen","Office","Bathroom"]} value={room} onPick={preset}/><label className="ml-auto flex items-center gap-2 text-xs text-slate-300">Floor <input type="color" value={floor} onChange={e=>setFloor(e.target.value)}/></label><label className="flex items-center gap-2 text-xs text-slate-300">Wall <input type="color" value={wall} onChange={e=>setWall(e.target.value)}/></label></div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_270px]">
      <Panel title={`${room} · ${view} planner`} subtitle="Drag items to place them. Select an object to edit its position and size.">
        <div className="mb-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6">{INTERIOR_ITEMS.map(([emoji,label])=><button key={label+emoji} type="button" onClick={()=>add(emoji,label)} className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-center hover:border-violet-400"><span className="block text-xl">{emoji}</span><span className="mt-1 block text-[9px] text-slate-300">{label}</span></button>)}</div>
        <div className="relative mx-auto h-[430px] w-full max-w-[760px] overflow-hidden rounded-xl border border-white/15" style={{background:view==="2D"?wall:`linear-gradient(135deg,${wall},#d5c9bc)`}}>
          {view==="2D"? <div className="absolute inset-4 border-[10px] border-stone-500/40" style={{backgroundColor:floor,backgroundImage:grid?"linear-gradient(rgba(80,70,60,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(80,70,60,.16) 1px,transparent 1px)":"none",backgroundSize:"32px 32px"}}>
            <div className="absolute left-0 top-1/3 h-1/3 w-2 bg-sky-300/80"/><div className="absolute right-0 top-1/3 h-1/3 w-2 bg-sky-300/80"/>
          </div>:<div className="absolute inset-x-[10%] bottom-[8%] top-[12%]" style={{transform:"perspective(900px) rotateX(52deg) rotateZ(-35deg) scale(.85)",transformStyle:"preserve-3d",background:floor,boxShadow:"0 35px 0 #9b8066, 0 45px 30px #0005",border:"10px solid #9b8066"}}>
            <div className="absolute inset-x-0 top-0 h-1/2 origin-top" style={{transform:"rotateX(-90deg)",background:wall,opacity:.9}}/><div className="absolute inset-y-0 right-0 w-1/2 origin-right" style={{transform:"rotateY(90deg)",background:wall,opacity:.75}}/>
          </div>}
          {items.map(it=><button key={it.id} type="button" onPointerDown={e=>{e.currentTarget.setPointerCapture?.(e.pointerId);setSelected(it.id);setDrag(it.id);}} onPointerMove={e=>{if(drag!==it.id)return;const r=e.currentTarget.parentElement.getBoundingClientRect();update(it.id,{x:Math.max(0,Math.min(r.width-40,e.clientX-r.left)),y:Math.max(0,Math.min(r.height-40,e.clientY-r.top))});}} onPointerUp={()=>setDrag(null)} style={{position:"absolute",left:it.x,top:it.y,transform:`translate(-50%,-50%) rotate(${it.rot||0}deg) scale(${it.scale||1})`,fontSize: view==="3D"?34:30,filter:"drop-shadow(0 4px 4px #0005)"}} className={`rounded-lg px-2 py-1 ${selected===it.id?"ring-2 ring-violet-500 bg-white/70":""}`} title={it.kind}>{it.emoji||"📦"}</button>)}
          {!items.length&&<div className="absolute inset-0 grid place-items-center text-center text-xs font-bold text-slate-500">Choose furniture above to start your floor plan</div>}
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={grid} onChange={e=>setGrid(e.target.checked)}/>Show floor grid</label>
      </Panel>
      <Panel title="Object inspector" subtitle="Position, rotation and scale">
        {active?<div className="space-y-3 text-xs"><p className="font-black text-white">{active.emoji} {active.kind}</p><Slider label="X position" value={active.x} min={0} max={700} onChange={v=>update(active.id,{x:v})}/><Slider label="Y position" value={active.y} min={0} max={400} onChange={v=>update(active.id,{y:v})}/><Slider label="Rotation" value={active.rot||0} min={-180} max={180} unit="°" onChange={v=>update(active.id,{rot:v})}/><Slider label="Scale" value={active.scale||1} min={0.5} max={2} step={0.05} unit="×" onChange={v=>update(active.id,{scale:v})}/><button type="button" className="w-full rounded-lg border border-rose-400/30 px-3 py-2 font-bold text-rose-300" onClick={()=>{patchProject({sceneItems:items.filter(x=>x.id!==active.id)});setSelected(null);}}>Remove object</button></div>:<p className="text-xs text-slate-400">Select a furniture item in the room.</p>}
        <div className="mt-4 border-t border-white/10 pt-3 text-[10px] leading-5 text-slate-500">Includes room presets, 24 furniture/decor objects, 2D plan, isometric preview, floor and wall colours, grid, drag placement, rotation, scale, and object removal. 3D view is a visual isometric planner, not a CAD-grade building model.</div>
      </Panel>
    </div>
  </div>;
}


function PdfConversionHub({ notify }) {
  const [busy,setBusy]=useState(""); const [message,setMessage]=useState("");
  const pdfInput=useRef(null); const imageInput=useRef(null); const docInput=useRef(null);
  const [pdfFile,setPdfFile]=useState(null); const [images,setImages]=useState([]);
  const loadPdfJs=async()=>{if(window.pdfjsLib)return window.pdfjsLib;await new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";return window.pdfjsLib;};
  const loadFile=async()=>{if(!pdfFile)throw new Error("Choose a PDF file first.");return new Uint8Array(await pdfFile.arrayBuffer());};
  const run=async(label,fn)=>{setBusy(label);setMessage("");try{await fn();setMessage(`${label} completed.`);}catch(e){setMessage(e.message||`${label} could not be completed.`);}finally{setBusy("");}};
  const jpgToPdf=()=>run("JPG to PDF",async()=>{if(!images.length)throw new Error("Select one or more JPG/PNG images.");const {PDFDocument}=await loadPdfLib();const doc=await PDFDocument.create();for(const f of images){const bytes=new Uint8Array(await f.arrayBuffer());const img=/png/i.test(f.type)?await doc.embedPng(bytes):await doc.embedJpg(bytes);const page=doc.addPage([img.width,img.height]);page.drawImage(img,{x:0,y:0,width:img.width,height:img.height});}fDownload(new Blob([await doc.save()],{type:"application/pdf"}),"images-to-pdf.pdf");});
  const pdfToJpg=()=>run("PDF to JPG",async()=>{const lib=await loadPdfJs(),pdf=await lib.getDocument({data:await loadFile()}).promise;for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n),vp=page.getViewport({scale:1.5}),canvas=document.createElement("canvas");canvas.width=vp.width;canvas.height=vp.height;await page.render({canvasContext:canvas.getContext("2d"),viewport:vp}).promise;const blob=await new Promise(r=>canvas.toBlob(r,"image/jpeg",.92));fDownload(blob,`page-${n}.jpg`);}});
  const extractPdfText=async()=>{const lib=await loadPdfJs(),pdf=await lib.getDocument({data:await loadFile()}).promise,parts=[];for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n),content=await page.getTextContent();parts.push(content.items.map(x=>x.str).join(" "));}return parts;};
  const pdfToWord=()=>run("PDF to Word",async()=>{const pages=await extractPdfText();const html=`<html><meta charset="utf-8"><body>${pages.map((p,i)=>`<h2>Page ${i+1}</h2><p>${p.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}</p>`).join("")}</body></html>`;fDownload(new Blob([html],{type:"application/msword"}),"converted-document.doc");});
  const pdfToExcel=()=>run("PDF to Excel",async()=>{const pages=await extractPdfText();const csv=pages.flatMap((p,i)=>[`Page ${i+1}`,p]).map(x=>`"${String(x).replace(/"/g,'""')}"`).join("\n");fDownload(new Blob([csv],{type:"text/csv;charset=utf-8"}),"pdf-text-export.csv");});
  const pdfToPpt=()=>run("PDF to PowerPoint",async()=>{const pages=await extractPdfText();const pptx=await new Promise((resolve,reject)=>{if(window.pptxgen){resolve(new window.pptxgen());return;}const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js";s.onload=()=>resolve(new window.pptxgen());s.onerror=reject;document.head.appendChild(s);});pptx.layout="LAYOUT_WIDE";pages.forEach((txt,i)=>{const slide=pptx.addSlide();slide.addText(`Page ${i+1}`,{x:.5,y:.3,w:12,h:.5,fontSize:24,bold:true});slide.addText(txt.slice(0,3000),{x:.6,y:1,w:12,h:5.5,fontSize:14,breakLine:false,fit:"shrink"});});await pptx.writeFile({fileName:"pdf-to-powerpoint.pptx"});});
  const printConvert=async(type)=>run(`${type} to PDF`,async()=>{
    const f=docInput.current?.files?.[0];
    if(!f)throw new Error(`Choose a ${type} file first.`);
    const win=window.open("","_blank");
    if(!win)throw new Error("Allow pop-ups for PlotCraft, then retry the conversion.");
    let html="";
    if(type==="HTML"){
      html=await f.text();
    } else if(type==="WORD"){
      if(!/\.docx$/i.test(f.name))throw new Error("Browser conversion supports DOCX. Save legacy DOC files as DOCX first.");
      if(!window.mammoth)await new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js";s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
      const result=await window.mammoth.convertToHtml({arrayBuffer:await f.arrayBuffer()});
      html=`<article class="word">${result.value}</article>`;
    } else if(type==="EXCEL"){
      if(!window.XLSX)await new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
      const wb=window.XLSX.read(await f.arrayBuffer(),{type:"array"});
      html=wb.SheetNames.map(name=>`<h2>${name}</h2>${window.XLSX.utils.sheet_to_html(wb.Sheets[name])}`).join("<div class='pagebreak'></div>");
    } else if(type==="POWERPOINT"){
      if(!window.JSZip)await new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
      const zip=await window.JSZip.loadAsync(await f.arrayBuffer());
      const names=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/i.test(n)).sort((a,b)=>Number(a.match(/slide(\d+)/i)[1])-Number(b.match(/slide(\d+)/i)[1]));
      const slides=[];
      for(const name of names){const xml=await zip.files[name].async("text");const texts=[...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(m=>m[1].replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"'));slides.push(`<section class="slide"><h2>${name.split("/").pop().replace(".xml","")}</h2>${texts.map(t=>`<p>${t}</p>`).join("")}</section>`);}
      html=slides.join("");
    }
    const css=`<style>body{font:14px Arial,sans-serif;color:#172033;margin:28px}h1,h2{color:#312e81}table{border-collapse:collapse;width:100%}td,th{border:1px solid #94a3b8;padding:6px}.slide{min-height:90vh;padding:24px;border:1px solid #ddd;margin-bottom:24px;page-break-after:always}.pagebreak{page-break-after:always}@media print{body{margin:12mm}}</style>`;
    win.document.open();win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${type} to PDF</title>${css}</head><body>${html}</body></html>`);win.document.close();
    setTimeout(()=>{try{win.focus();win.print();}catch{}},600);
    setMessage("A print-ready document opened. Choose “Save as PDF” in the print dialog.");
  });
  const pdfToPdfA=()=>setMessage("PDF/A archival conversion requires a server-side PDF/A engine (such as Ghostscript or veraPDF). This browser-only build does not claim to create a compliant PDF/A file.");
  const ToolBtn=({title,desc,onClick,disabled=false})=><button type="button" disabled={disabled||!!busy} onClick={onClick} className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-violet-400/60 hover:bg-violet-500/10 disabled:opacity-40"><span className="block text-xs font-black text-white">{title}</span><span className="mt-1 block text-[10px] leading-4 text-slate-500">{desc}</span></button>;
  return <Panel title="Document conversion centre" subtitle="Browser-side tools for images and PDF text. Office-to-PDF uses your browser print dialog; some advanced conversions need a server engine.">
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-xl border border-white/10 p-3"><h4 className="mb-2 text-xs font-black text-violet-200">Convert to PDF</h4><input ref={imageInput} type="file" accept="image/jpeg,image/png" multiple className="mb-2 block w-full text-[10px]" onChange={e=>setImages(Array.from(e.target.files||[]))}/><p className="mb-2 text-[10px] text-slate-500">{images.length} images selected</p><div className="grid grid-cols-2 gap-2"><ToolBtn title="JPG / PNG → PDF" desc="Combine selected images into a PDF." onClick={jpgToPdf}/><ToolBtn title="WORD → PDF" desc="Open document, then Print → Save as PDF." onClick={()=>printConvert("WORD")}/><ToolBtn title="POWERPOINT → PDF" desc="Use browser / Office print-to-PDF." onClick={()=>printConvert("POWERPOINT")}/><ToolBtn title="EXCEL → PDF" desc="Print the workbook to PDF." onClick={()=>printConvert("EXCEL")}/><ToolBtn title="HTML → PDF" desc="Open HTML in browser and print to PDF." onClick={()=>printConvert("HTML")}/></div></div>
      <div className="rounded-xl border border-white/10 p-3"><h4 className="mb-2 text-xs font-black text-cyan-200">Convert from PDF</h4><input ref={pdfInput} type="file" accept="application/pdf,.pdf" className="mb-2 block w-full text-[10px]" onChange={e=>setPdfFile(e.target.files?.[0]||null)}/><p className="mb-2 truncate text-[10px] text-slate-500">{pdfFile?.name||"No PDF selected"}</p><div className="grid grid-cols-2 gap-2"><ToolBtn title="PDF → JPG" desc="Render each page as a JPG image." onClick={pdfToJpg}/><ToolBtn title="PDF → WORD" desc="Extract selectable text into an editable DOC file." onClick={pdfToWord}/><ToolBtn title="PDF → POWERPOINT" desc="Create one editable text slide per PDF page." onClick={pdfToPpt}/><ToolBtn title="PDF → EXCEL" desc="Export extracted PDF text as CSV." onClick={pdfToExcel}/><ToolBtn title="PDF → PDF/A" desc="Requires a server-side archival conversion engine." onClick={pdfToPdfA}/></div></div>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2"><input ref={docInput} type="file" accept=".doc,.docx,.ppt,.pptx,.xls,.xlsx,.html,.htm" className="max-w-full text-[10px]"/><span className="text-[10px] text-slate-500">Office / HTML file for print-to-PDF</span></div>
    {busy&&<p className="mt-3 text-xs font-bold text-violet-300">{busy}…</p>}{message&&<p className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-2 text-xs text-slate-300">{message}</p>}
    <p className="mt-3 text-[10px] leading-5 text-slate-500">Notes: PDF→Word/PowerPoint/Excel extracts text and may not preserve the original layout, fonts, tables or charts. PDF/A compliance is not generated in this client-only version. Office print conversion depends on your installed browser / Office handlers.</p>
  </Panel>;
}

function FileEditor({ project, patchProject, notify }) {
  const [file, setFile] = useState(() => (project.fileText != null ? { name: project.fileName || "notes.txt", kind: "text", text: project.fileText, size: project.fileText.length, type: "text/plain" } : null));
  const [drag, setDrag] = useState(false); const input = useRef(null); const vid = useRef(null);
  const open = async (f) => {
    if (!f) return; const kind = fKind(f);
    if (kind === "text") { const text = await f.text(); setFile({ name: f.name, kind, text, size: f.size, type: f.type }); patchProject({ fileText: text, fileName: f.name }); }
    else setFile({ name: f.name, kind, url: URL.createObjectURL(f), size: f.size, type: f.type });
  };
  const setText = (text) => { setFile((p) => ({ ...p, text })); patchProject({ fileText: text, fileName: file.name }); };
  const close = () => { setFile(null); patchProject({ fileText: null, fileName: "" }); };
  const KIND_LABEL = { image: "Image", text: "Text / code", audio: "Audio", video: "Video", pdf: "PDF", other: "File" };
  return (
    <div className="space-y-4 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1122] p-3 text-slate-100 sm:p-4">
      <PdfConversionHub notify={notify} />
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1122]">
      <input ref={input} type="file" className="hidden" onChange={(e) => { open(e.target.files[0]); e.target.value = ""; }} />
      {!file ? (
        <div className="p-4 sm:p-8" onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); open(e.dataTransfer.files[0]); }}>
          <button type="button" onClick={() => input.current?.click()} className={`grid min-h-[320px] w-full place-items-center rounded-2xl border-2 border-dashed text-center transition ${drag ? "border-violet-400 bg-violet-500/10" : "border-white/20 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
            <span><Upload className="mx-auto mb-3 h-9 w-9 text-violet-300" /><span className="block text-base font-black">Drop any file here, or click to browse</span>
              <span className="mx-auto mt-2 block max-w-md text-xs leading-relaxed text-slate-400">Images (crop, resize, filters, text), text, code, JSON, CSV and SVG (find and replace, format, table view), audio (trim, fade, WAV export). Video and PDF open as a preview.</span></span>
          </button>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" className={fBtn} onClick={() => { setFile({ name: "untitled.txt", kind: "text", text: "", size: 0, type: "text/plain" }); }}><FileText className="h-3.5 w-3.5" /> New text file</button>
            <button type="button" className={fBtn} onClick={() => { setFile({ name: "data.json", kind: "text", text: '{\n  "name": "PlotCraft",\n  "items": [1, 2, 3]\n}', size: 0, type: "application/json" }); }}>New JSON</button>
            <button type="button" className={fBtn} onClick={() => { setFile({ name: "table.csv", kind: "text", text: "name,score\nAsha,92\nRavi,88", size: 0, type: "text/csv" }); }}>New CSV</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2"><span className="rounded-md bg-violet-500/20 px-2 py-0.5 text-[10px] font-black text-violet-200">{KIND_LABEL[file.kind]}</span>
              <input value={file.name} onChange={(e) => setFile({ ...file, name: e.target.value })} className="min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs font-bold focus:border-white/20 focus:outline-none" /><span className="text-[10px] text-slate-500">{fSize(file.size || 0)}</span></div>
            <div className="flex gap-2"><button type="button" className={fBtn} onClick={() => input.current?.click()}><Upload className="h-3.5 w-3.5" /> Open another</button><button type="button" className={fBtn} onClick={close}><X className="h-3.5 w-3.5" /> Close</button></div>
          </div>
          {file.kind === "image" && <FileImage file={file} notify={notify} />}
          {file.kind === "text" && <FileTextTool file={file} text={file.text} setText={setText} notify={notify} />}
          {file.kind === "audio" && <FileAudioTool file={file} notify={notify} />}
          {file.kind === "video" && (<div className="space-y-3 p-4"><video ref={vid} src={file.url} controls className="max-h-[480px] w-full rounded-xl bg-black" />
            <div className="flex flex-wrap gap-2"><button type="button" className={fBtn} onClick={() => { const v = vid.current; const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext("2d").drawImage(v, 0, 0); fDownload(c.toDataURL("image/png"), "frame.png"); }}><Camera className="h-3.5 w-3.5" /> Save current frame</button>
              <span className="self-center text-[11px] text-slate-400">To cut, merge and add graphics, import this video in the Video &amp; VFX studio.</span></div></div>)}
          {file.kind === "pdf" && <iframe title="PDF preview" src={file.url} className="h-[640px] w-full bg-white" />}
          {file.kind === "other" && (<div className="p-8 text-center text-xs text-slate-400"><p className="text-sm font-black text-slate-200">{file.name}</p><p className="mt-1">{file.type || "Unknown type"} · {fSize(file.size)}. This format cannot be edited in the browser.</p><button type="button" className={`${fBtn} mt-4`} onClick={() => fDownload(file.url, file.name)}><Download className="h-3.5 w-3.5" /> Download</button></div>)}
        </>
      )}
      </div>
    </div>
  );
}

const CATEGORIES = [
  {
    id: "art",
    title: "Art & Drawing",
    subtitle: "Layers, brush, fill & undo/redo",
    detail: "Multi-layer 2D canvas with brush, eraser, flood fill, shapes, undo/redo & PNG export.",
    accent: "from-pink-500/20 to-rose-500/10 border-pink-400/30 text-pink-300",
    Icon: Palette,
    tools: ["Layers", "Undo/Redo", "Flood Fill", "Shapes", "PNG"],
  },
  {
    id: "model",
    title: "2D & 3D Character / CAD",
    subtitle: "2D & 3D generator + CAD grid",
    detail: "Generate 2D characters & 3D models/characters, rotate in 3D space, drag parts & export PNG.",
    accent: "from-violet-500/20 to-indigo-500/10 border-violet-400/30 text-violet-300",
    Icon: Box,
    tools: ["2D Gen", "3D Gen", "3D Rotate", "CAD Parts", "PNG Export"],
  },
  {
    id: "animation",
    title: "Animation Studio",
    subtitle: "Animate your own photos, layers & keyframes",
    detail: "Import your own pictures, position and scale layers, animate with keyframes, easing, onion-skin, motion paths and export WebM.",
    accent: "from-fuchsia-500/20 to-purple-500/10 border-fuchsia-400/30 text-fuchsia-300",
    Icon: Clapperboard,
    tools: ["Photo Import", "Keyframes", "Easing", "Onion Skin", "WebM"],
  },
  {
    id: "video",
    title: "Video & VFX",
    subtitle: "Multitrack timeline, VFX & render profiles",
    detail: "Undo/redo, merge clips and songs, trim, transitions, motion graphics, 20+ filters, 15+ effects, colour controls, speed ramps and render presets.",
    accent: "from-sky-500/20 to-cyan-500/10 border-sky-400/30 text-sky-300",
    Icon: Film,
    tools: ["Undo/Redo", "Multi-clip", "Transitions", "20+ Filters", "VFX", "Render"],
  },
  {
    id: "graphic",
    title: "Graphic Design",
    subtitle: "24 ready-to-edit visual styles",
    detail: "Create posters, thumbnails, brand boards and social creatives with 24 starter styles, editable layers, uploaded images, typography, shapes and SVG/PNG export.",
    accent: "from-amber-500/20 to-orange-500/10 border-amber-400/30 text-amber-300",
    Icon: PenTool,
    tools: ["24 Styles", "Posters", "Thumbnails", "Brand Assets", "SVG / PNG"],
  },
  {
    id: "diy",
    title: "DIY & Handmade",
    subtitle: "Maker lab with project templates",
    detail: "Choose from 12 craft ideas, customise materials, difficulty, pattern size, editable instructions and export project guides.",
    accent: "from-emerald-500/20 to-teal-500/10 border-emerald-400/30 text-emerald-300",
    Icon: Scissors,
    tools: ["12 Templates", "Material Planner", "Pattern Grid", "Steps", "Guide Export"],
  },
  {
    id: "music",
    title: "Music & Audio Editor",
    subtitle: "Import, trim, arrange & mix songs",
    detail: "Import multiple local songs, sequence or overlap tracks, trim in/out, fade, pan, solo, mute, control gain and export a mixed WAV.",
    accent: "from-indigo-500/20 to-blue-500/10 border-indigo-400/30 text-indigo-300",
    Icon: Music2,
    tools: ["Multi-import", "Trim", "Fade", "Pan", "Solo / Mute", "WAV Mix"],
  },
  {
    id: "writing",
    title: "Writing & Stories",
    subtitle: "Scene & comic panel blocks",
    detail: "Write stories, comic scripts or screenplays in editable blocks with word count & TXT export.",
    accent: "from-cyan-500/20 to-sky-500/10 border-cyan-400/30 text-cyan-300",
    Icon: BookOpen,
    tools: ["Scenes & Panels", "Modes", "Word Count", "TXT Export"],
  },
  {
    id: "design",
    title: "Fashion & Interior",
    subtitle: "2D floor plans + isometric 3D view",
    detail: "Design living rooms, bedrooms, kitchens, offices and bathrooms; place 24 furniture objects, change materials and adjust positions, rotation and scale.",
    accent: "from-rose-500/20 to-amber-500/10 border-rose-400/30 text-rose-300",
    Icon: Sofa,
    tools: ["2D Floor Plan", "3D Preview", "24 Objects", "Room Presets", "Furniture Inspector"],
  },
  {
    id: "learn",
    title: "Learning & Experiments",
    subtitle: "Live wave, polygon & RGB lab",
    detail: "Explore animated sine waves, rotating polygons & RGB light mixing with live controls.",
    accent: "from-teal-500/20 to-emerald-500/10 border-teal-400/30 text-teal-300",
    Icon: FlaskConical,
    tools: ["Live Wave", "Polygons", "RGB Mixer", "Parameters"],
  },
  {
    id: "files",
    title: "Files Editor",
    subtitle: "Edit files + convert PDF formats",
    detail: "Edit images, text, code, JSON, CSV, audio and preview video/PDF. Convert JPG to PDF, PDF pages to JPG and extract PDF text to editable formats.",
    accent: "from-sky-500/20 to-indigo-500/10 border-sky-400/30 text-sky-300",
    Icon: FileText,
    tools: ["Image / Text", "Audio / Video", "JPG ↔ PDF", "PDF → Word", "PDF → PPT", "PDF → CSV"],
  },
];

const VIDEO_FILTERS = {
  none: "none",
  cinematic: "contrast(1.18) saturate(1.25) brightness(0.96)",
  vivid: "saturate(1.75) contrast(1.12)",
  noir: "grayscale(1) contrast(1.3)",
  warm: "sepia(0.45) saturate(1.3)",
  cool: "hue-rotate(180deg) saturate(1.2)",
};

const ACCENTS = {
  world: { a: "#d8a4f0", a2: "#f9a8d4" }, standard: ["#7c3aed", "#d946ef"], rgbclr: ["#d946ef", "#22d3ee"], cyberpunk: ["#06b6d4", "#f43f5e"], emerald: ["#059669", "#14b8a6"], sunset: ["#ea580c", "#f59e0b"], party: ["#db2777", "#8b5cf6"], rainy: ["#0284c7", "#6366f1"], dream: ["#8b5cf6", "#22d3ee"] };
const BASE_DARK = { bg: "#080d1a", surface: "#0e1528", surface2: "#10172b" };
const BASE_LIGHT = { bg: "#f4f6fb", surface: "#ffffff", surface2: "#eef1f8" };
const PRO_THEMES = {
  auto: { label: "Match dashboard" },
  spectrum: { label: "Spectrum Dark", light: false, bg: "#1b1b1d", surface: "#2a2a2d", surface2: "#303034", a: "#4b9bff", a2: "#7c5cff" },
  midnight: { label: "Midnight Violet", light: false, ...BASE_DARK, a: "#7c3aed", a2: "#d946ef" },
  kine: { label: "Kine Red", light: false, bg: "#101010", surface: "#1a1a1c", surface2: "#222225", a: "#ef4444", a2: "#f97316" },
  forest: { label: "Forest", light: false, bg: "#06120e", surface: "#0c1d16", surface2: "#10261d", a: "#10b981", a2: "#22d3ee" },
  ember: { label: "Ember", light: false, bg: "#140b0a", surface: "#201210", surface2: "#2a1815", a: "#f97316", a2: "#ec4899" },
  paper: { label: "Studio Light", light: true, bg: "#f3f4f6", surface: "#ffffff", surface2: "#eceef2", a: "#1473e6", a2: "#6d28d9" },
  blush: { label: "Soft Pink Light", light: true, bg: "#fdf2f8", surface: "#ffffff", surface2: "#fce7f3", a: "#db2777", a2: "#8b5cf6" },
};

const THEME_CSS = `
/* PlotCraft AI theme engine: surfaces and accent come from CSS variables set on .pcp-root */
.pcp-root{--a:#7c3aed;--a2:#d946ef;--pcp-bg:#080d1a;--pcp-surface:#0e1528;--pcp-surface2:#10172b}
.pcp-root .bg-\[\#080d1a\],.pcp-root .bg-\[\#070b17\],.pcp-root .bg-\[\#070d1b\],.pcp-root .bg-\[\#070c18\],.pcp-root .bg-\[\#060c19\]{background-color:var(--pcp-bg)!important}
.pcp-root .bg-\[\#0b1122\],.pcp-root .bg-\[\#0e1528\]{background-color:var(--pcp-surface)!important}
.pcp-root .bg-\[\#10172b\]\/95,.pcp-root .bg-slate-950,.pcp-root .bg-slate-900{background-color:var(--pcp-surface2)!important}
.pcp-root .bg-\[\#070b17\]\/85{background-color:color-mix(in srgb,var(--pcp-bg) 88%,transparent)!important}
.pcp-root [class~="bg-violet-600"],.pcp-root [class~="bg-violet-500"]{background-color:var(--a)!important}
.pcp-root [class*="bg-violet-500/"],.pcp-root [class*="bg-violet-600/"]{background-color:color-mix(in srgb,var(--a) 18%,transparent)!important}
.pcp-root [class*="border-violet-"]{border-color:color-mix(in srgb,var(--a) 55%,transparent)!important}
.pcp-root [class*="text-violet-"]{color:color-mix(in srgb,var(--a) 65%,white)!important}
.pcp-root [class*="accent-violet"]{accent-color:var(--a)}
.pcp-root [class~="from-violet-600"]{--tw-gradient-from:var(--a)!important;--tw-gradient-to:var(--a2)!important;--tw-gradient-stops:var(--a),var(--a2)!important}
.pcp-root [class~="to-fuchsia-600"]{--tw-gradient-to:var(--a2)!important}
.pcp-light{--pcp-ink:#0f172a;--pcp-ink2:#334155;--pcp-mute:#64748b;--pcp-line:rgba(15,23,42,.13);--pcp-tint:rgba(15,23,42,.045);color:var(--pcp-ink)}
.pcp-light .bg-slate-800,.pcp-light .bg-slate-900\/90,.pcp-light .bg-slate-950\/60{background-color:var(--pcp-surface2)!important}
.pcp-light .bg-black\/25,.pcp-light .bg-black\/60,.pcp-light .bg-black\/65{background-color:var(--pcp-tint)!important}
.pcp-light [class*="bg-white/"]{background-color:var(--pcp-tint)!important}
.pcp-light [class*="border-white/"]{border-color:var(--pcp-line)!important}
.pcp-light [class*="divide-white/"]>*+*{border-color:var(--pcp-line)!important}
.pcp-light .text-white,.pcp-light .text-slate-100,.pcp-light .text-slate-200{color:var(--pcp-ink)}
.pcp-light .text-slate-300{color:var(--pcp-ink2)}
.pcp-light .text-slate-400,.pcp-light .text-slate-500{color:var(--pcp-mute)}
.pcp-light [class*="text-violet-"]{color:color-mix(in srgb,var(--a) 85%,black)!important}
.pcp-light .shadow-xl,.pcp-light .shadow-2xl{box-shadow:0 12px 30px -12px rgba(15,23,42,.25)!important}
.pcp-light [class*="-600"].text-white,.pcp-light [class*="-500"].text-white,.pcp-light [class*="bg-gradient"].text-white,.pcp-light [class~="from-violet-600"] .text-white,.pcp-light [class~="from-violet-600"].text-white{color:#fff}
.pcp-light .bg-white.text-slate-900{background-color:#0f172a!important;color:#fff!important}
.pcp-light .bg-white.text-slate-900:hover{background-color:#1e293b!important}
.pcp-light textarea,.pcp-light input[type="text"],.pcp-light input[type="number"],.pcp-light select{color:var(--pcp-ink)}
/* Dashboard theme bridge: every studio panel follows the selected PlotCraft theme. */
.pcp-root[data-theme="world"]{--pcp-bg:#fbf7ff;--pcp-surface:#fff;--pcp-surface2:#f3eaff;--a:#a855d8;--a2:#ec8fca;color:#39264f}
.pcp-root[data-theme="standard"]{--pcp-bg:#f4f6fb;--pcp-surface:#fff;--pcp-surface2:#eef2f7;--a:#6d28d9;--a2:#db2777;color:#172033}
.pcp-root[data-theme="emerald"]{--pcp-bg:#ecfdf5;--pcp-surface:#fff;--pcp-surface2:#ddf5e9;--a:#059669;--a2:#0f766e;color:#064e3b}
.pcp-root[data-theme="sunset"]{--pcp-bg:#fff7ed;--pcp-surface:#fff;--pcp-surface2:#ffedd5;--a:#ea580c;--a2:#db2777;color:#7c2d12}
.pcp-root[data-theme="party"]{--pcp-bg:#fff1f8;--pcp-surface:#fff;--pcp-surface2:#fae8ff;--a:#db2777;--a2:#9333ea;color:#701a50}
.pcp-root[data-theme="rainy"]{--pcp-bg:#eff8ff;--pcp-surface:#fff;--pcp-surface2:#e0f2fe;--a:#0284c7;--a2:#6366f1;color:#0c3e5d}
.pcp-root[data-theme="rgbclr"],.pcp-root[data-theme="cyberpunk"],.pcp-root[data-theme="dream"]{--pcp-bg:#080d1a;--pcp-surface:#111a2d;--pcp-surface2:#17243b}
.pcp-root[data-theme="world"] .bg-\[\#080d1a\],.pcp-root[data-theme="standard"] .bg-\[\#080d1a\],.pcp-root[data-theme="emerald"] .bg-\[\#080d1a\],.pcp-root[data-theme="sunset"] .bg-\[\#080d1a\],.pcp-root[data-theme="party"] .bg-\[\#080d1a\],.pcp-root[data-theme="rainy"] .bg-\[\#080d1a\]{background:var(--pcp-bg)!important}
.pcp-root[data-theme="world"] .bg-\[\#0e1528\],.pcp-root[data-theme="standard"] .bg-\[\#0e1528\],.pcp-root[data-theme="emerald"] .bg-\[\#0e1528\],.pcp-root[data-theme="sunset"] .bg-\[\#0e1528\],.pcp-root[data-theme="party"] .bg-\[\#0e1528\],.pcp-root[data-theme="rainy"] .bg-\[\#0e1528\]{background:var(--pcp-surface)!important}
.pcp-root[data-theme="world"] .bg-\[\#0b1122\],.pcp-root[data-theme="standard"] .bg-\[\#0b1122\],.pcp-root[data-theme="emerald"] .bg-\[\#0b1122\],.pcp-root[data-theme="sunset"] .bg-\[\#0b1122\],.pcp-root[data-theme="party"] .bg-\[\#0b1122\],.pcp-root[data-theme="rainy"] .bg-\[\#0b1122\]{background:var(--pcp-surface)!important}
.pcp-root[data-theme="world"] .text-slate-100,.pcp-root[data-theme="world"] .text-slate-200,.pcp-root[data-theme="standard"] .text-slate-100,.pcp-root[data-theme="standard"] .text-slate-200,.pcp-root[data-theme="emerald"] .text-slate-100,.pcp-root[data-theme="emerald"] .text-slate-200,.pcp-root[data-theme="sunset"] .text-slate-100,.pcp-root[data-theme="sunset"] .text-slate-200,.pcp-root[data-theme="party"] .text-slate-100,.pcp-root[data-theme="party"] .text-slate-200,.pcp-root[data-theme="rainy"] .text-slate-100,.pcp-root[data-theme="rainy"] .text-slate-200{color:inherit!important}
.pcp-root[data-theme="world"] .text-slate-300,.pcp-root[data-theme="standard"] .text-slate-300,.pcp-root[data-theme="emerald"] .text-slate-300,.pcp-root[data-theme="sunset"] .text-slate-300,.pcp-root[data-theme="party"] .text-slate-300,.pcp-root[data-theme="rainy"] .text-slate-300{color:color-mix(in srgb,currentColor 78%,#64748b)!important}
.pcp-root[data-theme="world"] [class*="border-white/"],.pcp-root[data-theme="standard"] [class*="border-white/"],.pcp-root[data-theme="emerald"] [class*="border-white/"],.pcp-root[data-theme="sunset"] [class*="border-white/"],.pcp-root[data-theme="party"] [class*="border-white/"],.pcp-root[data-theme="rainy"] [class*="border-white/"]{border-color:rgba(71,85,105,.18)!important}
.pcp-root button,.pcp-root input,.pcp-root select,.pcp-root textarea{transition:background-color .2s ease,border-color .2s ease,color .2s ease,box-shadow .2s ease}
.pcp-root button:focus-visible,.pcp-root input:focus-visible,.pcp-root select:focus-visible,.pcp-root textarea:focus-visible{outline:2px solid var(--a);outline-offset:2px}

/* PlotCraft Glass Studio system — applied consistently to every studio and tool. */
.pcp-root{
  --pcp-ink:#172033;--pcp-ink2:#475569;--pcp-mute:#64748b;
  --pcp-glass:rgba(255,255,255,.66);--pcp-glass-strong:rgba(255,255,255,.82);
  --pcp-glass-line:rgba(255,255,255,.72);--pcp-glass-shadow:0 18px 50px rgba(31,41,55,.10);
  color:var(--pcp-ink);
  background:
    radial-gradient(ellipse at 8% 0%,color-mix(in srgb,var(--a) 13%,transparent),transparent 38%),
    radial-gradient(ellipse at 100% 100%,color-mix(in srgb,var(--a2) 12%,transparent),transparent 42%),
    var(--pcp-bg);
  transition:background .35s ease,color .25s ease;
}
.pcp-root.pcp-dark{--pcp-ink:#f1f5f9;--pcp-ink2:#cbd5e1;--pcp-mute:#94a3b8;--pcp-glass:rgba(255,255,255,.055);--pcp-glass-strong:rgba(255,255,255,.085);--pcp-glass-line:rgba(255,255,255,.12);--pcp-glass-shadow:0 18px 50px rgba(0,0,0,.22)}
.pcp-root.pcp-light{--pcp-ink:#172033;--pcp-ink2:#334155;--pcp-mute:#64748b;--pcp-glass:rgba(255,255,255,.68);--pcp-glass-strong:rgba(255,255,255,.88);--pcp-glass-line:rgba(255,255,255,.9);--pcp-glass-shadow:0 18px 48px rgba(36,48,72,.10)}
.pcp-root :is(section,aside,header,.rounded-2xl,.rounded-3xl).border{
  border-color:var(--pcp-glass-line)!important;
}
.pcp-root section.rounded-2xl.border,
.pcp-root aside.border-l,
.pcp-root header.border-b{
  background:var(--pcp-glass)!important;
  -webkit-backdrop-filter:blur(18px) saturate(145%);
  backdrop-filter:blur(18px) saturate(145%);
  box-shadow:var(--pcp-glass-shadow);
}
.pcp-root .bg-\\[\\#10172b\\]\\/95,
.pcp-root .bg-\\[\\#0e1528\\],
.pcp-root .bg-\\[\\#0b1122\\],
.pcp-root .bg-slate-950,
.pcp-root .bg-slate-900,
.pcp-root .bg-slate-800{
  background:var(--pcp-glass)!important;
  -webkit-backdrop-filter:blur(18px) saturate(145%);
  backdrop-filter:blur(18px) saturate(145%);
}
.pcp-root.pcp-light :is(.text-white,.text-slate-100,.text-slate-200,.text-slate-300){color:var(--pcp-ink)!important}
.pcp-root.pcp-light :is(.text-slate-400,.text-slate-500,.text-slate-600){color:var(--pcp-mute)!important}
.pcp-root.pcp-dark :is(.text-slate-300,.text-slate-400,.text-slate-500){color:var(--pcp-ink2)!important}
.pcp-root.pcp-light :is(button.bg-violet-600,button.bg-violet-500,[class~="bg-violet-600"],[class~="bg-violet-500"]).text-white,
.pcp-root.pcp-light button[class*="from-"].text-white{color:#fff!important}
.pcp-root.pcp-light input:not([type="range"]),.pcp-root.pcp-light textarea,.pcp-root.pcp-light select{
  color:#172033!important;background:rgba(255,255,255,.82)!important;border-color:rgba(100,116,139,.25)!important;
}
.pcp-root.pcp-dark input:not([type="range"]),.pcp-root.pcp-dark textarea,.pcp-root.pcp-dark select{
  color:#f8fafc!important;background:rgba(10,16,30,.62)!important;border-color:rgba(255,255,255,.14)!important;
}
.pcp-root :is(input,textarea,select){border-radius:12px;transition:all .22s cubic-bezier(.2,.8,.2,1)}
.pcp-root :is(input,textarea,select):focus{box-shadow:0 0 0 4px color-mix(in srgb,var(--a) 16%,transparent);border-color:var(--a)!important}
.pcp-root button{
  border-radius:12px;transition:transform .22s cubic-bezier(.2,.8,.2,1),background .22s ease,border-color .22s ease,box-shadow .22s ease,color .22s ease;
}
.pcp-root button:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 8px 22px color-mix(in srgb,var(--a) 16%,transparent)}
.pcp-root button:not(:disabled):active{transform:translateY(0) scale(.975)}
.pcp-root .shadow-lg,.pcp-root .shadow-xl,.pcp-root .shadow-2xl{box-shadow:var(--pcp-glass-shadow)!important}
.pcp-root .bg-white\\/\\[0\\.03\\],.pcp-root .bg-white\\/\\[0\\.04\\],.pcp-root .bg-white\\/\\[0\\.05\\]{
  background:var(--pcp-glass)!important;backdrop-filter:blur(14px);
}
.pcp-root [class*="border-white/"]{border-color:var(--pcp-glass-line)!important}
.pcp-root .pcp-studio-enter{animation:pcpStudioEnter .42s cubic-bezier(.2,.8,.2,1) both}
@keyframes pcpStudioEnter{from{opacity:0;transform:translateY(9px) scale(.995);filter:blur(3px)}to{opacity:1;transform:translateY(0) scale(1);filter:blur(0)}}
@media(prefers-reduced-motion:reduce){.pcp-root *, .pcp-root *::before,.pcp-root *::after{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
/* Fashion & Interior board: remove fixed amber styling and use the active glass theme. */
.pcp-root .pcp-fashion-board{background:linear-gradient(135deg,color-mix(in srgb,var(--a) 12%,var(--pcp-surface)),color-mix(in srgb,var(--a2) 9%,var(--pcp-surface)))!important;border:1px solid var(--pcp-glass-line)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.45),var(--pcp-glass-shadow)}
.pcp-root .pcp-fashion-item{background:var(--pcp-glass-strong)!important;color:var(--pcp-ink)!important;border-color:color-mix(in srgb,var(--a) 26%,transparent)!important;backdrop-filter:blur(14px);box-shadow:0 8px 22px rgba(15,23,42,.12)!important}
.pcp-root .pcp-fashion-inspector{color:var(--pcp-ink)!important}
.pcp-root .pcp-fashion-inspector label{color:var(--pcp-ink2)!important}
.pcp-root .pcp-fashion-empty{color:var(--pcp-mute)!important}
`;

function ThemePicker() { return null; }
function LegacyThemePicker({ value, onChange }) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold">
      <Palette className="h-3.5 w-3.5" />
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Pro theme" className="bg-transparent text-[11px] font-bold outline-none">
        {Object.entries(PRO_THEMES).map(([k, v]) => <option key={k} value={k} className="text-slate-900">{v.label}</option>)}
      </select>
    </label>
  );
}

const DB_NAME = "plotcraft_pro_2d3d_gen_v1";
const STORE = "projects";

const makeId = (prefix = "pc") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const defaultLayers = () => [
  { id: "l_base", name: "Base Layer", visible: true, data: "" },
  { id: "l_sketch", name: "Sketch Layer", visible: true, data: "" },
];

// Procedural 2D Character Generator (returns full structured character spec)
function build2DCharacterSpec({
  promptText = "",
  archetype = "hero",
  expression = "smile",
  outfitColor = "#7c3aed",
  skinColor = "#fbbf24",
  hairColor = "#1e293b",
  accessory = "cape",
}) {
  const lower = (promptText || "").toLowerCase();
  let resolvedArchetype = archetype;
  let resolvedOutfit = outfitColor;
  let resolvedAccessory = accessory;

  if (lower.includes("robot") || lower.includes("cyborg") || lower.includes("mech")) {
    resolvedArchetype = "robot";
    resolvedOutfit = "#0284c7";
    resolvedAccessory = "visor";
  } else if (lower.includes("mage") || lower.includes("wizard") || lower.includes("witch")) {
    resolvedArchetype = "mage";
    resolvedOutfit = "#6d28d9";
    resolvedAccessory = "hat";
  } else if (lower.includes("knight") || lower.includes("armor") || lower.includes("warrior")) {
    resolvedArchetype = "knight";
    resolvedOutfit = "#475569";
    resolvedAccessory = "shield";
  }

  return {
    id: makeId("char2d"),
    prompt: promptText.trim() || `${resolvedArchetype.toUpperCase()} 2D Character`,
    archetype: resolvedArchetype,
    expression,
    outfitColor: resolvedOutfit,
    skinColor,
    hairColor,
    accessory: resolvedAccessory,
  };
}

// Procedural 3D Model / 3D Character Generator
function build3DModelSpec({
  promptText = "",
  modelType = "character3d",
  primaryColor = "#8b5cf6",
  accentColor = "#06b6d4",
  depth = 46,
}) {
  const lower = (promptText || "").toLowerCase();
  let resolvedType = modelType;
  let resolvedPrimary = primaryColor;
  let resolvedAccent = accentColor;

  if (lower.includes("mech") || lower.includes("bot") || lower.includes("droid")) {
    resolvedType = "mech3d";
    resolvedPrimary = "#6366f1";
    resolvedAccent = "#38bdf8";
  } else if (lower.includes("tower") || lower.includes("building") || lower.includes("cad")) {
    resolvedType = "tower3d";
    resolvedPrimary = "#7c3aed";
    resolvedAccent = "#f59e0b";
  } else if (lower.includes("core") || lower.includes("cube") || lower.includes("crystal")) {
    resolvedType = "core3d";
    resolvedPrimary = "#ec4899";
    resolvedAccent = "#a855f7";
  }

  return {
    id: makeId("m3d"),
    prompt: promptText.trim() || `${resolvedType.toUpperCase()} 3D Model`,
    modelType: resolvedType,
    primaryColor: resolvedPrimary,
    accentColor: resolvedAccent,
    depth: Number(depth) || 46,
  };
}

const defaultCadParts = () => [
  {
    id: makeId("part"),
    name: "Character Face",
    kind: "face",
    x: 210,
    y: 76,
    w: 88,
    h: 88,
    rot: 0,
    scale: 1,
    color: "#fbbf24",
  },
  {
    id: makeId("part"),
    name: "Torso Frame",
    kind: "torso",
    x: 205,
    y: 170,
    w: 98,
    h: 112,
    rot: 0,
    scale: 1,
    color: "#7c3aed",
  },
  {
    id: makeId("part"),
    name: "CAD Gear",
    kind: "gear",
    x: 380,
    y: 120,
    w: 86,
    h: 86,
    rot: 0,
    scale: 1,
    color: "#38bdf8",
  },
];

const defaultGraphicElements = () => [
  {
    id: makeId("el"),
    type: "badge",
    text: "PRO STUDIO",
    x: 64,
    y: 44,
    w: 140,
    h: 34,
    bg: "#7c3aed",
    fg: "#ffffff",
    fontSize: 12,
  },
  {
    id: makeId("el"),
    type: "text",
    text: "PLOTCRAFT DESIGN",
    x: 64,
    y: 98,
    w: 360,
    h: 52,
    bg: "transparent",
    fg: "#ffffff",
    fontSize: 28,
  },
];

const defaultAudioClips = () => [
  {
    id: makeId("aud"),
    name: "Bass Pulse",
    start: 0,
    duration: 4,
    freq: 130.81,
    wave: "sine",
    color: "#8b5cf6",
    muted: false,
  },
  {
    id: makeId("aud"),
    name: "Lead Melody",
    start: 2,
    duration: 6,
    freq: 440,
    wave: "triangle",
    color: "#06b6d4",
    muted: false,
  },
];

const freshProject = (category = "model") => {
  const meta = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
  return {
    id: makeId("proj"),
    title: `${meta.title} Project`,
    category,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    content: "",
    layers: defaultLayers(),
    activeLayerId: "l_base",
    cadParts: defaultCadParts(),
    char2D: build2DCharacterSpec({ promptText: "Cyber Hero with Cape" }),
    model3D: build3DModelSpec({ promptText: "3D Stylized Character" }),
    graphicElements: defaultGraphicElements(),
    videoClips: [],
    videoOverlays: [],
    audioClips: defaultAudioClips(),
    sceneItems: [],
    writingBlocks: [
      { id: makeId("blk"), title: "Scene 1", text: "Start writing your scene here..." },
    ],
    settings: {
      color: "#8b5cf6",
      brushSize: 6,
      canvasBg: "#ffffff",
      cadGridSnap: 10,
      cadShowDimensions: true,
      rot3DX: -16,
      rot3DY: 28,
      rot3DZ: 0,
      keyframes: [
        { id: makeId("kf"), frame: 0, x: -120, rot: 0, scale: 1 },
        { id: makeId("kf"), frame: 50, x: 0, rot: 180, scale: 1.2 },
        { id: makeId("kf"), frame: 100, x: 120, rot: 360, scale: 1 },
      ],
      videoFilter: "none",
      videoSpeed: 1,
      videoScale: 1,
      videoVolume: 0.8,
      videoMuted: false,
      diyCells: Array.from({ length: 16 }, (_, i) => ({
        id: i,
        mode: i % 5 === 0 ? "cut" : i % 3 === 0 ? "fold" : "none",
      })),
      beat: Array(16).fill(false),
      bpm: 120,
      waveType: "triangle",
      synthGain: 0.16,
      writingMode: "Story",
      experimentMode: "wave",
      experiment: 50,
      geometrySides: 6,
    },
  };
};

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB unavailable"));
    }
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Storage open failed"));
  });
}

async function listProjects() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      db.close();
      resolve((req.result || []).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

async function saveProjectToDB(proj) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(proj);
    tx.oncomplete = () => {
      db.close();
      resolve(proj);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("Save failed"));
    };
  });
}

async function deleteProjectFromDB(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

// Detailed 2D Character SVG Artwork
function Character2DArtwork({ spec }) {
  const c = spec || build2DCharacterSpec({});
  const mouthPath =
    c.expression === "happy"
      ? "M 122 104 Q 140 128 158 104"
      : c.expression === "determined"
      ? "M 126 110 L 154 110"
      : "M 125 106 Q 140 120 155 106";

  return (
    <svg viewBox="0 0 280 320" className="h-full w-full select-none">
      <defs>
        <radialGradient id="charAura" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={c.outfitColor} stopOpacity="0.35" />
          <stop offset="100%" stopColor="#090f20" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="140" cy="160" r="120" fill="url(#charAura)" />

      {/* Back Cape or Shield */}
      {c.accessory === "cape" && (
        <path
          d="M 92 136 L 62 252 L 140 236 L 218 252 L 188 136 Z"
          fill={c.outfitColor}
          opacity="0.72"
        />
      )}

      {/* Legs */}
      <rect x="108" y="218" width="24" height="72" rx="11" fill="#1e293b" />
      <rect x="148" y="218" width="24" height="72" rx="11" fill="#1e293b" />
      <rect x="103" y="274" width="34" height="16" rx="7" fill={c.outfitColor} />
      <rect x="143" y="274" width="34" height="16" rx="7" fill={c.outfitColor} />

      {/* Arms */}
      <path
        d="M 94 144 L 62 194"
        stroke={c.archetype === "robot" ? "#94a3b8" : c.skinColor}
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M 186 144 L 218 194"
        stroke={c.archetype === "robot" ? "#94a3b8" : c.skinColor}
        strokeWidth="18"
        strokeLinecap="round"
      />

      {/* Torso / Armor */}
      <rect
        x="96"
        y="134"
        width="88"
        height="92"
        rx="22"
        fill={c.outfitColor}
        stroke="#e2e8f0"
        strokeWidth="2"
      />
      {/* Chest Emblem */}
      <polygon
        points="140,152 156,174 140,196 124,174"
        fill="#f8fafc"
        opacity="0.9"
      />

      {/* Shield accessory */}
      {c.accessory === "shield" && (
        <path
          d="M 206 168 L 242 168 L 242 204 Q 224 226 206 204 Z"
          fill="#38bdf8"
          stroke="#ffffff"
          strokeWidth="2.5"
        />
      )}

      {/* Head */}
      <circle
        cx="140"
        cy="88"
        r="42"
        fill={c.archetype === "robot" ? "#cbd5e1" : c.skinColor}
        stroke="#0f172a"
        strokeWidth="3"
      />

      {/* Visor or Eyes */}
      {c.accessory === "visor" ? (
        <rect
          x="106"
          y="74"
          width="68"
          height="18"
          rx="8"
          fill="#06b6d4"
          stroke="#0f172a"
          strokeWidth="2"
        />
      ) : (
        <>
          <circle cx="124" cy="84" r="6" fill="#0f172a" />
          <circle cx="156" cy="84" r="6" fill="#0f172a" />
          <circle cx="126" cy="82" r="2" fill="#ffffff" />
          <circle cx="158" cy="82" r="2" fill="#ffffff" />
        </>
      )}

      {/* Mouth */}
      <path
        d={mouthPath}
        fill="none"
        stroke="#0f172a"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Hair or Mage Hat */}
      {c.accessory === "hat" ? (
        <>
          <polygon
            points="140,8 92,58 188,58"
            fill={c.hairColor}
            stroke="#0f172a"
            strokeWidth="2.5"
          />
          <ellipse cx="140" cy="58" rx="58" ry="11" fill={c.hairColor} />
        </>
      ) : (
        <path
          d="M 98 76 Q 112 34 142 38 Q 174 34 182 76 Q 162 56 140 58 Q 118 56 98 76 Z"
          fill={c.hairColor}
        />
      )}
    </svg>
  );
}

// 3D Isometric / Perspective Model Artwork
function Model3DArtwork({ spec, rotX = -16, rotY = 28, rotZ = 0 }) {
  const m = spec || build3DModelSpec({});
  const radY = (rotY * Math.PI) / 180;
  const radX = (rotX * Math.PI) / 180;
  const shiftX = Math.sin(radY) * (m.depth * 0.45);
  const shiftY = -Math.sin(radX) * (m.depth * 0.45);

  return (
    <svg viewBox="0 0 320 300" className="h-full w-full select-none">
      <defs>
        <linearGradient id="m3dTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={m.accentColor} />
          <stop offset="100%" stopColor={m.primaryColor} />
        </linearGradient>
        <linearGradient id="m3dFront" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={m.primaryColor} />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>
      </defs>

      {/* Floor shadow */}
      <ellipse cx="160" cy="256" rx="84" ry="20" fill="rgba(0,0,0,0.45)" />

      <g transform={`translate(160, 148) rotate(${rotZ})`}>
        {m.modelType === "tower3d" ? (
          <>
            {/* Extruded 3D CAD Tower */}
            <polygon
              points={`-36,-76 ${36 + shiftX},${-76 + shiftY} ${36 + shiftX},${76 + shiftY} -36,76`}
              fill={m.accentColor}
              opacity="0.7"
            />
            <rect
              x="-36"
              y="-76"
              width="72"
              height="152"
              rx="10"
              fill="url(#m3dFront)"
              stroke="#e2e8f0"
              strokeWidth="2"
            />
            <polygon
              points={`-36,-76 36,-76 ${36 + shiftX},${-76 + shiftY} ${-36 + shiftX},${-76 + shiftY}`}
              fill="url(#m3dTop)"
            />
          </>
        ) : m.modelType === "core3d" ? (
          <>
            {/* 3D Octahedron / Cube Core */}
            <polygon
              points={`0,${-68 + shiftY} ${64 + shiftX},${shiftY} 0,${68 + shiftY} ${-64 + shiftX},${shiftY}`}
              fill={m.accentColor}
              opacity="0.65"
            />
            <polygon
              points="0,-68 64,0 0,68 -64,0"
              fill="url(#m3dFront)"
              stroke="#f8fafc"
              strokeWidth="2.5"
            />
            <circle cx="0" cy="0" r="20" fill={m.accentColor} />
          </>
        ) : (
          <>
            {/* 3D Character / Mech */}
            {/* Back depth layer */}
            <rect
              x={-34 + shiftX}
              y={-58 + shiftY}
              width="68"
              height="116"
              rx="18"
              fill={m.accentColor}
              opacity="0.55"
            />
            {/* 3D Head */}
            <circle
              cx="0"
              cy="-44"
              r="32"
              fill="url(#m3dTop)"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <circle cx="-10" cy="-46" r="4" fill="#0f172a" />
            <circle cx="10" cy="-46" r="4" fill="#0f172a" />
            {/* 3D Body */}
            <rect
              x="-38"
              y="-6"
              width="76"
              height="82"
              rx="18"
              fill="url(#m3dFront)"
              stroke="#e2e8f0"
              strokeWidth="2"
            />
            {/* 3D Limbs */}
            <rect
              x="-60"
              y="2"
              width="18"
              height="54"
              rx="9"
              fill={m.accentColor}
            />
            <rect
              x="42"
              y="2"
              width="18"
              height="54"
              rx="9"
              fill={m.accentColor}
            />
          </>
        )}
      </g>
    </svg>
  );
}

function CadPartVisual({ part }) {
  if (part.kind === "face") {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
        <circle
          cx="50"
          cy="50"
          r="44"
          fill={part.color || "#fbbf24"}
          stroke="#0f172a"
          strokeWidth="3"
        />
        <circle cx="34" cy="42" r="5.5" fill="#0f172a" />
        <circle cx="66" cy="42" r="5.5" fill="#0f172a" />
        <path
          d="M 31 62 Q 50 78 69 62"
          fill="none"
          stroke="#0f172a"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (part.kind === "gear") {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
        <circle
          cx="50"
          cy="50"
          r="30"
          fill={part.color || "#38bdf8"}
          stroke="#e0f2fe"
          strokeWidth="3"
        />
        <circle cx="50" cy="50" r="11" fill="#060c19" stroke="#e0f2fe" strokeWidth="2.5" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <rect
            key={deg}
            x="45"
            y="4"
            width="10"
            height="16"
            rx="2"
            fill={part.color || "#38bdf8"}
            transform={`rotate(${deg} 50 50)`}
          />
        ))}
      </svg>
    );
  }
  return (
    <div
      style={{ backgroundColor: part.color || "#7c3aed" }}
      className="flex h-full w-full items-center justify-center rounded-xl border-2 border-white/30 text-[10px] font-black text-white shadow-md"
    >
      {part.kind === "torso" ? "TORSO" : "CAD"}
    </div>
  );
}

function Panel({ title, subtitle, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-[#10172b]/95 p-4 sm:p-5 shadow-lg ${className}`}
    >
      {(title || subtitle) && (
        <div className="mb-3.5">
          {title && <h3 className="text-sm font-black tracking-tight text-white">{title}</h3>}
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

function Btn({
  children,
  onClick,
  active = false,
  secondary = false,
  disabled = false,
  className = "",
  type = "button",
  title,
}) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
          : secondary
          ? "border border-white/15 bg-white/[0.04] text-slate-200 hover:border-violet-400/50 hover:bg-violet-500/15"
          : "bg-violet-600 text-white hover:bg-violet-500"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function PlotCraftProStudio({
  currentStyle,
  onOpenExisting,
  onActivity,
  currentUser,
  onBackToMain,
  initialCategory = null,
  openProjectsSignal = 0,
  isLight = false,
  themeName = "standard",
}) {
  const [proTheme, setProTheme] = useState(() => { try { return localStorage.getItem("pcp_theme") || "auto"; } catch { return "auto"; } });
  const pickTheme = (k) => { setProTheme(k); try { localStorage.setItem("pcp_theme", k); } catch { /* storage unavailable */ } };
  const [dashA, dashB] = ACCENTS[themeName] || ACCENTS.standard;
  const THEME_SURFACES = {
    world: { bg: "#fbf7ff", surface: "#ffffff", surface2: "#f3eaff" },
    standard: { bg: "#f4f6fb", surface: "#ffffff", surface2: "#eef2f7" },
    emerald: { bg: "#ecfdf5", surface: "#ffffff", surface2: "#ddf5e9" },
    sunset: { bg: "#fff7ed", surface: "#ffffff", surface2: "#ffedd5" },
    party: { bg: "#fff1f8", surface: "#ffffff", surface2: "#fae8ff" },
    rainy: { bg: "#eff8ff", surface: "#ffffff", surface2: "#e0f2fe" },
    rgbclr: { bg: "#080d1a", surface: "#111a2d", surface2: "#17243b" },
    cyberpunk: { bg: "#07131c", surface: "#0c202c", surface2: "#123345" },
    dream: { bg: "#100d27", surface: "#1b1740", surface2: "#28205a" },
  };
  const eff = { light: isLight, ...(isLight ? BASE_LIGHT : BASE_DARK), ...(THEME_SURFACES[themeName] || {}), a: dashA, a2: dashB };
  const scope = eff.light ? "pcp-light" : "pcp-dark";
  const accentStyle = { "--a": eff.a, "--a2": eff.a2, "--pcp-bg": eff.bg, "--pcp-surface": eff.surface, "--pcp-surface2": eff.surface2 };
  const [activeCategory, setActiveCategory] = useState("art");
  const [studioOpen, setStudioOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(() => freshProject("art"));
  const [saveStatus, setSaveStatus] = useState("saved");
  const [toast, setToast] = useState("");

  // 2D & 3D Generator controls
  const [genPrompt, setGenPrompt] = useState("Hero character with cape");
  const [charArchetype, setCharArchetype] = useState("hero");
  const [charExpression, setCharExpression] = useState("smile");
  const [charAccessory, setCharAccessory] = useState("cape");
  const [model3DType, setModel3DType] = useState("character3d");
  const [model3DDepth, setModel3DDepth] = useState(48);
  const [modelTab, setModelTab] = useState("gen2d"); // "gen2d" | "gen3d" | "cad"

  // Art canvas state + undo/redo
  const [brushMode, setBrushMode] = useState("brush");
  const [isDrawing, setIsDrawing] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Dragging & selection states
  const [selectedPartId, setSelectedPartId] = useState(null);
  const [draggingPartId, setDraggingPartId] = useState(null);
  const cadBoardRef = useRef(null);

  const [selectedElId, setSelectedElId] = useState(null);
  const [draggingElId, setDraggingElId] = useState(null);
  const graphicBoardRef = useRef(null);

  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [draggingRoomId, setDraggingRoomId] = useState(null);
  const roomBoardRef = useRef(null);

  // Video state
  const [activeVideoClipId, setActiveVideoClipId] = useState(null);
  const [videoPlayhead, setVideoPlayhead] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [overlayDraft, setOverlayDraft] = useState("PLOTCRAFT EDIT");
  const [overlayColor, setOverlayColor] = useState("#ffffff");
  const videoElRef = useRef(null);

  // Animation & Audio & Learning states
  const [timeline, setTimeline] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [isBeatPlaying, setIsBeatPlaying] = useState(false);
  const [simTick, setSimTick] = useState(0);

  const canvasRef = useRef(null);
  const char2DSvgRef = useRef(null);
  const model3DSvgRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef(null);
  const videoClipsRef = useRef([]);

  const settings = project.settings || {};
  const layers = useMemo(
    () => (project.layers && project.layers.length ? project.layers : defaultLayers()),
    [project.layers]
  );
  const activeLayerId = project.activeLayerId || layers[0]?.id || "l_base";
  const cadParts = project.cadParts || [];
  const char2D = project.char2D || build2DCharacterSpec({});
  const model3D = project.model3D || build3DModelSpec({});
  const graphicElements = project.graphicElements || [];
  const videoClips = project.videoClips || [];
  const videoOverlays = project.videoOverlays || [];
  const audioClips = project.audioClips || [];
  const sceneItems = project.sceneItems || [];
  const writingBlocks = project.writingBlocks || [];

  const beat = settings.beat || Array(16).fill(false);
  const bpm = settings.bpm || 120;
  const writingMode = settings.writingMode || "Story";
  const experiment = settings.experiment ?? 50;

  const beatRef = useRef(beat);
  const bpmRef = useRef(bpm);
  const audioClipsRef = useRef(audioClips);
  const audioRef = useRef({ timer: null, step: 0, ctx: null });

  useEffect(() => {
    beatRef.current = beat;
  }, [beat]);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    audioClipsRef.current = audioClips;
  }, [audioClips]);

  useEffect(() => {
    videoClipsRef.current = videoClips;
  }, [videoClips]);

  const category = useMemo(
    () => CATEGORIES.find((c) => c.id === activeCategory) || CATEGORIES[0],
    [activeCategory]
  );

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.filter((c) =>
      `${c.title} ${c.subtitle} ${c.detail} ${c.tools.join(" ")}`.toLowerCase().includes(q)
    );
  }, [search]);

  const notify = useCallback((msg) => setToast(msg), []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let alive = true;
    listProjects()
      .then((list) => {
        if (alive) setProjects(list);
      })
      .catch(() => {
        if (alive) notify("Local project storage unavailable.");
      });
    return () => {
      alive = false;
    };
  }, [notify]);

  useEffect(() => {
    if (openProjectsSignal > 0) setProjectsOpen(true);
  }, [openProjectsSignal]);

  // Composite art layers onto canvas
  const compositeCanvas = useCallback((proj) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bg = proj.settings?.canvasBg || "#ffffff";
    const projLayers = proj.layers && proj.layers.length ? proj.layers : defaultLayers();

    const loadImg = (src) =>
      new Promise((resolve) => {
        if (!src) return resolve(null);
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });

    Promise.all(projLayers.map((l) => loadImg(l.data))).then((imgs) => {
      if (!canvasRef.current) return;
      const c2 = canvasRef.current.getContext("2d");
      if (!c2) return;
      c2.save();
      c2.fillStyle = bg;
      c2.fillRect(0, 0, canvas.width, canvas.height);
      projLayers.forEach((layer, idx) => {
        if (layer.visible !== false && imgs[idx]) {
          c2.drawImage(imgs[idx], 0, 0, canvas.width, canvas.height);
        }
      });
      c2.restore();
    });
  }, []);

  useEffect(() => {
    if (!studioOpen || activeCategory !== "art") return;
    compositeCanvas(project);
  }, [studioOpen, activeCategory, project.id, project.layers, project.settings?.canvasBg, compositeCanvas]); // eslint-disable-line react-hooks/exhaustive-deps

  // Animation timeline loop
  useEffect(() => {
    if (!playing || activeCategory !== "animation") return undefined;
    const id = window.setInterval(() => {
      setTimeline((t) => (t >= 100 ? 0 : t + 1));
    }, 80);
    return () => window.clearInterval(id);
  }, [playing, activeCategory]);

  // Video playhead sync loop
  useEffect(() => {
    if (!videoPlaying || activeCategory !== "video") return undefined;
    const v = videoElRef.current;
    if (v && v.paused) v.play().catch(() => {});

    const id = window.setInterval(() => {
      const vid = videoElRef.current;
      if (vid && Number.isFinite(vid.duration) && vid.duration > 0) {
        const pct = Math.min(100, (vid.currentTime / vid.duration) * 100);
        setVideoPlayhead(pct);
        if (vid.ended || pct >= 100) {
          vid.currentTime = 0;
          setVideoPlayhead(0);
        }
      } else {
        setVideoPlayhead((p) => (p >= 100 ? 0 : p + 1.2 * Number(settings.videoSpeed || 1)));
      }
    }, 60);

    return () => window.clearInterval(id);
  }, [videoPlaying, activeCategory, settings.videoSpeed]);

  useEffect(() => {
    const vid = videoElRef.current;
    if (!vid) return;
    vid.playbackRate = Number(settings.videoSpeed || 1);
    vid.volume = settings.videoVolume ?? 0.8;
    vid.muted = Boolean(settings.videoMuted);
  }, [settings.videoSpeed, settings.videoVolume, settings.videoMuted, activeVideoClipId]);

  useEffect(() => {
    if (!studioOpen || activeCategory !== "learn") return undefined;
    const id = window.setInterval(() => {
      setSimTick((s) => (s + 1) % 360);
    }, 45);
    return () => window.clearInterval(id);
  }, [studioOpen, activeCategory]);

  const stopBeat = useCallback(() => {
    if (audioRef.current.timer) {
      window.clearInterval(audioRef.current.timer);
      audioRef.current.timer = null;
    }
    setIsBeatPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      stopBeat();
      if (audioRef.current.ctx) {
        audioRef.current.ctx.close().catch(() => {});
      }
      videoClipsRef.current.forEach((v) => {
        if (v.url) URL.revokeObjectURL(v.url);
      });
    };
  }, [stopBeat]);

  const patchProject = useCallback((patch) => {
    setSaveStatus("unsaved");
    setProject((prev) => ({
      ...prev,
      ...patch,
      settings: patch.settings ? { ...prev.settings, ...patch.settings } : prev.settings,
      updatedAt: Date.now(),
    }));
  }, []);

  const patchSettings = useCallback(
    (patch) => patchProject({ settings: patch }),
    [patchProject]
  );

  const handleSave = useCallback(
    async (silent = false) => {
      const snap = { ...project, updatedAt: Date.now() };
      try {
        await saveProjectToDB(snap);
        const all = await listProjects();
        setProjects(all);
        setProject(snap);
        setSaveStatus("saved");
        if (!silent) notify("Saved project.");
        onActivity?.("pro", `Saved ${snap.title}`);
      } catch (err) {
        setSaveStatus("error");
        if (!silent) notify(err?.message || "Could not save.");
      }
    },
    [project, notify, onActivity]
  );

  useEffect(() => {
    if (saveStatus !== "unsaved") return undefined;
    const id = window.setTimeout(() => {
      handleSave(true);
    }, 900);
    return () => window.clearTimeout(id);
  }, [project, saveStatus, handleSave]);

  const handleNewProject = useCallback(
    (catId = activeCategory) => {
      stopBeat();
      setVideoPlaying(false);
      setPlaying(false);
      const next = freshProject(catId);
      setProject(next);
      setActiveCategory(catId);
      setSaveStatus("unsaved");
      setTimeline(0);
      setVideoPlayhead(0);
      setUndoStack([]);
      setRedoStack([]);
      setSelectedPartId(next.cadParts[0]?.id || null);
      setSelectedElId(next.graphicElements[0]?.id || null);
      setActiveVideoClipId(null);
      notify(`Created ${next.title}`);
    },
    [activeCategory, stopBeat, notify]
  );

  const handleOpenProject = useCallback(
    (item) => {
      stopBeat();
      setVideoPlaying(false);
      setPlaying(false);
      const base = freshProject(item.category || "art");
      const merged = {
        ...base,
        ...item,
        layers: item.layers && item.layers.length ? item.layers : base.layers,
        cadParts: item.cadParts && item.cadParts.length ? item.cadParts : base.cadParts,
        char2D: item.char2D || base.char2D,
        model3D: item.model3D || base.model3D,
        graphicElements:
          item.graphicElements && item.graphicElements.length
            ? item.graphicElements
            : base.graphicElements,
        audioClips: item.audioClips && item.audioClips.length ? item.audioClips : base.audioClips,
        writingBlocks:
          item.writingBlocks && item.writingBlocks.length
            ? item.writingBlocks
            : base.writingBlocks,
        settings: { ...base.settings, ...(item.settings || {}) },
      };
      setProject(merged);
      setActiveCategory(merged.category);
      setSaveStatus("saved");
      setTimeline(0);
      setVideoPlayhead(0);
      setProjectsOpen(false);
      onOpenExisting?.(merged);
      notify(`Opened ${merged.title}`);
    },
    [stopBeat, onOpenExisting, notify]
  );

  const handleDeleteProject = useCallback(
    async (id) => {
      if (!window.confirm("Delete this project? This cannot be undone.")) return;
      try {
        await deleteProjectFromDB(id);
        const nextList = await listProjects();
        setProjects(nextList);
        if (project.id === id) handleNewProject(activeCategory);
        notify("Deleted project.");
      } catch {
        notify("Could not delete project.");
      }
    },
    [project.id, activeCategory, handleNewProject, notify]
  );

  const handleDuplicateProject = useCallback(
    async (item) => {
      try {
        const copy = { ...item, id: uid("proj"), title: `${item.title} (copy)`, updatedAt: Date.now() };
        await saveProjectToDB(copy);
        const nextList = await listProjects();
        setProjects(nextList);
        notify("Project duplicated.");
      } catch {
        notify("Could not duplicate project.");
      }
    },
    [notify]
  );

  const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const exportSvgToPng = (svgEl, filename) => {
    if (!svgEl) {
      notify("Nothing to export.");
      return;
    }
    const serializer = new XMLSerializer();
    const raw = serializer.serializeToString(svgEl);
    const svgBlob = new Blob([raw], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 640;
      c.height = 640;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#080d1a";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((blob) => {
        if (blob) {
          downloadFile(blob, filename);
          notify(`Exported ${filename}`);
        }
      });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      notify("Could not render PNG.");
    };
    img.src = url;
  };

  const handleExportJSON = () => {
    const safeName = (project.title || "plotcraft-pro").replace(/[^a-z0-9-_]/gi, "-");
    downloadFile(
      new Blob([JSON.stringify({ ...project, exportedAt: new Date().toISOString() }, null, 2)], {
        type: "application/json",
      }),
      `${safeName}.json`
    );
    notify("Exported JSON.");
  };

  const handleExportPNG = () => {
    const c = canvasRef.current;
    if (!c) return;
    const safeName = (project.title || "artwork").replace(/[^a-z0-9-_]/gi, "-");
    c.toBlob((blob) => {
      if (blob) {
        downloadFile(blob, `${safeName}.png`);
        notify("Exported PNG.");
      }
    });
  };

  // --- ART CANVAS HANDLERS ---
  const getCanvasPoint = (e) => {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - rect.left) * c.width) / rect.width),
      y: Math.floor(((e.clientY - rect.top) * c.height) / rect.height),
    };
  };

  const pushUndo = (snapLayers) => {
    setUndoStack((prev) => [...prev.slice(-19), snapLayers]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, layers]);
    setUndoStack((u) => u.slice(0, -1));
    patchProject({ layers: prev });
  };

  const handleRedo = () => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, layers]);
    setRedoStack((r) => r.slice(0, -1));
    patchProject({ layers: next });
  };

  const hexToRgba = (hex) => {
    const clean = (hex || "#8b5cf6").replace("#", "");
    const full =
      clean.length === 3
        ? clean
            .split("")
            .map((ch) => ch + ch)
            .join("")
        : clean;
    const num = parseInt(full, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 255];
  };

  const floodFillCanvas = (startX, startY) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    pushUndo(layers);

    const imgData = ctx.getImageData(0, 0, c.width, c.height);
    const data = imgData.data;
    const w = c.width;
    const h = c.height;
    if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;

    const startIdx = (startY * w + startX) * 4;
    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];
    const targetA = data[startIdx + 3];
    const [fillR, fillG, fillB, fillA] = hexToRgba(settings.color || "#8b5cf6");

    if (
      targetR === fillR &&
      targetG === fillG &&
      targetB === fillB &&
      targetA === fillA
    ) {
      return;
    }

    const matchTarget = (idx) =>
      Math.abs(data[idx] - targetR) <= 12 &&
      Math.abs(data[idx + 1] - targetG) <= 12 &&
      Math.abs(data[idx + 2] - targetB) <= 12 &&
      Math.abs(data[idx + 3] - targetA) <= 12;

    const visited = new Uint8Array(w * h);
    const stack = [startX, startY];

    while (stack.length > 0) {
      const y = stack.pop();
      const x = stack.pop();
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      const flat = y * w + x;
      if (visited[flat]) continue;
      visited[flat] = 1;

      const idx = flat * 4;
      if (!matchTarget(idx)) continue;

      data[idx] = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      data[idx + 3] = fillA;

      stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }

    ctx.putImageData(imgData, 0, 0);
    const dataUrl = c.toDataURL("image/png");
    patchProject({
      layers: layers.map((l) => (l.id === activeLayerId ? { ...l, data: dataUrl } : l)),
    });
  };

  const onCanvasPointerDown = (e) => {
    if (!canvasRef.current) return;
    const pt = getCanvasPoint(e);
    if (brushMode === "fill") {
      floodFillCanvas(pt.x, pt.y);
      return;
    }
    pushUndo(layers);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    setIsDrawing(true);
    lastPtRef.current = pt;
  };

  const onCanvasPointerMove = (e) => {
    if (!drawingRef.current || !canvasRef.current || !lastPtRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const pt = getCanvasPoint(e);
    const prev = lastPtRef.current;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Number(settings.brushSize || 6);
    ctx.strokeStyle =
      brushMode === "eraser" ? settings.canvasBg || "#ffffff" : settings.color || "#8b5cf6";
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.restore();

    lastPtRef.current = pt;
  };

  const onCanvasPointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setIsDrawing(false);
    lastPtRef.current = null;
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      patchProject({
        layers: layers.map((l) => (l.id === activeLayerId ? { ...l, data: dataUrl } : l)),
      });
    }
  };

  const stampArtShape = (kind) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    pushUndo(layers);
    const col = settings.color || "#8b5cf6";
    ctx.save();
    ctx.fillStyle = col;
    if (kind === "rect") {
      ctx.fillRect(360, 180, 280, 220);
    } else if (kind === "circle") {
      ctx.beginPath();
      ctx.arc(500, 290, 110, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    const dataUrl = c.toDataURL("image/png");
    patchProject({
      layers: layers.map((l) => (l.id === activeLayerId ? { ...l, data: dataUrl } : l)),
    });
  };

  // --- AUDIO & BEAT ENGINE ---
  const playSynthTone = async (freq = 440, dur = 0.16, waveOverride) => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      notify("Web Audio not supported in browser.");
      return;
    }
    if (!audioRef.current.ctx) audioRef.current.ctx = new AudioCtx();
    const ctx = audioRef.current.ctx;
    if (ctx.state === "suspended") await ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = waveOverride || settings.waveType || "triangle";
    osc.frequency.value = freq;
    const peak = Math.max(0.02, Number(settings.synthGain ?? 0.16));
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  };

  const toggleBeat = async () => {
    if (isBeatPlaying) {
      stopBeat();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      notify("Web Audio not supported in browser.");
      return;
    }
    if (!audioRef.current.ctx) audioRef.current.ctx = new AudioCtx();
    await audioRef.current.ctx.resume();
    audioRef.current.step = 0;

    const triggerStep = (stepIdx) => {
      const slot = stepIdx % 16;
      if (beatRef.current[slot]) {
        playSynthTone(slot % 4 === 0 ? 660 : 440, 0.09);
      }
      audioClipsRef.current.forEach((clip) => {
        if (!clip.muted && slot >= clip.start && slot < clip.start + clip.duration) {
          playSynthTone(clip.freq || 330, 0.08, clip.wave || "triangle");
        }
      });
    };

    const startLoop = () => {
      if (audioRef.current.timer) window.clearInterval(audioRef.current.timer);
      const ms = Math.max(75, Math.round(60000 / bpmRef.current / 4));
      audioRef.current.timer = window.setInterval(() => {
        triggerStep(audioRef.current.step);
        audioRef.current.step += 1;
      }, ms);
    };

    triggerStep(audioRef.current.step);
    audioRef.current.step += 1;
    startLoop();
    setIsBeatPlaying(true);
  };

  // --- ALL 10 REAL-TIME STUDIOS ---
  const renderStudioBody = () => {
    // 1. Art & Drawing
    if (activeCategory === "art") {
      return (
        <div className="grid gap-4 xl:grid-cols-[1fr_270px]">
          <Panel
            title="Art & Drawing Canvas"
            subtitle="Brush, eraser, flood fill, shapes & undo/redo."
          >
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <Btn active={brushMode === "brush"} onClick={() => setBrushMode("brush")}>
                <Brush className="h-3.5 w-3.5" /> Brush
              </Btn>
              <Btn secondary active={brushMode === "eraser"} onClick={() => setBrushMode("eraser")}>
                <Eraser className="h-3.5 w-3.5" /> Eraser
              </Btn>
              <Btn secondary active={brushMode === "fill"} onClick={() => setBrushMode("fill")}>
                <Sparkles className="h-3.5 w-3.5" /> Fill
              </Btn>
              <Btn secondary onClick={() => stampArtShape("rect")} title="Stamp rectangle">
                <Square className="h-3.5 w-3.5" /> Box
              </Btn>
              <Btn secondary onClick={() => stampArtShape("circle")} title="Stamp circle">
                <Circle className="h-3.5 w-3.5" /> Circle
              </Btn>
              <Btn secondary disabled={!undoStack.length} onClick={handleUndo} title="Undo">
                <Undo2 className="h-3.5 w-3.5" />
              </Btn>
              <Btn secondary disabled={!redoStack.length} onClick={handleRedo} title="Redo">
                <Redo2 className="h-3.5 w-3.5" />
              </Btn>
              <label className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-xs font-semibold">
                <span>Color</span>
                <input
                  type="color"
                  className="h-5 w-6 cursor-pointer rounded border-0 bg-transparent"
                  value={settings.color || "#8b5cf6"}
                  onChange={(e) => patchSettings({ color: e.target.value })}
                />
              </label>
              <label className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-xs font-semibold">
                <span>{settings.brushSize || 6}px</span>
                <input
                  type="range"
                  min="1"
                  max="40"
                  value={settings.brushSize || 6}
                  onChange={(e) => patchSettings({ brushSize: Number(e.target.value) })}
                />
              </label>
              <Btn secondary onClick={handleExportPNG}>
                <Download className="h-3.5 w-3.5" /> PNG
              </Btn>
            </div>
            <canvas
              ref={canvasRef}
              width={1000}
              height={580}
              className="w-full cursor-crosshair touch-none rounded-xl border border-white/15 bg-white"
              onPointerDown={onCanvasPointerDown}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={onCanvasPointerUp}
              onPointerCancel={onCanvasPointerUp}
            />
            <p className="mt-2 text-[11px] text-slate-400">
              {isDrawing
                ? `Drawing on ${layers.find((l) => l.id === activeLayerId)?.name || "layer"}…`
                : `Active layer: ${layers.find((l) => l.id === activeLayerId)?.name || "Base Layer"}`}
            </p>
          </Panel>

          <Panel title="Layers" subtitle="Add, select or hide layers.">
            <div className="space-y-2">
              {layers.map((l) => (
                <div
                  key={l.id}
                  className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 text-xs ${
                    l.id === activeLayerId
                      ? "border-violet-500 bg-violet-500/15 text-white"
                      : "border-white/10 bg-white/[0.02] text-slate-300"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => patchProject({ activeLayerId: l.id })}
                    className="flex-1 truncate text-left font-bold"
                  >
                    {l.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      pushUndo(layers);
                      patchProject({
                        layers: layers.map((item) =>
                          item.id === l.id
                            ? { ...item, visible: item.visible === false ? true : false }
                            : item
                        ),
                      });
                    }}
                    className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-semibold"
                  >
                    {l.visible === false ? "Hidden" : "Visible"}
                  </button>
                </div>
              ))}
            </div>
            <Btn
              secondary
              className="mt-3 w-full"
              onClick={() => {
                pushUndo(layers);
                const id = makeId("lyr");
                patchProject({
                  layers: [
                    ...layers,
                    { id, name: `Layer ${layers.length + 1}`, visible: true, data: "" },
                  ],
                  activeLayerId: id,
                });
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add Layer
            </Btn>
          </Panel>
        </div>
      );
    }

    // 2. 2D Character Gen + 3D Model/Character Gen + CAD Workbench
    if (activeCategory === "model") {
      const snap = Number(settings.cadGridSnap || 10);
      const showDims = settings.cadShowDimensions !== false;
      const selectedPart = cadParts.find((p) => p.id === selectedPartId) || cadParts[0] || null;
      const rot3DX = settings.rot3DX ?? -16;
      const rot3DY = settings.rot3DY ?? 28;
      const rot3DZ = settings.rot3DZ ?? 0;

      const updatePart = (id, patch) => {
        patchProject({
          cadParts: cadParts.map((pt) => (pt.id === id ? { ...pt, ...patch } : pt)),
        });
      };

      const generate2D = () => {
        const nextSpec = build2DCharacterSpec({
          promptText: genPrompt,
          archetype: charArchetype,
          expression: charExpression,
          accessory: charAccessory,
          outfitColor: settings.color || "#7c3aed",
        });
        patchProject({ char2D: nextSpec });
        notify(`Generated 2D character: ${nextSpec.prompt}`);
      };

      const generate3D = () => {
        const next3D = build3DModelSpec({
          promptText: genPrompt,
          modelType: model3DType,
          primaryColor: settings.color || "#8b5cf6",
          accentColor: "#06b6d4",
          depth: model3DDepth,
        });
        patchProject({ model3D: next3D });
        notify(`Generated 3D model: ${next3D.prompt}`);
      };

      return (
        <div className="space-y-4">
          {/* Prompt & Mode Switcher */}
          <Panel
            title="2D & 3D Character / Model Generator + CAD"
            subtitle="Type a prompt or pick options, click Generate to build 2D/3D artwork, or edit CAD parts."
          >
            <div className="mb-3 flex flex-wrap gap-2">
              <Btn active={modelTab === "gen2d"} onClick={() => setModelTab("gen2d")}>
                <ImageIcon className="h-3.5 w-3.5" /> 2D Character Gen
              </Btn>
              <Btn active={modelTab === "gen3d"} onClick={() => setModelTab("gen3d")}>
                <Orbit className="h-3.5 w-3.5" /> 3D Model / Character Gen
              </Btn>
              <Btn active={modelTab === "cad"} onClick={() => setModelTab("cad")}>
                <Grid className="h-3.5 w-3.5" /> CAD & Parts Grid
              </Btn>
            </div>

            {modelTab !== "cad" && (
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={genPrompt}
                  onChange={(e) => setGenPrompt(e.target.value)}
                  placeholder="Describe character or 3D model (e.g. cyber robot, wizard, CAD tower)..."
                  className="min-w-[220px] flex-1 rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs text-white"
                />
                <input
                  type="color"
                  value={settings.color || "#8b5cf6"}
                  onChange={(e) => patchSettings({ color: e.target.value })}
                  className="h-9 w-11 cursor-pointer rounded-xl border border-white/15 bg-transparent"
                />
                <Btn onClick={modelTab === "gen2d" ? generate2D : generate3D}>
                  <Wand2 className="h-3.5 w-3.5" />
                  {modelTab === "gen2d" ? "Generate 2D Character" : "Generate 3D Model"}
                </Btn>
              </div>
            )}
          </Panel>

          {modelTab === "gen2d" && (
            <div className="grid gap-4 lg:grid-cols-[1fr_290px]">
              <Panel title="Generated 2D Character Preview">
                <div className="grid h-[380px] place-items-center rounded-2xl border border-white/10 bg-[#070d1b] p-4">
                  <div ref={char2DSvgRef} className="h-full max-h-[340px] w-full max-w-[340px]">
                    <Character2DArtwork spec={char2D} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-300">{char2D.prompt}</span>
                  <Btn
                    secondary
                    onClick={() =>
                      exportSvgToPng(
                        char2DSvgRef.current?.querySelector("svg"),
                        "2d-character.png"
                      )
                    }
                  >
                    <Download className="h-3.5 w-3.5" /> Download 2D PNG
                  </Btn>
                </div>
              </Panel>

              <Panel title="2D Character Traits">
                <div className="space-y-3 text-xs">
                  <label className="block font-bold text-slate-200">
                    Archetype
                    <select
                      className="mt-1 w-full rounded-xl border border-white/15 bg-[#0b1122] px-3 py-2 text-xs text-white"
                      value={charArchetype}
                      onChange={(e) => {
                        setCharArchetype(e.target.value);
                        patchProject({
                          char2D: build2DCharacterSpec({
                            promptText: genPrompt,
                            archetype: e.target.value,
                            expression: charExpression,
                            accessory: charAccessory,
                            outfitColor: settings.color,
                          }),
                        });
                      }}
                    >
                      <option value="hero">Hero</option>
                      <option value="robot">Robot</option>
                      <option value="mage">Mage</option>
                      <option value="knight">Knight</option>
                    </select>
                  </label>

                  <label className="block font-bold text-slate-200">
                    Expression
                    <select
                      className="mt-1 w-full rounded-xl border border-white/15 bg-[#0b1122] px-3 py-2 text-xs text-white"
                      value={charExpression}
                      onChange={(e) => {
                        setCharExpression(e.target.value);
                        patchProject({
                          char2D: build2DCharacterSpec({
                            promptText: genPrompt,
                            archetype: charArchetype,
                            expression: e.target.value,
                            accessory: charAccessory,
                            outfitColor: settings.color,
                          }),
                        });
                      }}
                    >
                      <option value="smile">Smile</option>
                      <option value="happy">Big Smile</option>
                      <option value="determined">Determined</option>
                    </select>
                  </label>

                  <label className="block font-bold text-slate-200">
                    Accessory
                    <select
                      className="mt-1 w-full rounded-xl border border-white/15 bg-[#0b1122] px-3 py-2 text-xs text-white"
                      value={charAccessory}
                      onChange={(e) => {
                        setCharAccessory(e.target.value);
                        patchProject({
                          char2D: build2DCharacterSpec({
                            promptText: genPrompt,
                            archetype: charArchetype,
                            expression: charExpression,
                            accessory: e.target.value,
                            outfitColor: settings.color,
                          }),
                        });
                      }}
                    >
                      <option value="cape">Cape</option>
                      <option value="shield">Shield</option>
                      <option value="visor">Visor</option>
                      <option value="hat">Wizard Hat</option>
                    </select>
                  </label>
                </div>
              </Panel>
            </div>
          )}

          {modelTab === "gen3d" && (
            <div className="grid gap-4 lg:grid-cols-[1fr_290px]">
              <Panel title="Generated 3D Model / Character Stage">
                <div className="grid h-[380px] place-items-center rounded-2xl border border-white/10 bg-[#070d1b] p-4">
                  <div ref={model3DSvgRef} className="h-full max-h-[340px] w-full max-w-[340px]">
                    <Model3DArtwork
                      spec={model3D}
                      rotX={rot3DX}
                      rotY={rot3DY}
                      rotZ={rot3DZ}
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-300">
                    {model3D.prompt} · X:{rot3DX}° Y:{rot3DY}° Z:{rot3DZ}°
                  </span>
                  <Btn
                    secondary
                    onClick={() =>
                      exportSvgToPng(
                        model3DSvgRef.current?.querySelector("svg"),
                        "3d-model.png"
                      )
                    }
                  >
                    <Download className="h-3.5 w-3.5" /> Download 3D PNG
                  </Btn>
                </div>
              </Panel>

              <Panel title="3D Rotation & Extrusion">
                <div className="space-y-3 text-xs">
                  <label className="block font-bold text-slate-200">
                    3D Type
                    <select
                      className="mt-1 w-full rounded-xl border border-white/15 bg-[#0b1122] px-3 py-2 text-xs text-white"
                      value={model3DType}
                      onChange={(e) => {
                        setModel3DType(e.target.value);
                        patchProject({
                          model3D: build3DModelSpec({
                            promptText: genPrompt,
                            modelType: e.target.value,
                            primaryColor: settings.color,
                            depth: model3DDepth,
                          }),
                        });
                      }}
                    >
                      <option value="character3d">3D Character</option>
                      <option value="mech3d">3D Mech</option>
                      <option value="tower3d">3D CAD Tower</option>
                      <option value="core3d">3D Core</option>
                    </select>
                  </label>

                  <label className="block font-bold text-slate-200">
                    Rotate X ({rot3DX}°)
                    <input
                      type="range"
                      min="-60"
                      max="60"
                      className="mt-1 w-full"
                      value={rot3DX}
                      onChange={(e) => patchSettings({ rot3DX: Number(e.target.value) })}
                    />
                  </label>

                  <label className="block font-bold text-slate-200">
                    Rotate Y ({rot3DY}°)
                    <input
                      type="range"
                      min="-90"
                      max="90"
                      className="mt-1 w-full"
                      value={rot3DY}
                      onChange={(e) => patchSettings({ rot3DY: Number(e.target.value) })}
                    />
                  </label>

                  <label className="block font-bold text-slate-200">
                    Depth ({model3DDepth}px)
                    <input
                      type="range"
                      min="16"
                      max="90"
                      className="mt-1 w-full"
                      value={model3DDepth}
                      onChange={(e) => {
                        const d = Number(e.target.value);
                        setModel3DDepth(d);
                        patchProject({
                          model3D: { ...model3D, depth: d },
                        });
                      }}
                    />
                  </label>
                </div>
              </Panel>
            </div>
          )}

          {modelTab === "cad" && (
            <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
              <Panel
                title="CAD & Character Parts Grid"
                subtitle="Drag parts on the snapped grid; edit size, rotation & color."
              >
                <div className="mb-3 flex flex-wrap gap-1.5">
                  <Btn
                    secondary
                    onClick={() => {
                      const created = {
                        id: makeId("part"),
                        name: "Face",
                        kind: "face",
                        x: 150,
                        y: 90,
                        w: 84,
                        h: 84,
                        rot: 0,
                        scale: 1,
                        color: "#fbbf24",
                      };
                      patchProject({ cadParts: [...cadParts, created] });
                      setSelectedPartId(created.id);
                    }}
                  >
                    <User className="h-3.5 w-3.5 text-amber-300" /> + Face
                  </Btn>
                  <Btn
                    secondary
                    onClick={() => {
                      const created = {
                        id: makeId("part"),
                        name: "Gear",
                        kind: "gear",
                        x: 240,
                        y: 120,
                        w: 82,
                        h: 82,
                        rot: 0,
                        scale: 1,
                        color: "#38bdf8",
                      };
                      patchProject({ cadParts: [...cadParts, created] });
                      setSelectedPartId(created.id);
                    }}
                  >
                    <Wrench className="h-3.5 w-3.5 text-sky-300" /> + Gear
                  </Btn>
                  {selectedPart && (
                    <>
                      <Btn
                        secondary
                        onClick={() => {
                          const copy = {
                            ...selectedPart,
                            id: makeId("part"),
                            name: `${selectedPart.name} Copy`,
                            x: selectedPart.x + 24,
                            y: selectedPart.y + 24,
                          };
                          patchProject({ cadParts: [...cadParts, copy] });
                          setSelectedPartId(copy.id);
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" /> Clone
                      </Btn>
                      <Btn
                        secondary
                        onClick={() => {
                          const next = cadParts.filter((p) => p.id !== selectedPart.id);
                          patchProject({ cadParts: next });
                          setSelectedPartId(next[0]?.id || null);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Btn>
                    </>
                  )}
                </div>

                <div
                  ref={cadBoardRef}
                  onPointerMove={(e) => {
                    if (!draggingPartId || !cadBoardRef.current) return;
                    const rect = cadBoardRef.current.getBoundingClientRect();
                    const sx = Math.round((e.clientX - rect.left) / snap) * snap;
                    const sy = Math.round((e.clientY - rect.top) / snap) * snap;
                    updatePart(draggingPartId, {
                      x: Math.max(10, Math.min(rect.width - 40, sx)),
                      y: Math.max(10, Math.min(rect.height - 40, sy)),
                    });
                  }}
                  onPointerUp={() => setDraggingPartId(null)}
                  onPointerLeave={() => setDraggingPartId(null)}
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(56,189,248,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.12) 1px, transparent 1px)",
                    backgroundSize: `${Math.max(14, snap * 2)}px ${Math.max(14, snap * 2)}px`,
                  }}
                  className="relative h-[380px] w-full select-none overflow-hidden rounded-2xl border border-sky-400/20 bg-[#060c19]"
                >
                  {cadParts.map((part) => (
                    <div
                      key={part.id}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelectedPartId(part.id);
                        setDraggingPartId(part.id);
                      }}
                      style={{
                        left: `${part.x}px`,
                        top: `${part.y}px`,
                        width: `${part.w}px`,
                        height: `${part.h}px`,
                        transform: `rotate(${part.rot || 0}deg) scale(${part.scale || 1})`,
                      }}
                      className={`absolute cursor-grab active:cursor-grabbing ${
                        selectedPart?.id === part.id ? "ring-2 ring-amber-300 rounded-xl" : ""
                      }`}
                    >
                      <CadPartVisual part={part} />
                      {showDims && (
                        <span className="pointer-events-none absolute -top-5 left-0 whitespace-nowrap rounded bg-slate-900/90 px-1.5 py-0.5 text-[9px] font-bold text-sky-200">
                          {part.name} · {part.w}×{part.h}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="CAD Inspector">
                {selectedPart ? (
                  <div className="space-y-3 text-xs">
                    <label className="block font-bold text-slate-200">
                      Part Name
                      <input
                        className="mt-1 w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-xs text-white"
                        value={selectedPart.name}
                        onChange={(e) => updatePart(selectedPart.id, { name: e.target.value })}
                      />
                    </label>
                    <label className="block font-bold text-slate-200">
                      Width: {selectedPart.w}px
                      <input
                        type="range"
                        min="24"
                        max="220"
                        className="mt-1 w-full"
                        value={selectedPart.w}
                        onChange={(e) => updatePart(selectedPart.id, { w: Number(e.target.value) })}
                      />
                    </label>
                    <label className="block font-bold text-slate-200">
                      Height: {selectedPart.h}px
                      <input
                        type="range"
                        min="24"
                        max="220"
                        className="mt-1 w-full"
                        value={selectedPart.h}
                        onChange={(e) => updatePart(selectedPart.id, { h: Number(e.target.value) })}
                      />
                    </label>
                    <label className="block font-bold text-slate-200">
                      Rotation: {selectedPart.rot || 0}°
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        className="mt-1 w-full"
                        value={selectedPart.rot || 0}
                        onChange={(e) => updatePart(selectedPart.id, { rot: Number(e.target.value) })}
                      />
                    </label>
                    <label className="block font-bold text-slate-200">
                      Grid Snap: {snap}px
                      <input
                        type="range"
                        min="5"
                        max="40"
                        step="5"
                        className="mt-1 w-full"
                        value={snap}
                        onChange={(e) => patchSettings({ cadGridSnap: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Select or add a part.</p>
                )}
              </Panel>
            </div>
          )}
        </div>
      );
    }

    // 3. Animation Studio
    if (activeCategory === "animation") {
      return <AnimStudio scene={project.animScene} patchProject={patchProject} notify={notify} />;
    }

    if (activeCategory === "files") {
      return <FileEditor project={project} patchProject={patchProject} notify={notify} />;
    }

    // 4. Video & VFX
    if (activeCategory === "video") {
      return (
        <KineVideoStudio
          clips={videoClips}
          overlays={videoOverlays}
          audio={project.videoAudio || []}
          settings={settings}
          patchProject={patchProject}
          notify={notify}
          themeName={themeName}
        />
      );
    }

    // 5. Graphic Design — expanded canvas, elements, layers and export
    if (activeCategory === "graphic") {
      const boardWidth = graphicBoardRef.current?.clientWidth || 720;
      const boardHeight = 420;
      const graphicBg = settings.graphicBg || "#ffffff";
      const graphicGrid = settings.graphicGrid !== false;
      const activeEl =
        graphicElements.find((el) => el.id === selectedElId) || graphicElements[0] || null;

      const updateEl = (id, patch) => {
        patchProject({
          graphicElements: graphicElements.map((el) =>
            el.id === id ? { ...el, ...patch } : el
          ),
        });
      };

      const addGraphicEl = (type) => {
        const presets = {
          heading: { text: "Your headline", w: 330, h: 64, fontSize: 38, fg: "#172033", bg: "transparent" },
          subheading: { text: "Add a supporting message", w: 300, h: 42, fontSize: 23, fg: "#334155", bg: "transparent" },
          paragraph: { text: "Write your message here. Make every word count.", w: 310, h: 84, fontSize: 16, fg: "#475569", bg: "transparent" },
          badge: { text: "NEW • FEATURED", w: 150, h: 38, fontSize: 13, fg: "#ffffff", bg: "#7c3aed" },
          rect: { text: "", w: 180, h: 110, fontSize: 16, fg: "#ffffff", bg: "#8b5cf6" },
          circle: { text: "", w: 110, h: 110, fontSize: 16, fg: "#ffffff", bg: "#ec4899" },
          triangle: { text: "", w: 120, h: 110, fontSize: 16, fg: "#ffffff", bg: "#0ea5e9" },
          line: { text: "", w: 190, h: 4, fontSize: 16, fg: "#7c3aed", bg: "#7c3aed" },
        };
        const preset = presets[type] || presets.heading;
        const el = {
          id: makeId("el"), type, ...preset,
          x: Math.max(16, Math.round(boardWidth * 0.16)),
          y: Math.max(16, Math.round(boardHeight * 0.18)),
          fontFamily: "Arial", fontWeight: "700", align: "left",
          opacity: 1, rotation: 0, letterSpacing: 0, stroke: "transparent",
          strokeWidth: 0, visible: true, locked: false,
        };
        patchProject({ graphicElements: [...graphicElements, el] });
        setSelectedElId(el.id);
      };

      const duplicateEl = (el) => {
        if (!el) return;
        const copy = { ...el, id: makeId("el"), x: el.x + 18, y: el.y + 18, text: el.text ? `${el.text} copy` : "" };
        patchProject({ graphicElements: [...graphicElements, copy] });
        setSelectedElId(copy.id);
      };

      const moveLayer = (id, direction) => {
        const index = graphicElements.findIndex((el) => el.id === id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= graphicElements.length) return;
        const next = [...graphicElements];
        [next[index], next[target]] = [next[target], next[index]];
        patchProject({ graphicElements: next });
      };

      const removeEl = (id) => {
        const next = graphicElements.filter((el) => el.id !== id);
        patchProject({ graphicElements: next });
        if (selectedElId === id) setSelectedElId(next[0]?.id || null);
      };

      const addImage = (file) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
          notify("Please choose an image file.");
          return;
        }
        if (file.size > 8 * 1024 * 1024) {
          notify("Image must be smaller than 8 MB.");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const el = {
            id: makeId("el"), type: "image", text: "", src: reader.result,
            x: 90, y: 90, w: 220, h: 150, bg: "transparent", fg: "#ffffff",
            fontSize: 16, opacity: 1, rotation: 0, visible: true, locked: false,
          };
          patchProject({ graphicElements: [...graphicElements, el] });
          setSelectedElId(el.id);
          notify("Image added to your design.");
        };
        reader.onerror = () => notify("Could not read that image.");
        reader.readAsDataURL(file);
      };

      const downloadSvg = () => {
        const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
          "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
        }[c]));
        const body = graphicElements.filter((el) => el.visible !== false).map((el) => {
          const x = Number(el.x) || 0, y = Number(el.y) || 0;
          const w = Number(el.w) || 120, h = Number(el.h) || 40;
          const transform = `rotate(${Number(el.rotation) || 0} ${x + w / 2} ${y + h / 2})`;
          const opacity = Number.isFinite(Number(el.opacity)) ? Number(el.opacity) : 1;
          if (el.type === "image" && el.src) {
            return `<image href="${esc(el.src)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" opacity="${opacity}" transform="${transform}"/>`;
          }
          if (["rect", "badge"].includes(el.type)) {
            return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${el.type === "badge" ? h / 2 : 10}" fill="${esc(el.bg || "#8b5cf6")}" opacity="${opacity}" transform="${transform}"/>`;
          }
          if (el.type === "circle") {
            return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${esc(el.bg || "#ec4899")}" opacity="${opacity}" transform="${transform}"/>`;
          }
          if (el.type === "triangle") {
            return `<polygon points="${x + w / 2},${y} ${x + w},${y + h} ${x},${y + h}" fill="${esc(el.bg || "#0ea5e9")}" opacity="${opacity}" transform="${transform}"/>`;
          }
          if (el.type === "line") {
            return `<line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="${esc(el.bg || el.fg || "#7c3aed")}" stroke-width="${Math.max(2, h)}" opacity="${opacity}" transform="${transform}"/>`;
          }
          const text = esc(el.text).replace(/\n/g, "&#10;");
          const lines = text.split("&#10;");
          const lineHeight = (Number(el.fontSize) || 20) * 1.2;
          const tspans = lines.map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${line}</tspan>`).join("");
          return `<text x="${x}" y="${y + (Number(el.fontSize) || 20)}" fill="${esc(el.fg || "#172033")}" font-family="${esc(el.fontFamily || "Arial")}" font-size="${Number(el.fontSize) || 20}" font-weight="${esc(el.fontWeight || "700")}" letter-spacing="${Number(el.letterSpacing) || 0}" text-anchor="${el.align === "center" ? "middle" : el.align === "right" ? "end" : "start"}" opacity="${opacity}" transform="${transform}">${tspans}</text>`;
        }).join("");
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${boardWidth}" height="${boardHeight}" viewBox="0 0 ${boardWidth} ${boardHeight}"><rect width="100%" height="100%" fill="${esc(graphicBg)}"/>${body}</svg>`;
        const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${(project.title || "plotcraft-design").replace(/[^\w-]+/g, "-")}.svg`;
        a.click(); URL.revokeObjectURL(url);
        notify("SVG exported.");
      };

      const downloadPng = () => {
        const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
          "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
        }[c]));
        const body = graphicElements.filter((el) => el.visible !== false).map((el) => {
          const x = Number(el.x) || 0, y = Number(el.y) || 0;
          const w = Number(el.w) || 120, h = Number(el.h) || 40;
          const rot = Number(el.rotation) || 0, opacity = Number(el.opacity ?? 1);
          const transform = `rotate(${rot} ${x + w / 2} ${y + h / 2})`;
          if (el.type === "image" && el.src) return `<image href="${esc(el.src)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" opacity="${opacity}" transform="${transform}"/>`;
          if (el.type === "circle") return `<ellipse cx="${x+w/2}" cy="${y+h/2}" rx="${w/2}" ry="${h/2}" fill="${esc(el.bg)}" opacity="${opacity}" transform="${transform}"/>`;
          if (el.type === "triangle") return `<polygon points="${x+w/2},${y} ${x+w},${y+h} ${x},${y+h}" fill="${esc(el.bg)}" opacity="${opacity}" transform="${transform}"/>`;
          if (el.type === "line") return `<line x1="${x}" y1="${y+h/2}" x2="${x+w}" y2="${y+h/2}" stroke="${esc(el.bg || el.fg)}" stroke-width="${Math.max(2,h)}" opacity="${opacity}" transform="${transform}"/>`;
          if (el.type === "rect" || el.type === "badge") return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${el.type === "badge" ? h/2 : 10}" fill="${esc(el.bg)}" opacity="${opacity}" transform="${transform}"/>`;
          return `<text x="${x}" y="${y+(Number(el.fontSize)||20)}" fill="${esc(el.fg)}" font-family="${esc(el.fontFamily||"Arial")}" font-size="${Number(el.fontSize)||20}" font-weight="${esc(el.fontWeight||"700")}" letter-spacing="${Number(el.letterSpacing)||0}" opacity="${opacity}" transform="${transform}">${esc(el.text)}</text>`;
        }).join("");
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${boardWidth*2}" height="${boardHeight*2}" viewBox="0 0 ${boardWidth} ${boardHeight}"><rect width="100%" height="100%" fill="${esc(graphicBg)}"/>${body}</svg>`;
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = boardWidth * 2; canvas.height = boardHeight * 2;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (!blob) return notify("PNG export failed.");
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `${(project.title || "plotcraft-design").replace(/[^\w-]+/g, "-")}.png`;
            a.click(); URL.revokeObjectURL(url); notify("PNG exported at 2× resolution.");
          }, "image/png");
        };
        image.onerror = () => notify("Could not render the design. Try SVG export.");
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      };
      const GRAPHIC_STYLES = [
        ["Minimal Editorial","#f8fafc","#111827","#64748b"],["Neon Cyber","#090b1b","#e879f9","#22d3ee"],["Luxury Gold","#17130d","#f8e7b5","#b88b38"],["Pastel Dream","#fff1f2","#7c3aed","#f9a8d4"],
        ["Bold Memphis","#fff7ed","#111827","#f97316"],["Retro 80s","#24113d","#f0abfc","#fb7185"],["Swiss Grid","#ffffff","#111111","#ef4444"],["Organic Earth","#e9eddf","#31433a","#a3a56b"],
        ["Glass Gradient","#e0f2fe","#0f172a","#8b5cf6"],["Monochrome","#f4f4f5","#18181b","#71717a"],["Pop Art","#fffde7","#172554","#f43f5e"],["Vintage Paper","#f2e8d5","#5b4636","#b77943"],
        ["Aurora","#071b2b","#dbeafe","#22d3ee"],["Floral Soft","#fff1f2","#831843","#fb7185"],["Tech Blueprint","#071a35","#dbeafe","#38bdf8"],["Sunset Poster","#431407","#ffedd5","#fb923c"],
        ["Kawaii Cute","#fdf2f8","#831843","#f9a8d4"],["Brutalist","#fef08a","#111827","#dc2626"],["Nature Fresh","#ecfccb","#14532d","#65a30d"],["Ocean Calm","#ecfeff","#164e63","#06b6d4"],
        ["Festival Glow","#2e1065","#f5d0fe","#facc15"],["Corporate Clean","#eff6ff","#1e3a8a","#3b82f6"],["Art Deco","#1c1917","#fef3c7","#d6a84f"],["Gradient Mesh","#f5f3ff","#312e81","#ec4899"]
      ];
      const applyGraphicStyle = (index) => {
        const [name,bg,fg,accent] = GRAPHIC_STYLES[index];
        const isDark = ["#090b1b","#17130d","#24113d","#071b2b","#071a35","#431407","#2e1065","#1c1917"].includes(bg);
        const elements = [
          {id:makeId("el"),type:"rect",text:"",x:0,y:0,w:720,h:420,bg:accent,fg:accent,opacity:.13,rotation:0,visible:true,locked:false},
          {id:makeId("el"),type:"badge",text:name.toUpperCase(),x:42,y:36,w:190,h:36,fontSize:12,fg:bg,bg:accent,fontFamily:"Arial",fontWeight:"800",align:"center",opacity:1,rotation:0,visible:true,locked:false},
          {id:makeId("el"),type:"heading",text:["CREATE WITHOUT LIMITS","MAKE IT MEMORABLE","DESIGN YOUR NEXT IDEA","A FRESH NEW PERSPECTIVE"][index%4],x:42,y:116,w:620,h:118,fontSize: index%3===0?48:42,fg,fontFamily:index%4===2?"Georgia":"Arial",fontWeight:"800",align:"left",opacity:1,rotation:0,visible:true,locked:false},
          {id:makeId("el"),type:"subheading",text:`${name} · PlotCraft Creative Series`,x:48,y:252,w:520,h:48,fontSize:20,fg: isDark?"#e2e8f0":"#475569",fontFamily:"Arial",fontWeight:"600",align:"left",opacity:1,rotation:0,visible:true,locked:false},
          {id:makeId("el"),type:index%2?"circle":"rect",text:"",x:540,y:300,w:112,h:92,bg:accent,fg:accent,opacity:.9,rotation:index*7,visible:true,locked:false}
        ];
        patchSettings({graphicBg:bg});
        patchProject({graphicElements:elements});
        setSelectedElId(elements[2].id);
        notify(`${name} style applied. Edit every layer on the canvas.`);
      };

      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div>
              <p className="text-sm font-black">Graphic Design Studio</p>
              <p className="text-[11px] text-slate-400">Create posters, social graphics and simple brand assets</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn secondary onClick={downloadSvg}><Download className="h-3.5 w-3.5" /> SVG</Btn>
              <Btn onClick={downloadPng}><Download className="h-3.5 w-3.5" /> PNG 2×</Btn>
            </div>
          </div>

          <Panel title="24 creative design styles" subtitle="One-click poster, brand and social layouts. Every generated layer remains editable.">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
              {GRAPHIC_STYLES.map(([name,bg,fg,accent],i) => <button key={name} type="button" onClick={() => applyGraphicStyle(i)} className="overflow-hidden rounded-xl border border-white/10 text-left transition hover:-translate-y-0.5 hover:border-violet-400">
                <span className="flex h-12 items-end gap-1 p-2" style={{background:bg}}><i className="h-5 w-5 rounded-full" style={{background:accent}}/><i className="h-2 flex-1 rounded" style={{background:fg,opacity:.8}}/></span>
                <span className="block truncate px-2 py-2 text-[10px] font-black text-slate-200">{name}</span>
              </button>)}
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">
            <Panel title="Design canvas" subtitle="Select an element to edit it. Drag elements to position them.">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Btn secondary onClick={() => addGraphicEl("heading")}><Plus className="h-3.5 w-3.5" /> Heading</Btn>
                <Btn secondary onClick={() => addGraphicEl("subheading")}><Plus className="h-3.5 w-3.5" /> Subheading</Btn>
                <Btn secondary onClick={() => addGraphicEl("paragraph")}><Plus className="h-3.5 w-3.5" /> Paragraph</Btn>
                <Btn secondary onClick={() => addGraphicEl("badge")}><Plus className="h-3.5 w-3.5" /> Badge</Btn>
                <Btn secondary onClick={() => addGraphicEl("rect")}><Square className="h-3.5 w-3.5" /> Rectangle</Btn>
                <Btn secondary onClick={() => addGraphicEl("circle")}><Circle className="h-3.5 w-3.5" /> Circle</Btn>
                <Btn secondary onClick={() => addGraphicEl("triangle")}><Shapes className="h-3.5 w-3.5" /> Triangle</Btn>
                <Btn secondary onClick={() => addGraphicEl("line")}><Plus className="h-3.5 w-3.5" /> Line</Btn>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10">
                  <Upload className="h-3.5 w-3.5" /> Upload image
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => { addImage(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-2 font-bold text-slate-300">
                  Background <input type="color" value={graphicBg} onChange={(e) => patchSettings({ graphicBg: e.target.value })} className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent" />
                </label>
                <label className="flex items-center gap-2 font-bold text-slate-300">
                  <input type="checkbox" checked={graphicGrid} onChange={(e) => patchSettings({ graphicGrid: e.target.checked })} /> Grid
                </label>
                <Btn secondary onClick={() => patchProject({ graphicElements: [] })}>Clear canvas</Btn>
              </div>

              <div
                ref={graphicBoardRef}
                onPointerMove={(e) => {
                  if (!draggingElId || !graphicBoardRef.current) return;
                  const rect = graphicBoardRef.current.getBoundingClientRect();
                  const x = Math.max(0, Math.min(rect.width - 24, Math.round(e.clientX - rect.left)));
                  const y = Math.max(0, Math.min(boardHeight - 18, Math.round(e.clientY - rect.top)));
                  updateEl(draggingElId, { x, y });
                }}
                onPointerUp={() => setDraggingElId(null)}
                onPointerCancel={() => setDraggingElId(null)}
                className="relative h-[420px] w-full touch-none select-none overflow-hidden rounded-xl border border-slate-300 shadow-inner"
                style={{
                  backgroundColor: graphicBg,
                  backgroundImage: graphicGrid
                    ? "linear-gradient(rgba(100,116,139,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,.12) 1px, transparent 1px)"
                    : "none",
                  backgroundSize: "20px 20px",
                }}
              >
                {graphicElements.filter((el) => el.visible !== false).map((el) => {
                  const selected = activeEl?.id === el.id;
                  const commonStyle = {
                    position: "absolute", left: el.x, top: el.y,
                    width: el.w, minHeight: el.type === "line" ? 4 : undefined,
                    height: ["rect", "circle", "triangle", "image", "line"].includes(el.type) ? el.h : undefined,
                    opacity: el.opacity ?? 1,
                    transform: `rotate(${el.rotation || 0}deg)`,
                    transformOrigin: "center",
                    border: selected ? "2px solid #f59e0b" : "1px solid transparent",
                    cursor: el.locked ? "not-allowed" : "grab",
                    boxSizing: "border-box",
                  };
                  return (
                    <div
                      key={el.id}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelectedElId(el.id);
                        if (!el.locked) {
                          e.currentTarget.setPointerCapture?.(e.pointerId);
                          setDraggingElId(el.id);
                        }
                      }}
                      style={{
                        ...commonStyle,
                        backgroundColor: ["rect", "circle", "triangle", "badge"].includes(el.type) ? el.bg : "transparent",
                        color: el.fg || "#172033",
                        borderRadius: el.type === "circle" ? "50%" : el.type === "badge" ? "9999px" : el.type === "rect" ? "10px" : "4px",
                        padding: ["heading", "subheading", "paragraph"].includes(el.type) ? "3px 6px" : el.type === "badge" ? "8px 14px" : 0,
                        fontSize: el.fontSize || 18,
                        fontFamily: el.fontFamily || "Arial",
                        fontWeight: el.fontWeight || "700",
                        letterSpacing: `${el.letterSpacing || 0}px`,
                        textAlign: el.align || "left",
                        textShadow: el.shadow ? "2px 2px 5px rgba(0,0,0,.35)" : "none",
                        WebkitTextStroke: el.stroke && el.stroke !== "transparent" ? `${el.strokeWidth || 1}px ${el.stroke}` : "0 transparent",
                        clipPath: el.type === "triangle" ? "polygon(50% 0, 100% 100%, 0 100%)" : "none",
                        display: el.type === "line" ? "block" : "flex",
                        alignItems: "center",
                        justifyContent: el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start",
                        overflow: "hidden",
                      }}
                      className="absolute leading-tight"
                      role="button"
                      tabIndex={0}
                      aria-label={`${el.type} layer${el.locked ? ", locked" : ""}`}
                      onKeyDown={(e) => {
                        if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeEl(el.id); }
                        if (e.key === "Escape") setSelectedElId(null);
                      }}
                    >
                      {el.type === "image" ? (
                        <img src={el.src} alt="Design layer" draggable="false" className="h-full w-full object-cover" />
                      ) : el.type === "line" ? (
                        <div className="h-full w-full rounded-full" style={{ background: el.bg || el.fg }} />
                      ) : ["rect", "circle", "triangle"].includes(el.type) ? null : el.text}
                    </div>
                  );
                })}
                {graphicElements.length === 0 && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center text-slate-500">
                    <PenTool className="mb-2 h-8 w-8 opacity-50" />
                    <p className="text-sm font-bold">Your canvas is ready</p>
                    <p className="mt-1 text-xs">Add text, shapes or an image to start designing</p>
                  </div>
                )}
              </div>
            </Panel>

            <div className="space-y-4">
              <Panel title="Layers" subtitle={`${graphicElements.length} objects`}>
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {[...graphicElements].reverse().map((el) => (
                    <div key={el.id} className={`flex items-center gap-1 rounded-lg p-1.5 ${activeEl?.id === el.id ? "bg-violet-500/15 ring-1 ring-violet-400/40" : "bg-white/[0.03]"}`}>
                      <button type="button" onClick={() => setSelectedElId(el.id)} className="min-w-0 flex-1 truncate px-1 text-left text-[11px] font-bold text-slate-200">
                        {el.type === "image" ? "Image" : (el.text || el.type).slice(0, 24)}
                      </button>
                      <button type="button" title={el.visible === false ? "Show layer" : "Hide layer"} aria-label={el.visible === false ? "Show layer" : "Hide layer"} onClick={() => updateEl(el.id, { visible: el.visible === false })} className="rounded p-1 text-slate-400 hover:bg-white/10">{el.visible === false ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</button>
                      <button type="button" title={el.locked ? "Unlock layer" : "Lock layer"} aria-label={el.locked ? "Unlock layer" : "Lock layer"} onClick={() => updateEl(el.id, { locked: !el.locked })} className="rounded p-1 text-slate-400 hover:bg-white/10"><LockKeyhole className="h-3 w-3" /></button>
                      <button type="button" title="Move layer up" aria-label="Move layer up" onClick={() => moveLayer(el.id, 1)} className="rounded p-1 text-slate-400 hover:bg-white/10">↑</button>
                      <button type="button" title="Move layer down" aria-label="Move layer down" onClick={() => moveLayer(el.id, -1)} className="rounded p-1 text-slate-400 hover:bg-white/10">↓</button>
                    </div>
                  ))}
                  {graphicElements.length === 0 && <p className="py-4 text-center text-xs text-slate-500">No layers yet.</p>}
                </div>
              </Panel>

              <Panel title="Element inspector">
                {activeEl ? (
                  <div className="space-y-3 text-xs">
                    {activeEl.type !== "image" && !["rect", "circle", "triangle", "line"].includes(activeEl.type) && (
                      <label className="block font-bold text-slate-300">
                        Text
                        <textarea rows={3} className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-xs text-inherit" value={activeEl.text || ""} onChange={(e) => updateEl(activeEl.id, { text: e.target.value })} />
                      </label>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <label className="font-bold text-slate-300">Width
                        <input type="number" min="12" max="900" value={activeEl.w || 120} onChange={(e) => updateEl(activeEl.id, { w: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.04] px-2 py-2 text-inherit" />
                      </label>
                      <label className="font-bold text-slate-300">Height
                        <input type="number" min="4" max="600" value={activeEl.h || 40} onChange={(e) => updateEl(activeEl.id, { h: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.04] px-2 py-2 text-inherit" />
                      </label>
                    </div>
                    {!["rect", "circle", "triangle", "line", "image"].includes(activeEl.type) && (
                      <>
                        <label className="block font-bold text-slate-300">Font size · {activeEl.fontSize}px
                          <input type="range" min="10" max="72" value={activeEl.fontSize || 18} onChange={(e) => updateEl(activeEl.id, { fontSize: Number(e.target.value) })} className="mt-1 w-full" />
                        </label>
                        <label className="block font-bold text-slate-300">Font family
                          <select value={activeEl.fontFamily || "Arial"} onChange={(e) => updateEl(activeEl.id, { fontFamily: e.target.value })} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 px-2 py-2 text-white">
                            {["Arial", "Georgia", "Impact", "Trebuchet MS", "Courier New", "Verdana"].map((font) => <option key={font} value={font}>{font}</option>)}
                          </select>
                        </label>
                        <label className="block font-bold text-slate-300">Text alignment
                          <select value={activeEl.align || "left"} onChange={(e) => updateEl(activeEl.id, { align: e.target.value })} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 px-2 py-2 text-white">
                            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                          </select>
                        </label>
                        <label className="flex items-center gap-2 font-bold text-slate-300"><input type="checkbox" checked={!!activeEl.shadow} onChange={(e) => updateEl(activeEl.id, { shadow: e.target.checked })} /> Text shadow</label>
                        <label className="block font-bold text-slate-300">Letter spacing · {activeEl.letterSpacing || 0}px
                          <input type="range" min="-2" max="12" step="0.5" value={activeEl.letterSpacing || 0} onChange={(e) => updateEl(activeEl.id, { letterSpacing: Number(e.target.value) })} className="mt-1 w-full" />
                        </label>
                      </>
                    )}
                    <label className="block font-bold text-slate-300">{activeEl.type === "image" ? "Tint / background" : "Fill color"}
                      <input type="color" value={activeEl.bg && activeEl.bg !== "transparent" ? activeEl.bg : activeEl.fg || "#7c3aed"} onChange={(e) => updateEl(activeEl.id, { bg: e.target.value, fg: e.target.value })} className="mt-1 h-8 w-full cursor-pointer rounded bg-transparent" />
                    </label>
                    {!["rect", "circle", "triangle", "line", "image"].includes(activeEl.type) && (
                      <label className="block font-bold text-slate-300">Text color
                        <input type="color" value={activeEl.fg || "#172033"} onChange={(e) => updateEl(activeEl.id, { fg: e.target.value })} className="mt-1 h-8 w-full cursor-pointer rounded bg-transparent" />
                      </label>
                    )}
                    <label className="block font-bold text-slate-300">Opacity · {Math.round((activeEl.opacity ?? 1) * 100)}%
                      <input type="range" min="0.1" max="1" step="0.05" value={activeEl.opacity ?? 1} onChange={(e) => updateEl(activeEl.id, { opacity: Number(e.target.value) })} className="mt-1 w-full" />
                    </label>
                    <label className="block font-bold text-slate-300">Rotation · {activeEl.rotation || 0}°
                      <input type="range" min="-180" max="180" value={activeEl.rotation || 0} onChange={(e) => updateEl(activeEl.id, { rotation: Number(e.target.value) })} className="mt-1 w-full" />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Btn secondary onClick={() => duplicateEl(activeEl)}><Copy className="h-3.5 w-3.5" /> Duplicate</Btn>
                      <Btn secondary onClick={() => removeEl(activeEl.id)}><Trash2 className="h-3.5 w-3.5" /> Delete</Btn>
                    </div>
                  </div>
                ) : <p className="text-xs text-slate-400">Select a layer to edit its properties.</p>}
              </Panel>
            </div>
          </div>
        </div>
      );
    }

    // 6. DIY & Handmade — maker workspace
    if (activeCategory === "diy") {
      return <DIYWorkbench project={project} patchProject={patchProject} notify={notify} />;
    }

    // 7. Music & Audio Editor — multitrack workstation
    if (activeCategory === "music") {
      return <MultiTrackAudioStudio project={project} patchProject={patchProject} notify={notify} />;
    }

    // 8. Writing & Stories
    if (activeCategory === "writing") {
      const totalWords = writingBlocks
        .map((b) => b.text.trim())
        .join(" ")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;

      return (
        <Panel
          title="Story, Comic & Script Builder"
          subtitle="Manage scene or panel blocks and export as TXT."
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {["Story", "Comic script", "Screenplay"].map((m) => (
                <Btn
                  key={m}
                  secondary
                  active={writingMode === m}
                  onClick={() => patchSettings({ writingMode: m })}
                >
                  {m}
                </Btn>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{totalWords} words</span>
              <Btn
                secondary
                onClick={() =>
                  patchProject({
                    writingBlocks: [
                      ...writingBlocks,
                      {
                        id: makeId("blk"),
                        title:
                          writingMode === "Comic script"
                            ? `Panel ${writingBlocks.length + 1}`
                            : `Scene ${writingBlocks.length + 1}`,
                        text: "",
                      },
                    ],
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add Block
              </Btn>
              <Btn
                onClick={() => {
                  const safeName = (project.title || "script").replace(/[^a-z0-9-_]/gi, "-");
                  const body = writingBlocks.map((b) => `### ${b.title}\n${b.text}`).join("\n\n");
                  downloadFile(
                    new Blob([body], { type: "text/plain;charset=utf-8" }),
                    `${safeName}.txt`
                  );
                }}
              >
                <Download className="h-3.5 w-3.5" /> TXT
              </Btn>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {writingBlocks.map((blk, idx) => (
              <div
                key={blk.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <input
                    className="flex-1 rounded-lg border border-white/10 bg-transparent px-2.5 py-1 text-xs font-bold text-violet-200"
                    value={blk.title}
                    onChange={(e) =>
                      patchProject({
                        writingBlocks: writingBlocks.map((item, i) =>
                          i === idx ? { ...item, title: e.target.value } : item
                        ),
                      })
                    }
                  />
                  {writingBlocks.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        patchProject({
                          writingBlocks: writingBlocks.filter((_, i) => i !== idx),
                        })
                      }
                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <textarea
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 p-2.5 text-xs leading-6 text-slate-100"
                  value={blk.text}
                  onChange={(e) =>
                    patchProject({
                      writingBlocks: writingBlocks.map((item, i) =>
                        i === idx ? { ...item, text: e.target.value } : item
                      ),
                    })
                  }
                  placeholder="Write scene action or dialogue..."
                />
              </div>
            ))}
          </div>
        </Panel>
      );
    }

    // 9. Fashion & Interior — 2D floor plan and isometric room planner
    if (activeCategory === "design") {
      return <InteriorPlanner project={project} patchProject={patchProject} />;
    }

    // 10. Learning & Experiments
    const expMode = settings.experimentMode || "wave";
    const sides = settings.geometrySides ?? 6;
    const r = Math.round(experiment * 2.55);
    const g = Math.round((100 - experiment) * 2.55);
    const b = Math.round(160 - experiment * 0.8);

    const polyPoints = Array.from({ length: Math.max(3, Math.min(12, sides)) }, (_, idx) => {
      const n = Math.max(3, Math.min(12, sides));
      const ang = (idx / n) * Math.PI * 2 - Math.PI / 2 + (simTick * Math.PI) / 90;
      return `${(150 + Math.cos(ang) * 72).toFixed(1)},${(110 + Math.sin(ang) * 72).toFixed(1)}`;
    }).join(" ");

    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Panel
          title="Interactive Science & Math Lab"
          subtitle="Live animated wave, rotating polygon & RGB colour mixer."
        >
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              { id: "wave", label: "Live Wave" },
              { id: "geometry", label: "Polygon Lab" },
              { id: "color", label: "RGB Mixer" },
            ].map((m) => (
              <Btn
                key={m.id}
                secondary
                active={expMode === m.id}
                onClick={() => patchSettings({ experimentMode: m.id })}
              >
                {m.label}
              </Btn>
            ))}
          </div>

          {expMode === "wave" && (
            <div className="grid h-56 place-items-center rounded-2xl bg-slate-950 p-4">
              <svg viewBox="0 0 400 160" className="h-full w-full">
                <path
                  d={Array.from({ length: 81 }, (_, x) => {
                    const px = x * 5;
                    const amp = 12 + (experiment / 100) * 44;
                    const py = 80 + Math.sin(px * 0.035 + simTick * 0.14) * amp;
                    return `${x === 0 ? "M" : "L"}${px},${py.toFixed(1)}`;
                  }).join(" ")}
                  fill="none"
                  stroke="#a78bfa"
                  strokeWidth="3.5"
                />
              </svg>
            </div>
          )}

          {expMode === "geometry" && (
            <div className="grid h-56 place-items-center rounded-2xl bg-slate-950 p-4">
              <svg viewBox="0 0 300 220" className="h-full w-full">
                <polygon
                  points={polyPoints}
                  fill="rgba(139, 92, 246, 0.25)"
                  stroke="#c4b5fd"
                  strokeWidth="3"
                />
              </svg>
            </div>
          )}

          {expMode === "color" && (
            <div
              className="grid h-56 place-items-center rounded-2xl"
              style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
            >
              <span className="rounded-xl bg-black/65 px-4 py-2 text-sm font-black text-white">
                rgb({r}, {g}, {b})
              </span>
            </div>
          )}
        </Panel>

        <Panel title="Experiment Controls">
          <label className="block text-xs font-bold text-slate-200">
            Parameter ({experiment})
            <input
              type="range"
              min="0"
              max="100"
              className="mt-2 w-full"
              value={experiment}
              onChange={(e) => patchSettings({ experiment: Number(e.target.value) })}
            />
          </label>
          {expMode === "geometry" && (
            <label className="mt-4 block text-xs font-bold text-slate-200">
              Sides ({sides})
              <input
                type="range"
                min="3"
                max="12"
                className="mt-2 w-full"
                value={sides}
                onChange={(e) => patchSettings({ geometrySides: Number(e.target.value) })}
              />
            </label>
          )}
        </Panel>
      </div>
    );
  };

  const openStudio = (catId) => {
    if (project.category !== catId) {
      handleNewProject(catId);
    } else {
      setActiveCategory(catId);
    }
    setStudioOpen(true);
  };

  const lastRequestedCategory = useRef("");
  useEffect(() => {
    if (!initialCategory) {
      lastRequestedCategory.current = "";
      setStudioOpen(false);
      return;
    }
    if (!CATEGORIES.some((item) => item.id === initialCategory)) return;
    if (lastRequestedCategory.current === initialCategory) return;
    lastRequestedCategory.current = initialCategory;
    openStudio(initialCategory);
  }, [initialCategory]); // open the studio selected from the parent navigation

  const closeStudio = async () => {
    stopBeat();
    setVideoPlaying(false);
    setPlaying(false);
    if (saveStatus === "unsaved") await handleSave(true);
    setStudioOpen(false);
  };
  const exitToDashboard = async () => {
    await closeStudio();
    if (onBackToMain) onBackToMain();
    else window.dispatchEvent(new CustomEvent("plotcraft:exit"));
  };
  const closeRef = useRef(null);
  closeRef.current = closeStudio;
  useEffect(() => {
    if (!studioOpen) return undefined;
    window.history.pushState({ pcpStudio: true }, "");
    const onPop = () => closeRef.current && closeRef.current();
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.history.state && window.history.state.pcpStudio) window.history.back();
    };
  }, [studioOpen]);
  useEffect(() => {
    if (!studioOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape" && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) closeStudio(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const CatIcon = category.Icon;

  if (studioOpen) {
    return (
      <div className={`pcp-root ${scope}`} data-theme={themeName} style={accentStyle}>
      <style>{THEME_CSS}</style>
      <div
        className="relative flex min-h-[100dvh] w-full flex-col bg-[#080d1a] text-slate-100"
        role="application"
        aria-label={`${category.title} studio`}
      >
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0e1528]/95 px-3 backdrop-blur sm:px-6 xl:px-10">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={closeStudio} title="Back to PlotCraft home (Esc)" aria-label="Back to PlotCraft home" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="hidden shrink-0 items-center gap-1.5 text-[11px] font-bold text-slate-400 sm:inline-flex">
              <CatIcon className="h-3.5 w-3.5" /> {category.title} <span className="text-slate-600">/</span>
            </span>
            <input type="text" value={project.title} onChange={(e) => patchProject({ title: e.target.value })} aria-label="Project title" className="min-w-0 max-w-[220px] rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-black text-white hover:border-white/10 focus:border-violet-400 focus:outline-none" />
            <span className="hidden items-center gap-1 text-[11px] text-slate-400 md:inline-flex">
              {saveStatus === "saved" && (<><Check className="h-3.5 w-3.5 text-emerald-400" /> Saved</>)}
              {saveStatus === "unsaved" && "Saving…"}
              {saveStatus === "error" && "Error"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span className="hidden lg:inline-flex"><ThemePicker value={proTheme} onChange={pickTheme} /></span>
            <Btn secondary onClick={() => setProjectsOpen((v) => !v)}><FolderOpen className="h-3.5 w-3.5" /><span className="hidden sm:inline">Projects ({projects.length})</span></Btn>
            <Btn secondary onClick={() => handleSave(false)}><Save className="h-3.5 w-3.5" /><span className="hidden sm:inline">Save</span></Btn>
            <Btn secondary onClick={handleExportJSON}><Download className="h-3.5 w-3.5" /><span className="hidden md:inline">JSON</span></Btn>
            <Btn onClick={() => handleNewProject(activeCategory)}><Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">New</span></Btn>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          

          <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5">
            <div className="mx-auto max-w-[1680px]">{renderStudioBody()}</div>
          </main>

          {projectsOpen && (
            <aside className="w-80 shrink-0 overflow-y-auto border-l border-white/10 bg-[#0e1528] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Saved Projects
                </h3>
                <button
                  type="button"
                  onClick={() => setProjectsOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {projects.length === 0 ? (
                <p className="text-xs text-slate-400">No saved projects yet.</p>
              ) : (
                <div className="space-y-2">
                  {projects.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${
                        item.id === project.id
                          ? "border-violet-500/60 bg-violet-500/10"
                          : "border-white/10 bg-white/[0.02]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenProject(item)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="truncate text-xs font-bold text-white">{item.title}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.category} ·{" "}
                          {new Date(item.updatedAt || Date.now()).toLocaleDateString()}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateProject(item)}
                        title="Duplicate project"
                        aria-label="Duplicate project"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-violet-300"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(item.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          )}
        </div>

        {toast && (
          <div className="pointer-events-none fixed bottom-4 right-4 z-50 rounded-xl border border-violet-400/30 bg-slate-900/95 px-4 py-2.5 text-xs font-bold text-white shadow-xl">
            {toast}
          </div>
        )}
      </div>
      </div>
    );
  }

  return (
    <div className={`pcp-root ${scope}`} data-theme={themeName} style={accentStyle}>
      <style>{THEME_CSS}</style>
      <ProLanding
        categories={filteredCategories}
        search={search}
        setSearch={setSearch}
        onOpen={openStudio}
        projects={projects}
        onOpenProject={(p) => {
          handleOpenProject(p);
          setStudioOpen(true);
        }}
        onDeleteProject={handleDeleteProject}
        currentUser={currentUser}
        onBack={onBackToMain || (() => window.dispatchEvent(new CustomEvent("plotcraft:exit")))}
        toast={toast}
        proTheme={proTheme}
        onTheme={pickTheme}
        themeName={themeName}
      />
    </div>
  );
}

/* ===== Landing page (merged from ProLanding.JSX) ===== */

/**
 * KineMaster-style landing for PlotCraft Pro.
 * Props come straight from PlotCraftPro.jsx (see README steps in chat).
 */

const LANDING_CSS = `
@keyframes pcp-play { from { left: 4% } to { left: 94% } }
@keyframes pcp-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
.pcp-playhead { animation: pcp-play 7s linear infinite; }
.pcp-float { animation: pcp-float 5s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .pcp-playhead, .pcp-float { animation: none; } }
`;

const STEPS = [
  { t: "Pick a studio", d: "Ten tools, one workspace. Start from drawing, animation, video, music or any other studio." },
  { t: "Create with real tools", d: "Layers, keyframes, split clips, snapped CAD parts, step sequencer and more, all live in your browser." },
  { t: "Save and export", d: "Projects auto-save on your device. Export PNG, TXT, JSON and more when you are done." },
];

const FAQ = [
  ["Do I need an account?", "No. Everything runs in your browser and saves locally. Logging in on the main app also syncs your activity."],
  ["Where are my projects stored?", "In your browser's IndexedDB, so they stay on this device until you delete them."],
  ["Can I import my own media?", "Yes. Video Studio imports local video files, and Art / Graphic studios export PNG."],
  ["Does it work on mobile?", "Yes. Every studio is responsive and touch-friendly."],
];

const TRACKS = [
  { c: "bg-sky-500", clips: [[4, 28], [32, 30], [66, 28]] },
  { c: "bg-fuchsia-500", clips: [[10, 24], [44, 40]] },
  { c: "bg-amber-400", clips: [[2, 16], [24, 20], [58, 30]] },
  { c: "bg-emerald-500", clips: [[6, 88]] },
];

function EditorMock() {
  return (
    <div className="pcp-float overflow-hidden rounded-2xl border border-white/10 bg-[#0b1020] shadow-2xl shadow-violet-900/40">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 text-[10px] font-bold text-slate-400">untitled-project · PlotCraft Pro</span>
      </div>
      <div className="grid grid-cols-[1fr_120px] gap-3 p-3">
        <div className="relative grid aspect-video place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-amber-400">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-black/40 backdrop-blur">
            <Play className="h-5 w-5 fill-white text-white" />
          </div>
          <span className="absolute bottom-2 left-3 rounded bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white">
            Text overlay
          </span>
        </div>
        <div className="space-y-2 text-[10px] font-bold text-slate-300">
          {["Cinematic", "Vivid", "Noir", "Warm"].map((f, i) => (
            <div key={f} className={`rounded-lg border px-2 py-1.5 ${i === 0 ? "border-violet-400 bg-violet-500/20" : "border-white/10 bg-white/5"}`}>
              {f}
            </div>
          ))}
        </div>
      </div>
      <div className="relative space-y-1.5 border-t border-white/10 p-3">
        {TRACKS.map((tr, i) => (
          <div key={i} className="relative h-5 rounded bg-white/5">
            {tr.clips.map(([l, w], j) => (
              <span key={j} className={`absolute top-0.5 bottom-0.5 rounded ${tr.c} opacity-90`} style={{ left: `${l}%`, width: `${w}%` }} />
            ))}
          </div>
        ))}
        <span className="pcp-playhead absolute bottom-2 top-2 w-0.5 bg-white shadow-[0_0_8px_#fff]" />
      </div>
    </div>
  );
}

function ProLandingPage({
  categories, search, setSearch, onOpen, projects = [], onOpenProject, onDeleteProject,
  currentUser, onBack, toast,
}) {
  const [faq, setFaq] = useState(0);
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen overflow-clip rounded-3xl bg-[#070b17] text-slate-100">
      <style>{LANDING_CSS}</style>

      {/* top bar */}
      <nav className="sticky top-0 z-30 border-b border-white/10 bg-[#070b17]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            {onBack && (
              <button type="button" onClick={onBack} className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:bg-white/10" aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <span className="text-sm font-black tracking-tight">PlotCraft Pro</span>
          </div>
          <div className="hidden items-center gap-6 text-xs font-bold text-slate-300 sm:flex">
            <button type="button" onClick={() => scrollTo("pcp-studios")} className="hover:text-white">Studios</button>
            <button type="button" onClick={() => scrollTo("pcp-how")} className="hover:text-white">How it works</button>
            <button type="button" onClick={() => scrollTo("pcp-faq")} className="hover:text-white">FAQ</button>
          </div>
          <button type="button" onClick={() => onOpen("video")} className="rounded-full bg-violet-600 px-4 py-1.5 text-xs font-black text-white hover:bg-violet-500">
            Start creating
          </button>
        </div>
      </nav>

      {/* hero */}
      <header className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-8 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="text-xs font-bold text-violet-300">
              {currentUser?.name ? `Welcome back, ${currentUser.name}` : "Ten studios. Zero installs."}
            </p>
            <h1 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Draw it, animate it, cut it, score it.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-300 sm:text-base">
              A full creative suite in your browser: layered painting, 3D characters, keyframe animation, a video editor
              with filters and text, a step sequencer, and more.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => onOpen("art")} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-900 hover:bg-violet-100">
                <Rocket className="h-4 w-4" /> Open a studio
              </button>
              <button type="button" onClick={() => scrollTo("pcp-studios")} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-white hover:bg-white/10">
                Browse all ten <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <dl className="mt-8 flex gap-8 text-xs text-slate-400">
              <div><dt>Studios</dt><dd className="text-xl font-black text-white">10</dd></div>
              <div><dt>Export formats</dt><dd className="text-xl font-black text-white">PNG · TXT · JSON</dd></div>
              <div><dt>Saved projects</dt><dd className="text-xl font-black text-white">{projects.length}</dd></div>
            </dl>
          </div>
          <EditorMock />
        </div>
      </header>

      {/* feature strip */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {[
            [Layers, "Real tools", "Layers, keyframes, clip splitting, CAD snapping."],
            [Zap, "Instant", "No uploads or waiting. Everything runs locally."],
            [HardDrive, "Auto-save", "Projects persist on your device."],
            [Download, "Export", "PNG, TXT and project files in one click."],
          ].map(([Icon, t, d]) => (
            <div key={t} className="flex gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-violet-300"><Icon className="h-4 w-4" /></span>
              <div><h3 className="text-sm font-black">{t}</h3><p className="text-xs leading-relaxed text-slate-400">{d}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* studios */}
      <section id="pcp-studios" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-14 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black sm:text-3xl">Every studio, fully hands-on</h2>
            <p className="mt-1 text-sm text-slate-400">Pick one and start. Your work saves automatically.</p>
          </div>
          <label className="relative flex w-full items-center sm:w-72">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search studios or tools..."
              className="w-full rounded-full border border-white/15 bg-white/[0.04] py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-slate-400 focus:border-violet-400 focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => {
            const Icon = c.Icon;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onOpen(c.id)}
                className="group flex flex-col rounded-2xl border border-white/10 bg-[#0e1528] p-5 text-left transition hover:-translate-y-1 hover:border-violet-400/60 hover:shadow-xl hover:shadow-violet-900/30"
              >
                <span className={`grid h-11 w-11 place-items-center rounded-xl border bg-gradient-to-br ${c.accent}`}><Icon className="h-5 w-5" /></span>
                <h3 className="mt-4 text-base font-black">{c.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{c.detail}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {c.tools.map((t) => (
                    <span key={t} className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300">{t}</span>
                  ))}
                </div>
                <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-violet-300 group-hover:text-white">
                  <MousePointer2 className="h-3.5 w-3.5" /> Open studio <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </span>
              </button>
            );
          })}
          {categories.length === 0 && <p className="col-span-full text-sm text-slate-400">No studio matches "{search}".</p>}
        </div>
      </section>

      {/* how it works */}
      <section id="pcp-how" className="scroll-mt-16 border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
          <h2 className="text-2xl font-black sm:text-3xl">From blank canvas to export in three steps</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.t} className="rounded-2xl border border-white/10 bg-[#0e1528] p-5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-600 text-xs font-black">{i + 1}</span>
                <h3 className="mt-3 text-sm font-black">{s.t}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* saved projects */}
      {projects.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
          <h2 className="text-2xl font-black">Continue where you left off</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0e1528] p-3">
                <button type="button" onClick={() => onOpenProject(p)} className="min-w-0 flex-1 text-left">
                  <div className="truncate text-sm font-bold">{p.title}</div>
                  <div className="text-[11px] text-slate-400">{p.category} · {new Date(p.updatedAt || Date.now()).toLocaleDateString()}</div>
                </button>
                <button type="button" onClick={() => onDeleteProject(p.id)} aria-label="Delete project" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* faq */}
      <section id="pcp-faq" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-14 sm:px-8">
        <h2 className="text-2xl font-black">Questions</h2>
        <div className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#0e1528]">
          {FAQ.map(([q, a], i) => (
            <div key={q}>
              <button type="button" onClick={() => setFaq(faq === i ? -1 : i)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-bold">
                {q}
                <ChevronDown className={`h-4 w-4 shrink-0 transition ${faq === i ? "rotate-180" : ""}`} />
              </button>
              {faq === i && <p className="px-5 pb-4 text-xs leading-relaxed text-slate-400">{a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* cta */}
      <section className="px-4 pb-16 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 rounded-3xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-10 text-center">
          <h2 className="text-2xl font-black sm:text-3xl">Your next project starts here</h2>
          <button type="button" onClick={() => onOpen("art")} className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-black text-slate-900">
            <Sparkles className="h-4 w-4" /> Start creating free <Check className="h-4 w-4" />
          </button>
        </div>
      </section>

      {toast && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 rounded-xl border border-violet-400/30 bg-slate-900/95 px-4 py-2.5 text-xs font-bold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ===== Dashboard (AiDashboard.jsx) ===== */


const SOCIALS = [
  { name: "Facebook", url: "https://www.facebook.com/profile.php?id=100042589516239", path: "M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" },
  { name: "Instagram", url: "https://www.instagram.com/im_gk_5?psln=OWs4Z2x3dDB0Mmlr", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" },
  { name: "YouTube", url: "https://youtube.com/@flashman_entertainments?si=JuYUNiXGAYGCUFTr", path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136c-1.871-.505-9.376-.505-9.376-.505s-7.505 0-9.377.505a3.017 3.017 0 0 0-2.122 2.136c-.505 1.873-.505 5.814-.505 5.814s0 3.941.505 5.814c.276 1.026 1.096 1.846 2.122 2.136 1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136c.505-1.873.505-5.814.505-5.814s0-3.941-.505-5.814zM9.545 15.568v-7.136l6.364 3.568-6.364 3.568z" },
  { name: "Twitter / X", url: "https://x.com/Ganeshk1537693", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
  { name: "LinkedIn", url: "https://in.linkedin.com/in/ganesh-k-5b450528b", path: "M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" }
];

// ======================= EDIT YOUR DETAILS HERE =======================
const DEVELOPER = {
  name: "K. Ganesh",
  initials: "KG",
  role: "Full-Stack & AI Application Developer",
  about:
    "I designed and built PlotCraft AI Studio end to end: the interface, the login system, the story engine and the image and video tools. My goal is to make AI storytelling simple and fun for kids and families.",
  phone: "+91 00000 00000",      // <- put your real number
  whatsapp: "910000000000",      // <- country code + number, no + or spaces
  email: "your-email@example.com", // <- put your real email
  skills: [
    "React", "JavaScript", "Tailwind CSS", "REST APIs", "AI integration",
    "Authentication", "Responsive UI", "Text-to-Speech", "Node.js backend"
  ],
  built: [
    { icon: "story", title: "Multi-page AI Story Writer", desc: "Plans the story first, then writes it page by page (up to 20 pages) using several AI providers, with a Continue option if an engine is busy." },
    { icon: "image", title: "Script to Image", desc: "Turns a scene description into 2D storybook art or 3D cinematic renders, with download." },
    { icon: "video", title: "AI Video Studio", desc: "Creates 5, 7 or 10 second motion videos from a prompt, with an animated image fallback." },
    { icon: "chat", title: "AI Chat", desc: "A built-in assistant for ideas, questions and help while you create." },
    { icon: "auth", title: "Accounts & Login", desc: "Register, login and a secure session. Image and video tools unlock after login." },
    { icon: "read", title: "Read Aloud & TXT Download", desc: "Listen to the whole story or save it as a text file with page headings." },
    { icon: "star", title: "History & Top Rated", desc: "Recent stories are saved on your device, and the community can review the best stories." },
    { icon: "theme", title: "Themes & Responsive Design", desc: "Light, dark and Dream themes that are remembered, working on phone, tablet and desktop." }
  ]
};
// =====================================================================

const BUILT_ICONS = {
  story: BookOpen, image: ImageIcon, video: Video, chat: MessageSquare,
  auth: LockKeyhole, read: Volume2, star: Star, theme: Palette
};

function DeveloperSection({ currentStyle }) {
  const [copied, setCopied] = useState(false);
  const telHref = `tel:${DEVELOPER.phone.replace(/[^\d+]/g, "")}`;

  const copyPhone = async () => {
    try {
      await navigator.clipboard.writeText(DEVELOPER.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked by the browser */
    }
  };

  const stats = [
    { value: "3", label: "Creation tools" },
    { value: "20", label: "Pages per story" },
    { value: "8", label: "Themes" },
    { value: "5", label: "AI features" }
  ];

  return (
    <div className="space-y-6 w-full animate-slide-in-left">
      {/* hero */}
      <section className={`rounded-3xl p-6 sm:p-8 ${currentStyle.bgCard}`}>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-24 h-24 rounded-3xl bg-purple-600 text-white flex items-center justify-center text-3xl font-black shrink-0">
            {DEVELOPER.initials}
          </div>
          <div className="text-center sm:text-left space-y-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${currentStyle.badgeBg}`}>
              <Code2 className="w-3.5 h-3.5" /> About the Developer
            </span>
            <h2 className="text-2xl sm:text-3xl font-black">{DEVELOPER.name}</h2>
            <p className="text-sm font-bold opacity-80">{DEVELOPER.role}</p>
            <p className="text-sm opacity-75 max-w-2xl leading-relaxed">{DEVELOPER.about}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {stats.map((s) => (
            <div key={s.label} className={`rounded-2xl p-3 text-center ${currentStyle.panelBg}`}>
              <p className="text-2xl font-black">{s.value}</p>
              <p className="text-[11px] opacity-70 font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* what the developer built */}
      <section className={`rounded-3xl p-6 sm:p-8 ${currentStyle.bgCard} space-y-4`}>
        <h3 className="font-black text-base flex items-center gap-2">
          <Rocket className="w-4 h-4 text-purple-600" /> What I built in PlotCraft
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {DEVELOPER.built.map((item) => {
            const Icon = BUILT_ICONS[item.icon] || CheckCircle2;
            return (
              <div key={item.title} className={`rounded-2xl p-4 flex gap-3 ${currentStyle.panelBg}`}>
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black">{item.title}</p>
                  <p className="text-xs opacity-75 leading-relaxed mt-0.5">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* skills */}
      <section className={`rounded-3xl p-6 sm:p-8 ${currentStyle.bgCard} space-y-3`}>
        <h3 className="font-black text-base flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-600" /> Skills & Technology
        </h3>
        <div className="flex flex-wrap gap-2">
          {DEVELOPER.skills.map((skill) => (
            <span key={skill} className={`px-3 py-1.5 rounded-full text-xs font-bold ${currentStyle.badgeBg}`}>{skill}</span>
          ))}
        </div>
      </section>

      {/* contact */}
      <section className={`rounded-3xl p-6 sm:p-8 ${currentStyle.bgCard} space-y-5`}>
        <div>
          <h3 className="font-black text-base flex items-center gap-2">
            <Phone className="w-4 h-4 text-purple-600" /> Contact the Developer
          </h3>
          <p className="text-xs opacity-70 mt-1">Have an idea, feedback or a project in mind? Reach out any time.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className={`rounded-2xl p-4 flex items-center justify-between gap-3 ${currentStyle.panelBg}`}>
            <div className="flex items-center gap-3 min-w-0">
              <Phone className="w-5 h-5 shrink-0 text-purple-600" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider opacity-60 font-bold">Phone</p>
                <p className="text-sm font-black truncate">{DEVELOPER.phone}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={copyPhone}
              title="Copy number"
              className={`p-2 rounded-lg ${currentStyle.btnSecondary} cursor-pointer`}
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className={`rounded-2xl p-4 flex items-center gap-3 ${currentStyle.panelBg}`}>
            <Mail className="w-5 h-5 shrink-0 text-purple-600" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider opacity-60 font-bold">Email</p>
              <p className="text-sm font-black truncate">{DEVELOPER.email}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={telHref} className={`px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer ${currentStyle.btnPrimary}`}>
            <Phone className="w-4 h-4" /> Call now
          </a>
          <a
            href={`https://wa.me/${DEVELOPER.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className={`px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer ${currentStyle.btnSecondary}`}
          >
            <MessageSquare className="w-4 h-4" /> WhatsApp
          </a>
          <a
            href={`mailto:${DEVELOPER.email}?subject=${encodeURIComponent("PlotCraft AI - Hello")}`}
            className={`px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer ${currentStyle.btnSecondary}`}
          >
            <Mail className="w-4 h-4" /> Send email
          </a>
        </div>

        <div className="pt-4 border-t border-current/10">
          <p className="text-[10px] uppercase tracking-wider opacity-60 font-bold mb-2">Follow & connect</p>
          <div className="flex flex-wrap items-center gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                title={s.name}
                className="flex items-center gap-2 px-3 py-2 rounded-full border border-current/20 text-xs font-bold hover:bg-purple-600 hover:text-white transition cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d={s.path} /></svg>
                {s.name}
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ======================= BRAIN GAMES =======================
const shuffleArr = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const readStore = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const writeStore = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};

function GameShell({ currentStyle, icon: Icon, title, skill, chips, children }) {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 animate-slide-in-left">
      <div className={`rounded-3xl p-5 ${currentStyle.bgCard} flex flex-wrap items-center gap-4`}>
        <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black">{title}</h2>
          <p className="text-xs opacity-75">{skill}</p>
        </div>
        {chips && <div className="flex flex-wrap gap-2">{chips}</div>}
      </div>
      <div className={`rounded-3xl p-5 sm:p-6 ${currentStyle.bgCard}`}>{children}</div>
    </div>
  );
}

function GameChip({ currentStyle, children }) {
  return <span className={`px-3 py-1.5 rounded-full text-xs font-black ${currentStyle.badgeBg}`}>{children}</span>;
}

function LevelTabs({ levels, value, onChange, currentStyle }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {Object.entries(levels).map(([key, cfg]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer ${
            value === key ? "bg-purple-600 text-white shadow-md" : currentStyle.btnSecondary
          }`}
        >
          {cfg.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- 1. SUDOKU ---------------- */
const SUDOKU_LEVELS = {
  easy: { label: "Easy · 4×4", n: 4, br: 2, bc: 2, remove: 8 },
  medium: { label: "Medium · 6×6", n: 6, br: 2, bc: 3, remove: 20 },
  hard: { label: "Hard · 9×9", n: 9, br: 3, bc: 3, remove: 46 }
};

function sudokuCandidates(g, n, br, bc, r, c) {
  const used = new Set();
  for (let i = 0; i < n; i++) {
    used.add(g[r * n + i]);
    used.add(g[i * n + c]);
  }
  const sr = r - (r % br);
  const sc = c - (c % bc);
  for (let i = 0; i < br; i++) for (let j = 0; j < bc; j++) used.add(g[(sr + i) * n + sc + j]);
  const out = [];
  for (let v = 1; v <= n; v++) if (!used.has(v)) out.push(v);
  return out;
}

function sudokuSolve(grid, n, br, bc, limit, randomize) {
  const g = grid.slice();
  let count = 0;
  let solution = null;
  const rec = () => {
    let best = -1;
    let bestCand = null;
    for (let i = 0; i < g.length; i++) {
      if (g[i] !== 0) continue;
      const cand = sudokuCandidates(g, n, br, bc, Math.floor(i / n), i % n);
      if (cand.length === 0) return;
      if (!bestCand || cand.length < bestCand.length) {
        best = i;
        bestCand = cand;
        if (cand.length === 1) break;
      }
    }
    if (best === -1) {
      count++;
      if (!solution) solution = g.slice();
      return;
    }
    for (const v of randomize ? shuffleArr(bestCand) : bestCand) {
      g[best] = v;
      rec();
      g[best] = 0;
      if (count >= limit) return;
    }
  };
  rec();
  return { count, solution };
}

function makeSudoku(levelKey) {
  const { n, br, bc, remove } = SUDOKU_LEVELS[levelKey];
  const full = sudokuSolve(new Array(n * n).fill(0), n, br, bc, 1, true).solution;
  const puzzle = full.slice();
  let removed = 0;
  for (const idx of shuffleArr([...Array(n * n).keys()])) {
    if (removed >= remove) break;
    const backup = puzzle[idx];
    puzzle[idx] = 0;
    if (sudokuSolve(puzzle, n, br, bc, 2, false).count !== 1) puzzle[idx] = backup;
    else removed++;
  }
  return { puzzle, solution: full, values: puzzle.slice() };
}

function SudokuGame({ currentStyle, onActivity }) {
  const [level, setLevel] = useState("easy");
  const [board, setBoard] = useState(() => makeSudoku("easy"));
  const [selected, setSelected] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const [hints, setHints] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const playedRef = useRef(false);

  const { n, br, bc } = SUDOKU_LEVELS[level];
  const won = board.values.every((v, i) => v === board.solution[i]);

  useEffect(() => {
    if (won) return undefined;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [won]);

  const newGame = (lv) => {
    setLevel(lv);
    setBoard(makeSudoku(lv));
    setSelected(null);
    setShowErrors(false);
    setHints(0);
    setSeconds(0);
    playedRef.current = false;
  };

  useEffect(() => {
    if (won) onActivity?.("game", `Completed Sudoku (${level}) in ${formatTime(seconds)}`);
  }, [won]); // eslint-disable-line react-hooks/exhaustive-deps

  const setCell = (v) => {
    if (selected === null || won || board.puzzle[selected] !== 0) return;
    if (!playedRef.current) {
      playedRef.current = true;
      onActivity?.("game", `Played Sudoku (${level})`);
    }
    setBoard((b) => {
      const values = b.values.slice();
      values[selected] = v;
      return { ...b, values };
    });
  };

  const giveHint = () => {
    if (won) return;
    let idx = selected;
    if (idx === null || board.puzzle[idx] !== 0 || board.values[idx] === board.solution[idx]) {
      idx = board.values.findIndex((v, i) => v !== board.solution[i]);
    }
    if (idx < 0) return;
    setBoard((b) => {
      const values = b.values.slice();
      values[idx] = b.solution[idx];
      return { ...b, values };
    });
    setSelected(idx);
    setHints((h) => h + 1);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.target && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (/^[1-9]$/.test(e.key) && Number(e.key) <= n) setCell(Number(e.key));
      else if (["Backspace", "Delete", "0"].includes(e.key)) setCell(0);
      else if (selected !== null && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const r = Math.floor(selected / n);
        const c = selected % n;
        const nr = Math.min(n - 1, Math.max(0, r + (e.key === "ArrowDown") - (e.key === "ArrowUp")));
        const nc = Math.min(n - 1, Math.max(0, c + (e.key === "ArrowRight") - (e.key === "ArrowLeft")));
        setSelected(nr * n + nc);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const sel = selected;
  const selR = sel !== null ? Math.floor(sel / n) : -1;
  const selC = sel !== null ? sel % n : -1;

  return (
    <GameShell
      currentStyle={currentStyle}
      icon={Grid3x3}
      title="Sudoku"
      skill="Trains logic, patience and focus. Every row, column and box must contain each number once."
      chips={
        <>
          <GameChip currentStyle={currentStyle}>⏱ {formatTime(seconds)}</GameChip>
          <GameChip currentStyle={currentStyle}>💡 {hints} hints</GameChip>
        </>
      }
    >
      <div className="space-y-5">
        <LevelTabs levels={SUDOKU_LEVELS} value={level} onChange={newGame} currentStyle={currentStyle} />

        <div
          className="mx-auto w-full max-w-[460px] grid rounded-xl overflow-hidden"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, border: "2px solid var(--pc-accent)" }}
        >
          {board.values.map((v, i) => {
            const r = Math.floor(i / n);
            const c = i % n;
            const given = board.puzzle[i] !== 0;
            const wrong = showErrors && v !== 0 && v !== board.solution[i];
            const related =
              sel !== null &&
              (r === selR || c === selC || (Math.floor(r / br) === Math.floor(selR / br) && Math.floor(c / bc) === Math.floor(selC / bc)));
            const sameNum = sel !== null && v !== 0 && v === board.values[sel];
            let bg = "transparent";
            if (wrong) bg = "rgba(239,68,68,.28)";
            else if (i === sel) bg = "color-mix(in srgb, var(--pc-accent) 40%, transparent)";
            else if (sameNum) bg = "color-mix(in srgb, var(--pc-accent) 26%, transparent)";
            else if (related) bg = "color-mix(in srgb, var(--pc-accent) 11%, transparent)";
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(i)}
                className={`aspect-square flex items-center justify-center font-black cursor-pointer ${
                  n === 9 ? "text-base sm:text-xl" : "text-xl sm:text-3xl"
                }`}
                style={{
                  background: bg,
                  color: wrong ? "#ef4444" : given ? "inherit" : "var(--pc-accent)",
                  borderRight: (c + 1) % bc === 0 && c < n - 1 ? "2px solid var(--pc-accent)" : "1px solid var(--pc-line)",
                  borderBottom: (r + 1) % br === 0 && r < n - 1 ? "2px solid var(--pc-accent)" : "1px solid var(--pc-line)"
                }}
              >
                {v || ""}
              </button>
            );
          })}
        </div>

        {won && (
          <div className="text-center p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-sm font-black">
            🎉 Solved in {formatTime(seconds)} with {hints} {hints === 1 ? "hint" : "hints"}! Try the next level.
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: n }, (_, k) => k + 1).map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setCell(num)}
              className={`w-11 h-11 rounded-xl text-base font-black cursor-pointer ${currentStyle.btnSecondary}`}
            >
              {num}
            </button>
          ))}
          <button type="button" onClick={() => setCell(0)} className={`px-4 h-11 rounded-xl text-xs font-black cursor-pointer ${currentStyle.btnSecondary}`}>
            Erase
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={giveHint} className={`px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer ${currentStyle.btnSecondary}`}>
            <Lightbulb className="w-4 h-4" /> Hint
          </button>
          <button type="button" onClick={() => setShowErrors((s) => !s)} className={`px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer ${currentStyle.btnSecondary}`}>
            <CheckCircle2 className="w-4 h-4" /> {showErrors ? "Hide mistakes" : "Check mistakes"}
          </button>
          <button type="button" onClick={() => newGame(level)} className={`px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer ${currentStyle.btnPrimary}`}>
            <RotateCcw className="w-4 h-4" /> New puzzle
          </button>
        </div>
        <p className="text-[11px] text-center opacity-60">Tip: tap a cell, then a number. On a computer you can type numbers and use the arrow keys.</p>
      </div>
    </GameShell>
  );
}

/* ---------------- 2. MEMORY MATCH ---------------- */
const MEMORY_EMOJIS = ["🦁", "🐼", "🦊", "🐸", "🐙", "🦄", "🐯", "🐵", "🦋", "🐳", "🐢", "🦉"];
const MEMORY_LEVELS = {
  easy: { label: "Easy · 6 pairs", pairs: 6, cols: 4 },
  medium: { label: "Medium · 8 pairs", pairs: 8, cols: 4 },
  hard: { label: "Hard · 12 pairs", pairs: 12, cols: 6 }
};
const buildDeck = (levelKey) =>
  shuffleArr(
    MEMORY_EMOJIS.slice(0, MEMORY_LEVELS[levelKey].pairs).flatMap((emoji, i) => [
      { id: `${i}a`, emoji, flipped: false, matched: false },
      { id: `${i}b`, emoji, flipped: false, matched: false }
    ])
  );

function MemoryGame({ currentStyle, onActivity }) {
  const [level, setLevel] = useState("easy");
  const [cards, setCards] = useState(() => buildDeck("easy"));
  const [open, setOpen] = useState([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [best, setBest] = useState(() => readStore("plotcraft_memory_best", {}));

  const won = cards.every((c) => c.matched);

  useEffect(() => {
    if (!started || won) return undefined;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [started, won]);

  useEffect(() => {
    if (!won) return;
    onActivity?.("game", `Completed Memory Match (${level}) in ${moves} moves`);
    setBest((b) => {
      if (b[level] && b[level] <= moves) return b;
      const next = { ...b, [level]: moves };
      writeStore("plotcraft_memory_best", next);
      return next;
    });
  }, [won]); // eslint-disable-line react-hooks/exhaustive-deps

  const restart = (lv) => {
    setLevel(lv);
    setCards(buildDeck(lv));
    setOpen([]);
    setMoves(0);
    setSeconds(0);
    setStarted(false);
    setBusy(false);
  };

  const flip = (i) => {
    if (busy || cards[i].flipped || cards[i].matched) return;
    if (!started) {
      setStarted(true);
      onActivity?.("game", `Played Memory Match (${level})`);
    }
    setCards((cur) => cur.map((c, k) => (k === i ? { ...c, flipped: true } : c)));
    const nextOpen = [...open, i];
    if (nextOpen.length < 2) {
      setOpen(nextOpen);
      return;
    }
    const [a, b] = nextOpen;
    setMoves((m) => m + 1);
    setBusy(true);
    setTimeout(() => {
      setCards((cur) => {
        const same = cur[a].emoji === cur[b].emoji;
        return cur.map((c, k) => (k === a || k === b ? (same ? { ...c, matched: true } : { ...c, flipped: false }) : c));
      });
      setOpen([]);
      setBusy(false);
    }, 750);
  };

  return (
    <GameShell
      currentStyle={currentStyle}
      icon={Brain}
      title="Memory Match"
      skill="Builds concentration and short-term memory. Flip two cards and find all the matching pairs."
      chips={
        <>
          <GameChip currentStyle={currentStyle}>⏱ {formatTime(seconds)}</GameChip>
          <GameChip currentStyle={currentStyle}>🔁 {moves} moves</GameChip>
          {best[level] && <GameChip currentStyle={currentStyle}>🏆 Best {best[level]}</GameChip>}
        </>
      }
    >
      <div className="space-y-5">
        <LevelTabs levels={MEMORY_LEVELS} value={level} onChange={restart} currentStyle={currentStyle} />

        <div
          className="mx-auto grid gap-2 sm:gap-3 w-full max-w-[520px]"
          style={{ gridTemplateColumns: `repeat(${MEMORY_LEVELS[level].cols}, minmax(0, 1fr))` }}
        >
          {cards.map((card, i) => {
            const faceUp = card.flipped || card.matched;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => flip(i)}
                aria-label={faceUp ? card.emoji : "Hidden card"}
                className="aspect-square rounded-2xl flex items-center justify-center text-2xl sm:text-4xl font-black cursor-pointer transition-transform duration-200"
                style={
                  faceUp
                    ? {
                        background: "color-mix(in srgb, var(--pc-accent) 14%, white)",
                        border: card.matched ? "2px solid #22c55e" : "2px solid var(--pc-accent)",
                        transform: card.matched ? "scale(.94)" : "none"
                      }
                    : { background: "linear-gradient(135deg, var(--pc-accent), var(--pc-accent-2))", color: "#fff" }
                }
              >
                {faceUp ? card.emoji : "?"}
              </button>
            );
          })}
        </div>

        {won && (
          <div className="text-center p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-sm font-black">
            🎉 All pairs found in {moves} moves and {formatTime(seconds)}!
          </div>
        )}

        <div className="flex justify-center">
          <button type="button" onClick={() => restart(level)} className={`px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer ${currentStyle.btnPrimary}`}>
            <RotateCcw className="w-4 h-4" /> Shuffle & restart
          </button>
        </div>
      </div>
    </GameShell>
  );
}

/* ---------------- 3. QUICK MATH ---------------- */
const MATH_LEVELS = {
  easy: { label: "Easy" },
  medium: { label: "Medium" },
  hard: { label: "Hard" }
};
const MATH_SECONDS = 60;

function makeMathQuestion(level) {
  if (level === "easy") {
    const a = randInt(2, 20);
    const b = randInt(2, 20);
    return Math.random() < 0.5
      ? { text: `${a} + ${b}`, answer: a + b }
      : { text: `${Math.max(a, b)} − ${Math.min(a, b)}`, answer: Math.abs(a - b) };
  }
  if (level === "medium") {
    const t = randInt(0, 2);
    if (t === 0) {
      const a = randInt(20, 99);
      const b = randInt(10, 99);
      return { text: `${a} + ${b}`, answer: a + b };
    }
    if (t === 1) {
      const a = randInt(30, 99);
      const b = randInt(10, a);
      return { text: `${a} − ${b}`, answer: a - b };
    }
    const a = randInt(3, 12);
    const b = randInt(3, 12);
    return { text: `${a} × ${b}`, answer: a * b };
  }
  const t = randInt(0, 3);
  if (t === 0) {
    const a = randInt(11, 25);
    const b = randInt(3, 12);
    return { text: `${a} × ${b}`, answer: a * b };
  }
  if (t === 1) {
    const b = randInt(3, 12);
    const ans = randInt(5, 25);
    return { text: `${b * ans} ÷ ${b}`, answer: ans };
  }
  if (t === 2) {
    const a = randInt(100, 999);
    const b = randInt(100, 999);
    return { text: `${a} + ${b}`, answer: a + b };
  }
  const a = randInt(300, 999);
  const b = randInt(100, a);
  return { text: `${a} − ${b}`, answer: a - b };
}

function MathGame({ currentStyle, onActivity }) {
  const [level, setLevel] = useState("easy");
  const [phase, setPhase] = useState("idle");
  const [timeLeft, setTimeLeft] = useState(MATH_SECONDS);
  const [score, setScore] = useState(0);
  const [asked, setAsked] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [question, setQuestion] = useState(() => makeMathQuestion("easy"));
  const [input, setInput] = useState("");
  const [flash, setFlash] = useState(null);
  const [best, setBest] = useState(() => readStore("plotcraft_math_best", {}));

  useEffect(() => {
    if (phase !== "play") return undefined;
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === "play" && timeLeft <= 0) {
      setPhase("done");
      onActivity?.("game", `Completed Quick Math (${level}) with score ${score}`);
      setBest((b) => {
        if ((b[level] || 0) >= score) return b;
        const next = { ...b, [level]: score };
        writeStore("plotcraft_math_best", next);
        return next;
      });
    }
  }, [timeLeft, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    onActivity?.("game", `Played Quick Math (${level})`);
    setScore(0);
    setAsked(0);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(MATH_SECONDS);
    setInput("");
    setFlash(null);
    setQuestion(makeMathQuestion(level));
    setPhase("play");
  };

  const submit = (e) => {
    e.preventDefault();
    if (input.trim() === "") return;
    const correct = Number(input) === question.answer;
    setAsked((a) => a + 1);
    if (correct) {
      setScore((s) => s + 1);
      setStreak(streak + 1);
      setBestStreak((b) => Math.max(b, streak + 1));
    } else {
      setStreak(0);
    }
    setFlash(correct ? "ok" : "bad");
    setInput("");
    setQuestion(makeMathQuestion(level));
  };

  return (
    <GameShell
      currentStyle={currentStyle}
      icon={Calculator}
      title="Quick Math"
      skill={`Sharpens mental calculation speed. Solve as many as you can in ${MATH_SECONDS} seconds.`}
      chips={
        <>
          <GameChip currentStyle={currentStyle}>✅ {score}</GameChip>
          <GameChip currentStyle={currentStyle}>🔥 Streak {streak}</GameChip>
          {best[level] ? <GameChip currentStyle={currentStyle}>🏆 Best {best[level]}</GameChip> : null}
        </>
      }
    >
      {phase === "idle" && (
        <div className="space-y-5 text-center">
          <p className="text-sm opacity-80">Pick a level and answer without a calculator. Wrong answers reset your streak.</p>
          <LevelTabs levels={MATH_LEVELS} value={level} onChange={setLevel} currentStyle={currentStyle} />
          <button type="button" onClick={start} className={`px-8 py-3 rounded-2xl text-sm flex items-center gap-2 mx-auto cursor-pointer ${currentStyle.btnPrimary}`}>
            <Rocket className="w-4 h-4" /> Start {MATH_SECONDS}s challenge
          </button>
        </div>
      )}

      {phase === "play" && (
        <div className="space-y-5 text-center">
          <div className="h-2.5 rounded-full bg-black/10 overflow-hidden">
            <div
              className="h-full transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / MATH_SECONDS) * 100}%`, background: "linear-gradient(90deg, var(--pc-accent), var(--pc-accent-2))" }}
            />
          </div>
          <p className="text-xs font-black opacity-70">⏱ {timeLeft}s left</p>
          <p
            className="text-5xl sm:text-6xl font-black tracking-tight transition-colors"
            style={{ color: flash === "bad" ? "#ef4444" : flash === "ok" ? "#22c55e" : "inherit" }}
          >
            {question.text} = ?
          </p>
          <form onSubmit={submit} className="flex items-center justify-center gap-2">
            <input
              autoFocus
              type="number"
              inputMode="numeric"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Your answer"
              className={`w-44 p-3 text-center text-lg font-black focus:outline-none ${currentStyle.bgInput}`}
            />
            <button type="submit" className={`px-5 py-3 rounded-xl text-xs font-black cursor-pointer ${currentStyle.btnPrimary}`}>
              Enter
            </button>
          </form>
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-5 text-center">
          <Trophy className="w-12 h-12 mx-auto text-yellow-500" />
          <p className="text-2xl font-black">Time's up! You scored {score}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <GameChip currentStyle={currentStyle}>🎯 {asked ? Math.round((score / asked) * 100) : 0}% accuracy</GameChip>
            <GameChip currentStyle={currentStyle}>🔥 Best streak {bestStreak}</GameChip>
            <GameChip currentStyle={currentStyle}>🏆 Best score {best[level] || score}</GameChip>
          </div>
          <LevelTabs levels={MATH_LEVELS} value={level} onChange={setLevel} currentStyle={currentStyle} />
          <button type="button" onClick={start} className={`px-8 py-3 rounded-2xl text-sm flex items-center gap-2 mx-auto cursor-pointer ${currentStyle.btnPrimary}`}>
            <RotateCcw className="w-4 h-4" /> Play again
          </button>
        </div>
      )}
    </GameShell>
  );
}

/* ---------------- AI DRAW & SKETCH STUDIO ---------------- */
const DRAW_COLORS = [
  "#111827", "#ef4444", "#f97316", "#facc15", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#92400e", "#9ca3af", "#ffffff"
];
const DRAW_STAMPS = ["⭐", "❤️", "🌈", "🦋", "🌸", "🐶", "🐱", "🚀", "☀️", "🌙", "🌳", "🏠"];
const DRAW_IDEAS = [
  "A tiny astronaut discovering a glowing garden on the moon",
  "A friendly dragon reading books in a treehouse library",
  "A peaceful village beside a waterfall at sunrise",
  "A robot planting flowers in a futuristic city",
  "A cute whale swimming through a galaxy of stars",
  "A magical castle floating above soft clouds",
  "A brave little fox exploring an autumn forest",
  "A colourful underwater school with friendly sea animals"
];
const BLEND_MODES = [["source-over", "Normal"], ["multiply", "Multiply"], ["screen", "Screen"], ["overlay", "Overlay"], ["darken", "Darken"], ["lighten", "Lighten"]];
const DRAW_SIZES = [2, 4, 8, 14, 22, 32];
const CANVAS_W = 1000;
const CANVAS_H = 625;

const SKETCH_BACKGROUNDS = [
  { id: "paper", label: "Paper", color: "#ffffff" },
  { id: "cream", label: "Warm", color: "#fff7e8" },
  { id: "night", label: "Night", color: "#111827" },
  { id: "blueprint", label: "Blueprint", color: "#102b4e" },
  { id: "pink", label: "Blush", color: "#fff0f6" },
  { id: "mint", label: "Mint", color: "#ecfdf5" }
];

function DrawingStudio({ currentStyle, storyTitle, currentUser, onMakeStory, onAnimate, onActivity }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const startPointRef = useRef(null);
  const lastPointRef = useRef(null);
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const snapshotRef = useRef(null);

  const [tool, setTool] = useState("brush");
  const [color, setColor] = useState("#111827");
  const [size, setSize] = useState(8);
  const [opacity, setOpacity] = useState(100);
  const [stamp, setStamp] = useState(DRAW_STAMPS[0]);
  const [idea, setIdea] = useState("");
  const [caption, setCaption] = useState("");
  const [background, setBackground] = useState("paper");
  const [showGrid, setShowGrid] = useState(false);
  const [symmetry, setSymmetry] = useState(false);
  const [brushPreset, setBrushPreset] = useState("round");
  const [recentColors, setRecentColors] = useState([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [gallery, setGallery] = useState(() => readStore("plotcraft_drawings_v2", readStore("plotcraft_drawings", [])));
  const [notice, setNotice] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiStyle, setAiStyle] = useState("sketch");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiProvider, setAiProvider] = useState("");

  const makeLayerCanvas = () => {
    const c = document.createElement("canvas");
    c.width = CANVAS_W;
    c.height = CANVAS_H;
    return c;
  };
  const [layers, setLayers] = useState(() => [{ id: "L1", name: "Layer 1", visible: true, opacity: 100, blend: "source-over", locked: false, canvas: makeLayerCanvas() }]);
  const [activeLayerId, setActiveLayerId] = useState("L1");
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const activeIdRef = useRef("L1");
  const [zoom, setZoom] = useState(120);
  const [isFull, setIsFull] = useState(false);
  const stageRef = useRef(null);
  useEffect(() => {
    const onChange = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else stageRef.current?.requestFullscreen?.();
  };

  // Every drawing tool paints into the ACTIVE layer; the visible canvas is the composite of all layers.
  const layerCtx = (id) => (layersRef.current.find((l) => l.id === id) || layersRef.current[0])?.canvas.getContext("2d");
  const getCtx = () => layerCtx(activeIdRef.current);
  const selectedBackground = SKETCH_BACKGROUNDS.find((item) => item.id === background)?.color || "#ffffff";

  const flash = (message) => {
    setNotice(message);
    window.clearTimeout(flash.timer);
    flash.timer = window.setTimeout(() => setNotice(""), 2400);
  };

  const composite = () => {
    const out = canvasRef.current?.getContext("2d");
    if (!out) return;
    out.save();
    out.globalCompositeOperation = "source-over";
    out.globalAlpha = 1;
    out.fillStyle = selectedBackground;
    out.fillRect(0, 0, CANVAS_W, CANVAS_H);
    for (const layer of layersRef.current) {
      if (!layer.visible) continue;
      out.globalAlpha = layer.opacity / 100;
      out.globalCompositeOperation = layer.blend;
      out.drawImage(layer.canvas, 0, 0);
    }
    out.restore();
  };

  const paintBackground = (ctx, bg = selectedBackground) => {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.restore();
  };

  const clearCanvas = (record = false) => {
    const ctx = getCtx();
    if (!ctx) return;
    if (record) pushHistory();
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  };

  const pushHistory = () => {
    const ctx = getCtx();
    if (!ctx) return;
    try {
      historyRef.current.push({ layerId: activeIdRef.current, data: ctx.getImageData(0, 0, CANVAS_W, CANVAS_H) });
      if (historyRef.current.length > 35) historyRef.current.shift();
      redoRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
    } catch (error) {
      console.error("Could not save sketch history:", error);
    }
  };

  useEffect(() => {
    composite();
  }, [background, layers, selectedBackground]);

  const undo = () => {
    const previous = historyRef.current.pop();
    if (!previous) return;
    const ctx = layerCtx(previous.layerId);
    if (!ctx) return;
    redoRef.current.push({ layerId: previous.layerId, data: ctx.getImageData(0, 0, CANVAS_W, CANVAS_H) });
    ctx.putImageData(previous.data, 0, 0);
    composite();
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(true);
  };

  const redo = () => {
    const next = redoRef.current.pop();
    if (!next) return;
    const ctx = layerCtx(next.layerId);
    if (!ctx) return;
    historyRef.current.push({ layerId: next.layerId, data: ctx.getImageData(0, 0, CANVAS_W, CANVAS_H) });
    ctx.putImageData(next.data, 0, 0);
    composite();
    setCanUndo(true);
    setCanRedo(redoRef.current.length > 0);
  };

  // ---- Layer operations ----
  const commitLayers = (next) => {
    layersRef.current = next;
    setLayers(next);
  };
  const selectLayer = (id) => {
    activeIdRef.current = id;
    setActiveLayerId(id);
  };
  const addLayer = () => {
    const id = `L${Date.now().toString(36)}`;
    const layer = { id, name: `Layer ${layersRef.current.length + 1}`, visible: true, opacity: 100, blend: "source-over", locked: false, canvas: makeLayerCanvas() };
    commitLayers([...layersRef.current, layer]);
    selectLayer(id);
  };
  const duplicateLayer = (id) => {
    const src = layersRef.current.find((l) => l.id === id);
    if (!src) return;
    const nid = `L${Date.now().toString(36)}`;
    const canvas = makeLayerCanvas();
    canvas.getContext("2d").drawImage(src.canvas, 0, 0);
    const copy = { ...src, id: nid, name: `${src.name} copy`, canvas };
    const next = [...layersRef.current];
    next.splice(next.findIndex((l) => l.id === id) + 1, 0, copy);
    commitLayers(next);
    selectLayer(nid);
  };
  const deleteLayer = (id) => {
    if (layersRef.current.length <= 1) {
      flash("Keep at least one layer");
      return;
    }
    const next = layersRef.current.filter((l) => l.id !== id);
    commitLayers(next);
    if (activeIdRef.current === id) selectLayer(next[next.length - 1].id);
  };
  const moveLayer = (id, dir) => {
    const list = [...layersRef.current];
    const i = list.findIndex((l) => l.id === id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    commitLayers(list);
  };
  const renameLayer = (id) => {
    const layer = layersRef.current.find((l) => l.id === id);
    const name = window.prompt("Layer name:", layer?.name || "");
    if (name?.trim()) patchLayer(id, { name: name.trim().slice(0, 30) });
  };
  const patchLayer = (id, patch) => commitLayers(layersRef.current.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const point = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(CANVAS_W, ((event.clientX - rect.left) * CANVAS_W) / rect.width)),
      y: Math.max(0, Math.min(CANVAS_H, ((event.clientY - rect.top) * CANVAS_H) / rect.height))
    };
  };

  const drawSegment = (ctx, from, to, mirror = false) => {
    const x1 = mirror ? CANVAS_W - from.x : from.x;
    const x2 = mirror ? CANVAS_W - to.x : to.x;
    ctx.beginPath();
    ctx.moveTo(x1, from.y);
    ctx.lineTo(x2, to.y);
    ctx.stroke();
  };

  const drawShape = (ctx, from, to) => {
    const width = to.x - from.x;
    const height = to.y - from.y;
    ctx.beginPath();
    if (tool === "line") {
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
    } else if (tool === "rectangle") {
      ctx.rect(from.x, from.y, width, height);
    } else if (tool === "circle") {
      const radiusX = Math.abs(width) / 2;
      const radiusY = Math.abs(height) / 2;
      ctx.ellipse(from.x + width / 2, from.y + height / 2, Math.max(1, radiusX), Math.max(1, radiusY), 0, 0, Math.PI * 2);
    }
    ctx.stroke();
  };

  const onPointerDownRaw = (event) => {
    if (!canvasRef.current) return;
    event.preventDefault();
    const ctx = getCtx();
    const p = point(event);
    if (tool === "eyedropper") {
      const px = ctx.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data;
      const hex = "#" + [px[0], px[1], px[2]].map((v) => v.toString(16).padStart(2, "0")).join("");
      setColor(hex);
      setTool("brush");
      flash(`Picked ${hex}`);
      return;
    }
    pushHistory();
    startPointRef.current = p;
    lastPointRef.current = p;
    snapshotRef.current = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);

    if (tool === "text") {
      const value = window.prompt("Enter text to place on your sketch:");
      if (value?.trim()) {
        ctx.save();
        ctx.globalAlpha = opacity / 100;
        ctx.fillStyle = color;
        ctx.font = `700 ${Math.max(18, size * 3)}px Arial`;
        ctx.fillText(value.trim().slice(0, 80), p.x, p.y);
        ctx.restore();
      }
      return;
    }

    if (tool === "stamp") {
      ctx.save();
      ctx.globalAlpha = opacity / 100;
      ctx.font = `${Math.max(30, size * 4)}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(stamp, p.x, p.y);
      ctx.restore();
      return;
    }

    if (tool === "fill") {
      // Flood-fill is intentionally kept simple and bounded to the canvas dimensions.
      const image = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
      const data = image.data;
      const sx = Math.min(CANVAS_W - 1, Math.max(0, Math.floor(p.x)));
      const sy = Math.min(CANVAS_H - 1, Math.max(0, Math.floor(p.y)));
      const start = (sy * CANVAS_W + sx) * 4;
      const target = [data[start], data[start + 1], data[start + 2]];
      const fill = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
      const matches = (index) =>
        Math.abs(data[index] - target[0]) +
        Math.abs(data[index + 1] - target[1]) +
        Math.abs(data[index + 2] - target[2]) < 45;
      if (target.some((value, index) => value !== fill[index])) {
        const stack = [[sx, sy]];
        let steps = 0;
        while (stack.length && steps < 350000) {
          const [x, y] = stack.pop();
          const index = (y * CANVAS_W + x) * 4;
          if (!matches(index)) continue;
          let left = x;
          while (left > 0 && matches((y * CANVAS_W + left - 1) * 4)) left--;
          let spanUp = false;
          let spanDown = false;
          for (let px = left; px < CANVAS_W && matches((y * CANVAS_W + px) * 4); px++) {
            const at = (y * CANVAS_W + px) * 4;
            data[at] = fill[0]; data[at + 1] = fill[1]; data[at + 2] = fill[2]; data[at + 3] = 255;
            if (y > 0) {
              const up = matches(((y - 1) * CANVAS_W + px) * 4);
              if (up && !spanUp) stack.push([px, y - 1]);
              spanUp = up;
            }
            if (y < CANVAS_H - 1) {
              const down = matches(((y + 1) * CANVAS_W + px) * 4);
              if (down && !spanDown) stack.push([px, y + 1]);
              spanDown = down;
            }
            steps++;
          }
        }
        ctx.putImageData(image, 0, 0);
      }
      return;
    }

    canvasRef.current.setPointerCapture(event.pointerId);
    drawingRef.current = true;
  };

  const onPointerMoveRaw = (event) => {
    if (!drawingRef.current || !snapshotRef.current) return;
    const ctx = getCtx();
    const p = point(event);
    if (["line", "rectangle", "circle"].includes(tool)) {
      ctx.putImageData(snapshotRef.current, 0, 0);
      ctx.save();
      ctx.globalAlpha = opacity / 100;
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawShape(ctx, startPointRef.current, p);
      ctx.restore();
      return;
    }

    if (tool === "brush" && brushPreset === "spray") {
      ctx.save();
      ctx.globalAlpha = opacity / 100;
      ctx.fillStyle = color;
      const from = lastPointRef.current;
      const steps = Math.max(1, Math.ceil(Math.hypot(p.x - from.x, p.y - from.y) / 3));
      for (let s = 0; s < steps; s++) {
        const cx = from.x + ((p.x - from.x) * s) / steps;
        const cy = from.y + ((p.y - from.y) * s) / steps;
        for (let d = 0; d < 6; d++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * size * 1.6;
          ctx.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.6, 1.6);
        }
      }
      ctx.restore();
      lastPointRef.current = p;
      return;
    }

    ctx.save();
    ctx.globalAlpha = opacity / 100;
    ctx.strokeStyle = tool === "eraser" ? selectedBackground : color;
    ctx.fillStyle = tool === "eraser" ? selectedBackground : color;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.lineWidth = tool === "eraser" ? size * 2.5 : brushPreset === "pencil" ? Math.max(1, size * 0.35) : brushPreset === "marker" ? size * 1.6 : size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (tool === "brush" && brushPreset === "marker") ctx.globalAlpha = (opacity / 100) * 0.5;
    drawSegment(ctx, lastPointRef.current, p);
    if (symmetry) drawSegment(ctx, lastPointRef.current, p, true);
    ctx.restore();
    lastPointRef.current = p;
  };

  const onPointerUpRaw = () => {
    drawingRef.current = false;
    startPointRef.current = null;
    lastPointRef.current = null;
    snapshotRef.current = null;
  };

  const onPointerDown = (event) => {
    if (layersRef.current.find((l) => l.id === activeIdRef.current)?.locked) {
      flash("This layer is locked. Unlock it to draw.");
      return;
    }
    onPointerDownRaw(event);
    composite();
  };
  const onPointerMove = (event) => { onPointerMoveRaw(event); composite(); };
  const onPointerUp = (event) => { onPointerUpRaw(event); composite(); };

  const exportUrl = (type = "image/png", quality) => canvasRef.current?.toDataURL(type, quality);

  const downloadDrawing = () => {
    const url = exportUrl();
    if (!url) return;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(caption.trim() || "plotcraft-sketch").replace(/[^a-z0-9-_]+/gi, "-")}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    flash("PNG exported successfully");
  };

  const saveDrawing = () => {
    const image = exportUrl("image/jpeg", 0.88);
    if (!image) return;
    const entry = { id: Date.now(), caption: caption.trim() || "My sketch", image, background };
    const next = [entry, ...gallery].slice(0, 12);
    setGallery(next);
    writeStore("plotcraft_drawings_v2", next);
    onActivity?.("drawing", `Saved sketch: ${entry.caption}`);
    flash("Saved in My Sketchbook");
  };

  const loadDrawing = (item) => {
    const image = new Image();
    image.onload = () => {
      pushHistory();
      const ctx = getCtx();
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.drawImage(image, 0, 0, CANVAS_W, CANVAS_H);
      setBackground(item.background || "paper");
    };
    image.src = item.image;
    setCaption(item.caption || "My sketch");
  };

  const deleteDrawing = (id) => {
    const next = gallery.filter((item) => item.id !== id);
    setGallery(next);
    writeStore("plotcraft_drawings_v2", next);
  };

  const changeBackground = (id) => {
    setBackground(id);
    flash("Background updated");
  };
  const generateAiSketch = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setAiError("First describe what you want to sketch.");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiResult("");
    try {
      const styleDirection = aiStyle === "sketch"
        ? "Render as a refined graphite pencil sketch on clean drawing paper, visible pencil strokes, fine linework, subtle cross-hatching, mostly monochrome with carefully controlled shading."
        : aiStyle === "2d"
          ? "Render as polished 2D storybook illustration with expressive shapes and rich hand-painted colour."
          : "Render as a detailed 3D cinematic illustration with dimensional lighting, realistic materials and depth.";
      const detailedPrompt = [
        "Create a clean, beautiful, high quality illustration based on this description:",
        prompt,
        styleDirection,
        "Clear subject, thoughtful composition, coherent details, no watermark."
      ].join("\n");
      const result = await generateImageWithInfo(detailedPrompt, { style: aiStyle === "sketch" ? "2d" : aiStyle });
      if (!result?.imageUrl) throw new Error("The AI service returned no image. Please try again.");
      setAiResult(result.imageUrl);
      setAiProvider(result.provider || "AI image engine");
      onActivity?.("drawing", `AI sketch generated: ${prompt.slice(0, 100)}`);
    } catch (error) {
      setAiError(error?.message || "AI sketch generation failed. Check that your backend and image provider are running.");
    } finally {
      setAiLoading(false);
    }
  };

  const useAiResult = () => {
    if (!aiResult) return;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      pushHistory();
      const ctx = getCtx();
      ctx.save();
      const scale = Math.min(CANVAS_W / image.width, CANVAS_H / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      ctx.drawImage(image, (CANVAS_W - width) / 2, (CANVAS_H - height) / 2, width, height);
      ctx.restore();
      setCaption(aiPrompt.trim().slice(0, 60) || "AI sketch");
      flash("AI artwork added to your canvas");
    };
    image.onerror = () => setAiError("Could not load the generated image into the canvas. Try downloading it instead.");
    image.src = aiResult;
  };

  const newIdea = () => {
    const next = DRAW_IDEAS[randInt(0, DRAW_IDEAS.length - 1)];
    setIdea(next);
    setAiPrompt(next);
  };

  useEffect(() => {
    setRecentColors((list) => [color, ...list.filter((c) => c !== color)].slice(0, 8));
  }, [color]);

  // Keyboard shortcuts: B brush, E eraser, G fill, I eyedropper, [ ] size, Ctrl+Z / Ctrl+Y undo redo.
  const latestRef = useRef({});
  latestRef.current = { undo, redo, save: saveDrawing, clearLayer: () => clearCanvas(true) };
  useEffect(() => {
    const onKey = (e) => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === "s") { e.preventDefault(); latestRef.current.save(); return; }
      if (!mod && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        if (window.confirm("Clear the selected layer?")) latestRef.current.clearLayer();
        return;
      }
      if (mod && k === "z") { e.preventDefault(); e.shiftKey ? latestRef.current.redo() : latestRef.current.undo(); }
      else if (mod && k === "y") { e.preventDefault(); latestRef.current.redo(); }
      else if (!mod && k === "b") setTool("brush");
      else if (!mod && k === "e") setTool("eraser");
      else if (!mod && k === "g") setTool("fill");
      else if (!mod && k === "i") setTool("eyedropper");
      else if (e.key === "[") setSize((s) => Math.max(1, s - 2));
      else if (e.key === "]") setSize((s) => Math.min(60, s + 2));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toolButton = (id, label, Icon) => (
    <button
      key={id}
      type="button"
      title={label}
      onClick={() => setTool(id)}
      aria-pressed={tool === id}
      className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
        tool === id ? "bg-purple-600 text-white shadow-md ring-2 ring-purple-300" : currentStyle.btnSecondary
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <div className="w-full space-y-5 animate-slide-in-left">
      <section className={`rounded-3xl p-5 sm:p-7 ${currentStyle.bgCard}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white grid place-items-center shadow-lg">
            <Pencil className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <p className="text-[10px] font-black uppercase tracking-[.2em] opacity-60">PlotCraft Creative Lab</p>
            <h2 className="text-xl sm:text-2xl font-black">AI Draw & Sketch Studio</h2>
            <p className="text-xs opacity-70 mt-1">Describe an idea and let AI create the first artwork. Then customise it on the canvas.</p>
          </div>
          {notice && <span className="px-3 py-2 rounded-xl text-xs font-black bg-emerald-500/15 text-emerald-600">{notice}</span>}
        </div>
      </section>

      <section className={`rounded-3xl p-5 sm:p-6 ${currentStyle.bgCard} space-y-4`}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-500" />
          <div>
            <h3 className="font-black text-sm">AI Sketch Generator</h3>
            <p className="text-[11px] opacity-65">Type normally — the AI turns your description into an image.</p>
          </div>
        </div>
        <textarea
          rows={3}
          value={aiPrompt}
          onChange={(event) => setAiPrompt(event.target.value)}
          placeholder="Example: Draw a small orange astronaut standing beside a glowing purple tree on the moon, cute storybook style..."
          className={`w-full p-4 rounded-2xl text-sm resize-y focus:outline-none focus:ring-2 focus:ring-purple-500 ${currentStyle.bgInput}`}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold opacity-70 mr-1">Art style</span>
          {[
            { id: "sketch", label: "Pencil sketch" },
            { id: "2d", label: "Storybook 2D" },
            { id: "3d", label: "3D render" }
          ].map((item) => (
            <button key={item.id} type="button" onClick={() => setAiStyle(item.id)}
              className={`px-3 py-2 rounded-xl text-xs font-black border cursor-pointer ${aiStyle === item.id ? "bg-purple-600 text-white border-purple-400" : currentStyle.btnSecondary}`}>
              {item.label}
            </button>
          ))}
          <button type="button" onClick={newIdea} className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer ${currentStyle.btnSecondary}`}>
            <Lightbulb className="w-3.5 h-3.5 inline mr-1" /> Surprise me
          </button>
          <button type="button" onClick={generateAiSketch} disabled={aiLoading}
            className="ml-auto px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-black flex items-center gap-2 disabled:opacity-50 cursor-pointer">
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {aiLoading ? "Creating artwork..." : "Generate with AI"}
          </button>
        </div>
        {aiError && <p role="alert" className="text-xs text-red-500 font-bold">{aiError}</p>}
        {aiResult && (
          <div className={`rounded-2xl p-3 ${currentStyle.panelBg} grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3 items-center`}>
            <img src={aiResult} alt="AI generated sketch" className="w-full max-h-[360px] object-contain rounded-xl bg-white" />
            <div className="flex sm:flex-col flex-wrap gap-2">
              <p className="text-[10px] opacity-65">Generated by {aiProvider}</p>
              <button type="button" onClick={useAiResult} className={`px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer ${currentStyle.btnPrimary}`}>
                <Plus className="w-4 h-4 inline mr-1" /> Add to canvas
              </button>
              <a href={aiResult} download="plotcraft-ai-sketch.png" target="_blank" rel="noreferrer"
                className={`px-4 py-2.5 rounded-xl text-xs font-black text-center ${currentStyle.btnSecondary}`}>Open / Save image</a>
            </div>
          </div>
        )}
      </section>

      <section className={`rounded-3xl p-4 sm:p-6 ${currentStyle.bgCard} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-sm">Drawing Canvas</h3>
            <p className="text-[11px] opacity-65">Mouse, touch screen and stylus supported</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={undo} disabled={!canUndo} className={`px-3 py-2 rounded-xl text-xs font-black disabled:opacity-40 cursor-pointer ${currentStyle.btnSecondary}`}><Undo2 className="w-4 h-4 inline mr-1" />Undo</button>
            <button type="button" onClick={redo} disabled={!canRedo} className={`px-3 py-2 rounded-xl text-xs font-black disabled:opacity-40 cursor-pointer ${currentStyle.btnSecondary}`}><RotateCcw className="w-4 h-4 inline mr-1" />Redo</button>
            <button type="button" onClick={() => {
              const url = exportUrl("image/jpeg", 0.92);
              if (!url) return;
              const a = document.createElement("a");
              a.href = url;
              a.download = `${(caption.trim() || "plotcraft-sketch").replace(/[^a-z0-9-_]+/gi, "-")}.jpg`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              flash("JPG exported successfully");
            }} className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer ${currentStyle.btnSecondary}`}>JPG</button>
            <button type="button" onClick={() => clearCanvas(true)} className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer ${currentStyle.btnSecondary}`}><Trash2 className="w-4 h-4 inline mr-1" />Clear</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {toolButton("brush", "Brush", Pencil)}
          {toolButton("eraser", "Eraser", Eraser)}
          {toolButton("line", "Line", Code2)}
          {toolButton("rectangle", "Rectangle", Square)}
          {toolButton("circle", "Ellipse", Circle)}
          {toolButton("fill", "Fill", PaintBucket)}
          {toolButton("text", "Text", FileText)}
          {toolButton("stamp", "Stickers", Smile)}
          {toolButton("eyedropper", "Eyedropper", Droplet)}
        </div>

        <div className={`rounded-2xl p-3 space-y-2 backdrop-blur-md border border-white/10 shadow-lg ${currentStyle.panelBg}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black">Layers</span>
            <button type="button" onClick={addLayer} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black cursor-pointer ${currentStyle.btnSecondary}`}>+ New layer</button>
          </div>
          {[...layers].reverse().map((l) => {
            const isActive = l.id === activeLayerId;
            const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
            return (
              <div key={l.id} onClick={() => selectLayer(l.id)}
                className={`flex flex-wrap items-center gap-2 rounded-xl px-2 py-2 cursor-pointer ${isActive ? "ring-2 ring-purple-400 bg-purple-500/10" : "bg-black/5"}`}>
                <button type="button" title={l.visible ? "Hide layer" : "Show layer"} onClick={stop(() => patchLayer(l.id, { visible: !l.visible }))} className="w-6 text-sm">{l.visible ? "👁" : "⊘"}</button>
                <span className="text-xs font-bold flex-1 min-w-[80px] truncate">{l.name}</span>
                <input type="range" min={0} max={100} value={l.opacity} aria-label="Layer opacity" onClick={(e) => e.stopPropagation()}
                  onChange={(e) => patchLayer(l.id, { opacity: Number(e.target.value) })} className="w-20" />
                <span className="text-[10px] w-8">{l.opacity}%</span>
                <select value={l.blend} aria-label="Blend mode" onClick={(e) => e.stopPropagation()}
                  onChange={(e) => patchLayer(l.id, { blend: e.target.value })} className="text-[11px] rounded-md px-1 py-1 text-slate-800">
                  {BLEND_MODES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button type="button" title={l.locked ? "Unlock layer" : "Lock layer"} onClick={stop(() => patchLayer(l.id, { locked: !l.locked }))} className="text-xs px-1.5">{l.locked ? "🔒" : "🔓"}</button>
                <button type="button" title="Rename layer" onClick={stop(() => renameLayer(l.id))} className="text-xs px-1.5">✎</button>
                <button type="button" title="Move up" onClick={stop(() => moveLayer(l.id, 1))} className="text-xs px-1.5">▲</button>
                <button type="button" title="Move down" onClick={stop(() => moveLayer(l.id, -1))} className="text-xs px-1.5">▼</button>
                <button type="button" title="Duplicate" onClick={stop(() => duplicateLayer(l.id))} className="text-xs px-1.5">⧉</button>
                <button type="button" title="Delete" onClick={stop(() => deleteLayer(l.id))} className="text-xs px-1.5 text-rose-400">✕</button>
              </div>
            );
          })}
          <p className="text-[10px] opacity-60">Click a layer to draw on it. Eraser removes pixels only from the selected layer. Top of the list is the top layer.</p>
        </div>

        {tool === "brush" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black mr-1">Brush style</span>
            {[["round", "Round"], ["marker", "Marker"], ["pencil", "Pencil"], ["spray", "Spray"]].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setBrushPreset(id)} aria-pressed={brushPreset === id}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black cursor-pointer ${brushPreset === id ? "bg-purple-600 text-white" : currentStyle.btnSecondary}`}>
                {label}
              </button>
            ))}
          </div>
        )}

        <div className={`rounded-2xl p-3 space-y-3 ${currentStyle.panelBg}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black mr-1">Colour</span>
            {DRAW_COLORS.map((value) => (
              <button key={value} type="button" aria-label={`Select ${value}`} onClick={() => setColor(value)}
                className="w-7 h-7 rounded-full border-2 cursor-pointer"
                style={{ background: value, borderColor: color === value ? "#8b5cf6" : "rgba(100,116,139,.4)", outline: color === value ? "2px solid #c4b5fd" : "none" }} />
            ))}
            {recentColors.map((value) => (
              <button key={`r-${value}`} type="button" aria-label={`Recent ${value}`} title={value} onClick={() => setColor(value)}
                className="w-6 h-6 rounded-md border border-white/30 cursor-pointer" style={{ background: value }} />
            ))}
            <input type="color" aria-label="Custom colour" value={color} onChange={(event) => setColor(event.target.value)} className="w-8 h-8 p-0 border-0 bg-transparent cursor-pointer" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-black">Brush size</span>
            {DRAW_SIZES.map((value) => (
              <button key={value} type="button" onClick={() => setSize(value)}
                className={`w-9 h-9 rounded-xl grid place-items-center cursor-pointer ${size === value ? "bg-purple-600 text-white" : currentStyle.btnSecondary}`}>
                <span className="rounded-full bg-current" style={{ width: Math.min(24, value), height: Math.min(24, value) }} />
              </button>
            ))}
            <label className="text-xs font-bold flex items-center gap-2">Opacity {opacity}%
              <input type="range" min="10" max="100" step="5" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} />
            </label>
          </div>
          {tool === "stamp" && <div className="flex flex-wrap gap-1.5">{DRAW_STAMPS.map((value) => (
            <button key={value} type="button" onClick={() => setStamp(value)} className={`w-9 h-9 rounded-lg text-xl cursor-pointer ${stamp === value ? "bg-purple-600" : currentStyle.btnSecondary}`}>{value}</button>
          ))}</div>}
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-xs font-bold flex items-center gap-2"><input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} /> Show grid</label>
            <label className="text-xs font-bold flex items-center gap-2"><input type="checkbox" checked={symmetry} onChange={(event) => setSymmetry(event.target.checked)} /> Mirror drawing</label>
            <span className="text-xs font-black">Canvas theme</span>
            {SKETCH_BACKGROUNDS.map((item) => (
              <button key={item.id} type="button" title={item.label} aria-label={`${item.label} canvas`}
                onClick={() => changeBackground(item.id)} className="w-7 h-7 rounded-full border-2 cursor-pointer"
                style={{ background: item.color, borderColor: background === item.id ? "#8b5cf6" : "rgba(100,116,139,.4)", boxShadow: background === item.id ? "0 0 0 2px #c4b5fd" : "none" }} />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black mr-1">Zoom</span>
          <button type="button" title="Zoom out (-)" onClick={() => setZoom((z) => Math.max(50, z - 20))} className={`px-2.5 py-1.5 rounded-lg text-xs font-black cursor-pointer ${currentStyle.btnSecondary}`}>−</button>
          <span className="text-xs font-bold w-12 text-center">{zoom}%</span>
          <button type="button" title="Zoom in (+)" onClick={() => setZoom((z) => Math.min(300, z + 20))} className={`px-2.5 py-1.5 rounded-lg text-xs font-black cursor-pointer ${currentStyle.btnSecondary}`}>+</button>
          <button type="button" title="Fit to width" onClick={() => setZoom(100)} className={`px-2.5 py-1.5 rounded-lg text-xs font-black cursor-pointer ${currentStyle.btnSecondary}`}>Fit</button>
          <button type="button" title="Full screen" onClick={toggleFullscreen} className={`px-2.5 py-1.5 rounded-lg text-xs font-black cursor-pointer ${currentStyle.btnSecondary}`}>{isFull ? "Exit full screen" : "Full screen"}</button>
        </div>

        <div ref={stageRef} className="relative overflow-auto rounded-2xl border-2 border-purple-500/60 bg-black/20"
          style={{ maxHeight: isFull ? "100vh" : "80vh", background: isFull ? "#0b0b12" : undefined }}>
        <div className="relative mx-auto overflow-hidden" style={{ width: `${zoom}%`, minWidth: "100%", background: selectedBackground }}>
          {showGrid && <div className="absolute inset-0 pointer-events-none z-[1]" style={{ backgroundImage: "linear-gradient(to right, rgba(120,120,120,.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,120,120,.16) 1px, transparent 1px)", backgroundSize: "25px 25px" }} />}
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp} onLostPointerCapture={onPointerUp}
            className="block w-full h-auto relative z-[2]"
            style={{ touchAction: "none", cursor: tool === "text" ? "text" : "crosshair", aspectRatio: `${CANVAS_W}/${CANVAS_H}` }} />
        </div>
        </div>

        <input type="text" value={caption} onChange={(event) => setCaption(event.target.value)}
          placeholder="Give your artwork a title..." className={`w-full p-3 rounded-xl text-xs focus:outline-none ${currentStyle.bgInput}`} />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={saveDrawing} className={`px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer ${currentStyle.btnPrimary}`}><Save className="w-4 h-4 inline mr-1" />Save to sketchbook</button>
          <button type="button" onClick={downloadDrawing} className={`px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer ${currentStyle.btnSecondary}`}><Download className="w-4 h-4 inline mr-1" />Download PNG</button>
          <button type="button" onClick={() => onMakeStory(caption.trim() || storyTitle || "My Sketch Story")} className={`px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer ${currentStyle.btnSecondary}`}><BookOpen className="w-4 h-4 inline mr-1" />Create story</button>
          <button type="button" onClick={() => onAnimate(exportUrl("image/jpeg", 0.9))} className={`px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer ${currentStyle.btnSecondary}`}><Video className="w-4 h-4 inline mr-1" />Animate drawing {!currentUser && <LockKeyhole className="w-3 h-3 inline ml-1" />}</button>
        </div>
      </section>

      {gallery.length > 0 && (
        <section className={`rounded-3xl p-5 ${currentStyle.bgCard} space-y-3`}>
          <div className="flex items-center justify-between gap-2"><h3 className="font-black text-sm">My Sketchbook</h3><span className="text-[11px] opacity-60">{gallery.length} saved</span></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {gallery.map((item) => (
              <div key={item.id} className={`relative group rounded-2xl overflow-hidden ${currentStyle.panelBg}`}>
                <button type="button" onClick={() => loadDrawing(item)} className="w-full text-left cursor-pointer">
                  <img src={item.image} alt={item.caption} className="w-full aspect-[8/5] object-contain bg-white" />
                  <p className="text-[11px] font-bold p-2 truncate">{item.caption}</p>
                </button>
                <button type="button" onClick={() => deleteDrawing(item.id)} title="Delete sketch" className="absolute top-2 right-2 p-2 rounded-full bg-black/70 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ---------------- PROFILE: ACTIVITY, STREAKS, LOGOUT ---------------- */
const WEEK_GOAL = 3;   // active days needed in a week to keep the weekly streak
const MONTH_GOAL = 10; // active days needed in a month to keep the monthly streak

const ACTIVITY_TYPES = {
  story: { label: "Stories", icon: BookOpen },
  image: { label: "Images", icon: ImageIcon },
  video: { label: "Videos", icon: Video },
  search: { label: "Searches", icon: Search },
  game: { label: "Games", icon: Gamepad2 },
  drawing: { label: "Drawings", icon: Pencil }
};

const pad2 = (n) => String(n).padStart(2, "0");
const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};
const dayNumber = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};
const mondayOf = (date) => {
  const x = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(ts).toLocaleDateString();
};

function computeStreaks(activity) {
  const days = new Set(activity.map((a) => dayKey(a.ts)));
  const today = new Date();

  // daily streak (still alive if you were active yesterday)
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let daily = 0;
  while (days.has(dayKey(cursor))) {
    daily++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // best ever daily streak
  const sorted = [...days].map(dayNumber).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  sorted.forEach((n, i) => {
    run = i > 0 && n - sorted[i - 1] === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });

  // weekly streak
  const activeIn = (start, end) => {
    let c = 0;
    for (const k of days) {
      const n = dayNumber(k);
      if (n >= dayNumber(dayKey(start)) && n <= dayNumber(dayKey(end))) c++;
    }
    return c;
  };
  const weekDays = (monday) => {
    const end = new Date(monday);
    end.setDate(end.getDate() + 6);
    return activeIn(monday, end);
  };
  let w = mondayOf(today);
  const thisWeek = weekDays(w);
  let weekly = thisWeek >= WEEK_GOAL ? 1 : 0;
  w = new Date(w);
  w.setDate(w.getDate() - 7);
  while (weekDays(w) >= WEEK_GOAL && weekly < 520) {
    weekly++;
    w = new Date(w);
    w.setDate(w.getDate() - 7);
  }

  // monthly streak
  const monthDays = (y, m) => {
    let c = 0;
    const prefix = `${y}-${pad2(m + 1)}-`;
    for (const k of days) if (k.startsWith(prefix)) c++;
    return c;
  };
  let y = today.getFullYear();
  let m = today.getMonth();
  const thisMonth = monthDays(y, m);
  let monthly = thisMonth >= MONTH_GOAL ? 1 : 0;
  m--;
  if (m < 0) { m = 11; y--; }
  while (monthDays(y, m) >= MONTH_GOAL && monthly < 240) {
    monthly++;
    m--;
    if (m < 0) { m = 11; y--; }
  }

  return { daily, best, weekly, monthly, thisWeek, thisMonth, totalDays: days.size };
}

function ProfilePage({ currentStyle, user, activity, onLogout, onClear }) {
  const [filter, setFilter] = useState("all");
  const streaks = useMemo(() => computeStreaks(activity), [activity]);

  const counts = useMemo(() => {
    const weekStart = mondayOf(new Date()).getTime();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const out = {};
    Object.keys(ACTIVITY_TYPES).forEach((t) => { out[t] = { total: 0, week: 0, month: 0 }; });
    activity.forEach((a) => {
      if (!out[a.type]) return;
      if (a.type === "game" && !a.label.startsWith("Played")) return; // count each game once
      out[a.type].total++;
      if (a.ts >= weekStart) out[a.type].week++;
      if (a.ts >= monthStart) out[a.type].month++;
    });
    return out;
  }, [activity]);

  const last7 = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      arr.push({ key, label: d.toLocaleDateString(undefined, { weekday: "short" }), count: activity.filter((a) => dayKey(a.ts) === key).length });
    }
    return arr;
  }, [activity]);
  const maxDay = Math.max(1, ...last7.map((d) => d.count));

  const calendar = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const total = new Date(y, m + 1, 0).getDate();
    const offset = (new Date(y, m, 1).getDay() + 6) % 7;
    const perDay = {};
    activity.forEach((a) => { const k = dayKey(a.ts); perDay[k] = (perDay[k] || 0) + 1; });
    const cells = Array(offset).fill(null);
    for (let d = 1; d <= total; d++) cells.push({ d, count: perDay[`${y}-${pad2(m + 1)}-${pad2(d)}`] || 0, today: d === now.getDate() });
    return { cells, title: now.toLocaleDateString(undefined, { month: "long", year: "numeric" }) };
  }, [activity]);

  const feed = activity.filter((a) => filter === "all" || a.type === filter).slice(0, 60);

  const streakCards = [
    { icon: Flame, title: "Daily streak", big: `${streaks.daily}`, unit: streaks.daily === 1 ? "day" : "days", note: `Best ever: ${streaks.best}` },
    { icon: CalendarDays, title: "Weekly streak", big: `${streaks.weekly}`, unit: streaks.weekly === 1 ? "week" : "weeks", note: `This week: ${streaks.thisWeek}/7 days (goal ${WEEK_GOAL})` },
    { icon: CalendarDays, title: "Monthly streak", big: `${streaks.monthly}`, unit: streaks.monthly === 1 ? "month" : "months", note: `This month: ${streaks.thisMonth} days (goal ${MONTH_GOAL})` },
    { icon: Star, title: "Active days", big: `${streaks.totalDays}`, unit: "total", note: "Days you created or played" }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 animate-slide-in-left">
      {/* profile header */}
      <section className={`rounded-3xl p-5 sm:p-6 ${currentStyle.bgCard} flex flex-wrap items-center gap-4`}>
        <div className="w-16 h-16 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-2xl font-black shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black truncate">{user.name}</h2>
          <p className="text-xs opacity-70 truncate">{user.email}</p>
        </div>
        <button type="button" onClick={onLogout} className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer ${currentStyle.btnSecondary}`}>
          <LogOut className="w-4 h-4" /> Log out
        </button>
      </section>

      {/* streaks */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {streakCards.map((c) => (
          <div key={c.title} className={`rounded-3xl p-4 ${currentStyle.bgCard}`}>
            <div className="flex items-center gap-2 text-xs font-black opacity-80">
              <c.icon className="w-4 h-4 text-purple-600" /> {c.title}
            </div>
            <p className="mt-2 text-3xl font-black">
              {c.big} <span className="text-xs font-bold opacity-70">{c.unit}</span>
            </p>
            <p className="text-[11px] opacity-70 mt-1 leading-snug">{c.note}</p>
          </div>
        ))}
      </section>

      {/* totals */}
      <section className={`rounded-3xl p-5 sm:p-6 ${currentStyle.bgCard} space-y-3`}>
        <h3 className="font-black text-sm">What you have done</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(ACTIVITY_TYPES).map(([key, cfg]) => (
            <div key={key} className={`rounded-2xl p-3 ${currentStyle.panelBg}`}>
              <div className="flex items-center gap-2 text-xs font-black">
                <cfg.icon className="w-4 h-4 text-purple-600" /> {cfg.label}
              </div>
              <p className="text-2xl font-black mt-1">{counts[key].total}</p>
              <p className="text-[11px] opacity-70">{counts[key].week} this week · {counts[key].month} this month</p>
            </div>
          ))}
        </div>
      </section>

      {/* last 7 days + month calendar */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className={`rounded-3xl p-5 ${currentStyle.bgCard} space-y-3`}>
          <h3 className="font-black text-sm">Last 7 days</h3>
          <div className="flex items-end gap-2 h-32">
            {last7.map((d) => (
              <div key={d.key} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                <span className="text-[10px] font-bold opacity-70">{d.count || ""}</span>
                <div
                  className="w-full rounded-lg"
                  style={{
                    height: `${Math.max(6, (d.count / maxDay) * 100)}%`,
                    background: d.count ? "linear-gradient(180deg, var(--pc-accent), var(--pc-accent-2))" : "var(--pc-line)"
                  }}
                />
                <span className="text-[10px] font-bold opacity-70">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-3xl p-5 ${currentStyle.bgCard} space-y-3`}>
          <h3 className="font-black text-sm">{calendar.title}</h3>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {["M", "T", "W", "T", "F", "S", "S"].map((l, i) => (
              <span key={i} className="text-[10px] font-black opacity-60">{l}</span>
            ))}
            {calendar.cells.map((c, i) =>
              c ? (
                <div
                  key={i}
                  title={`${c.count} activities`}
                  className="aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: c.count ? `color-mix(in srgb, var(--pc-accent) ${Math.min(90, 25 + c.count * 15)}%, transparent)` : "var(--pc-line)",
                    color: c.count > 2 ? "#fff" : "inherit",
                    outline: c.today ? "2px solid var(--pc-accent)" : "none"
                  }}
                >
                  {c.d}
                </div>
              ) : (
                <span key={i} />
              )
            )}
          </div>
        </div>
      </section>

      {/* activity feed */}
      <section className={`rounded-3xl p-5 sm:p-6 ${currentStyle.bgCard} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-black text-sm">Your activity</h3>
          {activity.length > 0 && (
            <button type="button" onClick={onClear} className={`px-3 py-1.5 rounded-lg text-[11px] font-black flex items-center gap-1.5 cursor-pointer ${currentStyle.btnSecondary}`}>
              <Trash2 className="w-3.5 h-3.5" /> Clear history
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {[["all", "All"], ...Object.entries(ACTIVITY_TYPES).map(([k, v]) => [k, v.label])].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-black cursor-pointer ${filter === key ? "bg-purple-600 text-white" : currentStyle.btnSecondary}`}
            >
              {label}
            </button>
          ))}
        </div>

        {feed.length === 0 ? (
          <p className="text-xs opacity-70 py-6 text-center">Nothing here yet. Write a story, draw, search or play a game and it will show up.</p>
        ) : (
          <ul className="space-y-2">
            {feed.map((a) => {
              const cfg = ACTIVITY_TYPES[a.type] || ACTIVITY_TYPES.story;
              return (
                <li key={a.id} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${currentStyle.panelBg}`}>
                  <span className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <cfg.icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{a.label}</p>
                    <p className="text-[10px] opacity-60">{cfg.label.replace(/s$/, "")} · {timeAgo(a.ts)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <button type="button" onClick={onLogout} className={`w-full py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer ${currentStyle.btnSecondary}`}>
        <LogOut className="w-4 h-4" /> Log out of PlotCraft
      </button>
    </div>
  );
}



/* ===== Sidebar navigation: 6 main groups. Every tool lives in exactly one place; search and favorites find it fast. ===== */
const NAV_GROUPS = [
  { id: "home", label: "Home", icon: Home, direct: { id: "home", label: "Home", icon: Home, go: { cat: null, tab: "pro" } } },
  {
    id: "create", label: "Create", icon: Sparkles, items: [
      { id: "story", label: "Story & Writing", icon: BookOpen, go: { tab: "story" } },
      { id: "writing", label: "Writing Studio", icon: FileText, go: { cat: "writing" } },
      { id: "graphic", label: "Graphic Design", icon: Palette, go: { cat: "graphic" } },
      { id: "video", label: "Video & VFX", icon: Video, go: { cat: "video" } },
      { id: "music", label: "Music & Audio", icon: Music2, go: { cat: "music" } },
      { id: "animation", label: "Animation Studio", icon: Clapperboard, go: { cat: "animation" } },
      { id: "character", label: "Character Creator", icon: Box, go: { cat: "model" } },
      { id: "art", label: "Art & Drawing", icon: ImageIcon, go: { cat: "art" } },
      { id: "fashion", label: "Fashion & Interior", icon: Sofa, go: { cat: "design" } },
      { id: "diy", label: "DIY & Handmade", icon: Scissors, go: { cat: "diy" } },
      { id: "templates", label: "Templates", icon: LayoutGrid, go: { tab: "templates" } },
      { id: "tools", label: "Creative Tools", icon: Wrench, go: { tab: "tools" } },
    ],
  },
  {
    id: "ai", label: "AI Tools", icon: Cpu, items: [
      { id: "chat", label: "AI Chat", icon: MessageSquare, go: { tab: "search" } },
      { id: "prompt", label: "Prompt Helper", icon: Wand2, go: { tab: "search" } },
      { id: "ai-image", label: "AI Image Generator", icon: ImageIcon, go: { action: "visuals", kind: "image" } },
      { id: "ai-video", label: "AI Video Generator", icon: Video, go: { action: "visuals", kind: "video" } },
    ],
  },
  {
    id: "workspace", label: "Workspace", icon: FolderOpen, items: [
      { id: "projects", label: "Projects", icon: FolderOpen, go: { tab: "projects" } },
      { id: "files", label: "Files Editor", icon: FileText, go: { cat: "files" } },
      { id: "history", label: "History", icon: CalendarDays, go: { tab: "history" } },
      { id: "saved", label: "Saved Projects", icon: Save, go: { cat: "art", openSaved: true } },
    ],
  },
  {
    id: "learn", label: "Learn", icon: Lightbulb, items: [
      { id: "learning", label: "Learning & Experiments", icon: FlaskConical, go: { cat: "learn" } },
      { id: "tutorials", label: "Tutorials & Guides", icon: BookOpen, go: { tab: "usage" } },
      { id: "sudoku", label: "Brain Games · Sudoku", icon: Grid3x3, go: { tab: "sudoku" } },
      { id: "memory", label: "Memory Match", icon: Brain, go: { tab: "memory" } },
      { id: "math", label: "Quick Math", icon: Calculator, go: { tab: "math" } },
    ],
  },
  {
    id: "community", label: "Community", icon: Users, items: [
      { id: "feed", label: "Community Feed", icon: Users, go: { tab: "community" } },
      { id: "toprated", label: "Top Rated", icon: Award, go: { tab: "toprated" } },
      { id: "about", label: "About", icon: Info, go: { tab: "about" } },
    ],
  },
];
const DEFAULT_FAVORITES = ["video", "graphic", "story"];

export function AiDashboard() {
  useUpgradeStyles();
  const [navQuery, setNavQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({ create: true });
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("plotcraft_favorites") || "null");
      return Array.isArray(saved) ? saved : DEFAULT_FAVORITES;
    } catch {
      return DEFAULT_FAVORITES;
    }
  });
  useEffect(() => {
    try { localStorage.setItem("plotcraft_favorites", JSON.stringify(favorites)); } catch { /* storage unavailable */ }
  }, [favorites]);
  const toggleFavorite = (id) => setFavorites((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const allNavItems = NAV_GROUPS.flatMap((g) => (g.direct ? [{ ...g.direct, group: g.label }] : g.items.map((i) => ({ ...i, group: g.label }))));
  const isNavActive = (go) => {
    if (go.action) return currentTab === go.kind;
    if (go.cat !== undefined) return currentTab === "pro" && proCategory === go.cat;
    return currentTab === go.tab;
  };
  const runNav = (go) => {
    if (go.action === "visuals") {
      handleRequireLoginForVisuals(go.kind);
    } else if (go.cat !== undefined) {
      setActiveProject(null);
      setProCategory(go.cat);
      setCurrentTab("pro");
      if (go.openSaved) setOpenProjectsSignal((value) => value + 1);
    } else {
      setActiveProject(null);
      setCurrentTab(go.tab);
    }
    setIsNavOpen(false);
  };
  const renderItem = (item, groupLabel) => {
    const Icon = item.icon;
    const active = isNavActive(item.go);
    const fav = favorites.includes(item.id);
    return (
      <div key={`${item.id}-${groupLabel || ""}`} className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => runNav(item.go)}
          className={`flex-1 min-w-0 flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-xl transition ${active ? "bg-purple-600 text-white shadow-md" : currentStyle.navHover}`}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span className="truncate">{item.label}</span>
          {groupLabel && <span className="ml-auto text-[9px] opacity-60 shrink-0">{groupLabel}</span>}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
          title={fav ? "Remove from favorites" : "Add to favorites"}
          className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition"
        >
          <Star className={`w-3.5 h-3.5 ${fav ? "fill-yellow-400 text-yellow-400" : ""}`} />
        </button>
      </div>
    );
  };
  const [theme, setTheme] = useState(() => {
    const validThemes = ["standard", "rgbclr", "cyberpunk", "emerald", "sunset", "party", "rainy"];
    try {
      const storedTheme = localStorage.getItem("plotcraft_theme");
      return validThemes.includes(storedTheme) ? storedTheme : "standard";
    } catch {
      return "standard";
    }
  });
  const [isNavOpen, setIsNavOpen] = useState(false);

  const [dream, setDream] = useState(() => {
    try {
      return localStorage.getItem("plotcraft_dream") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("plotcraft_dream", dream ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  }, [dream]);

  useEffect(() => {
    try {
      localStorage.setItem("plotcraft_theme", theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  const getThemeClasses = () => {
    if (dream) {
      return {
        isDream: true,
          bgMain: "bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-slate-100",
          bgHeader: "bg-slate-950/70 backdrop-blur-md border-b border-violet-500/30 text-slate-100",
          bgSidebar: "bg-slate-950/85 backdrop-blur-md border-r border-violet-500/30 text-slate-100",
          bgCard: "bg-slate-900/70 border border-violet-500/30 text-slate-100 shadow-xl shadow-violet-900/30",
          bgInput: "bg-slate-950/80 border border-violet-500/40 text-slate-100 placeholder-slate-500 focus:border-cyan-400",
          btnPrimary: "bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 text-white font-bold shadow-lg shadow-violet-900/40",
          btnSecondary: "bg-slate-800/80 hover:bg-slate-700 text-violet-100 border border-violet-500/40 font-semibold",
          badgeBg: "bg-violet-500/20 text-violet-200 border border-violet-400/40",
          scrollCard: "bg-slate-900/70 border border-violet-500/30 text-slate-100",
          footerBg: "bg-slate-950/70 border-t border-violet-500/30 text-slate-300",
          logoTheme: "text-violet-300", logoRing: "border border-violet-400/40 rounded-2xl p-0.5",
          navHover: "hover:bg-violet-500/20 text-slate-100", panelBg: "bg-violet-500/10 border border-violet-400/30",
          userBubble: "bg-gradient-to-br from-violet-600 to-cyan-500 text-white"
      };
    }
    switch (theme) {
              case "world": return {
          bgMain: "bg-gradient-to-br from-[#fff7fb] via-[#f5f1ff] to-[#eef8ff] text-slate-800",
          bgHeader: "bg-white/90 backdrop-blur-xl border-b border-violet-100 text-slate-800",
          bgSidebar: "bg-white/92 backdrop-blur-xl border-r border-violet-100 text-slate-800",
          bgCard: "bg-white/90 border border-violet-100 text-slate-800 shadow-lg shadow-violet-100/70 rounded-3xl",
          bgInput: "bg-white border border-violet-200 text-slate-800 placeholder-slate-400 focus:border-violet-400 rounded-2xl",
          btnPrimary: "bg-gradient-to-r from-violet-500 to-fuchsia-400 hover:opacity-90 text-white font-bold shadow-lg shadow-violet-200/70 rounded-2xl",
          btnSecondary: "bg-white hover:bg-violet-50 text-violet-800 border border-violet-200 font-semibold rounded-2xl",
          badgeBg: "bg-violet-100 text-violet-700 border border-violet-200",
          scrollCard: "bg-white/90 border border-violet-100 text-slate-800 rounded-3xl",
          footerBg: "bg-white/90 border-t border-violet-100 text-slate-600",
          logoTheme: "text-violet-600",
          logoRing: "border border-violet-200 rounded-2xl p-0.5",
          navHover: "hover:bg-violet-50 text-slate-700",
          panelBg: "bg-violet-50/80 border border-violet-100",
          userBubble: "bg-gradient-to-br from-violet-500 to-fuchsia-400 text-white",
        };
case "standard":
        return {
          bgMain: "bg-slate-50 text-slate-900",
          bgHeader: "bg-white border-b border-slate-200 text-slate-900",
          bgSidebar: "bg-white border-r border-slate-200 text-slate-800",
          bgCard: "bg-white border border-slate-200 text-slate-900 shadow-sm shadow-slate-200/60",
          bgInput: "bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-violet-500",
          btnPrimary: "bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-sm",
          btnSecondary: "bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold",
          badgeBg: "bg-violet-50 text-violet-700 border border-violet-200",
          scrollCard: "bg-white border border-slate-200 text-slate-900",
          footerBg: "bg-white border-t border-slate-200 text-slate-600",
          logoTheme: "text-violet-700", logoRing: "border border-slate-200 rounded-2xl p-0.5",
          navHover: "hover:bg-slate-100 text-slate-700", panelBg: "bg-slate-50 border border-slate-200",
          userBubble: "bg-violet-600 text-white"
        };
      case "rgbclr":
        return {
          bgMain: "bg-gradient-to-br from-black via-neutral-950 to-fuchsia-950 text-slate-100",
          bgHeader: "bg-slate-950/70 backdrop-blur-md border-b border-fuchsia-500/30 text-slate-100",
          bgSidebar: "bg-slate-950/85 backdrop-blur-md border-r border-fuchsia-500/30 text-slate-100",
          bgCard: "bg-slate-900/70 border border-fuchsia-500/30 text-slate-100 shadow-xl shadow-fuchsia-900/30",
          bgInput: "bg-slate-950/80 border border-fuchsia-500/40 text-slate-100 placeholder-slate-500 focus:border-cyan-400",
          btnPrimary: "bg-gradient-to-r from-fuchsia-600 to-cyan-500 hover:opacity-90 text-white font-bold shadow-lg shadow-fuchsia-900/40",
          btnSecondary: "bg-slate-800/80 hover:bg-slate-700 text-fuchsia-100 border border-fuchsia-500/40 font-semibold",
          badgeBg: "bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-400/40",
          scrollCard: "bg-slate-900/70 border border-fuchsia-500/30 text-slate-100",
          footerBg: "bg-slate-950/70 border-t border-fuchsia-500/30 text-slate-300",
          logoTheme: "text-fuchsia-300", logoRing: "border border-fuchsia-400/40 rounded-2xl p-0.5",
          navHover: "hover:bg-fuchsia-500/20 text-slate-100", panelBg: "bg-fuchsia-500/10 border border-fuchsia-400/30",
          userBubble: "bg-gradient-to-br from-fuchsia-600 to-cyan-500 text-white"
        };
      case "cyberpunk":
        return {
          bgMain: "bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-slate-100",
          bgHeader: "bg-slate-950/70 backdrop-blur-md border-b border-cyan-500/30 text-slate-100",
          bgSidebar: "bg-slate-950/85 backdrop-blur-md border-r border-cyan-500/30 text-slate-100",
          bgCard: "bg-slate-900/70 border border-cyan-500/30 text-slate-100 shadow-xl shadow-cyan-900/30",
          bgInput: "bg-slate-950/80 border border-cyan-500/40 text-slate-100 placeholder-slate-500 focus:border-fuchsia-400",
          btnPrimary: "bg-gradient-to-r from-cyan-600 to-fuchsia-500 hover:opacity-90 text-white font-bold shadow-lg shadow-cyan-900/40",
          btnSecondary: "bg-slate-800/80 hover:bg-slate-700 text-cyan-100 border border-cyan-500/40 font-semibold",
          badgeBg: "bg-cyan-500/20 text-cyan-200 border border-cyan-400/40",
          scrollCard: "bg-slate-900/70 border border-cyan-500/30 text-slate-100",
          footerBg: "bg-slate-950/70 border-t border-cyan-500/30 text-slate-300",
          logoTheme: "text-cyan-300", logoRing: "border border-cyan-400/40 rounded-2xl p-0.5",
          navHover: "hover:bg-cyan-500/20 text-slate-100", panelBg: "bg-cyan-500/10 border border-cyan-400/30",
          userBubble: "bg-gradient-to-br from-cyan-600 to-fuchsia-500 text-white"
        };
      case "emerald":
        return {
          bgMain: "bg-gradient-to-br from-emerald-100 via-white to-teal-100 text-slate-800",
          bgHeader: "bg-white/80 backdrop-blur-md border-b border-emerald-200 text-slate-800",
          bgSidebar: "bg-white/90 backdrop-blur-md border-r border-emerald-200 text-slate-800",
          bgCard: "bg-white/90 border border-emerald-200 text-slate-800 shadow-lg shadow-emerald-200/60",
          bgInput: "bg-white border border-emerald-300 text-slate-800 placeholder-slate-400 focus:border-emerald-500",
          btnPrimary: "bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-90 text-white font-bold shadow-md",
          btnSecondary: "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold",
          badgeBg: "bg-emerald-100 text-emerald-800 border border-emerald-200",
          scrollCard: "bg-white border border-emerald-200 text-slate-800",
          footerBg: "bg-white/80 border-t border-emerald-200 text-slate-600",
          logoTheme: "text-emerald-600", logoRing: "border border-emerald-300 rounded-2xl p-0.5",
          navHover: "hover:bg-emerald-100 text-slate-800", panelBg: "bg-emerald-50 border border-emerald-200",
          userBubble: "bg-emerald-600 text-white"
        };
      case "sunset":
        return {
          bgMain: "bg-gradient-to-br from-orange-100 via-white to-rose-100 text-slate-800",
          bgHeader: "bg-white/80 backdrop-blur-md border-b border-orange-200 text-slate-800",
          bgSidebar: "bg-white/90 backdrop-blur-md border-r border-orange-200 text-slate-800",
          bgCard: "bg-white/90 border border-orange-200 text-slate-800 shadow-lg shadow-orange-200/60",
          bgInput: "bg-white border border-orange-300 text-slate-800 placeholder-slate-400 focus:border-orange-500",
          btnPrimary: "bg-gradient-to-r from-orange-600 to-rose-500 hover:opacity-90 text-white font-bold shadow-md",
          btnSecondary: "bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 font-semibold",
          badgeBg: "bg-orange-100 text-orange-800 border border-orange-200",
          scrollCard: "bg-white border border-orange-200 text-slate-800",
          footerBg: "bg-white/80 border-t border-orange-200 text-slate-600",
          logoTheme: "text-orange-600", logoRing: "border border-orange-300 rounded-2xl p-0.5",
          navHover: "hover:bg-orange-100 text-slate-800", panelBg: "bg-orange-50 border border-orange-200",
          userBubble: "bg-orange-600 text-white"
        };
      case "party":
        return {
          bgMain: "bg-gradient-to-br from-pink-100 via-white to-purple-100 text-slate-800",
          bgHeader: "bg-white/80 backdrop-blur-md border-b border-pink-200 text-slate-800",
          bgSidebar: "bg-white/90 backdrop-blur-md border-r border-pink-200 text-slate-800",
          bgCard: "bg-white/90 border border-pink-200 text-slate-800 shadow-lg shadow-pink-200/60",
          bgInput: "bg-white border border-pink-300 text-slate-800 placeholder-slate-400 focus:border-pink-500",
          btnPrimary: "bg-gradient-to-r from-pink-600 to-purple-500 hover:opacity-90 text-white font-bold shadow-md",
          btnSecondary: "bg-pink-50 hover:bg-pink-100 text-pink-900 border border-pink-200 font-semibold",
          badgeBg: "bg-pink-100 text-pink-800 border border-pink-200",
          scrollCard: "bg-white border border-pink-200 text-slate-800",
          footerBg: "bg-white/80 border-t border-pink-200 text-slate-600",
          logoTheme: "text-pink-600", logoRing: "border border-pink-300 rounded-2xl p-0.5",
          navHover: "hover:bg-pink-100 text-slate-800", panelBg: "bg-pink-50 border border-pink-200",
          userBubble: "bg-pink-600 text-white"
        };
      case "rainy":
        return {
          bgMain: "bg-gradient-to-br from-sky-100 via-white to-indigo-100 text-slate-800",
          bgHeader: "bg-white/80 backdrop-blur-md border-b border-sky-200 text-slate-800",
          bgSidebar: "bg-white/90 backdrop-blur-md border-r border-sky-200 text-slate-800",
          bgCard: "bg-white/90 border border-sky-200 text-slate-800 shadow-lg shadow-sky-200/60",
          bgInput: "bg-white border border-sky-300 text-slate-800 placeholder-slate-400 focus:border-sky-500",
          btnPrimary: "bg-gradient-to-r from-sky-600 to-indigo-500 hover:opacity-90 text-white font-bold shadow-md",
          btnSecondary: "bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 font-semibold",
          badgeBg: "bg-sky-100 text-sky-800 border border-sky-200",
          scrollCard: "bg-white border border-sky-200 text-slate-800",
          footerBg: "bg-white/80 border-t border-sky-200 text-slate-600",
          logoTheme: "text-sky-600", logoRing: "border border-sky-300 rounded-2xl p-0.5",
          navHover: "hover:bg-sky-100 text-slate-800", panelBg: "bg-sky-50 border border-sky-200",
          userBubble: "bg-sky-600 text-white"
        };
      default:
        return {
          bgMain: "bg-gradient-to-br from-violet-100 via-white to-fuchsia-100 text-slate-800",
          bgHeader: "bg-white/80 backdrop-blur-md border-b border-violet-200 text-slate-800",
          bgSidebar: "bg-white/90 backdrop-blur-md border-r border-violet-200 text-slate-800",
          bgCard: "bg-white/90 border border-violet-200 text-slate-800 shadow-lg shadow-violet-200/60",
          bgInput: "bg-white border border-violet-300 text-slate-800 placeholder-slate-400 focus:border-violet-500",
          btnPrimary: "bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:opacity-90 text-white font-bold shadow-md",
          btnSecondary: "bg-violet-50 hover:bg-violet-100 text-violet-900 border border-violet-200 font-semibold",
          badgeBg: "bg-violet-100 text-violet-800 border border-violet-200",
          scrollCard: "bg-white border border-violet-200 text-slate-800",
          footerBg: "bg-white/80 border-t border-violet-200 text-slate-600",
          logoTheme: "text-violet-600", logoRing: "border border-violet-300 rounded-2xl p-0.5",
          navHover: "hover:bg-violet-100 text-slate-800", panelBg: "bg-violet-50 border border-violet-200",
          userBubble: "bg-violet-600 text-white"
        };
    }
  };

  // light themes need dark "Plot" text, dark themes need white
  const isLightTheme = ["standard", "emerald", "sunset", "party", "rainy"].includes(theme);
  const plotColor = isLightTheme ? "text-slate-900" : "text-white";

  const currentStyle = useMemo(() => ({
    isDream: false,
    navHover: "hover:bg-white/10",
    panelBg: "bg-white/10 border border-white/10",
    userBubble: "bg-purple-600 text-white",
    ...getThemeClasses()
  }), [theme, dream]);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("plotcraft_user");
      return saved && getToken() ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    if (!getToken()) return;
    fetchMe()
      .then((user) => {
        setCurrentUser(user);
        localStorage.setItem("plotcraft_user", JSON.stringify(user));
      })
      .catch((err) => {
        if (err.status === 401) {
          setToken("");
          setCurrentUser(null);
          localStorage.removeItem("plotcraft_user");
        }
      });
  }, []);

  const finishAuth = (user) => {
    setCurrentUser(user);
    localStorage.setItem("plotcraft_user", JSON.stringify(user));
    setShowAuthModal(false);
    setAuthForm({ name: "", email: "", password: "" });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthBusy(true);
    try {
      finishAuth(await loginUser({ email: authForm.email, password: authForm.password }));
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError("");
    if (!authForm.name || !authForm.email || !authForm.password) {
      setAuthError("Please fill all fields!");
      return;
    }
    setAuthBusy(true);
    try {
      finishAuth(await registerUser(authForm));
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    localStorage.removeItem("plotcraft_user");
    if (["image", "video", "profile"].includes(currentTab)) setCurrentTab("story");
  };

  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("plotcraft_stories_history");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("plotcraft_stories_history", JSON.stringify(history));
    } catch {
      /* Storage may be unavailable or full; history remains available in memory. */
    }
  }, [history]);

  const [searchQuery, setSearchQuery] = useState("");

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return history.filter((item) =>
      String(item?.title || "Untitled story").toLowerCase().includes(query)
    );
  }, [history, searchQuery]);

  const handleNewChat = () => {
    setStoryTitle("");
    setHeroName("");
    setGeneratedStory("");
    setStoryPages([]);
    setStoryPlace("");
    setStoryJob({ id: "", canContinue: false, error: "" });
    setStoryUrl("");
    setScriptInput("");
    setGeneratedImage("");
    setVideoInputContent("");
    setVideoUrl("");
    setAiVideoUrl("");
    setVideoError("");
    setCurrentTab("story");
  };

  const handleDeleteHistory = (id) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
  };

  const [currentTab, setCurrentTab] = useState("pro");
  const [activeProject, setActiveProject] = useState(null);
  const [creativeTab, setCreativeTab] = useState("audio");
  const [proCategory, setProCategory] = useState(null);
  const [openProjectsSignal, setOpenProjectsSignal] = useState(0);
  const scrollRef = useRef(null);

  // ---- activity tracking (per user, saved on this device) ----
  const activityKey = `plotcraft_activity_${currentUser?.email || "guest"}`;
  const [activity, setActivity] = useState(() => readStore(activityKey, []));
  const lastLogRef = useRef({ sig: "", t: 0 });

  useEffect(() => {
    setActivity(readStore(activityKey, []));
  }, [activityKey]);

  const logActivity = (type, label) => {
    const clean = String(label || "").trim().slice(0, 140);
    if (!clean) return;
    const now = Date.now();
    const sig = `${type}|${clean}`;
    if (lastLogRef.current.sig === sig && now - lastLogRef.current.t < 3000) return; // ignore double fires
    lastLogRef.current = { sig, t: now };
    setActivity((prev) => {
      const alreadyLogged = prev.some((item) => item.type === type && item.label === clean && now - Number(item.ts || 0) < 8000);
      if (alreadyLogged) return prev;
      const next = [{ id: `${now}-${Math.random().toString(36).slice(2, 7)}`, type, label: clean, ts: now }, ...prev].slice(0, 250);
      writeStore(activityKey, next);
      return next;
    });
  };

  const clearActivity = () => {
    setActivity([]);
    writeStore(activityKey, []);
  };

  // catches what the user types in AI Chat without changing AiSearch itself
  const captureSearchKey = (e) => {
    const el = e.target;
    if (e.key === "Enter" && !e.shiftKey && el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      logActivity("search", el.value);
    }
  };
  const captureSearchSubmit = (e) => {
    const field = e.target.querySelector && e.target.querySelector("textarea, input[type=text], input:not([type])");
    if (field) logActivity("search", field.value);
  };

  const tabLabels = {
    pro: "Home",
    history: "History",
    story: "Create Story",
    image: "Script to Image",
    video: "Video Gen",
    search: "AI Chat",
    about: "About Us",
    usage: "Usage Guidelines",
    toprated: "Top Rated",
    profile: "My Profile",
    developer: "About the Developer",
    draw: "Draw & Sketch",
    sudoku: "Sudoku",
    memory: "Memory Match",
    math: "Quick Math"
  };

  const openDeveloper = () => {
    setCurrentTab("developer");
    setIsNavOpen(false);
  };

  // always start a new page from the top
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentTab]);
  const [selectedGenre, setSelectedGenre] = useState("Moral Story with a good lesson for kids");
  const [storyTitle, setStoryTitle] = useState("");
  const [heroName, setHeroName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  
  const [generatedStory, setGeneratedStory] = useState("");
  const [storyUrl, setStoryUrl] = useState("");
  const [selectedDocStory, setSelectedDocStory] = useState(null);

  const [storyPages, setStoryPages] = useState([]);

  // long stories: how many pages, where it happens, and how far the writer has got
  const [pageCount, setPageCount] = useState(5);
  const [storyPlace, setStoryPlace] = useState("");
  const [storyProgress, setStoryProgress] = useState({ done: 0, total: 0, message: "" });
  const [storyJob, setStoryJob] = useState({ id: "", canContinue: false, error: "" });

  const [scriptInput, setScriptInput] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [imageStyle, setImageStyle] = useState("3d");
  const [imageInfo, setImageInfo] = useState({ provider: "", style: "" });

  const [videoInputContent, setVideoInputContent] = useState("");
  const [videoDuration, setVideoDuration] = useState(5);
  const [videoUrl, setVideoUrl] = useState("");
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [aiVideoUrl, setAiVideoUrl] = useState("");
  const [videoError, setVideoError] = useState("");
  const videoCanvasRef = useRef(null);

  const genres = [
    { name: "Moral Story 🦁", val: "Moral Story with a good lesson for kids" },
    { name: "Space Adventure 🚀", val: "Fun Space Adventure for children" },
    { name: "Magic World 🧙‍♂️", val: "Magical Fantasy story for kids" },
    { name: "Animal Tale 🐶", val: "Cute Animal story for kids" },
    { name: "Mythological 🔱", val: "Extensive authentic mythological epic story from Ramayana or Mahabharata with deep elaborate descriptions and sacred details" }
  ];

  // Saves the finished story in the history list (this device) and shows it
  const finishStory = (pages) => {
    const text = pages.join("\n\n");
    setGeneratedStory(text);
    setStoryPages(pages);
    logActivity("story", storyTitle || "Untitled story");
    setStoryUrl(`${API_BASE}/api/stories/start`);

    const newStoryObj = {
      id: Date.now(),
      title: storyTitle,
      heroName: heroName || "Hero",
      genre: selectedGenre,
      place: storyPlace,
      storyText: text,
      pages, // real pages, nothing cut
      storyUrl: `${API_BASE}/api/stories/start`,
      createdAt: new Date().toLocaleString()
    };
    setHistory((previousHistory) => {
      const updatedHistory = [
        newStoryObj,
        ...previousHistory.filter((item) => item?.title !== storyTitle)
      ].slice(0, 100);
      return updatedHistory;
    });
  };

  const onStoryProgress = (p) => {
    setStoryPages(p.pages);
    setStoryProgress({ done: p.done, total: p.total, message: p.message });
    setLoadingMsg(p.message || "Writing your story...");
  };

  const handleGenerateStory = async (e) => {
    e.preventDefault();
    if (!storyTitle.trim()) {
      alert("Please enter a story title!");
      return;
    }

    setLoading(true);
    setLoadingMsg("Planning your story...");
    setGeneratedStory("");
    setStoryPages([]);
    setStoryProgress({ done: 0, total: pageCount, message: "Planning your story..." });
    setStoryJob({ id: "", canContinue: false, error: "" });

    try {
      // The server plans the story, then writes it page by page using several AI providers.
      const result = await generateStory(
        {
          storyTitle: storyTitle.trim(),
          heroName: heroName?.trim() || "Hero",
          genre: selectedGenre || "Moral Story",
          place: storyPlace.trim(),
          pages: pageCount
        },
        { onProgress: onStoryProgress }
      );
      setStoryJob({ id: result.jobId, canContinue: false, error: "" });
      finishStory(result.pages);
    } catch (err) {
      console.error("Story generation error:", err);
      if (err.canContinue) {
        // engines were busy: the finished pages stay on screen and can be continued
        setStoryPages(err.pages || []);
        setStoryJob({ id: err.jobId, canContinue: true, error: err.message });
      } else {
        alert(err?.message || "Story generation failed. Please make sure the server is running on port 5000.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinueStory = async () => {
    if (!storyJob.id) return;
    setLoading(true);
    setLoadingMsg("Continuing your story...");
    setStoryJob((j) => ({ ...j, canContinue: false, error: "" }));
    try {
      const result = await continueStory(storyJob.id, storyPages, { onProgress: onStoryProgress });
      setStoryJob({ id: result.jobId, canContinue: false, error: "" });
      finishStory(result.pages);
    } catch (err) {
      setStoryPages(err.pages || storyPages);
      setStoryJob({ id: err.jobId || storyJob.id, canContinue: !!err.canContinue, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  // text file with a clear heading for every page
  const storyToFileText = (pages, fallbackText) =>
    pages && pages.length > 1 ? pages.map((p, i) => `--- Page ${i + 1} of ${pages.length} ---\n\n${p}`).join("\n\n") : fallbackText;

  const handleDownloadStoryTxtFile = (title, text) => {
    if (!text) return;
    const element = document.createElement("a");
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${title || 'story'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleRequireLoginForVisuals = (targetTab) => {
    if (!currentUser) {
      setShowAuthModal(true);
    } else {
      setCurrentTab(targetTab);
    }
  };

  // drawing studio -> story / video
  const handleDrawingToStory = (caption) => {
    setStoryTitle(caption);
    setCurrentTab("story");
  };

  const handleAnimateDrawing = (dataUrl) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    setGeneratedImage(dataUrl);
    setAiVideoUrl("");
    setVideoError("");
    setVideoUrl("generated_video_active");
    setIsVideoPlaying(true);
    logActivity("video", "Animated my drawing");
    setCurrentTab("video");
  };

  const handleScriptToImage = async () => {
    const finalPrompt = scriptInput || storyTitle || generatedStory.substring(0, 100);
    if (!finalPrompt) {
      alert("Please enter a script or prompt to generate an image!");
      return;
    }

    setLoading(true);
    setLoadingMsg(`Creating your ${imageStyle === "2d" ? "2D" : "3D"} image...`);
    try {
      const result = await generateImageWithInfo(finalPrompt, { style: imageStyle });
      setGeneratedImage(result.imageUrl);
      setImageInfo({ provider: result.provider, style: imageStyle });
      logActivity("image", `${imageStyle.toUpperCase()} image: ${finalPrompt}`);
    } catch (err) {
      alert(err?.message || "Image creation failed!");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadImage = () => {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = 'plotcraft_image.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleGenerateVideo = async () => {
    const promptText =
      videoInputContent.trim() || scriptInput.trim() || storyTitle.trim() || generatedStory.substring(0, 200);

    if (!promptText && !generatedImage) {
      alert("Please enter a text prompt to generate a video!");
      return;
    }

    setLoading(true);
    setLoadingMsg("Sending your scene to the free AI video engine...");
    setAiVideoUrl("");
    setVideoError("");

    try {
      const url = await generateVideo(`${promptText}, cinematic, smooth camera motion`, {
        duration: videoDuration,
        onProgress: (msg) => setLoadingMsg(msg),
      });
      setAiVideoUrl(url);
      setVideoUrl(url);
      logActivity("video", promptText);
    } catch (err) {
      setVideoError(err?.message || "AI video failed.");
      if (generatedImage) {
        setVideoUrl("generated_video_active");
        setIsVideoPlaying(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadVideo = () => {
    if (!videoCanvasRef.current) return;
    const canvas = videoCanvasRef.current;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement('a');
    a.href = url;
    a.download = `plotcraft_video_frame_${videoDuration}s.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    if (!videoUrl || !videoCanvasRef.current || !generatedImage) return;

    const canvas = videoCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = generatedImage;

    let animationFrameId;
    let startTime = null;

    img.onload = () => {
      const render = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = (timestamp - startTime) / 1000;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const scale = 1 + Math.sin(elapsed * 0.8) * 0.08;
        const dx = Math.sin(elapsed * 0.5) * 15;
        const dy = Math.cos(elapsed * 0.5) * 10;

        ctx.save();
        ctx.translate(canvas.width / 2 + dx, canvas.height / 2 + dy);
        ctx.scale(scale, scale);
        ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        ctx.restore();

        if (isVideoPlaying) {
          animationFrameId = requestAnimationFrame(render);
        }
      };

      if (isVideoPlaying) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    return () => cancelAnimationFrame(animationFrameId);
  }, [videoUrl, generatedImage, isVideoPlaying, videoDuration]);

  const closeDocModal = () => {
    stopSpeaking();
    setSelectedDocStory(null);
  };

  return (
    <div data-theme={theme} className={`plotcraft-shell relative flex flex-col h-screen ${currentStyle.bgMain} font-sans overflow-hidden transition-colors duration-300`}>
      <PlotCraftDesign />
      <PlotCraftFX dark={["rgbclr", "cyberpunk", "dream"].includes(theme)} />
      <style>{`
        @keyframes slideFromLeft {
          0% { opacity: 0; transform: translateX(-80px) scale(0.95); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes slideFromRight {
          0% { opacity: 0; transform: translateX(80px) scale(0.95); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes slideFromTop {
          0% { opacity: 0; transform: translateY(-80px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slide-in-left {
          animation: slideFromLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-in-right {
          animation: slideFromRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-in-top {
          animation: slideFromTop 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .nav-stagger-item {
          opacity: 0;
          transform: translateY(-15px);
          animation: navItemReveal 0.5s ease forwards;
        }
        .nav-stagger-item:nth-child(1) { animation-delay: 0.05s; }
        .nav-stagger-item:nth-child(2) { animation-delay: 0.1s; }
        .nav-stagger-item:nth-child(3) { animation-delay: 0.15s; }
        .nav-stagger-item:nth-child(4) { animation-delay: 0.2s; }
        .nav-stagger-item:nth-child(5) { animation-delay: 0.25s; }
        .nav-stagger-item:nth-child(6) { animation-delay: 0.3s; }
        .nav-stagger-item:nth-child(7) { animation-delay: 0.35s; }

        @keyframes navItemReveal {
          0% {
            opacity: 0;
            transform: translateY(-15px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .nav-stagger-item:nth-child(8) { animation-delay: 0.4s; }

        /* ---------- PlotCraft Studio theme layer (one clean block) ---------- */
        .plotcraft-shell {
          --pc-accent: #7c3aed;
          --pc-accent-2: #d946ef;
          --pc-line: rgba(124,58,237,.18);
          isolation: isolate;
          font-family: "Segoe UI Variable", "Aptos", Inter, system-ui, sans-serif;
          line-height: 1.55;
        }
        .plotcraft-shell[data-theme="standard"]  { --pc-accent: #7c3aed; --pc-accent-2: #d946ef; }
        .plotcraft-shell[data-theme="dream"]     { --pc-accent: #8b5cf6; --pc-accent-2: #06b6d4; --pc-line: rgba(139,92,246,.3); }
        .plotcraft-shell[data-theme="rgbclr"]    { --pc-accent: #d946ef; --pc-accent-2: #22d3ee; --pc-line: rgba(217,70,239,.3); }
        .plotcraft-shell[data-theme="cyberpunk"] { --pc-accent: #06b6d4; --pc-accent-2: #d946ef; --pc-line: rgba(6,182,212,.3); }
        .plotcraft-shell[data-theme="emerald"]   { --pc-accent: #059669; --pc-accent-2: #14b8a6; --pc-line: rgba(5,150,105,.2); }
        .plotcraft-shell[data-theme="sunset"]    { --pc-accent: #f97316; --pc-accent-2: #e11d48; --pc-line: rgba(249,115,22,.22); }
        .plotcraft-shell[data-theme="party"]     { --pc-accent: #ec4899; --pc-accent-2: #8b5cf6; --pc-line: rgba(236,72,153,.22); }
        .plotcraft-shell[data-theme="rainy"]     { --pc-accent: #0ea5e9; --pc-accent-2: #6366f1; --pc-line: rgba(14,165,233,.22); }

        .plotcraft-shell, .plotcraft-shell * { text-shadow: none !important; }
        .plotcraft-shell button, .plotcraft-shell input,
        .plotcraft-shell textarea, .plotcraft-shell select { font-family: inherit; }
        .plotcraft-shell h1, .plotcraft-shell h2, .plotcraft-shell h3, .plotcraft-shell h4 {
          letter-spacing: -0.025em; line-height: 1.2;
        }
        .plotcraft-shell .font-black, .plotcraft-shell .font-extrabold { font-weight: 700; }
        .plotcraft-shell .font-bold { font-weight: 600; }

        /* interaction */
        .plotcraft-shell button { transition: transform .18s ease, background-color .18s ease, border-color .18s ease, opacity .18s ease; }
        .plotcraft-shell button:active { transform: scale(.985); }
        .plotcraft-shell button:focus-visible, .plotcraft-shell a:focus-visible,
        .plotcraft-shell input:focus-visible, .plotcraft-shell textarea:focus-visible,
        .plotcraft-shell select:focus-visible {
          outline: 3px solid color-mix(in srgb, var(--pc-accent) 65%, white);
          outline-offset: 3px;
        }
        .plotcraft-shell input, .plotcraft-shell textarea, .plotcraft-shell select {
          border-radius: 12px; font-size: 13px; transition: border-color .18s ease, box-shadow .18s ease;
        }
        .plotcraft-shell input:focus, .plotcraft-shell textarea:focus, .plotcraft-shell select:focus {
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--pc-accent) 18%, transparent);
        }

        /* ---------- Premium layer: refined motion, glass depth, polish ---------- */
        .plotcraft-shell { --pc-ease: cubic-bezier(.16,1,.3,1); --pc-glow: color-mix(in srgb, var(--pc-accent) 30%, transparent); }
        @keyframes pcPageIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .plotcraft-shell main { animation: pcPageIn .6s var(--pc-ease) both; }
        .plotcraft-shell main > div.grid > div.rounded-3xl {
          transition: transform .5s var(--pc-ease), box-shadow .5s var(--pc-ease), border-color .35s ease;
        }
        .plotcraft-shell main > div.grid > div.rounded-3xl:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 48px color-mix(in srgb, var(--pc-accent) 22%, transparent);
        }
        .plotcraft-shell button.bg-purple-600:hover:not(:disabled) { box-shadow: 0 10px 28px var(--pc-glow) !important; }
        .plotcraft-shell ::selection { background: color-mix(in srgb, var(--pc-accent) 28%, transparent); }
        .plotcraft-shell ::-webkit-scrollbar { width: 8px; height: 8px; }
        .plotcraft-shell ::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--pc-accent) 35%, transparent); border-radius: 999px; }
        @media (prefers-reduced-motion: reduce) {
          .plotcraft-shell main, .plotcraft-shell * { animation-duration: .01ms !important; transition-duration: .01ms !important; }
        }

        /* the accent colour follows the chosen theme */
        .plotcraft-shell .bg-purple-600 { background-image: linear-gradient(135deg, var(--pc-accent), var(--pc-accent-2)) !important; background-color: var(--pc-accent) !important; box-shadow: 0 6px 16px color-mix(in srgb, var(--pc-accent) 30%, transparent) !important; }
        .plotcraft-shell .text-purple-600 { color: var(--pc-accent); }
        .plotcraft-shell button:hover:not(:disabled) { transform: translateY(-1px); }
        .plotcraft-shell button:active:not(:disabled) { transform: scale(.985); }

        /* layout */
        .plotcraft-shell aside, .plotcraft-shell header {
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        }
        .plotcraft-shell header {
          min-height: 66px; position: relative; z-index: 5;
          border-bottom: 3px solid transparent !important;
          border-image: linear-gradient(90deg, var(--pc-accent), var(--pc-accent-2)) 1;
        }
        .plotcraft-shell main form.rounded-3xl,
        .plotcraft-shell main > div.grid > div.rounded-3xl,
        .plotcraft-shell main section.rounded-3xl {
          border-color: color-mix(in srgb, var(--pc-accent) 35%, transparent) !important;
          box-shadow: 0 12px 38px color-mix(in srgb, var(--pc-accent) 16%, transparent);
        }
        .plotcraft-shell main {
          max-width: 1440px !important;
          padding-top: clamp(18px, 3vw, 34px);
          padding-bottom: 42px;
        }
        .plotcraft-shell main form.rounded-3xl,
        .plotcraft-shell main > div.grid > div.rounded-3xl { border-radius: 26px; min-width: 0; }
        .plotcraft-shell img, .plotcraft-shell video, .plotcraft-shell canvas { max-width: 100%; }
        .plotcraft-shell footer { margin-top: auto; }
        .plotcraft-shell ::-webkit-scrollbar { width: 8px; height: 8px; }
        .plotcraft-shell ::-webkit-scrollbar-track { background: transparent; }
        .plotcraft-shell ::-webkit-scrollbar-thumb {
          background: color-mix(in srgb, var(--pc-accent) 42%, #9ca3af); border-radius: 20px;
        }


        @media (max-width: 767px) {
          .plotcraft-shell { height: 100dvh; font-size: 13px; }
          .plotcraft-shell header { padding-right: 14px; min-height: 60px; }
          .plotcraft-shell main { padding: 16px 14px 30px; }
          .plotcraft-shell main > div.grid { gap: 14px; }
          .plotcraft-shell main form.rounded-3xl,
          .plotcraft-shell main > div.grid > div.rounded-3xl { padding: 18px; }
          .plotcraft-shell footer { padding: 20px 14px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .plotcraft-shell *, .plotcraft-shell *::before, .plotcraft-shell *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <FallingBackground theme={theme} dream={dream} />

      <button
        onClick={() => setIsNavOpen(!isNavOpen)}
        title={isNavOpen ? "Close Navigation Menu" : "Open Navigation Menu"}
        className="fixed top-3 left-3 z-50 p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 border border-white/30 flex items-center justify-center cursor-pointer"
      >
        {isNavOpen ? <X className="w-5 h-5 transition-transform duration-300 rotate-90" /> : <Menu className="w-5 h-5 transition-transform duration-300 rotate-0" />}
      </button>

      <div className="flex flex-1 overflow-hidden z-10 relative">
        {isNavOpen && (
          <div
            onClick={() => setIsNavOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-300"
          />
        )}

        <aside
          onClick={(e) => { if (e.target.closest("button")) setIsNavOpen(false); }}
          className={`fixed z-40 h-full w-72 ${currentStyle.bgSidebar} flex flex-col justify-between shrink-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isNavOpen ? "translate-x-0 opacity-100 shadow-[10px_0_40px_rgba(0,0,0,0.5)]" : "-translate-x-full opacity-0 pointer-events-none"
          }`}
        >
          <div className="p-4 pt-14 space-y-4 flex-1 overflow-y-auto scrollbar-thin">
            <div className="flex items-center space-x-3 px-1 py-1 nav-stagger-item">
              <PlotCraftLogo size={40} />
              <div>
                <h2 className="font-extrabold text-sm tracking-wide flex items-center gap-1">
                  <span className={`${plotColor}`}>Plot</span>
                  <span className={currentStyle.logoTheme}>Craft</span>
                  <span className="text-yellow-500">ai✨</span>
                </h2>
                <p className="text-[10px] opacity-70 font-semibold">AI Story & Media Engine</p>
              </div>
            </div>

            <div className="nav-stagger-item">
              <button
                onClick={handleNewChat}
                className={`w-full ${currentStyle.btnPrimary} text-xs py-3 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg`}
              >
                <Plus className="w-4 h-4" />
                <span>New Story / Chat</span>
              </button>
            </div>

            <div className="nav-stagger-item space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none" />
                <input
                  value={navQuery}
                  onChange={(e) => setNavQuery(e.target.value)}
                  placeholder="Search tools..."
                  className={`w-full pl-8 pr-3 py-2 text-xs font-semibold rounded-xl ${currentStyle.bgInput}`}
                />
              </div>

              {navQuery.trim() ? (
                (() => {
                  const q = navQuery.trim().toLowerCase();
                  const hits = allNavItems.filter((i) => i.label.toLowerCase().includes(q));
                  return hits.length ? (
                    <div className="space-y-1">{hits.map((i) => renderItem(i, i.group))}</div>
                  ) : (
                    <p className="text-xs opacity-60 px-2">No tool found.</p>
                  );
                })()
              ) : (
                <>
                  {favorites.length > 0 && (
                    <div className="space-y-1 pb-2 border-b border-slate-300/30 dark:border-purple-500/25">
                      <p className="px-2 text-[10px] font-black uppercase tracking-wider opacity-60 flex items-center gap-1"><Star className="w-3 h-3" /> Favorites</p>
                      {favorites.map((id) => allNavItems.find((i) => i.id === id)).filter(Boolean).map((i) => renderItem(i))}
                    </div>
                  )}

                  {NAV_GROUPS.map((group) => {
                    const GroupIcon = group.icon;
                    if (group.direct) return <div key={group.id}>{renderItem(group.direct)}</div>;
                    const open = !!expandedGroups[group.id];
                    return (
                      <div key={group.id} className="pt-2 border-t border-slate-300/30 dark:border-purple-500/25">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setExpandedGroups((g) => ({ ...g, [group.id]: !open })); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-black uppercase tracking-wider rounded-xl ${currentStyle.navHover}`}
                        >
                          <GroupIcon className="w-4 h-4" /> {group.label}
                          <ChevronDown className={`ml-auto w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
                        </button>
                        {open && <div className="mt-1 space-y-1 pl-2">{group.items.map((i) => renderItem(i))}</div>}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-300/30 dark:border-purple-500/25 nav-stagger-item">
              <p className="text-[10px] font-black uppercase opacity-70 tracking-wider px-2 mb-1">
                Appearance & Theme
              </p>
              <div className="px-2 space-y-2">
                

                <div className="flex items-center gap-2 pt-1">
                  <Palette className="w-4 h-4 shrink-0" />
                  <select
                    value={theme}
                    disabled={dream}
                    onChange={(e) => setTheme(e.target.value)}
                    className={`w-full p-2 text-xs font-black rounded-xl ${currentStyle.bgInput} cursor-pointer ${dream ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                <option value="standard">☀️ Standard Light</option>
                    <option value="rgbclr">🌈 RGB Neon Gamer</option>
                    <option value="cyberpunk">⚡ Cyberpunk Neon</option>
                    <option value="emerald">🌲 Emerald Forest</option>
                    <option value="sunset">🌅 Sunset Gold</option>
                    <option value="party">🎉 Party Vibe</option>
                    <option value="rainy">🌧️ Rainy Mood</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          <div className="p-3 border-t border-slate-300/30 dark:border-purple-500/25 space-y-2">
            {currentUser ? (
              <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${currentStyle.panelBg}`}>
                <button
                  type="button"
                  onClick={() => setCurrentTab("profile")}
                  title="Open my profile, activity and streaks"
                  className="flex items-center gap-2 truncate text-left cursor-pointer flex-1 min-w-0"
                >
                  <div className="w-7 h-7 bg-purple-600 text-white font-black rounded-full flex items-center justify-center text-xs shrink-0 shadow">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-black truncate">{currentUser.name}</p>
                    <p className="text-[10px] opacity-70 truncate underline decoration-dotted">{currentUser.email}</p>
                  </div>
                </button>
                <button onClick={handleLogout} title="Logout" className="hover:text-red-500 p-1 cursor-pointer">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setAuthMode("login"); setShowAuthModal(true); }}
                className={`w-full ${currentStyle.btnSecondary} text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer font-black shadow-md`}
              >
                <LogIn className="w-4 h-4" />
                <span>Login / Sign Up</span>
              </button>
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-h-screen overflow-hidden transition-all duration-300 w-full">
          <header className={`px-6 py-3.5 pl-14 flex items-center justify-between ${currentStyle.isDream ? "" : "border-b"} gap-3 ${currentStyle.bgHeader} animate-slide-in-top`}>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-wider">
                <span className={`${plotColor}`}>Plot</span>
                <span className={currentStyle.logoTheme}>Craft</span>
                <span className="text-yellow-500"> AI ✨</span>
              </span>
            </div>


            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-3 py-1 rounded-full bg-purple-600 text-white shadow">
                {tabLabels[currentTab] || currentTab}
              </span>
            </div>
          </header>

          <div ref={scrollRef} key={currentTab} className="pc-page flex-1 flex flex-col overflow-y-auto w-full items-center justify-start">
            <main className={`${currentTab === "search" ? "p-0" : "p-3 sm:p-6"} space-y-8 ${currentTab === "pro" || currentTab === "search" ? "max-w-none" : "max-w-5xl"} mx-auto w-full flex-1`}>
              {currentTab === "pro" && !proCategory && <ErrorBoundary label="home hero"><HomeHero onOpen={(id) => { setProCategory(id); setCurrentTab("pro"); }} onTab={(t) => setCurrentTab(t)} onTools={(t) => { setCreativeTab(t); setCurrentTab("tools"); }} /></ErrorBoundary>}

              {currentTab === "pro" && (
                <ErrorBoundary label="studio"><PlotCraftProStudio
                  isLight={isLightTheme}
                  themeName={theme}
                  initialCategory={proCategory}
                  openProjectsSignal={openProjectsSignal}
                  onBackToMain={() => { setProCategory(null); setCurrentTab("pro"); }}
                  currentStyle={currentStyle}
                  currentUser={currentUser}
                  onActivity={logActivity}
                  onOpenExisting={(project) => {
                    // Opening a saved studio project stays inside the PlotCraft workspace.
                    setCurrentTab("pro");
                    setProCategory(null);
                  }}
                /></ErrorBoundary>
              )}

              {currentTab === "tools" && <ErrorBoundary label="creative tools"><CreativeTools key={creativeTab} initialTab={creativeTab} /></ErrorBoundary>}

              {currentTab === "templates" && (
                <section className="w-full">
                  <TemplatesGallery api={apiRequest} onCreated={(p) => { setActiveProject(p); setCurrentTab("projects"); }} />
                </section>
              )}

              {currentTab === "community" && (
                <section className="w-full">
                  <CommunityFeed api={apiRequest} />
                </section>
              )}

              {currentTab === "projects" && (
                <section className="w-full">
                  {activeProject
                    ? <ProjectWorkspace api={apiRequest} projectId={activeProject.id} onBack={() => setActiveProject(null)} />
                    : <ProjectsPanel api={apiRequest} onOpen={(p) => setActiveProject(p)} />}
                </section>
              )}

              {currentTab === "history" && (
                <section className="w-full space-y-6 animate-slide-in-left">
                  <div className={`rounded-3xl p-6 sm:p-8 ${currentStyle.bgCard}`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500">Workspace</p>
                    <h1 className="mt-1 text-2xl sm:text-3xl font-black">Your History</h1>
                    <p className="mt-2 text-sm opacity-70">Find your previous stories and recent creative activity in one place.</p>
                    <div className="relative mt-5 max-w-xl">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
                      <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search your stories..." className={`w-full rounded-xl py-3 pl-10 pr-4 text-sm ${currentStyle.bgInput}`} />
                    </div>
                  </div>

                  <div className={`rounded-3xl p-5 sm:p-6 ${currentStyle.bgCard} space-y-4`}>
                    <div className="flex items-center justify-between gap-3">
                      <div><h2 className="text-base font-black">Story History</h2><p className="text-xs opacity-60 mt-1">{filteredHistory.length} saved {filteredHistory.length === 1 ? "story" : "stories"}</p></div>
                      {history.length > 0 && <button type="button" onClick={() => { if (window.confirm("Clear all story history?")) setHistory([]); }} className="text-xs font-bold text-rose-500 hover:underline">Clear history</button>}
                    </div>
                    {filteredHistory.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-current/20 p-8 text-center text-sm opacity-60">No stories found. Your generated stories will appear here.</div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {filteredHistory.map((item) => (
                          <div key={item.id} className={`flex items-center gap-3 rounded-2xl p-3 ${currentStyle.panelBg}`}>
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-600/15 text-purple-500"><BookOpen className="w-5 h-5" /></div>
                            <button type="button" onClick={() => item.storyText ? setSelectedDocStory(item) : (setStoryTitle(item.title), setCurrentTab("story"))} className="min-w-0 flex-1 text-left">
                              <span className="block truncate text-sm font-black">{item.title || "Untitled story"}</span>
                              <span className="text-[11px] opacity-60">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Saved story"}</span>
                            </button>
                            <button type="button" onClick={() => handleDeleteHistory(item.id)} aria-label="Delete story" className="rounded-lg p-2 opacity-60 hover:bg-rose-500/10 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`rounded-3xl p-5 sm:p-6 ${currentStyle.bgCard} space-y-3`}>
                    <h2 className="text-base font-black">Recent Activity</h2>
                    {activity.length === 0 ? <p className="text-sm opacity-60">Your recent activity will appear here as you create.</p> : (
                      <div className="space-y-2">
                        {activity.filter((item, index, all) => all.findIndex((other) => other.type === item.type && other.label === item.label) === index).slice(0, 8).map((item) => (
                          <div key={item.id} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${currentStyle.panelBg}`}>
                            <span className="min-w-0 truncate text-xs font-semibold">{item.label}</span>
                            <span className="shrink-0 text-[10px] opacity-50">{item.ts ? new Date(item.ts).toLocaleString() : ""}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {currentTab === "story" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
                  <form onSubmit={handleGenerateStory} className={`md:col-span-5 p-6 rounded-3xl ${currentStyle.bgCard} space-y-4 animate-slide-in-left`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-sm flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-purple-600" /> Story setup
                      </h3>
                      <span className={`text-[10px] font-black pl-2 pr-3 py-1 rounded-full flex items-center gap-1.5 ${currentStyle.badgeBg}`}>
                        <Sparkles className="w-3 h-3 text-purple-600 animate-spin" />
                        STUDIO
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-black block mb-1 tracking-wide">Story Topic / Title</label>
                      <input
                        type="text"
                        value={storyTitle}
                        onChange={(e) => setStoryTitle(e.target.value)}
                        placeholder="e.g. The Clever Rabbit, Ramayana, or any topic"
                        className={`w-full p-3 text-xs rounded-2xl focus:outline-none ${currentStyle.bgInput}`}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black block mb-1 tracking-wide">Hero Name</label>
                      <input
                        type="text"
                        value={heroName}
                        onChange={(e) => setHeroName(e.target.value)}
                        placeholder="e.g. Arjuna / Rama / Felix"
                        className={`w-full p-3 text-xs rounded-2xl focus:outline-none ${currentStyle.bgInput}`}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black block mb-1 tracking-wide">Place / setting (optional)</label>
                      <input
                        type="text"
                        value={storyPlace}
                        onChange={(e) => setStoryPlace(e.target.value)}
                        placeholder="e.g. a village near Tirupati, a space station, Ayodhya"
                        className={`w-full p-3 text-xs rounded-2xl focus:outline-none ${currentStyle.bgInput}`}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black block mb-1 tracking-wide">
                        Story Length: <span className="text-yellow-500">{pageCount} {pageCount === 1 ? "page" : "pages"}</span>
                        <span className="opacity-60 font-bold"> (about {(pageCount * 300).toLocaleString()} words)</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[1, 3, 5, 10, 15, 20].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setPageCount(n)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black border transition cursor-pointer ${
                              pageCount === n
                                ? "bg-purple-600 text-white border-yellow-500 shadow"
                                : `${currentStyle.bgInput} hover:border-purple-500`
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={pageCount}
                          onChange={(e) => setPageCount(Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                          aria-label="Number of pages"
                          className={`w-16 px-2 py-1.5 rounded-lg text-xs font-black text-center focus:outline-none ${currentStyle.bgInput}`}
                        />
                      </div>
                      <p className="text-[10px] opacity-60 mt-1.5 leading-snug">
                        Every page is written one by one, so the whole story is complete. Longer stories take longer (about 20 to 40 seconds per page).
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-black block mb-1 tracking-wide">Genre</label>
                      <div className="grid grid-cols-2 gap-2">
                        {genres.map((g) => (
                          <button
                            key={g.name}
                            type="button"
                            onClick={() => setSelectedGenre(g.val)}
                            className={`p-2.5 rounded-xl text-xs font-bold text-left transition border cursor-pointer ${
                              selectedGenre === g.val
                                ? "bg-purple-600 text-white border-yellow-500 shadow-lg"
                                : `${currentStyle.bgInput} hover:border-purple-500`
                            }`}
                          >
                            {g.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full ${currentStyle.btnPrimary} py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer transition`}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                          <span>{loadingMsg}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-yellow-400" />
                          <span>Generate Story</span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className={`md:col-span-7 p-6 rounded-3xl ${currentStyle.bgCard} flex flex-col justify-between animate-slide-in-right`}>
                    <div>
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-300/30 dark:border-purple-500/30">
                        <h3 className="font-black text-sm flex items-center gap-2 truncate pr-2">
                          <Sparkles className="w-4 h-4 text-yellow-500 shrink-0" />
                          <span className="truncate">{storyTitle || "Your story"}</span>
                        </h3>
                      </div>

                      {storyPages.length > 0 ? (
                        <div className="space-y-4">
                          {loading && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="flex items-center gap-2">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" /> {loadingMsg}
                                </span>
                                <span>{storyProgress.done} / {storyProgress.total} pages</span>
                              </div>
                              <div className="h-2 rounded-full bg-black/10 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-600 to-yellow-400 transition-all duration-500"
                                  style={{ width: `${storyProgress.total ? (storyProgress.done / storyProgress.total) * 100 : 0}%` }}
                                />
                              </div>
                              <p className="text-[10px] opacity-60">You can start reading while the next pages are being written.</p>
                            </div>
                          )}

                          {storyJob.error && (
                            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-xs space-y-2">
                              <p className="font-bold text-amber-600">{storyJob.error}</p>
                              {storyJob.canContinue && (
                                <button
                                  type="button"
                                  onClick={handleContinueStory}
                                  disabled={loading}
                                  className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer disabled:opacity-50 ${currentStyle.btnPrimary}`}
                                >
                                  Continue writing (page {storyPages.length + 1} onwards)
                                </button>
                              )}
                            </div>
                          )}

                          {/* every page is shown: one at a time with page numbers, or all pages in one scroll */}
                          <StoryViewer
                            pages={storyPages}
                            currentStyle={currentStyle}
                            writing={loading}
                            writingTotal={storyProgress.total}
                          />

                          {!loading && generatedStory && (
                            <div className="pt-1">
                              <button
                                onClick={() => setSelectedDocStory({ title: storyTitle || "Generated Story", heroName, genre: selectedGenre, storyText: generatedStory, pages: storyPages, storyUrl })}
                                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-yellow-500 text-white font-black text-xs shadow-lg hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer uppercase"
                              >
                                <Sparkles className="w-4 h-4 text-yellow-300 animate-bounce" />
                                <span>Get Full Story (Open Colorful Web Page)</span>
                                <ExternalLink className="w-4 h-4 ml-1" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : loading ? (
                        <div className="h-96 flex flex-col items-center justify-center gap-3">
                          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                          <p className="text-xs font-bold">{loadingMsg}</p>
                          <p className="text-[11px] opacity-60">Planning the story, then writing page 1...</p>
                        </div>
                      ) : storyJob.error ? (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-xs space-y-2">
                          <p className="font-bold text-amber-600">{storyJob.error}</p>
                        </div>
                      ) : (
                        <div className="h-96 flex flex-col items-center justify-center text-center opacity-70 space-y-2 font-bold">
                          <BookOpen className="w-12 h-12 stroke-2 text-purple-600 animate-pulse" />
                          <p className="text-xs">Choose how many pages you want, then press the button. A 15 page request gives you all 15 pages.</p>
                        </div>
                      )}
                    </div>

                    {generatedStory && (
                      <div className="pt-3 mt-3 border-t border-slate-300/30 dark:border-purple-500/30 flex justify-between items-center font-bold">
                        <span className="text-[11px] opacity-70">Use 'Get Full Story' to read the whole story, listen to it or download the TXT.</span>
                        <button
                          onClick={() => handleRequireLoginForVisuals("image")}
                          className={`px-4 py-2.5 text-xs font-black rounded-xl ${currentStyle.btnPrimary} flex items-center gap-2 cursor-pointer shadow-md`}
                        >
                          <span>Convert to Image & Video</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentTab === "search" && (
                <div>
                  <AiSearch currentStyle={currentStyle} currentUser={currentUser} onActivity={logActivity} />
                </div>
              )}

              {currentTab === "profile" && currentUser && (
                <ProfilePage
                  currentStyle={currentStyle}
                  user={currentUser}
                  activity={activity}
                  onLogout={handleLogout}
                  onClear={clearActivity}
                />
              )}

              {currentTab === "about" && <AboutPage currentStyle={currentStyle} />}

              {currentTab === "developer" && <DeveloperSection currentStyle={currentStyle} />}

              {currentTab === "draw" && (
                <DrawingStudio
                  currentStyle={currentStyle}
                  storyTitle={storyTitle}
                  currentUser={currentUser}
                  onMakeStory={handleDrawingToStory}
                  onAnimate={handleAnimateDrawing}
                  onActivity={logActivity}
                />
              )}

              {currentTab === "sudoku" && <SudokuGame currentStyle={currentStyle} onActivity={logActivity} />}

              {currentTab === "memory" && <MemoryGame currentStyle={currentStyle} onActivity={logActivity} />}

              {currentTab === "math" && <MathGame currentStyle={currentStyle} onActivity={logActivity} />}

              {currentTab === "usage" && <UsagePage currentStyle={currentStyle} />}

              {currentTab === "toprated" && (
                <ReviewsSection
                  api={apiRequest}
                  currentStyle={currentStyle}
                  currentUser={currentUser}
                  onRequireLogin={() => { setAuthMode("login"); setShowAuthModal(true); }}
                  onOpenStory={(story) => setSelectedDocStory(story)}
                />
              )}

              {currentTab === "image" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full animate-slide-in-left">
                  <div className={`md:col-span-5 p-6 rounded-3xl ${currentStyle.bgCard} space-y-4`}>
                    <h3 className="font-black text-sm flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-purple-600" /> Script to Image Generator
                    </h3>
                    <p className="text-xs font-bold opacity-80">
                      Transform your script into breathtaking visual art. Select either a 2D Storybook style or a 3D Cinematic Render.
                    </p>

                    <div>
                      <label className="text-xs font-black block mb-1.5">Image Style Engine</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "3d", title: "3D Cinematic", note: "Pixar & 3D Render" },
                          { id: "2d", title: "2D Storybook", note: "Hand-drawn illustration" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setImageStyle(opt.id)}
                            aria-pressed={imageStyle === opt.id}
                            className={`p-3 rounded-2xl text-left transition cursor-pointer border ${
                              imageStyle === opt.id
                                ? "bg-purple-600 text-white border-yellow-500 shadow-lg"
                                : `${currentStyle.bgInput} hover:border-purple-500`
                            }`}
                          >
                            <p className="text-sm font-black">{opt.title}</p>
                            <p className="text-[11px] font-bold opacity-80">{opt.note}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-black block mb-1">Detailed Scene Prompt</label>
                      <textarea
                        rows={5}
                        value={scriptInput}
                        onChange={(e) => setScriptInput(e.target.value)}
                        placeholder="Describe your scene lighting, mood, characters..."
                        className={`w-full p-3 text-xs rounded-2xl focus:outline-none resize-none ${currentStyle.bgInput}`}
                      />
                    </div>

                    <button
                      onClick={handleScriptToImage}
                      disabled={loading}
                      className={`w-full ${currentStyle.btnPrimary} py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer transition`}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                          <span>{loadingMsg}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-yellow-400" />
                          <span>Create {imageStyle === "2d" ? "2D" : "3D"} Artwork</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className={`md:col-span-7 p-6 rounded-3xl ${currentStyle.bgCard} flex flex-col items-center justify-center min-h-[380px] animate-slide-in-right`}>
                    {loading ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                        <p className="text-xs font-bold">{loadingMsg}</p>
                      </div>
                    ) : generatedImage ? (
                      <div className="w-full space-y-3">
                        <div className="rounded-2xl overflow-hidden border-2 border-purple-500/40 shadow-2xl">
                          <img src={generatedImage} alt="Generated scene" className="w-full h-auto object-cover max-h-[340px]" />
                        </div>

                        {imageInfo.provider && (
                          <p className="text-[11px] font-bold opacity-80">
                            {imageInfo.style === "2d" ? "2D Storybook" : imageInfo.style === "3d" ? "3D Cinematic" : ""} Artwork powered by {imageInfo.provider}
                          </p>
                        )}

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={handleDownloadImage}
                            className={`px-4 py-2 text-xs font-black rounded-xl ${currentStyle.btnSecondary} flex items-center gap-1.5 cursor-pointer shadow`}
                          >
                            <Download className="w-4 h-4 text-yellow-500" /> Save Image
                          </button>
                          <button
                            onClick={() => handleRequireLoginForVisuals("video")}
                            className={`px-4 py-2 text-xs font-black rounded-xl ${currentStyle.btnPrimary} flex items-center gap-1.5 cursor-pointer shadow`}
                          >
                            <Video className="w-4 h-4 text-yellow-500" /> Proceed to Video Gen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center opacity-70 font-bold space-y-2">
                        <ImageIcon className="w-12 h-12 stroke-2 mx-auto text-purple-600 animate-pulse" />
                        <p className="text-xs">Your AI generated masterpiece will appear here in high definition</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentTab === "video" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full animate-slide-in-left">
                  <div className={`md:col-span-5 p-6 rounded-3xl ${currentStyle.bgCard} space-y-4`}>
                    <h3 className="font-black text-sm flex items-center gap-2">
                      <Video className="w-4 h-4 text-purple-600" /> AI Motion Video Studio
                    </h3>
                    <p className="text-xs font-bold opacity-80">
                      Animate your images or text prompt into an immersive cinematic motion sequence with smooth camera moves.
                    </p>

                    <div>
                      <label className="text-xs font-black block mb-1">Cinematic Motion Direction</label>
                      <textarea
                        rows={3}
                        value={videoInputContent}
                        onChange={(e) => setVideoInputContent(e.target.value)}
                        placeholder="Describe lighting, camera tracking, pan speed..."
                        className={`w-full p-3 text-xs rounded-2xl focus:outline-none resize-none ${currentStyle.bgInput}`}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black block mb-1">Sequence Duration: {videoDuration} Seconds</label>
                      <div className="flex gap-2">
                        {[5, 7, 10].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => setVideoDuration(sec)}
                            className={`flex-1 py-2 text-xs font-black rounded-xl border transition cursor-pointer shadow ${
                              videoDuration === sec
                                ? "bg-purple-600 text-white border-yellow-500"
                                : `${currentStyle.bgInput} hover:border-purple-500`
                            }`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateVideo}
                      disabled={loading}
                      className={`w-full ${currentStyle.btnPrimary} py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer transition`}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                          <span>{loadingMsg}</span>
                        </>
                      ) : (
                        <>
                          <Video className="w-4 h-4 text-yellow-400" />
                          <span>Render {videoDuration}s Video Sequence</span>
                        </>
                      )}
                    </button>

                    <FreeVideoHelper
                      currentStyle={currentStyle}
                      prompt={videoInputContent.trim() || scriptInput.trim() || storyTitle.trim() || generatedStory.substring(0, 200)}
                      message={videoError}
                      defaultOpen={!!videoError}
                      currentUser={currentUser}
                      onRequireLogin={() => { setAuthMode("login"); setShowAuthModal(true); }}
                      onUploaded={(url) => { setAiVideoUrl(url); setVideoUrl(url); setVideoError(""); }}
                    />
                  </div>

                  <div className={`md:col-span-7 p-6 rounded-3xl ${currentStyle.bgCard} flex flex-col items-center justify-center min-h-[380px] animate-slide-in-right`}>
                    {loading ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                        <p className="text-xs font-bold">{loadingMsg}</p>
                      </div>
                    ) : videoUrl ? (
                      <div className="w-full space-y-3 flex flex-col items-center">
                        <div className="rounded-2xl overflow-hidden border-2 border-purple-500/40 shadow-2xl relative bg-black w-full max-w-lg aspect-video flex items-center justify-center">
                          {aiVideoUrl ? (
                            <video
                              src={aiVideoUrl}
                              controls
                              autoPlay
                              loop
                              playsInline
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <>
                              <canvas
                                ref={videoCanvasRef}
                                width={640}
                                height={360}
                                className="w-full h-full object-contain"
                              />
                              <button
                                onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                                className="absolute bottom-4 left-4 p-3 rounded-full bg-slate-950/80 backdrop-blur-md text-white hover:bg-purple-600 transition cursor-pointer shadow-lg border border-purple-500/40"
                              >
                                {isVideoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              </button>
                            </>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 w-full max-w-lg pt-1">
                          {aiVideoUrl ? (
                            <a
                              href={aiVideoUrl}
                              download="plotcraft_video.mp4"
                              className={`px-4 py-2 text-xs font-black rounded-xl ${currentStyle.btnSecondary} flex items-center gap-1.5 cursor-pointer shadow`}
                            >
                              <Download className="w-4 h-4 text-yellow-500" /> Download Video File
                            </a>
                          ) : (
                            <button
                              onClick={handleDownloadVideo}
                              className={`px-4 py-2 text-xs font-black rounded-xl ${currentStyle.btnSecondary} flex items-center gap-1.5 cursor-pointer shadow`}
                            >
                              <Download className="w-4 h-4 text-yellow-500" /> Download Video Frame
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center opacity-70 font-bold space-y-2">
                        <Video className="w-12 h-12 stroke-2 mx-auto text-purple-600 animate-pulse" />
                        <p className="text-xs">Generate or provide visual inputs to preview cinematic motion video</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </main>

            <footer className={`py-6 px-8 mt-auto text-center text-xs ${currentStyle.footerBg} flex flex-col md:flex-row items-center justify-between gap-4 w-full border-t border-slate-300/30 dark:border-purple-500/30`}>
              <div className="flex items-center gap-2">
                <PlotCraftLogo size={24} />
                <span className="font-black">
                  <span className={`${plotColor}`}>Plot</span>
                  <span className={currentStyle.logoTheme}>Craft</span>
                  <span className="text-yellow-500">✨</span> AI Engine
                </span>
              </div>

              <div className="flex items-center gap-4">
                {SOCIALS.map((s) => (
                  <a key={s.name} href={s.url} target="_blank" rel="noreferrer" title={s.name} className="p-2 rounded-full border border-current/20 hover:bg-purple-600 hover:text-white transition duration-300 cursor-pointer">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d={s.path} /></svg>
                  </a>
                ))}
              </div>

              <div className="text-center md:text-right space-y-1">
                <p className="font-bold">© 2026 PlotCraft AI. All rights reserved.</p>
                <p className="text-[11px] opacity-80">
                  Designed and Developed by{" "}
                  <button type="button" onClick={openDeveloper} className="underline font-bold cursor-pointer">K.Ganesh</button>
                </p>
                <button
                  type="button"
                  onClick={openDeveloper}
                  className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-purple-600 text-white cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" /> About the Developer
                </button>
              </div>
            </footer>
          </div>
        </div>
      </div>

      {selectedDocStory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center p-4 overflow-y-auto" role="presentation">
          <div role="dialog" aria-modal="true" aria-label={selectedDocStory.title || "Story viewer"} className="w-full max-w-3xl bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 text-white p-8 rounded-3xl shadow-2xl border-2 border-purple-500/50 relative space-y-6 my-8 animate-slide-in-top">
            <button
              onClick={closeDocModal}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2 border-b border-white/20 pb-5">
              <h2 className="text-3xl font-black text-yellow-400">
                {selectedDocStory.title}
              </h2>
            </div>

            <StoryViewer
              pages={selectedDocStory.pages && selectedDocStory.pages.length ? selectedDocStory.pages : [selectedDocStory.storyText || ""]}
              currentStyle={currentStyle}
              dark
              tall
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="file-actions flex items-center gap-2">
                <ReadAloudButton
                  text={selectedDocStory.storyText || (selectedDocStory.pages || []).join("\n\n")}
                  label="Read whole story"
                  className="px-4 py-2.5 text-xs font-black rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2 cursor-pointer transition shadow-md"
                />

                <button
                  onClick={() => handleDownloadStoryTxtFile(selectedDocStory.title, storyToFileText(selectedDocStory.pages, selectedDocStory.storyText))}
                  className="px-4 py-2.5 text-xs font-black rounded-xl bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-2 cursor-pointer transition shadow-md"
                >
                  <Download className="w-4 h-4" /> Download (.txt)
                </button>
              </div>

              <button
                onClick={closeDocModal}
                className="px-6 py-2.5 text-xs font-black rounded-xl bg-gradient-to-r from-purple-600 to-yellow-500 text-white hover:opacity-90 cursor-pointer shadow-lg"
              >
                Close Story Page
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl ${currentStyle.bgCard} space-y-5 relative shadow-2xl animate-slide-in-top`}>
            <button
              onClick={() => { setShowAuthModal(false); setAuthError(""); }}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:opacity-100 opacity-80 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="font-black text-base">
                {authMode === "login" ? "Welcome Back to PlotCraft" : "Create Your PlotCraft Account"}
              </h3>
            </div>

            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs text-center font-bold">
                {authError}
              </div>
            )}

            <form onSubmit={authMode === "login" ? handleLogin : handleRegister} className="space-y-4">
              {authMode === "register" && (
                <div>
                  <label className="text-xs font-black block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    placeholder="Enter your name"
                    className={`w-full p-3 text-xs rounded-2xl focus:outline-none ${currentStyle.bgInput}`}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-black block mb-1">Email Address</label>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  placeholder="Enter email address"
                  className={`w-full p-3 text-xs rounded-2xl focus:outline-none ${currentStyle.bgInput}`}
                />
              </div>

              <div>
                <label className="text-xs font-black block mb-1">Password</label>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  placeholder="Enter password"
                  className={`w-full p-3 text-xs rounded-2xl focus:outline-none ${currentStyle.bgInput}`}
                />
              </div>

              <button
                type="submit"
                disabled={authBusy}
                className={`w-full ${currentStyle.btnPrimary} py-3.5 rounded-2xl text-xs font-black cursor-pointer transition disabled:opacity-60 flex items-center justify-center gap-2`}
              >
                {authBusy && <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />}
                {authMode === "login" ? "Login" : "Sign Up"}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === "login" ? "register" : "login");
                    setAuthError("");
                  }}
                  className="text-xs font-bold text-purple-600 dark:text-yellow-400 hover:underline cursor-pointer"
                >
                  {authMode === "login"
                    ? "Don't have an account? Sign Up"
                    : "Already have an account? Login"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

  


  


  


  
  


  


  


  

/* ===== CREATIVE TOOLS: audio editor, video editor, image-to-PDF (runs fully in the browser) ===== */
function fmtSec(t) {
  if (!isFinite(t)) return "0:00";
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
function encodeToolWav(buffer) {
  const ch = buffer.numberOfChannels, sr = buffer.sampleRate, len = buffer.length;
  const out = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const w = (o, str) => { for (let i = 0; i < str.length; i++) out.setUint8(o + i, str.charCodeAt(i)); };
  w(0, "RIFF"); out.setUint32(4, 36 + len * ch * 2, true); w(8, "WAVE"); w(12, "fmt ");
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
  out.setUint32(24, sr, true); out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true);
  out.setUint16(34, 16, true); w(36, "data"); out.setUint32(40, len * ch * 2, true);
  let off = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) {
    const v = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
    out.setInt16(off, v < 0 ? v * 0x8000 : v * 0x7fff, true); off += 2;
  }
  return new Blob([out], { type: "audio/wav" });
}
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const toolCard = { borderRadius: 16, padding: 16, border: "1px solid rgba(127,127,127,.25)", background: "var(--pc-card)", color: "var(--pc-text)" };
const toolBtn = { padding: "8px 14px", borderRadius: 10, border: "none", background: "var(--pc-accent)", color: "#fff", fontWeight: 700, cursor: "pointer" };
const toolInput = { padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(127,127,127,.4)", background: "transparent", color: "inherit", width: 90 };

function AudioEditor() {
  const [buffer, setBuffer] = useState(null);
  const [name, setName] = useState("");
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [reverse, setReverse] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const srcRef = useRef(null);

  const load = async (file) => {
    setError("");
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buf = await ctx.decodeAudioData(await file.arrayBuffer());
      ctx.close();
      setBuffer(buf); setName(file.name); setStart(0); setEnd(buf.duration);
    } catch { setError("Ee audio format support kaadu. MP3/WAV/OGG try cheyyandi."); }
  };

  // Renders the trimmed, speed-changed, volume-adjusted (optionally reversed) result offline.
  const render = async () => {
    const len = Math.max(1, Math.floor((end - start) * buffer.sampleRate));
    const ctx = new OfflineAudioContext(buffer.numberOfChannels, Math.ceil(len / speed), buffer.sampleRate);
    const cut = ctx.createBuffer(buffer.numberOfChannels, len, buffer.sampleRate);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c).subarray(Math.floor(start * buffer.sampleRate), Math.floor(start * buffer.sampleRate) + len);
      const data = cut.getChannelData(c);
      if (reverse) for (let i = 0; i < len; i++) data[i] = src[len - 1 - i];
      else data.set(src);
    }
    const node = ctx.createBufferSource();
    node.buffer = cut; node.playbackRate.value = speed;
    const gain = ctx.createGain(); gain.gain.value = volume;
    node.connect(gain).connect(ctx.destination);
    node.start();
    return ctx.startRendering();
  };

  const preview = async () => {
    if (!buffer) return;
    setBusy(true);
    try {
      const out = await render();
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const node = ctx.createBufferSource(); node.buffer = out; node.connect(ctx.destination); node.start();
      srcRef.current = ctx;
    } finally { setBusy(false); }
  };

  const exportWav = async () => {
    if (!buffer) return;
    setBusy(true);
    try { downloadBlob(encodeToolWav(await render()), (name || "audio").replace(/\.[^.]+$/, "") + "_edited.wav"); }
    finally { setBusy(false); }
  };

  return (
    <div style={toolCard}>
      <h3 style={{ fontWeight: 800, marginBottom: 10 }}>🎵 Audio Editor</h3>
      <input type="file" accept="audio/*" onChange={e => e.target.files?.[0] && load(e.target.files[0])} />
      {error && <p style={{ color: "#f87171", marginTop: 8 }}>{error}</p>}
      {buffer && (
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <div style={{ fontSize: 13, opacity: .8 }}>{name} · {fmtSec(buffer.duration)}</div>
          <label>Start (s) <input type="number" style={toolInput} min={0} max={end} step="0.1" value={start} onChange={e => setStart(Math.max(0, Math.min(+e.target.value, end)))} /></label>
          <label>End (s) <input type="number" style={toolInput} min={start} max={buffer.duration} step="0.1" value={end} onChange={e => setEnd(Math.min(buffer.duration, Math.max(+e.target.value, start)))} /></label>
          <label>Speed <input type="range" min={0.5} max={2} step={0.05} value={speed} onChange={e => setSpeed(+e.target.value)} /> {speed.toFixed(2)}x</label>
          <label>Volume <input type="range" min={0} max={2} step={0.05} value={volume} onChange={e => setVolume(+e.target.value)} /> {Math.round(volume * 100)}%</label>
          <label><input type="checkbox" checked={reverse} onChange={e => setReverse(e.target.checked)} /> Reverse</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={toolBtn} disabled={busy} onClick={preview}>▶ Preview</button>
            <button type="button" style={toolBtn} disabled={busy} onClick={exportWav}>⬇ Export WAV</button>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoEditor() {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef(null);

  const pick = (file) => {
    if (url) URL.revokeObjectURL(url);
    setUrl(URL.createObjectURL(file)); setName(file.name); setError("");
  };
  const onMeta = () => { const d = videoRef.current.duration; setDuration(d); setStart(0); setEnd(d); };

  // Plays the trimmed range at the chosen speed while recording the video element to a WebM file.
  const exportWebm = async () => {
    const v = videoRef.current;
    if (!v || !window.MediaRecorder) { setError("Ee browser lo video export support ledu."); return; }
    try {
      const stream = v.captureStream ? v.captureStream() : null;
      if (!stream) { setError("Ee browser lo captureStream support ledu."); return; }
      const rec = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks = [];
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.onstop = () => { setRecording(false); downloadBlob(new Blob(chunks, { type: "video/webm" }), name.replace(/\.[^.]+$/, "") + "_edited.webm"); };
      v.pause(); v.currentTime = start; v.playbackRate = speed; v.muted = false;
      v.onended = () => rec.state !== "inactive" && rec.stop();
      const stopAt = () => { if (v.currentTime >= end) { v.pause(); rec.state !== "inactive" && rec.stop(); } else requestAnimationFrame(stopAt); };
      setRecording(true); rec.start(); await v.play(); requestAnimationFrame(stopAt);
    } catch { setError("Export fail ayyindi. Browser permissions check cheyyandi."); setRecording(false); }
  };

  return (
    <div style={toolCard}>
      <h3 style={{ fontWeight: 800, marginBottom: 10 }}>🎬 Video Editor</h3>
      <input type="file" accept="video/*" onChange={e => e.target.files?.[0] && pick(e.target.files[0])} />
      {error && <p style={{ color: "#f87171", marginTop: 8 }}>{error}</p>}
      {url && (
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <video ref={videoRef} src={url} controls onLoadedMetadata={onMeta} style={{ width: "100%", borderRadius: 12, background: "#000" }} />
          <div style={{ fontSize: 13, opacity: .8 }}>{name} · {fmtSec(duration)}</div>
          <label>Start (s) <input type="number" style={toolInput} min={0} max={end} step="0.1" value={start} onChange={e => setStart(Math.max(0, Math.min(+e.target.value, end)))} /></label>
          <label>End (s) <input type="number" style={toolInput} min={start} max={duration} step="0.1" value={end} onChange={e => setEnd(Math.min(duration, Math.max(+e.target.value, start)))} /></label>
          <label>Speed <input type="range" min={0.25} max={2} step={0.05} value={speed} onChange={e => { setSpeed(+e.target.value); if (videoRef.current) videoRef.current.playbackRate = +e.target.value; }} /> {speed.toFixed(2)}x</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={toolBtn} onClick={() => { videoRef.current.currentTime = start; videoRef.current.play(); }}>▶ Play trimmed</button>
            <button type="button" style={toolBtn} disabled={recording} onClick={exportWebm}>{recording ? "Recording…" : "⬇ Export WebM"}</button>
          </div>
          <p style={{ fontSize: 12, opacity: .7 }}>Export ippudu real-time lo jarugutundi (trimmed length ki equal time paduthundi).</p>
        </div>
      )}
    </div>
  );
}

let pdfLibPromise = null;
function loadPdfLib() {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  if (!pdfLibPromise) pdfLibPromise = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
    s.onload = () => res(window.PDFLib); s.onerror = () => rej(new Error("pdf-lib load fail"));
    document.head.appendChild(s);
  });
  return pdfLibPromise;
}

function ImageToPdf() {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const makePdf = async () => {
    if (!files.length) return;
    setBusy(true); setError("");
    try {
      const { PDFDocument } = await loadPdfLib();
      const doc = await PDFDocument.create();
      for (const f of files) {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const img = /png$/i.test(f.type) ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        const page = doc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      const out = await doc.save();
      downloadBlob(new Blob([out], { type: "application/pdf" }), "images.pdf");
    } catch { setError("PDF create avvaledu. JPG/PNG files matrame vaadandi."); }
    finally { setBusy(false); }
  };

  return (
    <div style={toolCard}>
      <h3 style={{ fontWeight: 800, marginBottom: 10 }}>🖼️ Image → PDF</h3>
      <input type="file" multiple accept="image/png,image/jpeg" onChange={e => setFiles(Array.from(e.target.files || []))} />
      <div style={{ fontSize: 13, opacity: .8, margin: "8px 0" }}>{files.length} image(s) selected</div>
      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      <button type="button" style={toolBtn} disabled={busy || !files.length} onClick={makePdf}>{busy ? "Creating…" : "⬇ Create PDF"}</button>
    </div>
  );
}

function CreativeTools({ initialTab = "audio" }) {
  const [tab, setTab] = useState(initialTab);
  const tabs = [["audio", "Audio"], ["video", "Video"], ["pdf", "Image → PDF"]];
  return (
    <div className="pc-page" style={{ width: "100%", maxWidth: 900, margin: "0 auto", padding: 16, color: "var(--pc-text)" }}>
      <h2 style={{ fontWeight: 900, fontSize: 24, marginBottom: 12 }}>Creative Tools</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {tabs.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} style={{ ...toolBtn, background: tab === id ? "var(--pc-accent)" : "transparent", color: tab === id ? "#fff" : "inherit", border: "1px solid var(--pc-accent)" }}>{label}</button>
        ))}
      </div>
      {tab === "audio" && <AudioEditor />}
      {tab === "video" && <VideoEditor />}
      {tab === "pdf" && <ImageToPdf />}
    </div>
  );
}

export default AiDashboard;