import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Copy, Check, RefreshCw, X, Palette, Keyboard, Wand2 } from "lucide-react";

/* ============ FX layer: aurora light-leak, film grain, cursor aura, spotlight cards,
   scroll reveal, shimmer text, ink underline. Colors follow the active theme's CSS vars. ============ */
const FX_CSS = `
.pcfx-root{--fx-a:var(--pc-accent,var(--wx-accent,#7c3aed));--fx-b:var(--pc-accent-2,#d946ef);--fx-c:#22d3ee;--fx-surface:rgba(255,255,255,.94);--fx-ink:#172033;--fx-muted:#64748b;--fx-line:rgba(15,23,42,.12);--fx-ease:cubic-bezier(.16,1,.3,1);}
.pcfx-dark{--fx-surface:rgba(15,20,36,.93);--fx-ink:#f1f5f9;--fx-muted:#94a3b8;--fx-line:rgba(255,255,255,.12);}

.pcfx-aurora{position:fixed;inset:-25%;pointer-events:none;z-index:1;mix-blend-mode:soft-light;opacity:.5;
  background:
    radial-gradient(38% 32% at 22% 28%,var(--fx-a),transparent 70%),
    radial-gradient(34% 28% at 80% 22%,var(--fx-b),transparent 70%),
    radial-gradient(44% 36% at 62% 86%,var(--fx-c),transparent 70%);
  animation:fxDrift 28s var(--fx-ease) infinite alternate;}
.pcfx-dark .pcfx-aurora{mix-blend-mode:screen;opacity:.26;}
@keyframes fxDrift{0%{transform:translate3d(-3%,-2%,0) rotate(0deg) scale(1)}50%{transform:translate3d(2%,3%,0) rotate(7deg) scale(1.07)}100%{transform:translate3d(-1%,4%,0) rotate(-4deg) scale(1)}}

.pcfx-grain{position:fixed;inset:0;pointer-events:none;z-index:2;opacity:.05;mix-blend-mode:multiply;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");}
.pcfx-dark .pcfx-grain{mix-blend-mode:overlay;opacity:.09;}

.pcfx-aura{position:fixed;left:0;top:0;width:360px;height:360px;border-radius:50%;pointer-events:none;z-index:3;will-change:transform;
  background:radial-gradient(circle,color-mix(in srgb,var(--fx-a) 16%,transparent),transparent 62%);}
@media (hover:none){.pcfx-aura{display:none}}

.pcfx-spot{position:relative;isolation:isolate;}
.pcfx-spot::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;opacity:0;z-index:0;
  transition:opacity .5s var(--fx-ease);
  background:radial-gradient(260px circle at var(--mx,50%) var(--my,50%),color-mix(in srgb,var(--fx-a) 20%,transparent),transparent 70%);}
.pcfx-spot:hover::after{opacity:1;}
.pcfx-spot>*{position:relative;z-index:1;}

.pcfx-reveal{opacity:0;transform:translateY(22px);filter:blur(6px);
  transition:opacity .9s var(--fx-ease),transform .9s var(--fx-ease),filter .9s var(--fx-ease);}
.pcfx-reveal.is-in{opacity:1;transform:none;filter:none;}

.pcfx-shimmer{background:linear-gradient(100deg,var(--fx-a) 0%,var(--fx-b) 35%,#ffffff 50%,var(--fx-b) 65%,var(--fx-a) 100%);
  background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:fxShine 6s linear infinite;}
@keyframes fxShine{from{background-position:120% 0}to{background-position:-120% 0}}

.pcfx-ink{background:linear-gradient(var(--fx-a),var(--fx-a)) 0 100%/0 2px no-repeat;transition:background-size .6s var(--fx-ease);}
.pcfx-ink:hover{background-size:100% 2px;}

.pcfx-dock-btn{position:fixed;right:20px;bottom:20px;z-index:60;width:52px;height:52px;border-radius:18px;border:1px solid rgba(255,255,255,.25);
  background:linear-gradient(135deg,var(--fx-a),var(--fx-b));color:#fff;display:grid;place-items:center;cursor:pointer;
  box-shadow:0 14px 34px -10px color-mix(in srgb,var(--fx-a) 60%,transparent);transition:box-shadow .5s var(--fx-ease);}
.pcfx-dock-btn:hover{box-shadow:0 22px 44px -12px color-mix(in srgb,var(--fx-a) 75%,transparent);}
.pcfx-dock-btn svg{transition:transform .6s var(--fx-ease);}
.pcfx-dock-btn:hover svg{transform:rotate(18deg) scale(1.1);}

.pcfx-panel{position:fixed;right:20px;bottom:84px;z-index:61;width:min(370px,calc(100vw - 40px));border-radius:24px;padding:18px;
  background:var(--fx-surface);color:var(--fx-ink);border:1px solid var(--fx-line);
  backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 30px 80px -20px rgba(15,23,42,.35);
  animation:fxRise .55s var(--fx-ease) both;font-family:inherit;}
@keyframes fxRise{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
.pcfx-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.pcfx-title{font-size:13px;font-weight:800;letter-spacing:.02em;}
.pcfx-x{background:none;border:0;color:var(--fx-muted);cursor:pointer;padding:4px;border-radius:8px;}
.pcfx-tabs{display:flex;gap:6px;margin-bottom:14px;}
.pcfx-tab{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 6px;border-radius:12px;border:1px solid var(--fx-line);
  background:transparent;color:var(--fx-muted);font-size:12px;font-weight:700;cursor:pointer;transition:all .45s var(--fx-ease);}
.pcfx-tab.on{background:linear-gradient(135deg,var(--fx-a),var(--fx-b));color:#fff;border-color:transparent;}
.pcfx-quote{font-family:Georgia,"Iowan Old Style",serif;font-style:italic;font-size:17px;line-height:1.5;min-height:96px;margin-bottom:14px;
  animation:fxRise .6s var(--fx-ease) both;}
.pcfx-row{display:flex;gap:8px;}
.pcfx-btn{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px;border-radius:12px;border:1px solid var(--fx-line);
  background:transparent;color:var(--fx-ink);font-size:12px;font-weight:700;cursor:pointer;transition:transform .35s var(--fx-ease),background .35s ease;}
.pcfx-btn:hover{transform:translateY(-2px);background:color-mix(in srgb,var(--fx-a) 12%,transparent);}
.pcfx-btn:active{transform:scale(.97);}
.pcfx-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.pcfx-chip{padding:5px 10px;border-radius:999px;border:1px solid var(--fx-line);background:transparent;color:var(--fx-muted);font-size:11px;font-weight:700;cursor:pointer;transition:all .35s var(--fx-ease);}
.pcfx-chip.on{color:var(--fx-ink);border-color:var(--fx-a);box-shadow:0 0 0 3px color-mix(in srgb,var(--fx-a) 18%,transparent);}
.pcfx-swatches{display:flex;gap:6px;margin-bottom:10px;}
.pcfx-swatch{flex:1;height:78px;border-radius:14px;border:0;cursor:pointer;position:relative;transition:transform .55s var(--fx-ease),flex .55s var(--fx-ease);}
.pcfx-swatch:hover{transform:translateY(-5px);flex:1.35;}
.pcfx-swatch span{position:absolute;left:6px;bottom:6px;font:700 9px/1 ui-monospace,monospace;padding:3px 5px;border-radius:6px;background:rgba(0,0,0,.5);color:#fff;opacity:0;transition:opacity .3s;}
.pcfx-swatch:hover span{opacity:1;}
.pcfx-keys{display:grid;gap:8px;}
.pcfx-key{display:flex;align-items:center;justify-content:space-between;font-size:13px;color:var(--fx-ink);}
.pcfx-key kbd{font:700 11px ui-monospace,monospace;padding:4px 8px;border-radius:8px;border:1px solid var(--fx-line);background:color-mix(in srgb,var(--fx-a) 8%,transparent);}
.pcfx-muted{font-size:11px;color:var(--fx-muted);margin-top:10px;}
@media (prefers-reduced-motion:reduce){.pcfx-root *,.pcfx-root{animation:none!important;transition:none!important;}.pcfx-reveal{opacity:1;transform:none;filter:none;}}
`;

