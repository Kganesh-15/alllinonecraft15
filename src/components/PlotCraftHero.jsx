import React, { useEffect, useState } from "react";
import { ArrowUpRight, Play, Sparkles, Download, Check } from "lucide-react";

/* PlotCraft animated editor hero.
   A live mock timeline: playhead, karaoke captions, clip reveals, transition nodes,
   effect chips that light up in sequence, and a headline that rotates. */

const LOOP_MS = 12000;
const WORDS = ["Create", "stunning", "studio", "videos", "in", "seconds."];

const CLIPS = [
  { t: "Intro", s: 0.0, e: 0.18, c: "#7c3aed", scene: "#7c3aed" },
  { t: "Talk A", s: 0.18, e: 0.42, c: "#db2777", scene: "#db2777" },
  { t: "B-roll", s: 0.42, e: 0.6, c: "#0ea5e9", scene: "#0ea5e9" },
  { t: "Talk B", s: 0.6, e: 0.82, c: "#f59e0b", scene: "#f59e0b" },
  { t: "Outro", s: 0.82, e: 1.0, c: "#84cc16", scene: "#84cc16" },
];

/* Transitions sit on clip boundaries. */
const TRANSITIONS = [
  { at: 0.18, kind: "Dissolve", c: "#c4b5fd" },
  { at: 0.42, kind: "Whip", c: "#67e8f9" },
  { at: 0.6, kind: "Zoom", c: "#fde68a" },
  { at: 0.82, kind: "Flash", c: "#f9a8d4" },
];

/* Effects light up one after another across the loop. */
const EFFECTS = [
  { label: "Chapter Title", c: "#a855f7", from: 0.0 },
  { label: "Text Burst", c: "#ec4899", from: 0.25 },
  { label: "Zoom Cut", c: "#84cc16", from: 0.5 },
  { label: "Beat Sync", c: "#22d3ee", from: 0.75 },
];

const TRACKS = ["V1", "T1", "A1", "FX"];
const TEXT_BOXES = [
  { row: "T1", left: 6, width: 30, label: "Chapter title", c: "#fde68a", from: 0.04, to: 0.3 },
  { row: "T1", left: 58, width: 22, label: "Text burst", c: "#f9a8d4", from: 0.5, to: 0.72 },
];
const FX_BOXES = [
  { row: "FX", left: 30, width: 18, label: "Zoom cut", c: "#67e8f9", from: 0.44, to: 0.62 },
  { row: "FX", left: 72, width: 20, label: "Beat sync", c: "#22d3ee", from: 0.8, to: 0.98 },
];

const WAVE = Array.from({ length: 84 }, (_, i) =>
  18 + Math.abs(Math.sin(i * 0.47) * Math.cos(i * 0.19)) * 70 + ((i * 7) % 11)
);

const pad = (n) => String(n).padStart(2, "0");
const inRange = (p, a, b) => p >= a && p < b;

