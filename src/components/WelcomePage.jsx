import React, { useEffect, useMemo, useRef, useState } from "react";
import PlotCraftFX from "./PlotCraftFX";
import PlotCraftDesign from "./PlotCraftDesign";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Layers,
  Moon,
  Search,
  Share2,
  Sparkles,
  Sun,
  X,
  Zap,
} from "lucide-react";

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
  const [phase, setPhase] = useState("idle"); // 'idle' | 'jumping' | 'shown'

  useEffect(() => {
    if (triggerKey === 0) {
      setPhase("shown");
      return;
    }
    setPhase("jumping");
    const t = setTimeout(() => {
      setPhase("shown");
    }, 340);
    return () => clearTimeout(t);
  }, [triggerKey]);

  return (
    <div className={`relative ${className}`}>
      {phase === "jumping" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
        >
          <span className="wx-dot-hopper" />
        </div>
      )}
      <div
        className={
          phase === "jumping"
            ? "wx-dot-wait"
            : triggerKey > 0
            ? "wx-dot-reveal"
            : ""
        }
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
`;

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
  const [spot, setSpot] = useState({ x: -999, y: -999, visible: false });

  const rootRef = useRef(null);
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
      const isTyping = tag === "input" || tag === "textarea";

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setNavSearchOpen(true);
        navInputRef.current?.focus();
        return;
      }

      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping) {
        e.preventDefault();
        setNavSearchOpen(true);
        navInputRef.current?.focus();
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
  }, [activeGroup, reviews.length]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    setRippleKey((k) => k + 1);
  };

  const launchApp = (toolName = null) => {
    if (leaving) return;
    setNavSearchOpen(false);
    setLeaving(true);
    navTimerRef.current = setTimeout(() => {
      if (toolName && typeof onSelectTool === "function") {
        onSelectTool(toolName);
      } else if (typeof onExplore === "function") {
        onExplore(toolName || undefined);
      }
    }, 480);
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleMouseMove = (e) => {
    setSpot({ x: e.clientX, y: e.clientY, visible: true });
  };

  const handleMouseLeave = () => {
    setSpot((prev) => ({ ...prev, visible: false }));
  };

  const handleSelectMode = (id) => {
    if (id === activeModeId) return;
    setActiveModeId(id);
    setModeDotTick((t) => t + 1);
    setCopiedPrompt(false);
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

  const handleCopyPrompt = () => {
    if (!activeMode?.prompt || typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(activeMode.prompt)
      .then(() => {
        setCopiedPrompt(true);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopiedPrompt(false), 1800);
      })
      .catch(() => {});
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

  useEffect(() => {
    setActiveResultIdx(0);
  }, [trimmedQuery]);

  const handleSearchKeyDown = (e) => {
    if (!matchedTools.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveResultIdx((prev) => (prev + 1) % matchedTools.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveResultIdx((prev) => (prev - 1 + matchedTools.length) % matchedTools.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = matchedTools[activeResultIdx] || matchedTools[0];
      if (target) launchApp(target.name);
    }
  };

  const visibleGroups = useMemo(() => {
    if (activeGroup === "All") return TOOL_GROUPS;
    return TOOL_GROUPS.filter((g) => g.title === activeGroup);
  }, [activeGroup]);

  const statItems = [
    { label: "Stories written", value: stats?.stories },
    { label: "Creators", value: stats?.creators },
    { label: "Chats saved", value: stats?.chats },
    {
      label: "Average rating",
      value: stats && stats.reviews ? Number(stats.rating).toFixed(1) : null,
    },
  ];

  const marqueeRow = useMemo(() => [...ALL_TOOLS, ...ALL_TOOLS], []);
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
        aria-hidden="true"
        className="wx-spotlight"
        style={{
          left: `${spot.x}px`,
          top: `${spot.y}px`,
          opacity: spot.visible ? 1 : 0,
        }}
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
          <div className="flex items-center justify-between gap-3 sm:gap-5">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
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
                      matchedTools.slice(0, 7).map((item, idx) => {
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
              <button type="button" onClick={() => scrollTo("features")} className="wx-link">
                Features
              </button>
              <button type="button" onClick={() => scrollTo("tools")} className="wx-link">
                Tools
              </button>
              <button type="button" onClick={() => scrollTo("workflow")} className="wx-link">
                Workflow
              </button>
              {reviews.length > 0 && (
                <button type="button" onClick={() => scrollTo("reviews")} className="wx-link">
                  Reviews
                </button>
              )}
            </nav>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => launchApp()}
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
                Write stories, generate images and videos, compose audio, and brainstorm with an AI
                assistant.{" "}
                <span className="wx-ink font-semibold">{TOOL_COUNT} tools</span> in one
                unified studio with automatic project saving.
              </p>

              <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                <button
                  type="button"
                  onClick={() => launchApp()}
                  className="wx-cta rounded-xl inline-flex items-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-black"
                >
                  Start creating <ArrowUpRight className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo("tools")}
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
                    onChange={(e) => setQuery(e.target.value)}
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
                        onClick={() => setQuery(active ? "" : q)}
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
                    matchedTools.slice(0, 5).map((item) => (
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
                        onClick={() => setQuery("")}
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
            <div className="lg:col-span-6">
              <div className="wx-panel rounded-3xl p-5 sm:p-7 space-y-6">
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

        {/* 1. QUICK OVERVIEW: Light slide from left */}
        <section className="px-4 sm:px-8 lg:px-14 py-16 sm:py-24 wx-divider-t">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10">
            <div className="lg:col-span-3 wx-anim-left">
              <p className="text-xs uppercase tracking-[0.3em] wx-subtle font-semibold">In short</p>
              <div className="mt-3 inline-flex items-center gap-2 text-xs wx-accent font-medium">
                <Layers className="w-3.5 h-3.5" /> Unified Creative Workspace
              </div>
            </div>

            <div className="lg:col-span-9 space-y-8 sm:space-y-10 wx-anim-left" style={{ transitionDelay: "90ms" }}>
              <p className="text-xl sm:text-3xl lg:text-4xl font-semibold leading-snug tracking-tight wx-ink">
                PlotCraft.AI brings storytelling, visuals, video, audio, and learning into one
                studio—backed by an AI assistant that remembers your context.
              </p>

              <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 text-sm wx-muted leading-relaxed">
                <div className="wx-panel wx-panel-lift p-5 sm:p-6 rounded-2xl">
                  <div className="wx-accent font-black tracking-wide mb-2">1 · Pick</div>
                  Choose a tool across five organized groups, or search by keyword.
                </div>
                <div className="wx-panel wx-panel-lift p-5 sm:p-6 rounded-2xl">
                  <div className="wx-accent font-black tracking-wide mb-2">2 · Create</div>
                  Write, draw, design, or generate. Every draft stays organized in Projects.
                </div>
                <div className="wx-panel wx-panel-lift p-5 sm:p-6 rounded-2xl">
                  <div className="wx-accent font-black tracking-wide mb-2">3 · Share</div>
                  Publish to the Community, collect likes and feedback, and leave a review.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TOOL MARQUEE */}
        <section
          className="wx-marquee-wrap py-7 sm:py-9 space-y-3 sm:space-y-4 wx-divider-y overflow-hidden"
          aria-label="Tools marquee"
        >
          {[false, true].map((rev, row) => (
            <div
              key={row}
              className={`wx-marquee ${rev ? "rev" : ""} gap-8 sm:gap-10 whitespace-nowrap text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight wx-ink opacity-80`}
            >
              {marqueeRow.map((t, i) => (
                <button
                  key={`${row}-${i}`}
                  type="button"
                  onClick={() => launchApp(t.name)}
                  className="inline-flex items-center gap-8 sm:gap-10 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <span>{t.name}</span>
                  <span className="wx-accent text-xl sm:text-2xl" aria-hidden="true">
                    ✦
                  </span>
                </button>
              ))}
            </div>
          ))}
        </section>

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
                  <div
                    key={f.n}
                    onMouseEnter={() => handleSelectFeature(i)}
                    onClick={() => handleSelectFeature(i)}
                    className={`wx-row wx-anim-rise py-7 sm:py-9 px-3 sm:px-4 grid md:grid-cols-12 gap-3 sm:gap-4 items-start cursor-pointer ${
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
                  </div>
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
                      {"★".repeat(Math.max(1, Number(r.rating) || 5))}
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
              className="wx-cta rounded-xl inline-flex items-center gap-3 px-7 sm:px-9 py-4 sm:py-5 text-base sm:text-lg font-black"
            >
              Enter PlotCraft <ArrowUpRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        <footer className="px-4 sm:px-8 lg:px-14 py-8 wx-divider-t flex flex-wrap justify-between gap-4 text-xs wx-subtle">
          <span>
            Designed and developed by <span className="wx-ink font-medium">K.Ganesh</span>
          </span>
          <span>Imagine · Create · Learn · Discover</span>
        </footer>
      </div>

      {/* Smooth exit fade into the app */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-50 pointer-events-none transition-opacity duration-500"
        style={{ background: isLight ? "#faf9fc" : "#07050c", opacity: leaving ? 1 : 0 }}
      />
    </div>
  );
} 