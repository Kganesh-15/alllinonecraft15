import { useState } from "react";
import { ArrowUpRight, ArrowRight, Sparkles, Trash2 } from "lucide-react";

const STATS_KEY = "plotcraft_tool_stats";
const readStats = () => {
  try { return JSON.parse(localStorage.getItem(STATS_KEY) || "{}"); } catch { return {}; }
};
const writeStats = (s) => {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* storage blocked */ }
};

/* PlotCraft workspace: premium tiles with tilt, spotlight, sheen, glyph float,
   staggered entrance, animated welcome hero, resume cards. Works in light and dark. */

const PALETTE = ["#f43f5e", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#6366f1", "#14b8a6"];
const colorFor = (str) => PALETTE[[...String(str || "x")].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

const WS_CSS = `
.ws-root { --ws-ink:#172033; --ws-muted:#64748b; --ws-card:rgba(255,255,255,.8); --ws-line:rgba(15,23,42,.09);
  --ws-shadow:0 18px 40px -26px rgba(15,23,42,.35); color:var(--ws-ink); }
.plotcraft-shell[data-theme="rgbclr"] .ws-root, .plotcraft-shell[data-theme="cyberpunk"] .ws-root, .plotcraft-shell[data-theme="dream"] .ws-root,
.pcp-landing:not([data-theme="standard"]):not([data-theme="world"]):not([data-theme="emerald"]):not([data-theme="sunset"]):not([data-theme="party"]):not([data-theme="rainy"]) .ws-root {
  --ws-ink:#f1f5f9; --ws-muted:#94a3b8; --ws-card:rgba(20,28,48,.74); --ws-line:rgba(255,255,255,.1);
  --ws-shadow:0 22px 46px -24px rgba(0,0,0,.7); }
@keyframes wsIn { from { opacity:0; transform:translateY(22px) scale(.98); filter:blur(4px); } to { opacity:1; transform:none; filter:none; } }
@keyframes wsFloat { 0%,100% { transform:translateY(0) scale(1.08); } 50% { transform:translateY(-5px) scale(1.08); } }
@keyframes wsSheen { from { transform:translateX(-120%) skewX(-18deg); } to { transform:translateX(260%) skewX(-18deg); } }
@keyframes wsMesh { from { transform:translate3d(-4%,-3%,0) scale(1); } to { transform:translate3d(4%,4%,0) scale(1.12); } }
@keyframes wsShine { from { background-position:0% 50%; } to { background-position:200% 50%; } }
@keyframes wsPulse { 0% { box-shadow:0 0 0 0 rgba(134,239,172,.7); } 70% { box-shadow:0 0 0 8px rgba(134,239,172,0); } 100% { box-shadow:0 0 0 0 rgba(134,239,172,0); } }

.ws-grid { display:grid; gap:14px; grid-template-columns:minmax(0,1fr); }
@media (min-width:640px) { .ws-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (min-width:1024px) { .ws-grid.ws-four { grid-template-columns:repeat(4,minmax(0,1fr)); } }
@media (min-width:1280px) { .ws-grid.ws-five { grid-template-columns:repeat(5,minmax(0,1fr)); } }

.ws-tile { --rx:0deg; --ry:0deg; --mx:50%; --my:50%; position:relative; isolation:isolate; overflow:hidden; cursor:pointer;
  display:flex; flex-direction:column; text-align:left; min-height:184px; padding:20px; border-radius:24px;
  border:1px solid var(--ws-line); background:var(--ws-card); box-shadow:var(--ws-shadow); color:var(--ws-ink);
  transform:perspective(900px) rotateX(var(--rx)) rotateY(var(--ry));
  animation:wsIn .7s cubic-bezier(.16,1,.3,1) backwards; animation-delay:var(--d,0ms);
  transition:transform .35s cubic-bezier(.16,1,.3,1), box-shadow .45s ease, border-color .45s ease; }
.ws-tile::before { content:""; position:absolute; inset:0; z-index:-1; pointer-events:none; opacity:0; transition:opacity .5s ease;
  background:radial-gradient(260px circle at var(--mx) var(--my), color-mix(in srgb,var(--a) 26%,transparent), transparent 70%); }
.ws-tile::after { content:""; position:absolute; top:-10%; bottom:-10%; left:0; width:42%; pointer-events:none;
  background:linear-gradient(100deg,transparent,rgba(255,255,255,.28),transparent); transform:translateX(-120%) skewX(-18deg); }
.ws-tile:hover { transform:perspective(900px) translateY(-6px) rotateX(var(--rx)) rotateY(var(--ry));
  border-color:color-mix(in srgb,var(--a) 55%,transparent); box-shadow:0 30px 60px -28px color-mix(in srgb,var(--a) 60%,transparent); }
.ws-tile:hover::before { opacity:1; }
.ws-tile:hover::after { animation:wsSheen .9s ease; }
.ws-tile:active { transform:perspective(900px) scale(.98); }
.ws-tile:focus-visible { outline:3px solid color-mix(in srgb,var(--a) 70%,white); outline-offset:3px; }
.ws-index { position:absolute; top:12px; right:16px; font-size:34px; font-weight:900; letter-spacing:-.04em; line-height:1;
  color:transparent; -webkit-text-stroke:1px color-mix(in srgb,var(--a) 55%,transparent); transition:color .4s ease; }
.ws-tile:hover .ws-index { color:color-mix(in srgb,var(--a) 22%,transparent); }
.ws-glyph { font-size:34px; line-height:1; margin-bottom:auto; transform:scale(1.08); transition:transform .5s cubic-bezier(.16,1,.3,1);
  filter:drop-shadow(0 8px 14px color-mix(in srgb,var(--a) 45%,transparent)); display:inline-flex; }
.ws-tile:hover .ws-glyph { animation:wsFloat 2.2s ease-in-out infinite; }
.ws-title { margin-top:18px; font-size:15px; font-weight:800; letter-spacing:-.01em; }
.ws-detail { margin-top:6px; font-size:12px; line-height:1.5; color:var(--ws-muted); }
.ws-go { margin-top:14px; display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:800; color:var(--a);
  opacity:0; transform:translateX(-6px); transition:opacity .35s ease, transform .45s cubic-bezier(.16,1,.3,1); }
.ws-tile:hover .ws-go { opacity:1; transform:none; }
.ws-tile:focus-within .ws-go { opacity:1; transform:none; }
.ws-bar { position:absolute; left:0; bottom:0; height:3px; width:0; background:linear-gradient(90deg,var(--a),transparent);
  transition:width .6s cubic-bezier(.16,1,.3,1); }
.ws-tile:hover .ws-bar { width:100%; }
.ws-tile.ws-compact { min-height:150px; padding:18px; border-radius:22px; }
.ws-tile-main { position:absolute; inset:0; z-index:1; display:flex; flex-direction:column; padding:18px 48px 18px 18px;
  border:0; background:transparent; color:inherit; font:inherit; text-align:left; cursor:pointer; }
.ws-tile-main:focus-visible { outline:3px solid color-mix(in srgb,var(--a) 70%,white); outline-offset:-5px; border-radius:inherit; }
.ws-fav { position:absolute; top:10px; right:10px; z-index:2; display:grid; place-items:center; width:34px; height:34px;
  padding:0; border:0; border-radius:12px; background:transparent; font-size:17px; line-height:1; opacity:.55; cursor:pointer; color:var(--ws-muted);
  transition:opacity .3s ease, color .3s ease, transform .4s cubic-bezier(.16,1,.3,1); }
.ws-fav:hover { opacity:1; transform:scale(1.15); }
.ws-fav:focus-visible { outline:2px solid #fbbf24; outline-offset:2px; opacity:1; }
.ws-fav.on { opacity:1; color:#fbbf24; text-shadow:0 0 12px rgba(251,191,36,.6); }
.ws-chip, .ws-rc, .ws-tile { transition:transform .35s cubic-bezier(.16,1,.3,1), box-shadow .45s ease, border-color .45s ease, background .3s ease, opacity .3s ease; }

.ws-hero { position:relative; isolation:isolate; overflow:hidden; border-radius:28px; padding:clamp(22px,4vw,40px); color:#fff;
  background:#0b1020; animation:wsIn .8s cubic-bezier(.16,1,.3,1) backwards; }
.ws-blob { position:absolute; z-index:-1; border-radius:50%; filter:blur(64px); opacity:.8; pointer-events:none; animation:wsMesh 9s ease-in-out infinite alternate; }
.ws-eyebrow { font-size:12px; font-weight:700; color:rgba(255,255,255,.8); }
.ws-hero h1 { margin-top:6px; font-size:clamp(1.6rem,3.6vw,2.7rem); font-weight:900; letter-spacing:-.035em; line-height:1.08; }
.ws-shimmer { background:linear-gradient(100deg,#c4b5fd,#f9a8d4,#fde68a,#bae6fd,#c4b5fd); background-size:250% 100%;
  -webkit-background-clip:text; background-clip:text; color:transparent; animation:wsShine 6s linear infinite; }
.ws-hero p.ws-lead { margin-top:10px; max-width:560px; font-size:14px; line-height:1.65; color:rgba(255,255,255,.85); }
.ws-chips { margin-top:22px; display:flex; flex-wrap:wrap; gap:10px; }
.ws-chip { display:inline-flex; align-items:center; gap:8px; padding:10px 16px; border-radius:999px; font-size:12px; font-weight:800; color:#fff;
  background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.22); backdrop-filter:blur(10px); cursor:pointer;
  transition:transform .35s cubic-bezier(.16,1,.3,1), background .3s ease, box-shadow .35s ease; }
.ws-chip:hover { transform:translateY(-2px); background:rgba(255,255,255,.24); box-shadow:0 12px 24px -12px rgba(0,0,0,.5); }
.ws-chip:active { transform:scale(.97); }
.ws-save { position:absolute; top:clamp(16px,3vw,28px); right:clamp(16px,3vw,28px); display:inline-flex; align-items:center; gap:7px;
  font-size:11px; font-weight:700; padding:6px 11px; border-radius:999px; background:rgba(0,0,0,.28); border:1px solid rgba(255,255,255,.2); }
.ws-live { width:6px; height:6px; border-radius:50%; background:#86efac; animation:wsPulse 1.8s infinite; }

.ws-recent { display:grid; gap:12px; grid-template-columns:minmax(0,1fr); }
@media (min-width:640px) { .ws-recent { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (min-width:1024px) { .ws-recent { grid-template-columns:repeat(3,minmax(0,1fr)); } }
.ws-rc { --a:#8b5cf6; position:relative; overflow:hidden; display:flex; align-items:center; gap:12px; padding:14px 12px 14px 20px; border-radius:20px;
  border:1px solid var(--ws-line); background:var(--ws-card); box-shadow:var(--ws-shadow); animation:wsIn .6s cubic-bezier(.16,1,.3,1) backwards; animation-delay:var(--d,0ms);
  transition:transform .4s cubic-bezier(.16,1,.3,1), border-color .4s ease; }
.ws-rc::before { content:""; position:absolute; left:0; top:14px; bottom:14px; width:3px; border-radius:3px; background:var(--a); box-shadow:0 0 14px var(--a); }
.ws-rc:hover { transform:translateY(-3px); border-color:color-mix(in srgb,var(--a) 50%,transparent); }
.ws-rc-ico { color:var(--a); filter:drop-shadow(0 4px 8px color-mix(in srgb,var(--a) 40%,transparent)); flex:none; }
.ws-rc-open { flex:1; min-width:0; text-align:left; background:none; border:0; color:inherit; cursor:pointer; padding:0; }
.ws-rc-title { display:block; font-size:14px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ws-rc-meta { display:flex; align-items:center; gap:6px; margin-top:3px; font-size:11px; color:var(--ws-muted); }
.ws-rc-go { opacity:0; transform:translateX(-4px); color:var(--a); transition:opacity .3s ease, transform .4s cubic-bezier(.16,1,.3,1); }
.ws-rc:hover .ws-rc-go { opacity:1; transform:none; }
.ws-rc-del { opacity:0; border:0; background:none; color:var(--ws-muted); padding:7px; border-radius:10px; cursor:pointer; transition:opacity .3s ease, background .3s ease, color .3s ease; }
.ws-rc:hover .ws-rc-del, .ws-rc-del:focus-visible { opacity:1; }
.ws-rc-del:hover { background:rgba(244,63,94,.16); color:#f43f5e; }
.ws-rc-del:focus-visible { outline:2px solid #f43f5e; outline-offset:2px; }

.ws-head { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
.ws-head h2 { font-size:11px; font-weight:900; letter-spacing:.18em; text-transform:uppercase; color:var(--ws-muted); }
.ws-count { font-size:10px; font-weight:800; padding:3px 9px; border-radius:999px; border:1px solid var(--ws-line); color:var(--ws-muted); }
.ws-head::after { content:""; flex:1; height:1px; background:linear-gradient(90deg,var(--ws-line),transparent); }
.ws-section + .ws-section { margin-top:36px; }

@media (max-width:640px) {
  .ws-hero { padding-top:22px; }
  .ws-save { position:relative; top:auto; right:auto; width:max-content; max-width:100%; margin:0 0 18px auto; }
}
@media (hover:none) {
  .ws-go, .ws-rc-del { opacity:1; transform:none; }
}
@media (prefers-reduced-motion:reduce) {
  .ws-root *, .ws-root { animation:none !important; transition:none !important; }
}
`;

/* Pointer tilt + spotlight, using CSS variables only. */
const onTilt = (e) => {
  const el = e.currentTarget;
  if (e.pointerType === "touch") return;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  el.style.setProperty("--mx", `${x * 100}%`);
  el.style.setProperty("--my", `${y * 100}%`);
  el.style.setProperty("--ry", `${(x - 0.5) * 9}deg`);
  el.style.setProperty("--rx", `${(0.5 - y) * 7}deg`);
};
const onUntilt = (e) => {
  e.currentTarget.style.setProperty("--rx", "0deg");
  e.currentTarget.style.setProperty("--ry", "0deg");
};

const Wrap = ({ children }) => (
  <div className="ws-root">
    <style>{WS_CSS}</style>
    {children}
  </div>
);

/* 1. Studio shortcuts on the dashboard home. */
export function WorkspaceShortcuts({ items, onPick }) {
  const count = items.length;
  return (
    <Wrap>
      <div className={`ws-grid ${count === 5 ? "ws-five" : count === 4 ? "ws-four" : ""}`}>
        {items.map((item, i) => {
          const a = colorFor(item.title);
          return (
            <button
              key={item.title}
              type="button"
              className="ws-tile"
              style={{ "--a": a, "--d": `${i * 80}ms` }}
              onPointerMove={onTilt}
              onPointerLeave={onUntilt}
              onClick={() => onPick && onPick(item.go)}
            >
              <span className="ws-index">0{i + 1}</span>
              <span className="ws-glyph">{item.icon}</span>
              <span className="ws-title">{item.title}</span>
              <span className="ws-detail">{item.detail}</span>
              <span className="ws-go">Open <ArrowUpRight size={13} /></span>
              <span className="ws-bar" />
            </button>
          );
        })}
      </div>
    </Wrap>
  );
}

/* 2. Welcome hero with animated mesh and quick actions. */
export function WorkspaceWelcome({ quick = [], onOpen, name }) {
  return (
    <Wrap>
      <section className="ws-hero">
        <span className="ws-blob" style={{ width: 340, height: 340, left: -90, top: -120, background: "#7c3aed" }} aria-hidden="true" />
        <span className="ws-blob" style={{ width: 300, height: 300, right: -80, bottom: -110, background: "#db2777", animationDelay: "-4s" }} aria-hidden="true" />
        <span className="ws-blob" style={{ width: 240, height: 240, left: "40%", top: "30%", background: "#0ea5e9", opacity: 0.45, animationDelay: "-2s" }} aria-hidden="true" />
        <div className="ws-save"><span className="ws-live" /> Saves automatically on this device</div>
        <div className="ws-eyebrow"><Sparkles size={12} style={{ display: "inline", marginRight: 6, verticalAlign: "-2px" }} />{name ? `Welcome back, ${name}` : "Welcome to PlotCraft AI"}</div>
        <h1>What will you <span className="ws-shimmer">create today?</span></h1>
        <p className="ws-lead">Pick a studio, or jump straight in. Your work saves automatically on this device.</p>
        <div className="ws-chips">
          {quick.map(([label, id, Icon]) => (
            <button key={id} type="button" className="ws-chip" onClick={() => onOpen(id)}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </section>
    </Wrap>
  );
}

/* 3. Continue where you left off. */
export function WorkspaceRecent({ items, iconOf, shortOf, onOpenProject, onDeleteProject }) {
  return (
    <Wrap>
      <section className="ws-section">
        <div className="ws-head"><h2>Continue where you left off</h2><span className="ws-count">{items.length}</span></div>
        <div className="ws-recent">
          {items.map((p, i) => {
            const Icon = iconOf(p.category);
            const a = colorFor(p.category);
            return (
              <div key={p.id} className="ws-rc" style={{ "--a": a, "--d": `${i * 70}ms` }}>
                <Icon size={22} className="ws-rc-ico" />
                <button type="button" className="ws-rc-open" onClick={() => onOpenProject(p)}>
                  <span className="ws-rc-title">{p.title}</span>
                  <span className="ws-rc-meta">
                    {shortOf(p.category)} · {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "Recently updated"}
                    <ArrowRight size={12} className="ws-rc-go" />
                  </span>
                </button>
                <button type="button" aria-label="Delete project" className="ws-rc-del" onClick={() => onDeleteProject(p.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </Wrap>
  );
}

/* 4. Studio group grids (Create, Video, Make, Learn...). */
export function WorkspaceGroup({ name, list, onOpen, index = 0 }) {
  const [stats, setStats] = useState(readStats);
  const isFav = (id) => Boolean(stats[id]?.fav);
  const usesOf = (id) => stats[id]?.uses || 0;
  const open = (id) => {
    const s = readStats();
    s[id] = { uses: (s[id]?.uses || 0) + 1, fav: Boolean(s[id]?.fav) };
    writeStats(s);
    setStats(s);
    onOpen(id);
  };
  const toggleFav = (id) => {
    const s = readStats();
    s[id] = { uses: s[id]?.uses || 0, fav: !s[id]?.fav };
    writeStats(s);
    setStats(s);
  };
  const ordered = [...list].sort((a, b) => Number(isFav(b.id)) - Number(isFav(a.id)));
  return (
    <Wrap>
      <section className="ws-section">
        <div className="ws-head"><h2>{name}</h2><span className="ws-count">{list.length}</span></div>
        <div className="ws-grid ws-four">
          {ordered.map((c, i) => {
            const Icon = c.Icon;
            const a = colorFor(c.id);
            return (
              <div
                key={c.id}
                className="ws-tile ws-compact"
                style={{ "--a": a, "--d": `${(index * 4 + i) * 45}ms` }}
                onPointerMove={onTilt}
                onPointerLeave={onUntilt}
              >
                <button
                  type="button"
                  aria-label={isFav(c.id) ? "Remove from favourites" : "Add to favourites"}
                  aria-pressed={isFav(c.id)}
                  title={isFav(c.id) ? "Favourite" : "Add to favourites"}
                  className={`ws-fav ${isFav(c.id) ? "on" : ""}`}
                  onClick={() => toggleFav(c.id)}
                >★</button>
                <button type="button" className="ws-tile-main" onClick={() => open(c.id)} aria-label={`Open ${c.title}`}>
                  <span className="ws-glyph"><Icon size={26} /></span>
                  <span className="ws-title">{c.title}</span>
                  <span className="ws-detail">{c.subtitle}{usesOf(c.id) > 0 ? ` · Used ${usesOf(c.id)}×` : ""}</span>
                  <span className="ws-go">Open <ArrowUpRight size={13} /></span>
                  <span className="ws-bar" />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </Wrap>
  );
}

/* Dashboard backdrop: drifting colour mesh, fading grid, grain and rising light motes.
   Sits behind all content (z -1 inside an isolated parent). Matches the welcome page palette. */
const DBK_CSS = `
.dbk { position:absolute; inset:0; z-index:-1; pointer-events:none; overflow:hidden; }
.dbk-mesh { position:absolute; inset:-20%; opacity:.9;
  background:
    radial-gradient(40% 35% at 14% 18%, rgba(124,58,237,.34), transparent 70%),
    radial-gradient(34% 30% at 86% 14%, rgba(219,39,119,.28), transparent 70%),
    radial-gradient(40% 36% at 72% 92%, rgba(245,158,11,.20), transparent 70%),
    radial-gradient(34% 30% at 8% 86%, rgba(14,165,233,.18), transparent 70%);
  animation:dbkDrift 26s ease-in-out infinite alternate; }
@keyframes dbkDrift { from { transform:translate3d(-2%,-1%,0) rotate(0deg) scale(1); } to { transform:translate3d(2%,3%,0) rotate(4deg) scale(1.06); } }
.dbk-grid { position:absolute; inset:0;
  background-image:linear-gradient(rgba(127,127,127,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(127,127,127,.09) 1px, transparent 1px);
  background-size:56px 56px; -webkit-mask-image:linear-gradient(to bottom, #000 0%, transparent 65%); mask-image:linear-gradient(to bottom, #000 0%, transparent 65%); }
.dbk-noise { position:absolute; inset:0; opacity:.06; mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"); }
.dbk-mote { position:absolute; bottom:-12px; border-radius:50%; opacity:0; animation:dbkRise linear infinite; }
@keyframes dbkRise { 0% { transform:translateY(0); opacity:0; } 12% { opacity:.85; } 100% { transform:translateY(-115vh); opacity:0; } }
@media (prefers-reduced-motion: reduce) { .dbk * { animation:none !important; } }
`;

const DBK_COLORS = ["#a78bfa", "#f472b6", "#fbbf24", "#38bdf8", "#c4b5fd"];
const DBK_MOTES = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37) % 100,
  size: 2 + ((i * 7) % 4),
  dur: 14 + ((i * 5) % 12),
  delay: -((i * 3) % 14),
  color: DBK_COLORS[i % DBK_COLORS.length],
}));

export function DashboardBackdrop() {
  return (
    <div className="dbk" aria-hidden="true">
      <style>{DBK_CSS}</style>
      <div className="dbk-mesh" />
      <div className="dbk-grid" />
      <div className="dbk-noise" />
      {DBK_MOTES.map((m, i) => (
        <span
          key={i}
          className="dbk-mote"
          style={{
            left: `${m.left}%`,
            width: m.size,
            height: m.size,
            background: m.color,
            boxShadow: `0 0 12px ${m.color}`,
            animationDuration: `${m.dur}s`,
            animationDelay: `${m.delay}s`,
          }}
        />
      ))}
    </div>
  );
}