import { useEffect, useMemo, useRef, useState } from "react";
import PlotCraftFX from "./PlotCraftFX";
import PlotCraftDesign from "./PlotCraftDesign";
import FeaturedCreations from "./FeaturedCreations";
import VoiceInputButton from "./VoiceInputButton";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Moon,
  Search,
  Share2,
  Sparkles,
  Sun,
  X,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { isSpeechSupported } from "../services/speech";

const API_BASE =
  (typeof window !== "undefined" && window.PLOTCRAFT_API_BASE) ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : "http://localhost:5000");

const getJson = (path, signal) =>
  fetch(`${API_BASE}${path}`, { signal })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

// Same groups and names as the dashboard sidebar.
const TOOL_GROUPS = [
  {
    title: "Create",
    accentVar: "--wx-group-create",
    dotVar: "--wx-dot-create",
    tools: [
      "Story & Writing",
      "Writing Studio",
      "Graphic Design",
      "Video & VFX",
      "Music & Audio",
      "Animation Studio",
      "Character Creator",
      "Art & Drawing",
      "Fashion & Interior",
      "DIY & Handmade",
      "Templates",
      "Creative Tools",
    ],
  },
  {
    title: "AI Tools",
    accentVar: "--wx-group-ai",
    dotVar: "--wx-dot-ai",
    tools: ["AI Chat", "Prompt Helper", "AI Image Generator", "AI Video Generator"],
  },
  {
    title: "Workspace",
    accentVar: "--wx-group-workspace",
    dotVar: "--wx-dot-workspace",
    tools: ["Projects", "Files Editor", "History", "Saved Projects"],
  },
  {
    title: "Learn",
    accentVar: "--wx-group-learn",
    dotVar: "--wx-dot-learn",
    tools: [
      "Learning & Experiments",
      "Tutorials & Guides",
      "Brain Games",
      "Memory Match",
      "Quick Math",
    ],
  },
  {
    title: "Community",
    accentVar: "--wx-group-community",
    dotVar: "--wx-dot-community",
    tools: ["Community Feed", "Top Rated", "About"],
  },
];

const ALL_TOOLS = TOOL_GROUPS.flatMap((g) =>
  g.tools.map((name) => ({ name, group: g.title }))
);
const TOOL_COUNT = ALL_TOOLS.length;

const resolveCopilotTool = (prompt) => {
  const text = prompt.toLowerCase();
  if (/\b(video|movie|film|reel|animation|vfx|clip|motion)\b/.test(text)) {
    return "AI Video Generator";
  }
  if (/\b(song|music|lyrics|audio|melody|soundtrack)\b/.test(text)) {
    return "AI Chat";
  }
  if (/\b(edit|crop|resize|retouch|document|pdf|spreadsheet|file)\b/.test(text)) {
    return "Files Editor";
  }
  if (/\b(image|photo|picture|illustration|logo|thumbnail|poster|artwork|draw|painting)\b/.test(text)) {
    return "AI Image Generator";
  }
  if (/\b(story|stories|horror|romance|fantasy|novel|tale)\b|కథ|హారర్|[\u0c00-\u0c7f]/.test(text)) {
    return "Story & Writing";
  }
  return "AI Chat";
};

const STUDIO_MODES = [
  {
    id: "story",
    label: "Story",
    tool: "Story & Writing",
    tag: "Longform · Narration · Export",
    title: "Cinematic Story Engine",
    desc: "Shape characters, plot arcs, and tone—then read, listen, or export clean chapters.",
    prompt:
      "A lighthouse keeper on a misty coast discovers a brass compass that points toward unfinished memories.",
  },
  {
    id: "image",
    label: "Image",
    tool: "AI Image Generator",
    tag: "2D Illustration · 3D Clay · Concept",
    title: "Visual Scene Synthesizer",
    desc: "Turn rich visual directions into crisp storybook art and concept frames ready for download.",
    prompt:
      "Sunlit Kyoto rooftop greenhouse at golden hour, warm glass reflections, painterly editorial concept art, 8k detail.",
  },
  {
    id: "video",
    label: "Video",
    tool: "AI Video Generator",
    tag: "Motion · Atmosphere · VFX",
    title: "Motion & Scene Director",
    desc: "Compose atmospheric short video sequences directly inside your studio workspace.",
    prompt:
      "Slow dolly shot through bioluminescent forest mist with floating golden spores and soft rim lighting.",
  },
  {
    id: "chat",
    label: "Chat",
    tool: "AI Chat",
    tag: "Originality · Editing · Memory",
    title: "Creative Co-Pilot",
    desc: "Audit originality, refine prose, catch file mistakes, and keep every thread saved to your account.",
    prompt:
      "Critique pacing in my opening scene and suggest three sharper visual hooks without changing my voice.",
  },
];

const FEATURES = [
  {
    n: "01",
    title: "Story Studio",
    tool: "Story & Writing",
    badge: "Narrative & Audio",
    text: "Give a title and a hero, pick a genre, and get a complete story you can read, listen to, or download.",
    samplePrompt:
      "“A quiet train at dawn where every carriage holds a different season.”",
  },
  {
    n: "02",
    title: "AI Images",
    tool: "AI Image Generator",
    badge: "2D & 3D Visuals",
    text: "Turn any scene into a storybook-style picture in 2D or 3D style, ready to download.",
    samplePrompt:
      "“Minimalist glass observatory above cloud sea, warm amber lamps, tactile 3D render”",
  },
  {
    n: "03",
    title: "AI Videos",
    tool: "AI Video Generator",
    badge: "Motion & VFX",
    text: "Describe a scene and get a short AI video clip that plays right here.",
    samplePrompt:
      "“Rain ripples across a neon-lit courtyard at night with gentle camera drift”",
  },
  {
    n: "04",
    title: "Smart AI Chat",
    tool: "AI Chat",
    badge: "Co-Pilot & Review",
    text: "Check if a story is original, review files for errors, and keep every chat saved to your account.",
    samplePrompt:
      "“Check character consistency across all scenes and polish dialogue rhythm.”",
  },
];

const STEPS = [
  {
    n: "01",
    icon: Search,
    title: "Pick a tool",
    text: "Jump in via instant search or browse five dedicated studio groups.",
  },
  {
    n: "02",
    icon: Zap,
    title: "Craft your idea",
    text: "Direct with natural language, refine iteratively, and keep drafts saved in Projects.",
  },
  {
    n: "03",
    icon: Share2,
    title: "Publish & evolve",
    text: "Share to the Community, gather ratings and reactions, and build on what works.",
  },
];

const QUICK_QUERIES = ["video", "story", "image", "chat", "music", "math"];
const SEARCH_RESULT_LIMIT = 7;

function PlotCraftLogo({ isLight }) {
  return (
    <div className="inline-flex items-center gap-3 select-none group">
      <div
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl overflow-hidden transition-all duration-500"
        style={{
          background: isLight ? "#ffffff" : "#140d22",
          border: "1px solid var(--wx-border-strong)",
          boxShadow: isLight
            ? "0 10px 24px -10px rgba(15, 23, 42, 0.16)"
            : "0 0 0 1px rgba(240, 171, 252, 0.1), 0 12px 28px -10px rgba(192, 38, 211, 0.45)",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: isLight
              ? "linear-gradient(135deg, rgba(124, 58, 237, 0.14) 0%, transparent 62%)"
              : "linear-gradient(135deg, rgba(240, 171, 252, 0.2) 0%, transparent 58%)",
          }}
        />
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 transition-transform duration-300 group-hover:scale-105"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={isLight ? "pcPrismLightV6" : "pcPrismDarkV6"}
              x1="3"
              y1="3"
              x2="21"
              y2="21"
              gradientUnits="userSpaceOnUse"
            >
              {isLight ? (
                <>
                  <stop offset="0%" stopColor="#6d28d9" />
                  <stop offset="50%" stopColor="#db2777" />
                  <stop offset="100%" stopColor="#d97706" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#f5d0fe" />
                  <stop offset="50%" stopColor="#fda4af" />
                  <stop offset="100%" stopColor="#fde68a" />
                </>
              )}
            </linearGradient>
          </defs>
          <path
            d="M12 2.75L21.25 12L12 21.25L2.75 12L12 2.75Z"
            stroke={`url(#${isLight ? "pcPrismLightV6" : "pcPrismDarkV6"})`}
            strokeWidth="1.65"
          />
          <path
            d="M9.5 16.5V7.5H13.2C14.75 7.5 15.8 8.45 15.8 9.9C15.8 11.35 14.75 12.3 13.2 12.3H9.5"
            stroke={isLight ? "#0f172a" : "#ffffff"}
            strokeWidth="1.85"
            strokeLinecap="square"
          />
          <circle
            cx="16.8"
            cy="15.8"
            r="1.35"
            fill={isLight ? "#7c3aed" : "#f5d0fe"}
          />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-base sm:text-lg font-black tracking-[-0.03em] wx-ink">
          PlotCraft<span style={{ color: "var(--wx-accent)" }}>.AI</span>
        </span>
        <span className="text-[9px] uppercase tracking-[0.28em] wx-subtle mt-1">
          Creative Studio
        </span>
      </div>
    </div>
  );
}

/* Jumping Dot + Next Content Display */
function DotJumpStage({ triggerKey, children, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      {triggerKey > 0 && (
        <div
          key={`hopper-${triggerKey}`}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
        >
          <span className="wx-dot-hopper" />
        </div>
      )}
      <div
        key={`content-${triggerKey}`}
        className={triggerKey > 0 ? "wx-dot-reveal" : ""}
      >
        {children}
      </div>
    </div>
  );
}