const SPARKS = [
  "A lighthouse keeper finds a letter addressed to a ship that sank in 1902.",
  "Every morning, a city's clocks run five minutes slower. Nobody remembers why.",
  "A street vendor sells one thing only: other people's forgotten sounds.",
  "Two rival bakers must cook one shared dish before the monsoon floods the market.",
  "A robot gardener discovers a seed that only grows when someone tells it a lie.",
  "The last train of the night keeps stopping at a station that isn't on the map.",
  "A child's drawing predicts a storm — and the child is the only one who can stop it.",
  "An astronaut receives a voicemail from her own voice, recorded ten years from now.",
  "A cursed mirror shows the room as it was a hundred years ago, one reflection at a time.",
  "A village festival where every mask reveals a secret the wearer has never told.",
  "A detective solves crimes by tasting the weather. Today, she tastes betrayal.",
  "A library book keeps rewriting its last page to match the reader's worst fear.",
];

const MOODS = [
  { name: "Monsoon Dusk", colors: ["#1e3a5f", "#4a6fa5", "#9bb7d4", "#f2c6a0", "#e8875e"] },
  { name: "Neon Temple", colors: ["#0b0f2a", "#5b21b6", "#d946ef", "#22d3ee", "#fde68a"] },
  { name: "Old Paper", colors: ["#f5efe0", "#d8c9a8", "#8a6d4b", "#3b2f25", "#b5523b"] },
  { name: "Sea Glass", colors: ["#e6f4f1", "#9ed9cc", "#3aa39a", "#1d5c63", "#f4b393"] },
  { name: "Ember Night", colors: ["#140b0b", "#7f1d1d", "#ef4444", "#fb923c", "#fef3c7"] },
];