export default function PlotCraftHero({ onStart, onDemo }) {
  const [reduce] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
  const [p, setP] = useState(0.12);
  const [hoverFx, setHoverFx] = useState(-1);

  // Smooth playhead driven by requestAnimationFrame (throttled to ~20fps state updates).
  useEffect(() => {
    if (reduce) return undefined;
    let raf = 0;
    let last = 0;
    const start = performance.now() - 0.12 * LOOP_MS;
    const tick = (t) => {
      if (t - last > 50) {
        last = t;
        setP(((performance.now() - start) % LOOP_MS) / LOOP_MS);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  const litWords = Math.min(WORDS.length, Math.floor(p * WORDS.length * 1.15) + 1);
  const secs = p * (LOOP_MS / 1000);
  const timecode = `00:${pad(Math.floor(secs / 60))}:${pad(Math.floor(secs % 60))}:${pad(Math.floor((secs % 1) * 30))}`;
  const renderPct = Math.min(100, Math.round(p * 100));

  const activeClip = CLIPS.find((c) => inRange(p, c.s, c.e)) || CLIPS[0];
  const activeFx = hoverFx >= 0 ? hoverFx : Math.min(EFFECTS.length - 1, Math.floor(p * EFFECTS.length));
  const nearTransition = TRANSITIONS.findIndex((t) => Math.abs(p - t.at) < 0.025);
  const isSpeaking = activeClip.t.startsWith("Talk");

  return (
    <section className="eh-root" aria-label="PlotCraft editor preview">
      <style>{`
        .eh-root { position: relative; isolation: isolate; overflow: hidden; border-radius: 30px; color: #e5e7eb;
          background: #06060b; border: 1px solid rgba(255,255,255,.08); padding: clamp(22px, 4vw, 44px);
          box-shadow: 0 40px 120px -40px rgba(124,58,237,.5); }
        .eh-root::before { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
          background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
          background-size: 42px 42px; mask-image: radial-gradient(ellipse at 70% 40%, #000 30%, transparent 75%); }
        .eh-glow { position: absolute; z-index: -1; border-radius: 50%; filter: blur(80px); opacity: .55; pointer-events: none; animation: ehFloat 16s ease-in-out infinite alternate; }
        .eh-grid { display: grid; gap: 30px; align-items: center; }
        @media (min-width: 1100px) { .eh-grid { grid-template-columns: .85fr 1.35fr; } }

        .eh-pill { display: inline-flex; align-items: center; gap: 8px; padding: 7px 13px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06); font-size: 11px; font-weight: 800;
          letter-spacing: .12em; text-transform: uppercase; animation: ehUp .8s cubic-bezier(.16,1,.3,1) both; }
        .eh-stats { list-style: none; margin: 22px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 10px; animation: ehUp .9s .28s cubic-bezier(.16,1,.3,1) both; }
        .eh-stats li { display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; color: #e5e7eb; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); transition: transform .35s cubic-bezier(.16,1,.3,1), background .3s ease; }
        .eh-stats li:hover { transform: translateY(-2px); background: rgba(255,255,255,.12); }
        .eh-stats b { color: #fde68a; font-weight: 900; }
        .eh-h1 { margin-top: 20px; font-size: clamp(2.4rem, 5vw, 4.3rem); font-weight: 900; line-height: 1.02; letter-spacing: -0.04em; animation: ehUp .9s .08s cubic-bezier(.16,1,.3,1) both; }
        .eh-grad { background: linear-gradient(100deg, #c4b5fd 0%, #f9a8d4 40%, #fde68a 70%, #bae6fd 100%); -webkit-background-clip: text; background-clip: text; color: transparent; background-size: 200% 100%; animation: ehUp .9s .16s cubic-bezier(.16,1,.3,1) both, ehShine 7s linear infinite; }
        .eh-rot-unused { display: block; font-size: 22px; line-height: 1.4; height: 1.4em; overflow: hidden; margin-top: 6px; padding-bottom: 2px; }
        .eh-rot span { display: inline-block; color: #e9d5ff; font-weight: 800; font-size: inherit; line-height: 1.4; animation: ehRotIn .7s cubic-bezier(.16,1,.3,1) both; }
        .eh-sub { margin-top: 18px; max-width: 520px; font-size: 15px; line-height: 1.7; color: rgba(229,231,235,.72); animation: ehUp .9s .24s cubic-bezier(.16,1,.3,1) both; }
        .eh-cta { margin-top: 28px; display: flex; flex-wrap: wrap; gap: 12px; animation: ehUp .9s .32s cubic-bezier(.16,1,.3,1) both; }
        .eh-btn { display: inline-flex; align-items: center; gap: 8px; padding: 13px 22px; border-radius: 999px; font-size: 14px; font-weight: 800; cursor: pointer; transition: transform .35s cubic-bezier(.16,1,.3,1), box-shadow .35s ease, background .3s ease; border: 0; }
        .eh-btn:hover { transform: translateY(-2px); }
        .eh-btn:active { transform: scale(.97); }
        .eh-btn-primary { background: #fff; color: #0b0b12; box-shadow: 0 14px 30px -12px rgba(255,255,255,.5); }
        .eh-btn-primary:hover { box-shadow: 0 20px 40px -12px rgba(255,255,255,.6); }
        .eh-btn-ghost { background: rgba(255,255,255,.07); color: #fff; border: 1px solid rgba(255,255,255,.18); backdrop-filter: blur(10px); }
        .eh-btn-ghost:hover { background: rgba(255,255,255,.14); }

        .eh-stage { perspective: 1400px; animation: ehUp 1s .2s cubic-bezier(.16,1,.3,1) both; }
        .eh-win { position: relative; border-radius: 20px; background: #0b0b12; border: 1px solid rgba(255,255,255,.1);
          box-shadow: 0 40px 90px -30px rgba(0,0,0,.85), inset 0 1px 0 rgba(255,255,255,.05);
          transform: rotateY(-5deg) rotateX(3deg); transition: transform 1s cubic-bezier(.16,1,.3,1); overflow: hidden; }
        .eh-stage:hover .eh-win { transform: rotateY(-1.5deg) rotateX(1deg); }
        @media (max-width: 760px) { .eh-win { transform: none !important; } }
        .eh-bar { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px; border-bottom: 1px solid rgba(255,255,255,.07); font-size: 11px; color: rgba(229,231,235,.6); }
        .eh-dot { width: 9px; height: 9px; border-radius: 50%; }
        .eh-body { display: grid; grid-template-columns: 118px 1fr; min-height: 0; }
        @media (max-width: 640px) { .eh-body { grid-template-columns: 1fr; } .eh-tools { display: none; } }

        .eh-tools { padding: 12px; border-right: 1px solid rgba(255,255,255,.07); display: grid; gap: 8px; align-content: start; }
        .eh-chip { position: relative; overflow: hidden; display: flex; align-items: center; gap: 6px; padding: 8px 8px; border-radius: 10px; font-size: 10px; font-weight: 700;
          background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); color: rgba(229,231,235,.7);
          transition: background .45s ease, border-color .45s ease, color .45s ease, box-shadow .45s ease, transform .45s cubic-bezier(.16,1,.3,1);
          animation: ehPop .6s cubic-bezier(.16,1,.3,1) both; cursor: default; }
        .eh-chip i { width: 7px; height: 7px; border-radius: 2px; flex: none; transition: transform .45s cubic-bezier(.16,1,.3,1), box-shadow .45s ease; }
        .eh-chip svg { margin-left: auto; opacity: 0; transform: scale(.4); transition: opacity .35s ease, transform .45s cubic-bezier(.16,1,.3,1); }
        .eh-chip.on { color: #fff; transform: translateX(3px); box-shadow: 0 0 0 1px var(--c) inset, 0 10px 24px -12px var(--c); background: color-mix(in srgb, var(--c) 18%, transparent); border-color: color-mix(in srgb, var(--c) 70%, transparent); }
        .eh-chip.on i { transform: scale(1.35); box-shadow: 0 0 10px var(--c); }
        .eh-chip.on svg { opacity: 1; transform: none; }
        .eh-chip.on::after { content: ""; position: absolute; top: 0; bottom: 0; width: 40%; left: -60%; pointer-events: none;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,.35), transparent); animation: ehSweep .9s ease both; }
        .eh-chip:hover { transform: translateX(3px); border-color: rgba(255,255,255,.2); }

        .eh-preview { position: relative; margin: 14px; aspect-ratio: 16 / 9; border-radius: 14px; overflow: hidden; background: #111; border: 1px solid rgba(255,255,255,.08); }
        .eh-scene { position: absolute; inset: -20%; background: conic-gradient(from 0deg, #7c3aed, #db2777, #0ea5e9, #84cc16, #7c3aed); filter: saturate(1.2) blur(38px); opacity: .55; animation: ehSpin 18s linear infinite; }
        .eh-tint { position: absolute; inset: 0; opacity: .28; mix-blend-mode: soft-light; transition: background-color .9s ease; }
        .eh-subject { position: absolute; left: 50%; top: 42%; width: 42%; aspect-ratio: 1; transform: translate(-50%, -50%); border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fde7d8, #c4a48a 55%, #3b2f2a 100%); box-shadow: 0 0 60px rgba(255,255,255,.12); transition: transform .8s cubic-bezier(.16,1,.3,1); animation: ehBreath 4s ease-in-out infinite; }
        .eh-subject.talk { transform: translate(-50%, -50%) scale(1.06); }
        .eh-flash { position: absolute; inset: 0; background: #fff; pointer-events: none; animation: ehFlash .45s ease-out both; }
        .eh-caption { position: absolute; left: 0; right: 0; bottom: 14px; text-align: center; font-size: clamp(13px, 1.6vw, 17px); font-weight: 900; letter-spacing: -0.01em; text-shadow: 0 2px 14px rgba(0,0,0,.6); }
        .eh-caption b { font-weight: 900; color: rgba(255,255,255,.35); transition: color .25s ease, transform .25s ease; display: inline-block; margin-right: 5px; }
        .eh-caption b.on { color: #fff; transform: translateY(-1px); }
        .eh-cursor { display: inline-block; width: 2px; height: 1em; background: #84cc16; margin-left: 3px; vertical-align: -2px; animation: ehBlink 1s steps(2) infinite; }
        .eh-badge { position: absolute; top: 12px; right: 12px; display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px; border-radius: 999px; font-size: 10px; font-weight: 800; background: rgba(0,0,0,.55); border: 1px solid rgba(132,204,22,.5); color: #d9f99d; animation: ehPop .7s .5s cubic-bezier(.16,1,.3,1) both; }
        .eh-live { width: 6px; height: 6px; border-radius: 50%; background: #84cc16; animation: ehPulse 1.8s infinite; }

        .eh-tl { position: relative; margin: 0 14px 14px; border-radius: 12px; background: #09090f; border: 1px solid rgba(255,255,255,.07); padding: 8px 0 8px 46px; overflow: hidden; }
        .eh-ruler { position: relative; height: 16px; margin-bottom: 6px; font-size: 9px; color: rgba(229,231,235,.4); }
        .eh-ruler span { position: absolute; top: 0; transform: translateX(-50%); }
        .eh-row { position: relative; height: 26px; margin-bottom: 4px; }
        .eh-label { position: absolute; left: -40px; top: 0; height: 100%; width: 34px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; color: rgba(229,231,235,.5); }
        .eh-clip { position: absolute; top: 2px; bottom: 2px; border-radius: 6px; font-size: 9px; font-weight: 800; color: #fff; padding: 5px 7px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          transition: box-shadow .4s ease, filter .4s ease, transform .4s cubic-bezier(.16,1,.3,1); animation: ehClip .8s cubic-bezier(.16,1,.3,1) both; }
        .eh-clip.on { box-shadow: 0 0 0 1px rgba(255,255,255,.85), 0 0 18px currentColor; filter: brightness(1.2); transform: translateY(-1px); }
        .eh-trans { position: absolute; top: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px; transform: rotate(45deg); border-radius: 2px; z-index: 2;
          background: var(--c); border: 1px solid rgba(0,0,0,.4); opacity: .55; transition: opacity .3s ease, box-shadow .3s ease, transform .3s ease; }
        .eh-trans.on { opacity: 1; transform: rotate(45deg) scale(1.35); box-shadow: 0 0 14px var(--c); }
        .eh-wave { position: absolute; top: 2px; bottom: 2px; left: 0; right: 0; display: flex; align-items: center; gap: 2px; }
        .eh-wave i { flex: 1; min-width: 0; border-radius: 2px; background: linear-gradient(180deg, #a3e635, #22c55e); transform-origin: center; animation: ehBar 1.4s ease-in-out infinite alternate; opacity: .9; }
        .eh-fx { position: absolute; top: 3px; height: 20px; border-radius: 6px; font-size: 9px; font-weight: 800; display: flex; align-items: center; padding: 0 7px; color: #0b0b12; white-space: nowrap; overflow: hidden;
          transition: opacity .4s ease, filter .4s ease, box-shadow .4s ease, transform .4s cubic-bezier(.16,1,.3,1); opacity: .45; animation: ehPop .6s cubic-bezier(.16,1,.3,1) both; }
        .eh-fx.on { opacity: 1; filter: brightness(1.15); box-shadow: 0 0 14px currentColor; transform: translateY(-1px); }
        .eh-head { position: absolute; top: 0; bottom: 0; width: 2px; background: #fff; box-shadow: 0 0 12px rgba(255,255,255,.8); transition: left .08s linear; z-index: 3; pointer-events: none; }
        .eh-head::before { content: ""; position: absolute; top: -2px; left: -5px; border: 6px solid transparent; border-top: 8px solid #fff; border-bottom: 0; }
        .eh-tc { position: absolute; right: 14px; top: 10px; font: 700 11px ui-monospace, monospace; color: #fde68a; z-index: 4; }
        .eh-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 14px 14px; font-size: 11px; color: rgba(229,231,235,.55); }
        .eh-export { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 8px; background: #84cc16; color: #0b0b12; font-weight: 800; font-size: 11px; border: 0; cursor: pointer; transition: transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s ease; }
        .eh-export:hover { transform: translateY(-1px); box-shadow: 0 8px 18px -8px #84cc16; }

        @keyframes ehUp { from { opacity: 0; transform: translateY(18px); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
        @keyframes ehRotIn { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: none; } }
        @keyframes ehPop { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: none; } }
        @keyframes ehClip { from { opacity: 0; transform: scaleX(.6); } to { opacity: 1; transform: none; } }
        @keyframes ehSweep { from { left: -60%; } to { left: 120%; } }
        @keyframes ehFlash { 0% { opacity: .7; } 100% { opacity: 0; } }
        @keyframes ehFloat { from { transform: translate3d(-4%, -3%, 0) scale(1); } to { transform: translate3d(4%, 5%, 0) scale(1.1); } }
        @keyframes ehSpin { to { transform: rotate(360deg); } }
        @keyframes ehBreath { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.04); } }
        @keyframes ehBar { from { transform: scaleY(.35); } to { transform: scaleY(1); } }
        @keyframes ehBlink { 50% { opacity: 0; } }
        @keyframes ehPulse { 0% { box-shadow: 0 0 0 0 rgba(132,204,22,.7); } 70% { box-shadow: 0 0 0 8px rgba(132,204,22,0); } 100% { box-shadow: 0 0 0 0 rgba(132,204,22,0); } }
        @keyframes ehShine { from { background-position: 0% 0; } to { background-position: 200% 0; } }
        @media (prefers-reduced-motion: reduce) { .eh-root *, .eh-root { animation: none !important; transition: none !important; } }
      `}</style>

      <div className="eh-glow" style={{ width: 420, height: 420, left: -120, top: -140, background: "#7c3aed" }} aria-hidden="true" />
      <div className="eh-glow" style={{ width: 380, height: 380, right: -100, bottom: -120, background: "#db2777", animationDelay: "-6s" }} aria-hidden="true" />

      <div className="eh-grid">
        <div>
          <div className="eh-pill"><Sparkles size={12} /> AI-Powered Creative Studio</div>
          <h1 className="eh-h1">
            Create Stories, <br />
            <span className="eh-grad">Images, Videos &amp; Music</span>
          </h1>
          <p className="eh-sub">Using One AI-Powered Creative Studio. Write, draw, edit and compose in a single place.</p>
          <ul className="eh-stats" aria-label="Highlights">
            <li><b>28</b> AI Tools</li>
            <li><b>∞</b> Unlimited Projects</li>
            <li><b>✓</b> Auto Save</li>
            <li><b>↗</b> Export Anywhere</li>
          </ul>
          <div className="eh-cta">
            <button type="button" className="eh-btn eh-btn-primary" onClick={onStart}>
              Start Creating <ArrowUpRight size={16} />
            </button>
            <button type="button" className="eh-btn eh-btn-ghost" onClick={onDemo || (() => document.querySelector(".ws-section")?.scrollIntoView({ behavior: "smooth", block: "start" }))}>
              <Play size={14} /> View Demo
            </button>
          </div>
        </div>

        <div className="eh-stage" aria-hidden="true">
          <div className="eh-win">
            <div className="eh-bar">
              <span className="eh-dot" style={{ background: "#ff5f57" }} />
              <span className="eh-dot" style={{ background: "#febc2e" }} />
              <span className="eh-dot" style={{ background: "#28c840" }} />
              <span style={{ marginLeft: 10, fontWeight: 700 }}>PlotCraft Studio — Reel_01.mp4</span>
              <span className="eh-badge"><i className="eh-live" /> Auto-captions</span>
            </div>

            <div className="eh-body">
              <div className="eh-tools">
                {EFFECTS.map((f, i) => (
                  <div
                    key={f.label}
                    className={`eh-chip ${i === activeFx ? "on" : ""}`}
                    style={{ "--c": f.c, animationDelay: `${0.2 + i * 0.12}s` }}
                    onMouseEnter={() => setHoverFx(i)}
                    onMouseLeave={() => setHoverFx(-1)}
                  >
                    <i style={{ background: f.c }} />
                    {f.label}
                    <Check size={11} />
                  </div>
                ))}
              </div>

              <div>
                <div className="eh-preview">
                  <div className="eh-scene" />
                  <div className="eh-tint" style={{ background: activeClip.scene }} />
                  <div className={`eh-subject ${isSpeaking ? "talk" : ""}`} />
                  {nearTransition >= 0 && <div key={nearTransition} className="eh-flash" />}
                  <div className="eh-caption">
                    {WORDS.map((w, i) => (
                      <b key={w} className={i < litWords ? "on" : ""}>{w}</b>
                    ))}
                    <span className="eh-cursor" />
                  </div>
                </div>

                <div className="eh-tl">
                  <div className="eh-tc">{timecode}</div>
                  <div className="eh-ruler">
                    {[0, 25, 50, 75, 100].map((n) => (
                      <span key={n} style={{ left: `${n}%` }}>{`${Math.round(n / 8.33)}s`}</span>
                    ))}
                  </div>

                  {TRACKS.map((tk) => (
                    <div key={tk} className="eh-row">
                      <div className="eh-label">{tk}</div>

                      {tk === "V1" && CLIPS.map((c) => (
                        <div
                          key={c.t}
                          title={c.t}
                          className={`eh-clip ${inRange(p, c.s, c.e) ? "on" : ""}`}
                          style={{ left: `${c.s * 100}%`, width: `calc(${(c.e - c.s) * 100}% - 3px)`, background: c.c, color: c.c, animationDelay: `${c.s * 0.8}s` }}
                        >
                          <span style={{ color: "#fff" }}>{c.t}</span>
                        </div>
                      ))}

                      {tk === "V1" && TRANSITIONS.map((t, i) => (
                        <div
                          key={t.kind}
                          title={`${t.kind} transition`}
                          className={`eh-trans ${nearTransition === i ? "on" : ""}`}
                          style={{ left: `${t.at * 100}%`, "--c": t.c }}
                        />
                      ))}

                      {tk === "T1" && TEXT_BOXES.map((b) => (
                        <div
                          key={b.label}
                          className={`eh-fx ${inRange(p, b.from, b.to) ? "on" : ""}`}
                          style={{ left: `${b.left}%`, width: `${b.width}%`, background: b.c, color: b.c, animationDelay: `${b.from}s` }}
                        >
                          <span style={{ color: "#0b0b12" }}>{b.label}</span>
                        </div>
                      ))}

                      {tk === "A1" && (
                        <div className="eh-wave">
                          {WAVE.map((h, i) => (
                            <i key={i} style={{ height: `${h}%`, animationDelay: `${(i % 9) * 0.09}s` }} />
                          ))}
                        </div>
                      )}

                      {tk === "FX" && FX_BOXES.map((b) => (
                        <div
                          key={b.label}
                          className={`eh-fx ${inRange(p, b.from, b.to) ? "on" : ""}`}
                          style={{ left: `${b.left}%`, width: `${b.width}%`, background: b.c, color: b.c, animationDelay: `${b.from}s` }}
                        >
                          <span style={{ color: "#0b0b12" }}>{b.label}</span>
                        </div>
                      ))}
                    </div>
                  ))}

                  <div className="eh-head" style={{ left: `calc(46px + (100% - 46px - 28px) * ${p})` }} />
                </div>

                <div className="eh-foot">
                  <span>Rendering {renderPct}% · 1080×1920</span>
                  <button type="button" className="eh-export" tabIndex={-1}><Download size={12} /> Export</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export { PlotCraftHero };