const CSS = `
.wx {
  --wx-bg: #07050c;
  --wx-header-bg: rgba(7, 5, 12, 0.78);
  --wx-ink: #ffffff;
  --wx-ink-soft: #f5f2fa;
  --wx-muted: #c2bcd1;
  --wx-subtle: #9289a6;
  --wx-border: rgba(255, 255, 255, 0.11);
  --wx-border-strong: rgba(255, 255, 255, 0.2);
  --wx-panel-bg: linear-gradient(155deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 100%);
  --wx-panel-hover-bg: linear-gradient(155deg, rgba(255, 255, 255, 0.085) 0%, rgba(255, 255, 255, 0.025) 100%);
  --wx-panel-shadow: 0 24px 70px -24px rgba(0, 0, 0, 0.88), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  --wx-input-bg: rgba(255, 255, 255, 0.045);
  --wx-input-focus-bg: #120c1f;
  --wx-well-bg: rgba(0, 0, 0, 0.48);
  --wx-dropdown-bg: rgba(15, 10, 25, 0.96);
  --wx-grid-line: rgba(255, 255, 255, 0.036);
  --wx-spot: radial-gradient(circle, rgba(244, 114, 182, 0.13) 0%, rgba(168, 85, 247, 0.065) 42%, transparent 72%);
  --wx-glow-a: #7e22ce;
  --wx-glow-b: #be185d;
  --wx-glow-op: 0.28;
  --wx-accent: #f0abfc;
  --wx-accent-solid: #f5d0fe;
  --wx-accent-ink: #07050c;
  --wx-row-wash: linear-gradient(90deg, rgba(217, 70, 239, 0.15), rgba(251, 113, 133, 0.05) 55%, transparent 84%);
  --wx-cta-bg: #ffffff;
  --wx-cta-ink: #07050c;
  --wx-cta-hover-bg: #f5d0fe;
  --wx-cta-hover-ink: #07050c;
  --wx-cta-shadow: 0 12px 32px -10px rgba(245, 208, 254, 0.35);
  --wx-cta-hover-shadow: 0 18px 40px -10px rgba(245, 208, 254, 0.52);
  --wx-grad: linear-gradient(105deg, #fae8ff 0%, #fda4af 36%, #fde68a 65%, #bae6fd 100%);
  --wx-group-create: #f0abfc;
  --wx-dot-create: #e879f9;
  --wx-group-ai: #fda4af;
  --wx-dot-ai: #fb7185;
  --wx-group-workspace: #fde68a;
  --wx-dot-workspace: #fbbf24;
  --wx-group-learn: #67e8f9;
  --wx-dot-learn: #22d3ee;
  --wx-group-community: #6ee7b7;
  --wx-dot-community: #34d399;
  --wx-ease: cubic-bezier(0.16, 1, 0.3, 1);

  position: relative;
  min-height: 100vh;
  overflow-x: clip;
  background: var(--wx-bg);
  color: var(--wx-ink);
  font-family: "Segoe UI Variable", "Aptos", Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  transition: background-color 0.65s var(--wx-ease), color 0.55s var(--wx-ease);
}
.wx::before {
  content: "";
  position: fixed;
  inset: -18%;
  z-index: 0;
  pointer-events: none;
  opacity: 0.58;
  background:
    radial-gradient(38rem 34rem at 12% 18%, color-mix(in srgb, var(--wx-glow-a) 20%, transparent), transparent 72%),
    radial-gradient(34rem 30rem at 86% 32%, color-mix(in srgb, var(--wx-glow-b) 18%, transparent), transparent 72%),
    radial-gradient(30rem 28rem at 52% 88%, color-mix(in srgb, var(--wx-accent) 10%, transparent), transparent 74%);
  background-size: cover;
  animation: wxAmbientDrift 32s ease-in-out infinite alternate;
  transform: translateZ(0);
}
@keyframes wxAmbientDrift {
  from { transform: translate3d(-1%, -1%, 0) scale(1); }
  to { transform: translate3d(1%, 1%, 0) scale(1.04); }
}

.wx.wx-light {
  --wx-bg: #f4f6fb;
  --wx-header-bg: rgba(244, 246, 251, 0.85);
  --wx-ink: #172033;
  --wx-ink-soft: #172033;
  --wx-muted: #334155;
  --wx-subtle: #64748b;
  --wx-border: rgba(15, 23, 42, 0.1);
  --wx-border-strong: rgba(15, 23, 42, 0.18);
  --wx-panel-bg: linear-gradient(155deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.78) 100%);
  --wx-panel-hover-bg: linear-gradient(155deg, #ffffff 0%, rgba(255, 255, 255, 0.92) 100%);
  --wx-panel-shadow: 0 20px 50px -24px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.95);
  --wx-input-bg: rgba(15, 23, 42, 0.035);
  --wx-input-focus-bg: #ffffff;
  --wx-well-bg: rgba(15, 23, 42, 0.032);
  --wx-dropdown-bg: rgba(255, 255, 255, 0.98);
  --wx-grid-line: rgba(15, 23, 42, 0.045);
  --wx-spot: radial-gradient(circle, rgba(124, 58, 237, 0.085) 0%, rgba(219, 39, 119, 0.045) 45%, transparent 72%);
  --wx-glow-a: #c084fc;
  --wx-glow-b: #f472b6;
  --wx-glow-op: 0.18;
  --wx-accent: #7c3aed;
  --wx-accent-solid: #6d28d9;
  --wx-accent-ink: #ffffff;
  --wx-row-wash: linear-gradient(90deg, rgba(124, 58, 237, 0.08), rgba(219, 39, 119, 0.035) 55%, transparent 84%);
  --wx-cta-bg: #0f172a;
  --wx-cta-ink: #ffffff;
  --wx-cta-hover-bg: #6d28d9;
  --wx-cta-hover-ink: #ffffff;
  --wx-cta-shadow: 0 12px 28px -10px rgba(15, 23, 42, 0.24);
  --wx-cta-hover-shadow: 0 18px 36px -10px rgba(109, 40, 217, 0.36);
  --wx-grad: linear-gradient(105deg, #6d28d9 0%, #db2777 38%, #d97706 68%, #0284c7 100%);
  --wx-group-create: #7c3aed;
  --wx-dot-create: #8b5cf6;
  --wx-group-ai: #db2777;
  --wx-dot-ai: #ec4899;
  --wx-group-workspace: #b45309;
  --wx-dot-workspace: #d97706;
  --wx-group-learn: #0284c7;
  --wx-dot-learn: #0ea5e9;
  --wx-group-community: #059669;
  --wx-dot-community: #10b981;
}

.wx-ink { color: var(--wx-ink); transition: color 0.45s var(--wx-ease); }
.wx-ink-soft { color: var(--wx-ink-soft); transition: color 0.45s var(--wx-ease); }
.wx-muted { color: var(--wx-muted); transition: color 0.45s var(--wx-ease); }
.wx-subtle { color: var(--wx-subtle); transition: color 0.45s var(--wx-ease); }
.wx-accent { color: var(--wx-accent); transition: color 0.45s var(--wx-ease); }
.wx-divider-t { border-top: 1px solid var(--wx-border); transition: border-color 0.45s var(--wx-ease); }
.wx-divider-b { border-bottom: 1px solid var(--wx-border); transition: border-color 0.45s var(--wx-ease); }
.wx-divider-y { border-top: 1px solid var(--wx-border); border-bottom: 1px solid var(--wx-border); transition: border-color 0.45s var(--wx-ease); }

.wx-grid {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background-image:
    linear-gradient(to right, var(--wx-grid-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--wx-grid-line) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 85% 65% at 50% 14%, #000 30%, transparent 100%);
  transition: background-image 0.5s var(--wx-ease);
}
.wx-glow {
  position: absolute;
  pointer-events: none;
  filter: blur(140px);
  opacity: var(--wx-glow-op);
  border-radius: 9999px;
  transition: background-color 0.7s var(--wx-ease), opacity 0.6s var(--wx-ease);
}
.wx-spotlight {
  position: fixed;
  width: 500px;
  height: 500px;
  border-radius: 9999px;
  pointer-events: none;
  background: var(--wx-spot);
  transform: translate(-50%, -50%);
  transition: opacity .35s ease, background 0.5s ease;
  z-index: 2;
}
.wx-panel {
  background: var(--wx-panel-bg);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  border: 1px solid var(--wx-border);
  box-shadow: var(--wx-panel-shadow);
  transition:
    transform 0.45s var(--wx-ease),
    background 0.55s var(--wx-ease),
    border-color 0.4s var(--wx-ease),
    box-shadow 0.45s var(--wx-ease);
}
.wx-panel-lift:hover {
  transform: translateY(-3px);
  background: var(--wx-panel-hover-bg);
  border-color: var(--wx-border-strong);
}
.wx-well {
  background: var(--wx-well-bg);
  border: 1px solid var(--wx-border);
  transition: background-color 0.4s var(--wx-ease), border-color 0.4s var(--wx-ease), transform 0.35s var(--wx-ease);
}
.wx-hero-title {
  font-size: clamp(3.2rem, 11.4vw, 8.6rem);
  line-height: 0.92;
  letter-spacing: -0.045em;
}
.wx-hero-preview {
  position: relative;
  isolation: isolate;
  animation: wxPreviewArrive 1s .12s var(--wx-ease) both;
}
.wx-hero-preview::before {
  position: absolute;
  z-index: -1;
  inset: -5% -3%;
  border: 1px solid color-mix(in srgb, var(--wx-accent) 18%, transparent);
  border-radius: 30px;
  transform: rotate(1.5deg);
  box-shadow: 0 18px 48px -36px color-mix(in srgb, var(--wx-accent) 55%, transparent);
}
.wx-hero-preview::after {
  content: "";
  position: absolute;
  z-index: 2;
  top: -12px;
  right: 18px;
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--wx-accent) 28%, var(--wx-border));
  border-radius: 999px;
  background: var(--wx-panel-bg);
  color: var(--wx-accent);
  content: "LIVE · CREATIVE STUDIO";
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .12em;
  box-shadow: 0 8px 22px -14px rgba(15, 23, 42, .45);
}
.wx-preview-surface {
  animation: wxPreviewFloat 8s ease-in-out 1s infinite;
}
@keyframes wxPreviewArrive {
  from { opacity: 0; transform: translateY(28px) scale(.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes wxPreviewFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}
.wx-launch-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  overflow: hidden;
  pointer-events: none;
  color: var(--wx-ink);
  background:
    radial-gradient(ellipse at 50% 45%, color-mix(in srgb, var(--wx-accent) 18%, transparent), transparent 56%),
    var(--wx-bg);
  clip-path: circle(0 at 50% 50%);
  opacity: 0;
}
.wx-launch-overlay.is-active {
  animation: wxLaunchReveal .68s cubic-bezier(.76, 0, .24, 1) forwards;
  pointer-events: all;
}
@keyframes wxLaunchReveal {
  0% { clip-path: circle(0 at 50% 50%); opacity: 1; }
  75% { clip-path: circle(100vmax at 50% 50%); opacity: 1; }
  100% { clip-path: circle(100vmax at 50% 50%); opacity: 1; }
}
.wx-launch-content {
  display: grid;
  justify-items: center;
  gap: 10px;
  text-align: center;
  opacity: 0;
  transform: translateY(12px) scale(.96);
}
.wx-launch-overlay.is-active .wx-launch-content {
  animation: wxLaunchContent .38s .16s var(--wx-ease) forwards;
}
@keyframes wxLaunchContent {
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.wx-launch-mark {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--wx-accent) 35%, transparent);
  border-radius: 20px;
  background: color-mix(in srgb, var(--wx-accent) 12%, var(--wx-bg));
  color: var(--wx-accent);
  box-shadow: 0 12px 40px -18px color-mix(in srgb, var(--wx-accent) 75%, transparent);
  animation: wxLaunchPulse 1s ease-in-out infinite alternate;
}
@keyframes wxLaunchPulse {
  to { transform: translateY(-3px) scale(1.04); box-shadow: 0 18px 46px -18px color-mix(in srgb, var(--wx-accent) 85%, transparent); }
}
.wx-launch-title { font-size: clamp(20px, 4vw, 28px); font-weight: 900; letter-spacing: -.035em; }
.wx-launch-subtitle { color: var(--wx-muted); font-size: 13px; }
.wx-launch-track {
  width: min(220px, 60vw);
  height: 3px;
  margin-top: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--wx-accent) 16%, transparent);
}
.wx-launch-track span {
  display: block;
  width: 42%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--wx-accent), #ec4899, #f59e0b);
  animation: wxLaunchProgress .6s var(--wx-ease) forwards;
}
@keyframes wxLaunchProgress { to { transform: translateX(140%); } }
.wx-scroll-progress {
  position: absolute;
  inset: auto 0 -1px;
  height: 2px;
  transform: scaleX(0);
  transform-origin: left center;
  background: linear-gradient(90deg, var(--wx-accent), #ec4899 55%, #f59e0b);
  box-shadow: 0 0 12px color-mix(in srgb, var(--wx-accent) 48%, transparent);
  pointer-events: none;
}
.wx-line {
  display: block;
  overflow: hidden;
  padding-bottom: .07em;
}
.wx-line > span {
  display: inline-block;
  transform: translateY(105%);
  animation: wxUp 0.95s cubic-bezier(.16,1,.3,1) forwards;
}
@keyframes wxUp {
  to { transform: translateY(0); }
}
.wx-grad {
  background: var(--wx-grad);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  transition: background-image 0.55s var(--wx-ease);
}
.wx-marquee {
  display: flex;
  width: max-content;
  animation: wxMarq 64s linear infinite;
}
.wx-marquee.rev {
  animation-direction: reverse;
  animation-duration: 78s;
}
.wx-marquee-wrap:hover .wx-marquee {
  animation-play-state: paused;
}
@keyframes wxMarq {
  to { transform: translateX(-50%); }
}

/* --- Distinct, subtle per-section animations --- */

/* Section 1 (In short): Gentle slide from left */
.wx-anim-left {
  opacity: 0;
  transform: translateX(-28px);
  transition: opacity 0.75s var(--wx-ease), transform 0.75s var(--wx-ease);
}
.wx-anim-left.wx-in {
  opacity: 1;
  transform: translateX(0);
}

/* Section 2 (Stats): Soft upward rise */
.wx-anim-rise {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.7s var(--wx-ease), transform 0.7s var(--wx-ease);
}
.wx-anim-rise.wx-in {
  opacity: 1;
  transform: translateY(0);
}

/* Section 3 (Features spotlight): Subtle paper unfold */
.wx-paper-open {
  transform-origin: left center;
  animation: wxPaperOpenSubtle 0.45s var(--wx-ease) both;
}
@keyframes wxPaperOpenSubtle {
  0% {
    opacity: 0.5;
    transform: perspective(1000px) rotateY(-22deg);
  }
  100% {
    opacity: 1;
    transform: perspective(1000px) rotateY(0deg);
  }
}

/* Section 4 (Tools content switch): Soft split/tear arrival */
.wx-tear-soft {
  animation: wxTearSoft 0.42s var(--wx-ease) both;
}
@keyframes wxTearSoft {
  0% {
    opacity: 0;
    clip-path: inset(0 65% 0 0);
    transform: translateX(-10px);
  }
  100% {
    opacity: 1;
    clip-path: inset(0 0 0 0);
    transform: translateX(0);
  }
}

/* Jumping dot -> next content display */
.wx-dot-hopper {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  background: var(--wx-accent);
  animation: wxDotHopSubtle 0.34s var(--wx-ease) forwards;
}
@keyframes wxDotHopSubtle {
  0% {
    opacity: 0;
    transform: translateY(-14px) scale(0.8);
  }
  45% {
    opacity: 1;
    transform: translateY(2px) scale(1.1);
  }
  75% {
    opacity: 1;
    transform: translateY(-6px) scale(0.95);
  }
  100% {
    opacity: 0;
    transform: translateY(0) scale(1);
  }
}
.wx-dot-wait {
  opacity: 0.35;
  transition: opacity 0.15s ease;
}
.wx-dot-reveal {
  animation: wxDotRevealSubtle 0.36s var(--wx-ease) both;
}
@keyframes wxDotRevealSubtle {
  0% {
    opacity: 0;
    transform: translateY(6px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Section 5 (Workflow): Gentle slide from right */
.wx-anim-right {
  opacity: 0;
  transform: translateX(28px);
  transition: opacity 0.75s var(--wx-ease), transform 0.75s var(--wx-ease);
}
.wx-anim-right.wx-in {
  opacity: 1;
  transform: translateX(0);
}

/* Section 6 (Reviews & Closing): Subtle scale-in */
.wx-anim-scale {
  opacity: 0;
  transform: scale(0.97);
  transition: opacity 0.72s var(--wx-ease), transform 0.72s var(--wx-ease);
}
.wx-anim-scale.wx-in {
  opacity: 1;
  transform: scale(1);
}

.wx-row {
  position: relative;
  border-top: 1px solid var(--wx-border);
  transition: background-color .3s ease, border-color .45s var(--wx-ease);
}
.wx-row::before {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--wx-row-wash);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform .65s cubic-bezier(.16,1,.3,1), background 0.5s ease;
  pointer-events: none;
}
.wx-row:hover::before,
.wx-row.is-active::before {
  transform: scaleX(1);
}
.wx-row:hover .wx-arrow,
.wx-row.is-active .wx-arrow {
  transform: translate(3px,-3px);
  opacity: 1;
  color: var(--wx-accent);
}
.wx-arrow {
  transition: transform .4s cubic-bezier(.16,1,.3,1), opacity .3s ease, color .3s ease;
  opacity: .38;
}
.wx-link {
  background-image: linear-gradient(currentColor, currentColor);
  background-size: 0 1px;
  background-repeat: no-repeat;
  background-position: 0 100%;
  transition: background-size .4s cubic-bezier(.16,1,.3,1), color .2s ease;
}
.wx-link:hover,
.wx-link:focus-visible {
  background-size: 100% 1px;
  color: var(--wx-accent);
  outline: none;
}
.wx-cta {
  background: var(--wx-cta-bg);
  color: var(--wx-cta-ink);
  box-shadow: var(--wx-cta-shadow);
  transition: letter-spacing .35s cubic-bezier(.16,1,.3,1), background-color .3s ease, color .3s ease, transform .25s var(--wx-ease), box-shadow .35s ease;
}
.wx-cta:hover {
  letter-spacing: .015em;
  background: var(--wx-cta-hover-bg);
  color: var(--wx-cta-hover-ink);
  transform: translateY(-2px);
  box-shadow: var(--wx-cta-hover-shadow);
}
.wx-cta:active {
  transform: translateY(0) scale(0.99);
}

/* Top-right Theme Emblem Switch */
.wx-theme-logo {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid var(--wx-border-strong);
  background: var(--wx-input-bg);
  color: var(--wx-ink);
  cursor: pointer;
  overflow: hidden;
  transition:
    transform 0.45s var(--wx-ease),
    border-color 0.35s ease,
    background-color 0.4s var(--wx-ease),
    color 0.35s ease,
    box-shadow 0.4s ease;
}
.wx-theme-logo:hover {
  transform: scale(1.06) rotate(8deg);
  border-color: var(--wx-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--wx-accent) 18%, transparent);
}
.wx-theme-logo:active {
  transform: scale(0.95);
}
.wx-theme-logo:focus-visible {
  outline: 2px solid var(--wx-accent);
  outline-offset: 2px;
}
.wx-theme-icon-wrap {
  position: relative;
  width: 18px;
  height: 18px;
}
.wx-theme-icon {
  position: absolute;
  inset: 0;
  width: 18px;
  height: 18px;
  transition: transform 0.55s var(--wx-ease), opacity 0.35s ease;
}
.wx-theme-icon.is-visible {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}
.wx-theme-icon.is-hidden-sun {
  opacity: 0;
  transform: rotate(-95deg) scale(0.45);
}
.wx-theme-icon.is-hidden-moon {
  opacity: 0;
  transform: rotate(95deg) scale(0.45);
}

/* Smooth radial ripple wash when toggling theme */
.wx-ripple {
  position: fixed;
  top: 36px;
  right: 48px;
  width: 24px;
  height: 24px;
  margin-left: -12px;
  margin-top: -12px;
  border-radius: 9999px;
  pointer-events: none;
  z-index: 35;
  opacity: 0;
  transform: scale(0);
}
.wx-ripple.fire {
  animation: wxRippleOut 0.8s var(--wx-ease) forwards;
}
@keyframes wxRippleOut {
  0% { opacity: 0.2; transform: scale(0); }
  65% { opacity: 0.08; }
  100% { opacity: 0; transform: scale(115); }
}

@media (prefers-reduced-motion: reduce) {
  .wx::before,
  .wx-hero-preview,
  .wx-preview-surface {
    animation: none !important;
  }
  .wx-launch-overlay.is-active,
  .wx-launch-overlay.is-active .wx-launch-content,
  .wx-launch-mark,
  .wx-launch-track span { animation: none !important; }
  .wx-launch-overlay.is-active { clip-path: none; opacity: 1; }
  .wx-launch-content { opacity: 1; transform: none; }
  .wx-hero-preview { opacity: 1; transform: none; }
  .wx-line > span,
  .wx-marquee,
  .wx-ripple.fire,
  .wx-paper-open,
  .wx-tear-soft,
  .wx-dot-hopper,
  .wx-dot-reveal {
    animation: none !important;
    transform: none !important;
    clip-path: none !important;
  }
  .wx-anim-left,
  .wx-anim-rise,
  .wx-anim-right,
  .wx-anim-scale {
    opacity: 1;
    transform: none;
    transition: none;
  }
  .wx-spotlight, .wx-grid, .wx-ripple { display: none; }
  .wx-row::before, .wx-link, .wx-cta, .wx-arrow, .wx-theme-logo, .wx-theme-icon, .wx-panel, .wx-well { transition: none; }
}
@media (max-width: 767px) {
  .wx .pcfx-dock-btn { display: none; }
  .wx-hero-preview::before { inset: -3% -1%; }
  .wx-hero-preview::after { top: -10px; right: 12px; font-size: 8px; }
}
`;