const SHORTCUTS = [
  ["?", "Open or close this dock"],
  ["Esc", "Close panels"],
  ["Click swatch", "Copy hex color"],
  ["Spark ↻", "New story prompt"],
];

const pickSpark = (current) => {
  let next = SPARKS[Math.floor(Math.random() * SPARKS.length)];
  if (next === current && SPARKS.length > 1) next = SPARKS[(SPARKS.indexOf(current) + 1) % SPARKS.length];
  return next;
};

export default function PlotCraftFX({ dark = false }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("spark");
  const [spark, setSpark] = useState(() => SPARKS[0]);
  const [mood, setMood] = useState(0);
  const [copied, setCopied] = useState("");
  const auraRef = useRef(null);
  const target = useRef({ x: -400, y: -400 });
  const pos = useRef({ x: -400, y: -400 });
  const copyTimer = useRef(null);

  useEffect(() => {
    setSpark(pickSpark(""));
    const coarse = typeof window.matchMedia === "function" && window.matchMedia("(hover: none)").matches;
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    const onMove = (e) => {
      target.current = { x: e.clientX, y: e.clientY };
      const el = e.target && e.target.closest ? e.target.closest(".pcfx-spot") : null;
      if (el) {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      }
    };
    const tick = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.16;
      pos.current.y += (target.current.y - pos.current.y) * 0.16;
      if (auraRef.current) {
        auraRef.current.style.transform = `translate3d(${pos.current.x - 180}px, ${pos.current.y - 180}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    if (!coarse && !reduce) {
      window.addEventListener("pointermove", onMove, { passive: true });
      raf = requestAnimationFrame(tick);
    }

    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      }),
      { threshold: 0.12 }
    );
    const scan = () => document.querySelectorAll(".pcfx-reveal:not(.is-in)").forEach((el) => io.observe(el));
    scan();
    let queued = false;
    const mo = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; scan(); });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    const onKey = (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable;
      if (typing) return;
      if (e.key === "?") setOpen((o) => !o);
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
      io.disconnect();
      mo.disconnect();
      clearTimeout(copyTimer.current);
    };
  }, []);

  const copy = async (text, key) => {
    try { await navigator.clipboard?.writeText(text); } catch { /* clipboard blocked */ }
    setCopied(key);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(""), 1400);
  };

  const current = MOODS[mood];

  return (
    <div className={`pcfx-root ${dark ? "pcfx-dark" : ""}`}>
      <style>{FX_CSS}</style>
      <div className="pcfx-aurora" aria-hidden="true" />
      <div className="pcfx-grain" aria-hidden="true" />
      <div ref={auraRef} className="pcfx-aura" aria-hidden="true" />

      <button
        type="button"
        className="pcfx-dock-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open Spark dock"
        title="Spark dock (?)"
      >
        <Sparkles size={20} />
      </button>

      {open && (
        <div className="pcfx-panel" role="dialog" aria-label="Spark dock">
          <div className="pcfx-head">
            <span className="pcfx-title">✦ Spark Dock</span>
            <button type="button" className="pcfx-x" onClick={() => setOpen(false)} aria-label="Close"><X size={16} /></button>
          </div>

          <div className="pcfx-tabs">
            <button type="button" className={`pcfx-tab ${tab === "spark" ? "on" : ""}`} onClick={() => setTab("spark")}><Wand2 size={13} />Spark</button>
            <button type="button" className={`pcfx-tab ${tab === "palette" ? "on" : ""}`} onClick={() => setTab("palette")}><Palette size={13} />Palette</button>
            <button type="button" className={`pcfx-tab ${tab === "keys" ? "on" : ""}`} onClick={() => setTab("keys")}><Keyboard size={13} />Keys</button>
          </div>

          {tab === "spark" && (
            <>
              <p key={spark} className="pcfx-quote">“{spark}”</p>
              <div className="pcfx-row">
                <button type="button" className="pcfx-btn" onClick={() => setSpark((s) => pickSpark(s))}>
                  <RefreshCw size={13} /> New spark
                </button>
                <button type="button" className="pcfx-btn" onClick={() => copy(spark, "spark")}>
                  {copied === "spark" ? <Check size={13} /> : <Copy size={13} />}
                  {copied === "spark" ? "Copied" : "Copy"}
                </button>
              </div>
            </>
          )}

          {tab === "palette" && (
            <>
              <div className="pcfx-chips">
                {MOODS.map((m, i) => (
                  <button key={m.name} type="button" className={`pcfx-chip ${i === mood ? "on" : ""}`} onClick={() => setMood(i)}>{m.name}</button>
                ))}
              </div>
              <div className="pcfx-swatches">
                {current.colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="pcfx-swatch"
                    style={{ background: c }}
                    onClick={() => copy(c, c)}
                    aria-label={`Copy ${c}`}
                  >
                    <span>{copied === c ? "copied" : c}</span>
                  </button>
                ))}
              </div>
              <div className="pcfx-row">
                <button type="button" className="pcfx-btn" onClick={() => setMood((m) => (m + 1) % MOODS.length)}>
                  <RefreshCw size={13} /> Next mood
                </button>
              </div>
              <p className="pcfx-muted">Hover a swatch to see its hex. Click to copy.</p>
            </>
          )}

          {tab === "keys" && (
            <div className="pcfx-keys">
              {SHORTCUTS.map(([k, label]) => (
                <div key={k} className="pcfx-key"><span>{label}</span><kbd>{k}</kbd></div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}