const ROUTES = ["home", "features", "tools", "workflow", "reviews"];
const readRoute = () => {
  if (typeof window === "undefined") return "home";
  const r = window.location.hash.replace(/^#\/?/, "").toLowerCase();
  return ROUTES.includes(r) ? r : "home";
};

const WXP_CSS = `
.wxp-page { position: relative; isolation: isolate; min-height: 70vh; animation: wxpIn .8s cubic-bezier(.16,1,.3,1) both; }
@keyframes wxpIn { from { opacity: 0; transform: translateY(24px); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
.wxp-orb { position: absolute; width: 380px; height: 380px; border-radius: 50%; filter: blur(90px); opacity: .3; z-index: -1; pointer-events: none; animation: wxpFloat 14s ease-in-out infinite alternate; }
@keyframes wxpFloat { from { transform: translate3d(-3%, -2%, 0); } to { transform: translate3d(4%, 5%, 0) scale(1.1); } }
.wxp-back { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px; border: 1px solid rgba(127,127,127,.3); background: rgba(127,127,127,.06); font-size: 13px; font-weight: 700; cursor: pointer; transition: transform .35s cubic-bezier(.16,1,.3,1), background .3s ease; }
.wxp-back:hover { transform: translateX(-4px); background: rgba(127,127,127,.14); }
.wxp-eyebrow { margin-top: 30px; font-size: 11px; letter-spacing: .3em; text-transform: uppercase; font-weight: 800; opacity: .7; animation: wxpIn .6s .1s both; }
.wxp-title { margin-top: 10px; font-size: clamp(2.2rem, 6vw, 4.8rem); font-weight: 900; letter-spacing: -.04em; line-height: 1.02;
  background: linear-gradient(100deg, #7c3aed, #db2777, #f59e0b, #7c3aed); background-size: 250% 100%; -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: wxpIn .8s .15s both, wxpShine 8s linear infinite; }
@keyframes wxpShine { from { background-position: 0% 50%; } to { background-position: 250% 50%; } }
.wxp-sub { margin-top: 12px; font-size: 16px; opacity: .75; max-width: 560px; animation: wxpIn .7s .25s both; }
.wxp-progress { height: 3px; border-radius: 3px; margin: 26px 0 36px; background: rgba(127,127,127,.2); overflow: hidden; }
.wxp-progress span { display: block; height: 100%; background: linear-gradient(90deg, #7c3aed, #db2777); transform-origin: left; animation: wxpGrow 1.1s .3s cubic-bezier(.16,1,.3,1) both; }
@keyframes wxpGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.wxp-grid { display: grid; gap: 18px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
.wxp-card { padding: 24px; border-radius: 24px; border: 1px solid rgba(127,127,127,.2); background: rgba(127,127,127,.06); backdrop-filter: blur(14px); display: flex; flex-direction: column; gap: 10px;
  animation: wxpRise .8s var(--d, 0ms) cubic-bezier(.16,1,.3,1) backwards;
  transition: transform .45s cubic-bezier(.16,1,.3,1), box-shadow .45s ease, border-color .45s ease; }
.wxp-card:hover { transform: translateY(-6px) scale(1.01); box-shadow: 0 30px 60px -30px rgba(124,58,237,.55); border-color: rgba(124,58,237,.45); }
@keyframes wxpRise { from { opacity: 0; transform: translateY(30px) scale(.96); } to { opacity: 1; transform: none; } }
.wxp-num { font-family: ui-monospace, monospace; font-size: 12px; opacity: .6; }
.wxp-card h3 { font-size: 22px; font-weight: 900; letter-spacing: -.02em; }
.wxp-badge { font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #a78bfa; }
.wxp-go { margin-top: auto; align-self: flex-start; font-size: 13px; font-weight: 800; color: #a78bfa; background: none; border: 0; cursor: pointer; transition: transform .35s cubic-bezier(.16,1,.3,1), color .3s ease; }
.wxp-go:hover { transform: translateX(4px); color: #f0abfc; }
.wxp-group { margin-top: 36px; }
.wxp-group h2 { font-size: 12px; letter-spacing: .25em; text-transform: uppercase; font-weight: 800; opacity: .7; margin-bottom: 14px; }
.wxp-tools { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
.wxp-tool { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-radius: 18px; border: 1px solid rgba(127,127,127,.22); background: rgba(127,127,127,.05); font-size: 14px; font-weight: 700; cursor: pointer; text-align: left;
  animation: wxpRise .7s var(--d, 0ms) cubic-bezier(.16,1,.3,1) backwards; transition: transform .35s cubic-bezier(.16,1,.3,1), background .3s ease, border-color .3s ease; }
.wxp-tool:hover { transform: translateY(-3px); background: linear-gradient(120deg, rgba(124,58,237,.18), rgba(219,39,119,.12)); border-color: rgba(124,58,237,.5); }
.wxp-arrow { transition: transform .4s cubic-bezier(.16,1,.3,1); }
.wxp-tool:hover .wxp-arrow { transform: translateX(5px); }
.wxp-steps { list-style: none; padding: 0; margin: 0; display: grid; gap: 18px; }
@media (min-width: 768px) { .wxp-steps { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.wxp-step { padding: 26px; border-radius: 24px; border: 1px solid rgba(127,127,127,.2); background: rgba(127,127,127,.06); display: flex; flex-direction: column; gap: 10px; animation: wxpRise .8s var(--d, 0ms) cubic-bezier(.16,1,.3,1) backwards; }
.wxp-stepno { font-family: ui-monospace, monospace; font-size: 12px; opacity: .6; }
.wxp-step h3 { font-size: 22px; font-weight: 900; letter-spacing: -.02em; }
.wxp-cta { margin-top: 52px; }
.wxp-cta button { padding: 16px 28px; border-radius: 14px; font-size: 15px; font-weight: 900; color: #fff; border: 0; cursor: pointer; background: linear-gradient(120deg, #7c3aed, #db2777); box-shadow: 0 18px 40px -16px rgba(124,58,237,.7); transition: transform .35s cubic-bezier(.16,1,.3,1), box-shadow .35s ease; }
.wxp-cta button:hover { transform: translateY(-3px); box-shadow: 0 28px 50px -18px rgba(124,58,237,.8); }
.wxp-wipe { position: fixed; inset: 0; z-index: 60; pointer-events: none; background: linear-gradient(100deg, #7c3aed, #db2777 60%, #f59e0b); animation: wxpWipe .9s cubic-bezier(.7,0,.2,1) both; }
@keyframes wxpWipe { 0% { transform: translateX(-101%); } 45% { transform: translateX(0); } 100% { transform: translateX(101%); } }
@media (prefers-reduced-motion: reduce) { .wxp-page, .wxp-page *, .wxp-wipe { animation: none !important; transition: none !important; } }
`;

function RoutePage({ route, onBack, onLaunch, reviews }) {
  const meta = {
    features: { eyebrow: "Features", title: "Everything you need to create.", sub: "Each studio, one click away." },
    tools: { eyebrow: "Tools", title: `${TOOL_COUNT} tools in five groups.`, sub: "Pick a tool and jump straight into its studio." },
    workflow: { eyebrow: "How it works", title: "From idea to finished piece.", sub: "Three steps. No setup." },
    reviews: { eyebrow: "In their words", title: "Loved by creators.", sub: "What people say after making their first piece." },
  }[route];
  if (!meta) return null;
  return (
    <section key={route} className="wxp-page px-4 sm:px-8 lg:px-14 pt-10 sm:pt-14 pb-24">
      <style>{WXP_CSS}</style>
      <span className="wxp-orb" style={{ background: "#7c3aed", left: "-8%", top: "-6%" }} aria-hidden="true" />
      <span className="wxp-orb" style={{ background: "#db2777", right: "-6%", top: "12%", animationDelay: "-6s" }} aria-hidden="true" />

      <button type="button" onClick={onBack} className="wxp-back">← Back to home</button>
      <p className="wxp-eyebrow">{meta.eyebrow}</p>
      <h1 className="wxp-title">{meta.title}</h1>
      <p className="wxp-sub">{meta.sub}</p>
      <div className="wxp-progress"><span /></div>

      {route === "features" && (
        <div className="wxp-grid">
          {FEATURES.map((f, i) => (
            <article key={f.n} className="wxp-card" style={{ "--d": `${i * 90}ms` }}>
              <span className="wxp-num">{f.n}</span>
              <h3>{f.title}</h3>
              <p className="wxp-badge">{f.badge}</p>
              <p className="opacity-80">{f.text}</p>
              <p className="text-sm italic opacity-60">{f.samplePrompt}</p>
              <button type="button" onClick={() => onLaunch(f.tool)} className="wxp-go">Open {f.tool} →</button>
            </article>
          ))}
        </div>
      )}

      {route === "tools" && TOOL_GROUPS.map((g, gi) => (
        <div key={g.title} className="wxp-group">
          <h2>{g.title}</h2>
          <div className="wxp-grid wxp-tools">
            {g.tools.map((name, i) => (
              <button key={name} type="button" onClick={() => onLaunch(name)} className="wxp-tool" style={{ "--d": `${(gi * 4 + i) * 50}ms` }}>
                <span>{name}</span>
                <span className="wxp-arrow">→</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {route === "workflow" && (
        <ol className="wxp-steps">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.n} className="wxp-step" style={{ "--d": `${i * 140}ms` }}>
                <span className="wxp-stepno">Step {s.n}</span>
                <Icon className="w-5 h-5" />
                <h3>{s.title}</h3>
                <p className="opacity-80">{s.text}</p>
              </li>
            );
          })}
        </ol>
      )}

      {route === "reviews" && (
        <div className="wxp-grid">
          {(reviews || []).length === 0 ? (
            <p className="opacity-70">No reviews yet. Be the first to share your experience.</p>
          ) : (
            reviews.map((r, i) => (
              <figure key={r.id || i} className="wxp-card" style={{ "--d": `${i * 80}ms` }}>
                <blockquote className="font-serif italic text-lg leading-snug">“{r.comment}”</blockquote>
                <figcaption className="mt-auto text-xs opacity-70">
                  {r.name} · <span className="text-amber-500">{"★".repeat(Math.min(5, Math.max(1, Number(r.rating) || 5)))}</span>
                </figcaption>
              </figure>
            ))
          )}
        </div>
      )}

      <div className="wxp-cta">
        <button type="button" onClick={() => onLaunch()}>Start creating →</button>
      </div>
    </section>
  );
}

export default function WelcomePage({ onExplore, onSelectTool }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("plotcraft_welcome_theme");
      return saved === "light" || saved === "dark" ? saved : "light";
    } catch {
      return "light";
    }
  });
  const [rippleKey, setRippleKey] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [route, setRoute] = useState(readRoute);
  const [wipeKey, setWipeKey] = useState(0);
  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute());
      setWipeKey((k) => k + 1);
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const goRoute = (r) => {
    const target = ROUTES.includes(r) ? r : "home";
    window.location.hash = target === "home" ? "/" : `/${target}`;
  };
  const [reviews, setReviews] = useState([]);

  // Shared live search state across Header & Hero
  const [query, setQuery] = useState("");
  const [navSearchOpen, setNavSearchOpen] = useState(false);
  const [activeResultIdx, setActiveResultIdx] = useState(0);

  const [activeGroup, setActiveGroup] = useState("All");
  const [groupDotTick, setGroupDotTick] = useState(0);

  const [activeModeId, setActiveModeId] = useState("story");
  const [modeDotTick, setModeDotTick] = useState(0);

  const [activeFeatureIdx, setActiveFeatureIdx] = useState(0);
  const [featurePaperTick, setFeaturePaperTick] = useState(0);

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotPrompt, setCopilotPrompt] = useState("");
  const [voiceReplies, setVoiceReplies] = useState(false);
  const copilotTarget = copilotPrompt.trim() ? resolveCopilotTool(copilotPrompt) : "";

  const rootRef = useRef(null);
  const spotlightRef = useRef(null);
  const progressRef = useRef(null);
  const navInputRef = useRef(null);
  const navDropdownRef = useRef(null);
  const heroInputRef = useRef(null);
  const navTimerRef = useRef(null);
  const copyTimerRef = useRef(null);

  const isLight = theme === "light";

  useEffect(() => {
    try {
      localStorage.setItem("plotcraft_welcome_theme", theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  useEffect(() => {
    const controller = new AbortController();

    getJson("/api/stats", controller.signal).then((d) => {
      if (d?.stats) setStats(d.stats);
    });

    getJson("/api/reviews", controller.signal).then((d) => {
      if (!d || !Array.isArray(d.reviews)) return;
      const top = [...d.reviews]
        .filter((r) => r && r.comment)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 3);
      setReviews(top);
    });

    return () => {
      controller.abort();
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // Keyboard shortcuts: "/" or "Cmd/Ctrl+K" focuses search; "Esc" closes dropdown
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      const isTyping = ["input", "textarea", "select"].includes(tag) || e.target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setNavSearchOpen(true);
        const visibleInput = [navInputRef.current, heroInputRef.current].find(
          (input) => input && input.getClientRects().length > 0
        );
        (visibleInput || heroInputRef.current || navInputRef.current)?.focus();
        return;
      }

      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping) {
        e.preventDefault();
        setNavSearchOpen(true);
        const visibleInput = [navInputRef.current, heroInputRef.current].find(
          (input) => input && input.getClientRects().length > 0
        );
        (visibleInput || heroInputRef.current || navInputRef.current)?.focus();
        return;
      }

      if (e.key === "Escape") {
        setNavSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Close navbar search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navDropdownRef.current && !navDropdownRef.current.contains(e.target)) {
        setNavSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Per-section scroll reveal
  useEffect(() => {
    const els = rootRef.current
      ? Array.from(
          rootRef.current.querySelectorAll(
            ".wx-anim-left, .wx-anim-rise, .wx-anim-right, .wx-anim-scale"
          )
        )
      : [];
    if (!els.length) return;

    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("wx-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("wx-in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [activeGroup, reviews.length, route]);

  useEffect(() => {
    const progress = progressRef.current;
    if (!progress) return undefined;
    let frame = 0;
    const updateProgress = () => {
      frame = 0;
      const root = document.documentElement;
      const scrollable = root.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      progress.style.transform = `scaleX(${ratio})`;
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateProgress);
    };
    updateProgress();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [route, reviews.length]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    setRippleKey((k) => k + 1);
  };

  const launchApp = (toolName = null, promptText = "", speakReplies = false) => {
    if (leaving) return;
    setNavSearchOpen(false);
    setLeaving(true);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    navTimerRef.current = setTimeout(() => {
      if (toolName && typeof onSelectTool === "function") {
        onSelectTool(toolName, promptText, speakReplies);
      } else if (typeof onExplore === "function") {
        onExplore(toolName || undefined, promptText, speakReplies);
      }
    }, reduceMotion ? 0 : 680);
  };

  const handleCopilotSubmit = (event) => {
    event.preventDefault();
    const prompt = copilotPrompt.trim();
    if (!prompt) return;
    launchApp(resolveCopilotTool(prompt), prompt, voiceReplies);
  };

  const selectCopilotExample = (prompt) => {
    setCopilotPrompt(prompt);
    launchApp(resolveCopilotTool(prompt), prompt, voiceReplies);
  };

  const handleMouseMove = (e) => {
    const spotlight = spotlightRef.current;
    if (!spotlight) return;
    spotlight.style.left = `${e.clientX}px`;
    spotlight.style.top = `${e.clientY}px`;
    spotlight.style.opacity = "1";
  };

  const handleMouseLeave = () => {
    if (spotlightRef.current) spotlightRef.current.style.opacity = "0";
  };

  const handleSelectMode = (id) => {
    if (id === activeModeId) return;
    setActiveModeId(id);
    setModeDotTick((t) => t + 1);
    setCopiedPrompt(false);
    setCopyError(false);
    setCopyError(false);
  };

  const handleSelectFeature = (idx) => {
    if (idx === activeFeatureIdx) return;
    setActiveFeatureIdx(idx);
    setFeaturePaperTick((t) => t + 1);
  };

  const handleSelectGroup = (tab) => {
    if (tab === activeGroup) return;
    setActiveGroup(tab);
    setGroupDotTick((t) => t + 1);
  };

  const activeMode = useMemo(
    () => STUDIO_MODES.find((m) => m.id === activeModeId) || STUDIO_MODES[0],
    [activeModeId]
  );

  const handleCopyPrompt = async () => {
    if (!activeMode?.prompt) return;
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(activeMode.prompt);
      setCopiedPrompt(true);
      setCopyError(false);
    } catch {
      setCopiedPrompt(false);
      setCopyError(true);
    }
    copyTimerRef.current = setTimeout(() => {
      setCopiedPrompt(false);
      setCopyError(false);
    }, 2200);
  };

  const trimmedQuery = query.trim().toLowerCase();

  const matchedTools = useMemo(() => {
    if (!trimmedQuery) return ALL_TOOLS.slice(0, 5);
    return ALL_TOOLS.filter(
      (t) =>
        t.name.toLowerCase().includes(trimmedQuery) ||
        t.group.toLowerCase().includes(trimmedQuery)
    );
  }, [trimmedQuery]);

  const handleSearchKeyDown = (e) => {
    const resultCount = Math.min(matchedTools.length, SEARCH_RESULT_LIMIT);
    if (!resultCount) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveResultIdx((prev) => (prev + 1) % resultCount);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveResultIdx((prev) => (prev - 1 + resultCount) % resultCount);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = matchedTools[Math.min(activeResultIdx, resultCount - 1)] || matchedTools[0];
      if (target) launchApp(target.name);
    }
  };

  const visibleGroups = useMemo(() => {
    if (activeGroup === "All") return TOOL_GROUPS;
    return TOOL_GROUPS.filter((g) => g.title === activeGroup);
  }, [activeGroup]);

  const rating = Number(stats?.rating);
  const statItems = [
    { label: "Stories written", value: stats?.stories },
    { label: "Creators", value: stats?.creators },
    { label: "Chats saved", value: stats?.chats },
    {
      label: "Average rating",
      value: stats?.reviews && Number.isFinite(rating) ? rating.toFixed(1) : null,
    },
  ];

  const activeFeature = FEATURES[activeFeatureIdx] || FEATURES[0];

  return (
    <div
      ref={rootRef}
      className={`wx ${isLight ? "wx-light" : ""}`}
      data-theme={theme}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <style>{CSS}</style>

      <PlotCraftDesign />
      <PlotCraftFX dark={!isLight} />
      {/* Theme ripple pulse */}
      {rippleKey > 0 && (
        <div
          key={rippleKey}
          aria-hidden="true"
          className="wx-ripple fire"
          style={{ background: isLight ? "#ffffff" : "#07050c" }}
        />
      )}

      {/* Architectural grid */}
      <div className="wx-grid" aria-hidden="true" />

      {/* Cursor spotlight */}
      <div
        ref={spotlightRef}
        aria-hidden="true"
        className="wx-spotlight"
        style={{ left: "-999px", top: "-999px", opacity: 0 }}
      />

      {/* Ambient glow */}
      <div
        className="wx-glow"
        style={{ top: "-14%", left: "-10%", width: "54vw", height: "54vw", background: "var(--wx-glow-a)" }}
        aria-hidden="true"
      />
      <div
        className="wx-glow"
        style={{ top: "26%", right: "-16%", width: "44vw", height: "44vw", background: "var(--wx-glow-b)" }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-[1440px] mx-auto">
        {/* STICKY TOP BAR WITH LOGO + LIVE SEARCH + THEME LOGO SWITCH */}
        <header
          className="sticky top-0 z-40 px-4 sm:px-8 lg:px-14 py-3.5 backdrop-blur-xl wx-divider-b transition-colors duration-500"
          style={{ background: "var(--wx-header-bg)" }}
        >
          <div ref={progressRef} aria-hidden="true" className="wx-scroll-progress" />
          <div className="flex items-center justify-between gap-3 sm:gap-5">
            <a
              href="#/"
              onClick={(e) => {
                e.preventDefault();
                if (route !== "home") goRoute("home");
                else window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="shrink-0 focus:outline-none"
              aria-label="PlotCraft.AI Home"
            >
              <PlotCraftLogo isLight={isLight} />
            </a>

            {/* Global Command Search Bar (Desktop & Tablet) */}
            <div ref={navDropdownRef} className="relative hidden sm:block flex-1 max-w-md">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 wx-subtle absolute left-3.5 pointer-events-none" />
                <input
                  ref={navInputRef}
                  type="text"
                  value={query}
                  onFocus={() => setNavSearchOpen(true)}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveResultIdx(0);
                    setNavSearchOpen(true);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={`Search ${TOOL_COUNT} AI & creative tools...`}
                  aria-label="Search tools"
                  style={{
                    background: navSearchOpen ? "var(--wx-input-focus-bg)" : "var(--wx-input-bg)",
                    borderColor: navSearchOpen ? "var(--wx-accent)" : "var(--wx-border-strong)",
                    color: "var(--wx-ink)",
                  }}
                  className="w-full rounded-xl border focus:outline-none pl-10 pr-16 py-2 text-xs sm:text-sm transition-colors"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setActiveResultIdx(0);
                      navInputRef.current?.focus();
                    }}
                    aria-label="Clear search"
                    className="absolute right-2.5 p-1 wx-muted hover:wx-ink"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <kbd
                    style={{
                      background: "var(--wx-input-bg)",
                      borderColor: "var(--wx-border)",
                      color: "var(--wx-subtle)",
                    }}
                    className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono border rounded absolute right-2.5 pointer-events-none"
                  >
                    ⌘K
                  </kbd>
                )}
              </div>

              {/* Live Dropdown Results */}
              {navSearchOpen && (
                <div
                  style={{
                    background: "var(--wx-dropdown-bg)",
                    borderColor: "var(--wx-border-strong)",
                  }}
                  className="absolute left-0 right-0 mt-2 rounded-2xl backdrop-blur-2xl border shadow-[0_24px_64px_rgba(0,0,0,0.28)] overflow-hidden z-50"
                >
                  <div className="px-4 py-2.5 wx-divider-b flex items-center justify-between text-[10px] uppercase tracking-[0.2em] wx-subtle">
                    <span>{trimmedQuery ? `Matches (${matchedTools.length})` : "Quick Launch"}</span>
                    <span>↑↓ navigate · ↵ open</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-[var(--wx-border)]">
                    {matchedTools.length > 0 ? (
                      matchedTools.slice(0, SEARCH_RESULT_LIMIT).map((item, idx) => {
                        const isHighlighted = idx === activeResultIdx;
                        return (
                          <button
                            key={item.name}
                            type="button"
                            onMouseEnter={() => setActiveResultIdx(idx)}
                            onClick={() => launchApp(item.name)}
                            style={{
                              background: isHighlighted
                                ? "color-mix(in srgb, var(--wx-accent) 14%, transparent)"
                                : "transparent",
                            }}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors wx-ink"
                          >
                            <div>
                              <div className="text-xs sm:text-sm font-semibold">{item.name}</div>
                              <div className="text-[11px] wx-subtle">{item.group}</div>
                            </div>
                            <ArrowUpRight className="w-4 h-4 wx-accent shrink-0" />
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-4 py-5 text-center text-xs wx-subtle">
                        No tools found for “{query}”
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <nav
              className="hidden xl:flex items-center gap-7 text-sm wx-muted"
              aria-label="Primary"
            >
              <button type="button" onClick={() => goRoute("features")} className="wx-link">
                Features
              </button>
              <button type="button" onClick={() => goRoute("tools")} className="wx-link">
                Tools
              </button>
              <button type="button" onClick={() => goRoute("workflow")} className="wx-link">
                Workflow
              </button>
              {reviews.length > 0 && (
                <button type="button" onClick={() => goRoute("reviews")} className="wx-link">
                  Reviews
                </button>
              )}
            </nav>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => launchApp()}
                disabled={leaving}
                aria-busy={leaving}
                style={{
                  background: "var(--wx-input-bg)",
                  borderColor: "var(--wx-border-strong)",
                  color: "var(--wx-ink)",
                }}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-2 rounded-xl border hover:opacity-90 transition-all"
              >
                <span>Open Studio</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>

              {/* Top-right Theme Emblem Switch (Sun in Dark mode, Moon in Light mode) */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
                title={isLight ? "Switch to dark theme" : "Switch to light theme"}
                className="wx-theme-logo"
              >
                <span className="wx-theme-icon-wrap" aria-hidden="true">
                  <Sun
                    className={`wx-theme-icon ${!isLight ? "is-visible" : "is-hidden-sun"}`}
                  />
                  <Moon
                    className={`wx-theme-icon ${isLight ? "is-visible" : "is-hidden-moon"}`}
                  />
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* HERO */}
        {route === "home" && (<>
        <section id="top" className="px-4 sm:px-8 lg:px-14 pt-10 sm:pt-14 lg:pt-20 pb-16 sm:pb-24">
          <div
            style={{
              background: "var(--wx-input-bg)",
              borderColor: "var(--wx-border)",
              color: "var(--wx-muted)",
            }}
            className="inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.25em] border px-3.5 py-1.5 rounded-full"
          >
            <Sparkles className="w-3.5 h-3.5 wx-accent" />
            <span>AI storytelling &amp; media studio</span>
            {stats?.creators ? (
              <span className="wx-accent font-semibold tabular-nums">· {stats.creators} creators</span>
            ) : null}
          </div>

          <h1 className="mt-6 font-black wx-hero-title wx-ink">
            <span className="wx-line">
              <span style={{ animationDelay: "0.06s" }}>Dream.</span>
            </span>
            <span className="wx-line">
              <span className="wx-grad" style={{ animationDelay: "0.18s" }}>
                Build.
              </span>
            </span>
            <span className="wx-line">
              <span style={{ animationDelay: "0.3s" }}>
                Share<span className="wx-accent">.</span>
              </span>
            </span>
          </h1>

          <div className="mt-10 sm:mt-14 grid lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Left Column: Value Proposition + Dedicated Search Card */}
            <div className="lg:col-span-6 space-y-7">
              <p className="text-base sm:text-lg lg:text-xl wx-muted leading-relaxed max-w-xl">
                One workspace for stories, visuals, video and sound—then save and share your work.
              </p>

              <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                <button
                  type="button"
                  onClick={() => launchApp()}
                  disabled={leaving}
                  aria-busy={leaving}
                  className="wx-cta rounded-xl inline-flex items-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-black"
                >
                  Start creating <ArrowUpRight className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => goRoute("tools")}
                  className="wx-link text-xs sm:text-sm font-medium wx-muted"
                >
                  Explore all {TOOL_COUNT} tools →
                </button>
              </div>

              {/* Hero Tool Finder Box */}
              <div className="wx-panel rounded-3xl p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <label
                    htmlFor="hero-tool-search"
                    className="text-[11px] uppercase tracking-[0.22em] wx-subtle font-semibold"
                  >
                    Instant Tool Finder
                  </label>
                  <span className="text-[11px] wx-accent font-semibold tabular-nums">
                    {trimmedQuery ? `${matchedTools.length} found` : `${TOOL_COUNT} available`}
                  </span>
                </div>

                <div className="relative flex items-center">
                  <Search className="w-4 h-4 wx-subtle absolute left-3.5 pointer-events-none" />
                  <input
                    id="hero-tool-search"
                    ref={heroInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActiveResultIdx(0);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Type story, video, image, chat, math..."
                    style={{
                      background: "var(--wx-well-bg)",
                      borderColor: "var(--wx-border-strong)",
                      color: "var(--wx-ink)",
                    }}
                    className="w-full rounded-xl border focus:outline-none pl-10 pr-9 py-3 text-sm transition-colors"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setActiveResultIdx(0);
                        heroInputRef.current?.focus();
                      }}
                      aria-label="Clear search"
                      className="absolute right-3 p-1 wx-muted hover:wx-ink"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3.5">
                  {QUICK_QUERIES.map((q) => {
                    const active = trimmedQuery === q;
                    return (
                      <button
                        key={q}
                        type="button"
                        onClick={() => {
                          setQuery(active ? "" : q);
                          setActiveResultIdx(0);
                        }}
                        style={
                          active
                            ? {
                                background: "var(--wx-accent-solid)",
                                color: "var(--wx-accent-ink)",
                                borderColor: "var(--wx-accent-solid)",
                              }
                            : {
                                background: "var(--wx-input-bg)",
                                color: "var(--wx-muted)",
                                borderColor: "var(--wx-border)",
                              }
                        }
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                          active ? "font-bold" : "hover:opacity-85"
                        }`}
                      >
                        {q}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {matchedTools.length > 0 ? (
                    matchedTools.slice(0, SEARCH_RESULT_LIMIT).map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => launchApp(item.name)}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl wx-well hover:translate-x-0.5 text-left transition-all group"
                      >
                        <div>
                          <div className="text-sm font-semibold wx-ink">
                            {item.name}
                          </div>
                          <div className="text-[11px] wx-subtle">{item.group}</div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold wx-accent opacity-85 group-hover:opacity-100">
                          Launch <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="text-xs wx-subtle py-4 text-center">
                      No exact match for “{query}”.{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          setActiveResultIdx(0);
                        }}
                        className="wx-accent underline font-medium"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Studio Stage with Light Jumping-Dot Switch */}
            <div className="lg:col-span-6 wx-hero-preview">
              <div className="wx-panel wx-preview-surface rounded-3xl p-5 sm:p-7 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] uppercase tracking-[0.24em] wx-accent font-semibold">
                    Studio Preview
                  </span>

                  <div
                    style={{
                      background: "var(--wx-well-bg)",
                      borderColor: "var(--wx-border)",
                    }}
                    className="inline-flex p-1 rounded-xl border"
                    role="tablist"
                    aria-label="Studio modes"
                  >
                    {STUDIO_MODES.map((m) => {
                      const active = m.id === activeMode.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => handleSelectMode(m.id)}
                          style={
                            active
                              ? {
                                  background: "var(--wx-cta-bg)",
                                  color: "var(--wx-cta-ink)",
                                }
                              : { color: "var(--wx-muted)" }
                          }
                          className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <DotJumpStage triggerKey={modeDotTick} className="space-y-6">
                  <div className="space-y-2">
                    <div className="text-xs wx-subtle tracking-wide">{activeMode.tag}</div>
                    <h2 className="text-xl sm:text-3xl font-black tracking-tight wx-ink">
                      {activeMode.title}
                    </h2>
                    <p className="text-sm wx-muted leading-relaxed">{activeMode.desc}</p>
                  </div>

                  <div
                    className="relative min-h-40 sm:min-h-48 overflow-hidden rounded-2xl border wx-live-preview"
                    style={{ borderColor: "var(--wx-border)" }}
                    aria-label={`${activeMode.label} sample output preview`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-indigo-500 to-cyan-400 opacity-90" />
                    <div className="absolute -right-8 -top-12 h-44 w-44 rounded-full bg-white/25 blur-3xl animate-pulse" />
                    <div className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-fuchsia-300/30 blur-3xl" />
                    <div className="relative flex min-h-40 sm:min-h-48 flex-col justify-between p-4 sm:p-5 text-white">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                        <span>Interactive sample preview</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                          {activeMode.label} mode
                        </span>
                      </div>
                      {activeMode.id === "story" && (
                        <div className="max-w-xs rounded-xl border border-white/25 bg-black/15 p-4 shadow-xl backdrop-blur-sm">
                          <p className="text-[9px] uppercase tracking-[0.25em] text-white/70">A new chapter</p>
                          <p className="mt-1 text-xl font-black leading-tight sm:text-2xl">Stories begin with a spark.</p>
                          <div className="mt-3 h-1 w-16 rounded-full bg-amber-300" />
                        </div>
                      )}
                      {activeMode.id === "image" && (
                        <div className="flex items-end gap-3">
                          <div className="h-20 w-20 rounded-[2rem] bg-gradient-to-br from-amber-200 via-rose-300 to-fuchsia-500 shadow-2xl sm:h-24 sm:w-24" />
                          <div className="mb-2 h-14 w-14 rounded-full border border-white/50 bg-cyan-200/50 shadow-xl backdrop-blur" />
                          <div className="mb-1 rounded-xl border border-white/20 bg-black/15 px-3 py-2 text-xs font-semibold backdrop-blur">
                            Art direction · ready
                          </div>
                        </div>
                      )}
                      {activeMode.id === "video" && (
                        <div className="flex items-center gap-4">
                          <div className="grid h-14 w-14 place-items-center rounded-full border border-white/40 bg-white/15 text-sm shadow-lg backdrop-blur">
                            Play
                          </div>
                          <div className="flex-1 rounded-xl border border-white/20 bg-black/15 p-3 backdrop-blur-sm">
                            <p className="text-sm font-bold">Scene sequence</p>
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/25">
                              <div className="h-full w-2/3 rounded-full bg-cyan-200" />
                            </div>
                          </div>
                        </div>
                      )}
                      {activeMode.id === "chat" && (
                        <div className="max-w-sm space-y-2">
                          <div className="w-fit rounded-2xl rounded-bl-sm bg-white/20 px-3 py-2 text-xs backdrop-blur">Help me shape this idea…</div>
                          <div className="ml-auto w-fit rounded-2xl rounded-br-sm bg-white px-3 py-2 text-xs font-semibold text-indigo-900 shadow-lg">Let’s make it clearer and more memorable.</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="wx-well rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] wx-subtle">
                      <span>Starter Prompt</span>
                      <button
                        type="button"
                        onClick={handleCopyPrompt}
                        className="inline-flex items-center gap-1.5 wx-accent hover:opacity-80 transition-opacity font-semibold"
                      >
                        {copiedPrompt ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-500 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    {copyError && (
                      <p role="status" className="text-[11px] text-rose-500">
                        Clipboard unavailable. Select and copy the prompt manually.
                      </p>
                    )}
                    <p className="font-serif italic text-base sm:text-lg wx-ink-soft leading-relaxed">
                      “{activeMode.prompt}”
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 wx-divider-t">
                    <span className="text-xs wx-subtle">
                      Workspace: <strong className="wx-ink">{activeMode.tool}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => launchApp(activeMode.tool)}
                      style={{
                        background: "var(--wx-accent-solid)",
                        color: "var(--wx-accent-ink)",
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:opacity-90 transition-opacity"
                    >
                      Launch {activeMode.label} <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </DotJumpStage>
              </div>
            </div>
          </div>
        </section>

        <FeaturedCreations
          onOpenCommunity={() => launchApp("Community Feed")}
          onCreate={() => launchApp()}
        />

        {/* 2. STATS: Light upward rise */}
        <section className="px-4 sm:px-8 lg:px-14 py-16 sm:py-24">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {statItems.map((s, i) => (
              <div
                key={s.label}
                className="wx-anim-rise wx-panel wx-panel-lift p-5 sm:p-6 rounded-2xl"
                style={{ transitionDelay: `${i * 75}ms` }}
              >
                <div className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter wx-grad tabular-nums">
                  {s.value ?? "—"}
                </div>
                <div className="mt-2 sm:mt-3 text-[11px] sm:text-xs uppercase tracking-[0.2em] wx-subtle font-semibold">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. FEATURES: Light paper unfold on spotlight card */}
        <section id="features" className="px-4 sm:px-8 lg:px-14 pb-20 sm:pb-28 scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8 wx-anim-left">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] wx-accent mb-2 font-semibold">
                What you can make
              </p>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight wx-ink">
                Core studio engines
              </h2>
            </div>
            <p className="text-xs wx-subtle">
              Hover or select a row to preview its prompt
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 wx-divider-b">
              {FEATURES.map((f, i) => {
                const isSelected = i === activeFeatureIdx;
                return (
                  <button
                    type="button"
                    key={f.n}
                    onMouseEnter={() => handleSelectFeature(i)}
                    onFocus={() => handleSelectFeature(i)}
                    onClick={() => handleSelectFeature(i)}
                    aria-pressed={isSelected}
                    className={`wx-row wx-anim-rise w-full appearance-none bg-transparent border-0 text-left py-7 sm:py-9 px-3 sm:px-4 grid md:grid-cols-12 gap-3 sm:gap-4 items-start cursor-pointer ${
                      isSelected ? "is-active" : ""
                    }`}
                    style={{ transitionDelay: `${i * 65}ms` }}
                  >
                    <span className="md:col-span-1 text-xs sm:text-sm wx-subtle font-mono">
                      {f.n}
                    </span>
                    <div className="md:col-span-5">
                      <span className="inline-block text-[10px] uppercase tracking-[0.22em] wx-accent mb-1 font-semibold">
                        {f.badge}
                      </span>
                      <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight wx-ink">
                        {f.title}
                      </h3>
                    </div>
                    <p className="md:col-span-5 text-sm sm:text-base wx-muted leading-relaxed">
                      {f.text}
                    </p>
                    <ArrowUpRight className="wx-arrow hidden md:block md:col-span-1 justify-self-end w-5 h-5 wx-ink" />
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-4 lg:sticky lg:top-24">
              <div
                key={`paper-${activeFeature.n}-${featurePaperTick}`}
                className="wx-panel wx-paper-open rounded-3xl p-5 sm:p-6 space-y-5"
              >
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="uppercase tracking-[0.22em] wx-accent font-semibold">
                    Spotlight · {activeFeature.n}
                  </span>
                  <span
                    style={{
                      background: "var(--wx-input-bg)",
                      borderColor: "var(--wx-border)",
                      color: "var(--wx-ink-soft)",
                    }}
                    className="px-2.5 py-0.5 rounded-lg border font-medium"
                  >
                    {activeFeature.tool}
                  </span>
                </div>

                <blockquote
                  style={{ borderColor: "var(--wx-accent)" }}
                  className="font-serif italic text-base sm:text-lg wx-ink-soft leading-relaxed border-l-2 pl-4"
                >
                  {activeFeature.samplePrompt}
                </blockquote>

                <p className="text-xs wx-subtle leading-relaxed">{activeFeature.text}</p>

                <button
                  type="button"
                  onClick={() => launchApp(activeFeature.tool)}
                  style={{
                    background: "var(--wx-accent-solid)",
                    color: "var(--wx-accent-ink)",
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  Open {activeFeature.tool} <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 4. TOOLS: Light content tear + jumping dot on group switch */}
        <section id="tools" className="px-4 sm:px-8 lg:px-14 pb-20 sm:pb-28 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-12 wx-anim-rise">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] wx-accent mb-3 font-semibold">
                Every tool, organized
              </p>
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight wx-ink">
                {TOOL_COUNT} tools in five groups.
              </h2>
            </div>

            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tool groups">
              {["All", ...TOOL_GROUPS.map((g) => g.title)].map((tab) => {
                const selected = activeGroup === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => handleSelectGroup(tab)}
                    style={
                      selected
                        ? {
                            background: "var(--wx-cta-bg)",
                            color: "var(--wx-cta-ink)",
                            borderColor: "var(--wx-cta-bg)",
                          }
                        : {
                            background: "var(--wx-input-bg)",
                            color: "var(--wx-muted)",
                            borderColor: "var(--wx-border-strong)",
                          }
                    }
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors"
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          <DotJumpStage triggerKey={groupDotTick}>
            <div
              key={`groups-${activeGroup}-${groupDotTick}`}
              className={`wx-tear-soft grid sm:grid-cols-2 ${
                visibleGroups.length === 1 ? "lg:grid-cols-1 max-w-xl" : "lg:grid-cols-5"
              } gap-5 sm:gap-6`}
            >
              {visibleGroups.map((g, i) => (
                <div
                  key={g.title}
                  className="wx-panel wx-panel-lift p-5 sm:p-6 rounded-2xl"
                  style={{ transitionDelay: `${i * 50}ms` }}
                >
                  <h3
                    style={{ color: `var(${g.accentVar})` }}
                    className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] mb-5 flex items-center justify-between"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        style={{ background: `var(${g.dotVar})` }}
                        className="h-1.5 w-1.5 rounded-full"
                      />
                      {g.title}
                    </span>
                    <span className="wx-subtle font-mono text-xs">{g.tools.length}</span>
                  </h3>
                  <ul className="space-y-2">
                    {g.tools.map((t) => (
                      <li key={t}>
                        <button
                          type="button"
                          onClick={() => launchApp(t)}
                          className="text-sm wx-muted wx-link inline-flex items-center justify-between w-full text-left py-0.5 group"
                        >
                          <span>{t}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity wx-accent" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </DotJumpStage>
        </section>

        {/* 5. PROCESS: Light slide from right */}
        <section id="workflow" className="px-4 sm:px-8 lg:px-14 pb-20 sm:pb-28 scroll-mt-24">
          <p className="text-xs uppercase tracking-[0.3em] wx-accent mb-8 sm:mb-10 wx-anim-right font-semibold">
            How it works
          </p>
          <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.n}
                  className="wx-anim-right wx-panel wx-panel-lift p-6 sm:p-7 rounded-2xl"
                  style={{ transitionDelay: `${i * 85}ms` }}
                >
                  <div className="flex items-center justify-between wx-subtle">
                    <span className="text-xs font-mono tracking-widest uppercase">
                      Step {s.n}
                    </span>
                    <Icon className="w-4 h-4 wx-accent" />
                  </div>
                  <h3 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight wx-ink">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-sm sm:text-base wx-muted leading-relaxed">
                    {s.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. REVIEWS: Light scale-in */}
        {reviews.length > 0 && (
          <section id="reviews" className="px-4 sm:px-8 lg:px-14 pb-20 sm:pb-28 scroll-mt-24">
            <p className="text-xs uppercase tracking-[0.3em] wx-accent mb-8 sm:mb-10 wx-anim-scale font-semibold">
              In their words
            </p>
            <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
              {reviews.map((r, i) => (
                <figure
                  key={r.id || i}
                  className="wx-anim-scale wx-panel wx-panel-lift p-6 sm:p-7 rounded-2xl flex flex-col justify-between"
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <blockquote className="font-serif italic text-lg sm:text-2xl leading-snug wx-ink-soft">
                    “{r.comment}”
                  </blockquote>
                  <figcaption className="mt-6 pt-4 wx-divider-t text-xs uppercase tracking-[0.2em] wx-subtle flex items-center justify-between">
                    <span>{r.name}</span>
                    <span className="text-amber-500">
                      {"★".repeat(Math.min(5, Math.max(1, Number(r.rating) || 5)))}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* CLOSING: Light scale-in */}
        <section className="px-4 sm:px-8 lg:px-14 pt-14 sm:pt-18 pb-24 sm:pb-28 wx-divider-t">
          <h2 className="text-4xl sm:text-7xl lg:text-8xl font-black tracking-[-0.045em] leading-[0.94] wx-ink wx-anim-scale">
            Your next idea
            <br />
            starts <span className="wx-grad">here.</span>
          </h2>
          <div className="mt-10 sm:mt-12 wx-anim-scale" style={{ transitionDelay: "90ms" }}>
            <button
              type="button"
              onClick={() => launchApp()}
              disabled={leaving}
              aria-busy={leaving}
              className="wx-cta rounded-xl inline-flex items-center gap-3 px-7 sm:px-9 py-4 sm:py-5 text-base sm:text-lg font-black"
            >
              Enter PlotCraft <ArrowUpRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        </>)}
        {route !== "home" && (
          <RoutePage route={route} onBack={() => goRoute("home")} onLaunch={(name) => launchApp(name)} reviews={reviews} />
        )}
        <footer className="px-4 sm:px-8 lg:px-14 py-8 wx-divider-t flex flex-wrap justify-between gap-4 text-xs wx-subtle">
          <span>
            Designed and developed by <span className="wx-ink font-medium">K.Ganesh</span>
          </span>
          <span>Imagine · Create · Learn · Discover</span>
        </footer>
      </div>

      {wipeKey > 0 && (
        <>
          <style>{WXP_CSS}</style>
          <div key={wipeKey} aria-hidden="true" className="wxp-wipe" />
        </>
      )}

      <div
        className={`wx-launch-overlay ${leaving ? "is-active" : ""}`}
        aria-hidden={!leaving}
        role={leaving ? "status" : undefined}
        aria-live={leaving ? "polite" : undefined}
      >
        <div className="wx-launch-content">
          <div className="wx-launch-mark" aria-hidden="true"><Sparkles size={25} /></div>
          <p className="wx-launch-title">Opening your studio</p>
          <p className="wx-launch-subtitle">Getting your creative workspace ready</p>
          <div className="wx-launch-track" aria-hidden="true"><span /></div>
        </div>
      </div>

      <div className="fixed bottom-4 left-4 z-[80] sm:bottom-6 sm:left-6">
        {copilotOpen && (
          <section
            id="copilot-panel"
            aria-label="PlotCraft Muse"
            className="mb-3 w-[min(22rem,calc(100vw-2rem))] rounded-3xl border p-4 shadow-2xl backdrop-blur-xl sm:p-5"
            style={{
              background: "var(--wx-panel-bg)",
              borderColor: "var(--wx-border-strong)",
              color: "var(--wx-ink)",
            }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-black">
                  <Sparkles className="h-4 w-4 wx-accent" /> PlotCraft Muse
                </p>
                <p className="mt-1 text-xs wx-muted">Describe it and Muse will start creating in the right workspace.</p>
              </div>
              <button
                type="button"
                onClick={() => setCopilotOpen(false)}
                aria-label="Close PlotCraft Muse"
                className="rounded-lg p-1.5 wx-muted hover:wx-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCopilotSubmit}>
              <label htmlFor="copilot-prompt" className="sr-only">What do you want to create?</label>
              <textarea
                id="copilot-prompt"
                rows={3}
                value={copilotPrompt}
                onChange={(event) => {
                  setCopilotPrompt(event.target.value);
                }}
                placeholder="e.g. Create a Telugu horror story…"
                className="w-full resize-none rounded-2xl border px-3.5 py-3 text-sm outline-none"
                style={{
                  background: "var(--wx-well-bg)",
                  borderColor: "var(--wx-border)",
                  color: "var(--wx-ink)",
                }}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <VoiceInputButton
                  onTranscript={(transcript) => {
                    setCopilotPrompt((current) => [current.trim(), transcript].filter(Boolean).join(" "));
                    setVoiceReplies(true);
                  }}
                  className="wx-muted"
                />
                <button
                  type="button"
                  aria-pressed={voiceReplies}
                  disabled={!isSpeechSupported()}
                  onClick={() => setVoiceReplies((enabled) => !enabled)}
                  className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ borderColor: "var(--wx-border)" }}
                  title={isSpeechSupported() ? "Speak AI Chat replies aloud" : "Spoken replies are not supported in this browser"}
                >
                  {voiceReplies ? <Volume2 className="h-4 w-4 wx-accent" /> : <VolumeX className="h-4 w-4" />}
                  Speak replies {voiceReplies ? "on" : "off"}
                </button>
              </div>
              <button
                type="submit"
                disabled={!copilotPrompt.trim()}
                className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "var(--wx-accent-solid)", color: "var(--wx-accent-ink)" }}
              >
                Create with Muse
              </button>
            </form>
            <p className="mt-2 text-[10px] leading-relaxed wx-subtle">
              Stories, images and videos start automatically (sign-in may be required). Song prompts create lyrics; photo edits need a source file.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["Telugu horror story", "YouTube thumbnail", "Telugu song"].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => selectCopilotExample(example)}
                  className="rounded-full border px-2.5 py-1 text-[10px] font-semibold wx-muted hover:wx-ink"
                  style={{ borderColor: "var(--wx-border)" }}
                >
                  {example}
                </button>
              ))}
            </div>
            {copilotTarget && (
              <p className="mt-3 text-xs font-semibold wx-accent">
                Ready for {copilotTarget}
              </p>
            )}
          </section>
        )}
        <button
          type="button"
          aria-expanded={copilotOpen}
          aria-controls="copilot-panel"
          onClick={() => setCopilotOpen((open) => !open)}
          className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-black shadow-xl transition-transform hover:-translate-y-0.5"
          style={{ background: "var(--wx-accent-solid)", color: "var(--wx-accent-ink)" }}
        >
          <Sparkles className="h-4 w-4" />
          {copilotOpen ? "Close Muse" : "Ask PlotCraft Muse"}
        </button>
      </div>
    </div>
  );
}