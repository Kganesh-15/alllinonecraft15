import React, { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Check, Download, RefreshCw, Play, Pause, RotateCcw, Flag, ArrowLeft, Star, Clock } from "lucide-react";

const STORE_KEY = "plotcraft_utils_v1";
const readStore = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch { return {}; } };
const writeStore = (s) => { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* blocked */ } };

/* Shared features for every utility: favourite, usage count, last used, reset, Esc to go back. */
function ToolShell({ id, title, onBack, children }) {
  const [store, setStore] = useState(readStore);
  const [run, setRun] = useState(0);
  const entry = store[id] || { uses: 0, fav: false, last: 0 };
  useEffect(() => {
    const s = readStore();
    const e = s[id] || { uses: 0, fav: false, last: 0 };
    s[id] = { ...e, uses: e.uses + 1, last: Date.now() };
    writeStore(s); setStore(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onBack?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);
  const toggleFav = () => { const s = readStore(); s[id] = { ...(s[id] || { uses: 0, last: 0 }), fav: !(s[id]?.fav) }; writeStore(s); setStore(s); };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className={btn}><ArrowLeft size={13} /> All utilities <span className="opacity-50">(Esc)</span></button>
        <div className="flex flex-wrap items-center gap-2 text-xs opacity-80">
          <span className="inline-flex items-center gap-1"><Clock size={12} /> Used {entry.uses}×{entry.last ? ` · last ${new Date(entry.last).toLocaleDateString()}` : ""}</span>
          <button type="button" className={btn} onClick={toggleFav}><Star size={13} className={entry.fav ? "fill-amber-400 text-amber-400" : ""} /> {entry.fav ? "Favourite" : "Favourite it"}</button>
          <button type="button" className={btn} onClick={() => setRun((r) => r + 1)}><RotateCcw size={13} /> Reset tool</button>
        </div>
      </div>
      <h2 className="text-2xl font-black">{title}</h2>
      <div key={run}>{children}</div>
    </div>
  );
}

/* PlotCraft Utilities: 21 working tools, all in the browser (no uploads, no server).
   Each tool is self-contained. Open one with <UtilityTools tool="util-wordcount" onBack={...} />. */

const card = "rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-4 transition hover:border-violet-400/40";
const btn = "inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10 hover:-translate-y-0.5 active:scale-95 disabled:opacity-40";
const btnPrimary = "inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white transition hover:bg-violet-500 hover:-translate-y-0.5 active:scale-95";
const input = "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-violet-400 focus:outline-none";
const label = "text-[11px] font-black uppercase tracking-wider text-slate-400";

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className={btn} onClick={() => { navigator.clipboard?.writeText(String(text)); setOk(true); setTimeout(() => setOk(false), 1200); }}>
      {ok ? <Check size={13} /> : <Copy size={13} />} {ok ? "Copied" : "Copy"}
    </button>
  );
}
function Stat({ k, v }) {
  return <div className="rounded-xl bg-black/30 p-3"><div className={label}>{k}</div><div className="mt-1 text-lg font-black tabular-nums">{v}</div></div>;
}

/* 1. Word & character counter */
function WordCount() {
  const [text, setText] = useState("");
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const noSpace = text.replace(/\s/g, "").length;
  const sentences = text.trim() ? (text.match(/[.!?]+(\s|$)/g) || []).length || 1 : 0;
  const minutes = Math.max(1, Math.round(words / 230));
  return (
    <div className={card}>
      <textarea className={input} rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ikkada text paste cheyandi..." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat k="Words" v={words} /><Stat k="Characters" v={chars} /><Stat k="No spaces" v={noSpace} /><Stat k="Sentences" v={sentences} /><Stat k="Reading" v={words ? `${minutes} min` : "0"} />
      </div>
      <div className="flex gap-2"><CopyBtn text={text} /><button className={btn} onClick={() => setText("")}>Clear</button></div>
    </div>
  );
}

/* 2. Text case converter */
const CASES = {
  UPPER: (s) => s.toUpperCase(),
  lower: (s) => s.toLowerCase(),
  Title: (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
  Sentence: (s) => s.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (c) => c.toUpperCase()),
  camelCase: (s) => s.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase()),
  snake_case: (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"),
  "kebab-case": (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  Reverse: (s) => [...s].reverse().join(""),
};
function CaseConverter() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("Title");
  return (
    <div className={card}>
      <textarea className={input} rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Text type cheyandi..." />
      <div className="flex flex-wrap gap-2">{Object.keys(CASES).map((k) => <button key={k} className={mode === k ? btnPrimary : btn} onClick={() => setMode(k)}>{k}</button>)}</div>
      <textarea readOnly className={input} rows={5} value={CASES[mode](text)} />
      <div className="flex gap-2"><CopyBtn text={CASES[mode](text)} /><button className={btn} onClick={() => setText(CASES[mode](text))}>Apply to input</button></div>
    </div>
  );
}

/* 3. Lorem ipsum generator */
const LOREM = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat".split(" ");
function Lorem() {
  const [count, setCount] = useState(3);
  const [kind, setKind] = useState("paragraphs");
  const out = useMemo(() => {
    const word = (i) => LOREM[(i * 7 + 3) % LOREM.length];
    if (kind === "words") return Array.from({ length: count * 10 }, (_, i) => word(i)).join(" ");
    return Array.from({ length: count }, (_, p) => {
      const s = Array.from({ length: 6 }, (_, i) => Array.from({ length: 9 }, (_, j) => word(p * 60 + i * 9 + j)).join(" "));
      return s.map((x) => x[0].toUpperCase() + x.slice(1) + ".").join(" ");
    }).join("\n\n");
  }, [count, kind]);
  return (
    <div className={card}>
      <div className="flex flex-wrap items-center gap-3">
        <select className={input + " w-auto"} value={kind} onChange={(e) => setKind(e.target.value)}><option value="paragraphs">Paragraphs</option><option value="words">Words</option></select>
        <input type="range" min={1} max={10} value={count} onChange={(e) => setCount(+e.target.value)} className="accent-violet-500" />
        <span className="text-sm font-bold">{count}</span>
      </div>
      <textarea readOnly className={input} rows={10} value={out} />
      <CopyBtn text={out} />
    </div>
  );
}

/* 4. Password generator */
function Password() {
  const [len, setLen] = useState(16);
  const [opts, setOpts] = useState({ upper: true, lower: true, digits: true, symbols: true });
  const [pw, setPw] = useState("");
  const gen = () => {
    const sets = [opts.upper && "ABCDEFGHJKLMNPQRSTUVWXYZ", opts.lower && "abcdefghijkmnopqrstuvwxyz", opts.digits && "23456789", opts.symbols && "!@#$%^&*-_=+?"].filter(Boolean);
    if (!sets.length) return setPw("");
    const all = sets.join(""); const arr = new Uint32Array(len); crypto.getRandomValues(arr);
    setPw([...arr].map((n) => all[n % all.length]).join(""));
  };
  useEffect(gen, [len, opts]);
  const score = Math.min(4, Math.floor(len / 6) + Object.values(opts).filter(Boolean).length - 1);
  const names = ["Weak", "Fair", "Good", "Strong", "Very strong"];
  return (
    <div className={card}>
      <div className="flex items-center gap-2 rounded-xl bg-black/30 p-3"><code className="flex-1 break-all text-base">{pw}</code><CopyBtn text={pw} /></div>
      <div className="flex items-center gap-3"><input type="range" min={6} max={48} value={len} onChange={(e) => setLen(+e.target.value)} className="flex-1 accent-violet-500" /><span className="w-10 text-sm font-bold">{len}</span></div>
      <div className="flex flex-wrap gap-2">
        {Object.keys(opts).map((k) => <label key={k} className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={opts[k]} onChange={(e) => setOpts({ ...opts, [k]: e.target.checked })} />{k}</label>)}
      </div>
      <div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-500" style={{ width: `${((score + 1) / 5) * 100}%` }} /></div><span className="text-xs font-bold">{names[Math.max(0, score)]}</span></div>
      <button className={btnPrimary} onClick={gen}><RefreshCw size={13} /> Regenerate</button>
    </div>
  );
}

/* 5. Colour palette generator */
const hsl = (h, s, l) => { s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); const to = (x) => Math.round(x * 255).toString(16).padStart(2, "0"); return `#${to(f(0))}${to(f(8))}${to(f(4))}`; };
function Palette() {
  const [base, setBase] = useState(268);
  const [mode, setMode] = useState("analogous");
  const colors = useMemo(() => {
    const offs = mode === "complementary" ? [0, 180, 0, 180, 0] : mode === "triadic" ? [0, 120, 240, 0, 120] : [-30, -15, 0, 15, 30];
    return offs.map((o, i) => hsl((base + o + 360) % 360, 70 - i * 4, 35 + i * 10));
  }, [base, mode]);
  const css = colors.map((c, i) => `--color-${i + 1}: ${c};`).join("\n");
  return (
    <div className={card}>
      <div className="flex flex-wrap items-center gap-3">
        <input type="range" min={0} max={359} value={base} onChange={(e) => setBase(+e.target.value)} className="flex-1 accent-violet-500" />
        <select className={input + " w-auto"} value={mode} onChange={(e) => setMode(e.target.value)}><option value="analogous">Analogous</option><option value="complementary">Complementary</option><option value="triadic">Triadic</option></select>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {colors.map((c) => <button key={c} onClick={() => navigator.clipboard?.writeText(c)} className="group relative h-32 rounded-xl transition hover:-translate-y-1" style={{ background: c }}><span className="absolute bottom-2 left-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-bold opacity-0 transition group-hover:opacity-100">{c}</span></button>)}
      </div>
      <div className="flex gap-2"><CopyBtn text={css} /><span className="text-xs text-slate-400">CSS variables copy aguthayi</span></div>
    </div>
  );
}

/* 6. Unit converter */
const UNITS = {
  Length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, ft: 0.3048, in: 0.0254 },
  Weight: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.45359237, oz: 0.0283495 },
  Volume: { l: 1, ml: 0.001, gal: 3.78541, cup: 0.236588 },
};
function Units() {
  const [cat, setCat] = useState("Length");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("ft");
  const [val, setVal] = useState(1);
  const units = Object.keys(UNITS[cat]);
  const result = (val * UNITS[cat][from]) / UNITS[cat][to];
  return (
    <div className={card}>
      <div className="flex flex-wrap gap-2">{Object.keys(UNITS).map((c) => <button key={c} className={cat === c ? btnPrimary : btn} onClick={() => { setCat(c); setFrom(Object.keys(UNITS[c])[0]); setTo(Object.keys(UNITS[c])[1]); }}>{c}</button>)}</div>
      <div className="grid gap-3 sm:grid-cols-3">
        <input type="number" className={input} value={val} onChange={(e) => setVal(+e.target.value)} />
        <select className={input} value={from} onChange={(e) => setFrom(e.target.value)}>{units.map((u) => <option key={u}>{u}</option>)}</select>
        <select className={input} value={to} onChange={(e) => setTo(e.target.value)}>{units.map((u) => <option key={u}>{u}</option>)}</select>
      </div>
      <div className="rounded-xl bg-black/30 p-4 text-2xl font-black tabular-nums">{Number.isFinite(result) ? Number(result.toPrecision(8)) : "—"} <span className="text-sm text-slate-400">{to}</span></div>
      <button className={btn} onClick={() => { setFrom(to); setTo(from); }}>Swap</button>
    </div>
  );
}

/* 7. Pomodoro timer */
function Pomodoro() {
  const [mode, setMode] = useState("work");
  const [secs, setSecs] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const total = mode === "work" ? 25 * 60 : mode === "short" ? 5 * 60 : 15 * 60;
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setSecs((s) => {
      if (s <= 1) { setRunning(false); if (mode === "work") setCycles((c) => c + 1); try { new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQQAAAAAAA==").play(); } catch { /* sound blocked */ } return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [running, mode]);
  const pick = (m) => { setMode(m); setRunning(false); setSecs(m === "work" ? 25 * 60 : m === "short" ? 5 * 60 : 15 * 60); };
  const mm = String(Math.floor(secs / 60)).padStart(2, "0"); const ss = String(secs % 60).padStart(2, "0");
  return (
    <div className={card + " text-center"}>
      <div className="flex justify-center gap-2">{[["work", "Focus 25"], ["short", "Break 5"], ["long", "Long 15"]].map(([m, l]) => <button key={m} className={mode === m ? btnPrimary : btn} onClick={() => pick(m)}>{l}</button>)}</div>
      <div className="text-6xl font-black tabular-nums">{mm}:{ss}</div>
      <div className="mx-auto h-2 max-w-md overflow-hidden rounded-full bg-white/10"><div className="h-full bg-violet-500 transition-all duration-1000" style={{ width: `${(secs / total) * 100}%` }} /></div>
      <div className="flex justify-center gap-2">
        <button className={btnPrimary} onClick={() => setRunning((r) => !r)}>{running ? <Pause size={13} /> : <Play size={13} />} {running ? "Pause" : "Start"}</button>
        <button className={btn} onClick={() => pick(mode)}><RotateCcw size={13} /> Reset</button>
      </div>
      <p className="text-xs text-slate-400">Completed focus sessions: <b>{cycles}</b></p>
    </div>
  );
}

/* 8. Stopwatch with laps */
function Stopwatch() {
  const [ms, setMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState([]);
  const startRef = useRef(0); const baseRef = useRef(0);
  useEffect(() => {
    if (!running) return undefined;
    startRef.current = performance.now();
    const id = setInterval(() => setMs(baseRef.current + performance.now() - startRef.current), 50);
    return () => { clearInterval(id); baseRef.current += performance.now() - startRef.current; };
  }, [running]);
  const fmt = (x) => { const m = Math.floor(x / 60000), s = Math.floor((x % 60000) / 1000), c = Math.floor((x % 1000) / 10); return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`; };
  return (
    <div className={card + " text-center"}>
      <div className="text-6xl font-black tabular-nums">{fmt(ms)}</div>
      <div className="flex justify-center gap-2">
        <button className={btnPrimary} onClick={() => setRunning((r) => !r)}>{running ? "Pause" : "Start"}</button>
        <button className={btn} onClick={() => setLaps((l) => [ms, ...l])} disabled={!running}><Flag size={13} /> Lap</button>
        <button className={btn} onClick={() => { setRunning(false); setMs(0); baseRef.current = 0; setLaps([]); }}>Reset</button>
      </div>
      <ol className="mx-auto max-w-sm space-y-1 text-left text-sm">{laps.map((l, i) => <li key={i} className="flex justify-between rounded-lg bg-black/30 px-3 py-1.5 tabular-nums"><span>Lap {laps.length - i}</span><span>{fmt(l)}</span></li>)}</ol>
    </div>
  );
}

/* 9. JSON formatter */
function JsonTool() {
  const [text, setText] = useState('{"name":"PlotCraft","tools":21}');
  let out = ""; let err = "";
  try { out = JSON.stringify(JSON.parse(text), null, 2); } catch (e) { err = e.message; }
  return (
    <div className={card}>
      <textarea className={input + " font-mono"} rows={8} value={text} onChange={(e) => setText(e.target.value)} />
      {err ? <p className="rounded-xl bg-rose-500/15 p-3 text-xs text-rose-300">Invalid JSON: {err}</p> : <p className="text-xs text-emerald-400">✓ Valid JSON</p>}
      <div className="flex flex-wrap gap-2">
        <button className={btnPrimary} disabled={!!err} onClick={() => setText(out)}>Format</button>
        <button className={btn} disabled={!!err} onClick={() => setText(JSON.stringify(JSON.parse(text)))}>Minify</button>
        <CopyBtn text={err ? text : out} />
      </div>
    </div>
  );
}

/* 10. Base64 */
function Base64() {
  const [text, setText] = useState("");
  const enc = (() => { try { return btoa(unescape(encodeURIComponent(text))); } catch { return ""; } })();
  const dec = (() => { try { return decodeURIComponent(escape(atob(text.trim()))); } catch { return "Not valid Base64"; } })();
  return (
    <div className={card}>
      <textarea className={input} rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Text or Base64 paste cheyandi" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2"><div className={label}>Encoded</div><textarea readOnly className={input} rows={4} value={enc} /><CopyBtn text={enc} /></div>
        <div className="space-y-2"><div className={label}>Decoded</div><textarea readOnly className={input} rows={4} value={dec} /><CopyBtn text={dec} /></div>
      </div>
    </div>
  );
}

/* 11. SHA-256 hash */
function Hash() {
  const [text, setText] = useState("");
  const [hex, setHex] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      if (live) setHex([...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join(""));
    })();
    return () => { live = false; };
  }, [text]);
  return (
    <div className={card}>
      <textarea className={input} rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Hash cheyyali anna text" />
      <div className="break-all rounded-xl bg-black/30 p-3 font-mono text-xs">{hex}</div>
      <CopyBtn text={hex} />
    </div>
  );
}

/* 12. Regex tester */
function RegexTool() {
  const [pattern, setPattern] = useState("\\b\\w+@\\w+\\.\\w+\\b");
  const [flags, setFlags] = useState("gi");
  const [text, setText] = useState("Mail me at ganesh@example.com or hello@plotcraft.ai");
  let matches = []; let err = "";
  try { const re = new RegExp(pattern, flags); matches = [...text.matchAll(re)].map((m) => m[0]); } catch (e) { err = e.message; }
  return (
    <div className={card}>
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <input className={input + " font-mono"} value={pattern} onChange={(e) => setPattern(e.target.value)} />
        <input className={input + " font-mono"} value={flags} onChange={(e) => setFlags(e.target.value)} placeholder="flags" />
      </div>
      <textarea className={input} rows={4} value={text} onChange={(e) => setText(e.target.value)} />
      {err ? <p className="text-xs text-rose-300">{err}</p> : <p className="text-xs text-slate-300">{matches.length} match(es)</p>}
      <div className="flex flex-wrap gap-2">{matches.map((m, i) => <span key={i} className="rounded-lg bg-violet-500/25 px-2 py-1 text-xs font-bold">{m}</span>)}</div>
    </div>
  );
}

/* 13. CSV to JSON */
function CsvJson() {
  const [csv, setCsv] = useState("name,score\nAsha,91\nRavi,84");
  const json = useMemo(() => {
    const [head, ...rows] = csv.trim().split("\n").map((r) => r.split(","));
    if (!head) return "[]";
    return JSON.stringify(rows.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || "").trim()]))), null, 2);
  }, [csv]);
  return (
    <div className={card}>
      <div className="grid gap-3 sm:grid-cols-2">
        <textarea className={input + " font-mono"} rows={10} value={csv} onChange={(e) => setCsv(e.target.value)} />
        <textarea readOnly className={input + " font-mono"} rows={10} value={json} />
      </div>
      <div className="flex gap-2"><CopyBtn text={json} /><button className={btn} onClick={() => { const b = new Blob([json], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "data.json"; a.click(); }}><Download size={13} /> Download</button></div>
    </div>
  );
}

/* 14. Markdown preview (headings, bold, italic, code, lists, links) */
function mdToHtml(src) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  return src.split("\n").map((line) => {
    if (/^### /.test(line)) return `<h3>${inline(line.slice(4))}</h3>`;
    if (/^## /.test(line)) return `<h2>${inline(line.slice(3))}</h2>`;
    if (/^# /.test(line)) return `<h1>${inline(line.slice(2))}</h1>`;
    if (/^[-*] /.test(line)) return `<li>${inline(line.slice(2))}</li>`;
    if (!line.trim()) return "<br/>";
    return `<p>${inline(line)}</p>`;
  }).join("");
}
function Markdown() {
  const [md, setMd] = useState("# Hello\n\nThis is **bold**, this is *italic*, and `code`.\n\n- item one\n- item two\n\n[PlotCraft](https://plotcraft.ai)");
  return (
    <div className={card}>
      <div className="grid gap-3 sm:grid-cols-2">
        <textarea className={input + " font-mono"} rows={14} value={md} onChange={(e) => setMd(e.target.value)} />
        <div className="prose prose-invert max-w-none overflow-auto rounded-xl bg-black/30 p-4 text-sm [&_h1]:text-2xl [&_h1]:font-black [&_h2]:text-xl [&_h2]:font-bold [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1" dangerouslySetInnerHTML={{ __html: mdToHtml(md) }} />
      </div>
      <CopyBtn text={md} />
    </div>
  );
}

/* 15. Image resizer (in-browser, nothing uploaded) */
function ImageResize() {
  const [src, setSrc] = useState("");
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [target, setTarget] = useState({ w: 0, h: 0 });
  const [keep, setKeep] = useState(true);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const url = URL.createObjectURL(f); setSrc(url);
    const im = new Image(); im.onload = () => { setDims({ w: im.width, h: im.height }); setTarget({ w: im.width, h: im.height }); imgRef.current = im; }; im.src = url;
  };
  const setW = (w) => setTarget(keep && dims.w ? { w, h: Math.round((w * dims.h) / dims.w) } : { ...target, w });
  const setH = (h) => setTarget(keep && dims.h ? { w: Math.round((h * dims.w) / dims.h), h } : { ...target, h });
  const download = (type) => {
    const c = canvasRef.current; if (!c || !imgRef.current) return;
    c.width = target.w; c.height = target.h; c.getContext("2d").drawImage(imgRef.current, 0, 0, target.w, target.h);
    const a = document.createElement("a"); a.href = c.toDataURL(type, 0.92); a.download = `resized.${type.split("/")[1]}`; a.click();
  };
  return (
    <div className={card}>
      <input type="file" accept="image/*" onChange={onFile} className="text-xs" />
      {src && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <input type="number" className={input + " w-28"} value={target.w} onChange={(e) => setW(+e.target.value)} /> ×
            <input type="number" className={input + " w-28"} value={target.h} onChange={(e) => setH(+e.target.value)} />
            <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /> Keep ratio</label>
          </div>
          <img src={src} alt="" className="max-h-64 rounded-xl" />
          <div className="flex gap-2"><button className={btnPrimary} onClick={() => download("image/png")}><Download size={13} /> PNG</button><button className={btn} onClick={() => download("image/jpeg")}>JPG</button></div>
        </>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

/* 16. Slug generator */
function Slug() {
  const [text, setText] = useState("PlotCraft AI — Best Creative Tools 2026!");
  const slug = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (
    <div className={card}>
      <input className={input} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex items-center gap-2 rounded-xl bg-black/30 p-3"><code className="flex-1 break-all">/{slug || "..."}</code><CopyBtn text={slug} /></div>
    </div>
  );
}

/* 17. Random picker */
function RandomPicker() {
  const [names, setNames] = useState("Asha\nRavi\nMeera\nKiran");
  const [winner, setWinner] = useState("");
  const list = names.split("\n").map((n) => n.trim()).filter(Boolean);
  const pick = () => { if (!list.length) return; const a = new Uint32Array(1); crypto.getRandomValues(a); setWinner(list[a[0] % list.length]); };
  const shuffle = () => setNames([...list].sort(() => Math.random() - 0.5).join("\n"));
  return (
    <div className={card + " text-center"}>
      <textarea className={input} rows={6} value={names} onChange={(e) => setNames(e.target.value)} />
      <div className="text-3xl font-black">{winner || "—"}</div>
      <div className="flex justify-center gap-2"><button className={btnPrimary} onClick={pick}>Pick one</button><button className={btn} onClick={shuffle}>Shuffle list</button></div>
      <p className="text-xs text-slate-400">{list.length} entries</p>
    </div>
  );
}

/* 18. Dice roller */
function Dice() {
  const [sides, setSides] = useState(6);
  const [count, setCount] = useState(2);
  const [rolls, setRolls] = useState([]);
  const roll = () => {
    const a = new Uint32Array(count); crypto.getRandomValues(a);
    const vals = [...a].map((n) => (n % sides) + 1);
    setRolls((r) => [{ vals, total: vals.reduce((x, y) => x + y, 0) }, ...r].slice(0, 12));
  };
  return (
    <div className={card + " text-center"}>
      <div className="flex flex-wrap justify-center gap-2">{[4, 6, 8, 10, 12, 20].map((s) => <button key={s} className={sides === s ? btnPrimary : btn} onClick={() => setSides(s)}>d{s}</button>)}</div>
      <div className="flex items-center justify-center gap-3 text-sm">Dice count <input type="range" min={1} max={6} value={count} onChange={(e) => setCount(+e.target.value)} className="accent-violet-500" /> <b>{count}</b></div>
      <button className={btnPrimary} onClick={roll}>Roll d{sides} × {count}</button>
      {rolls[0] && <div className="text-5xl font-black tabular-nums">{rolls[0].vals.join(" + ")} = {rolls[0].total}</div>}
      <ul className="mx-auto max-w-sm space-y-1 text-sm">{rolls.slice(1).map((r, i) => <li key={i} className="rounded-lg bg-black/30 px-3 py-1 tabular-nums">{r.vals.join(", ")} → {r.total}</li>)}</ul>
    </div>
  );
}

/* 19. Tip & bill splitter */
function Tip() {
  const [bill, setBill] = useState(1200);
  const [tip, setTip] = useState(10);
  const [people, setPeople] = useState(2);
  const total = bill * (1 + tip / 100);
  return (
    <div className={card}>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1"><span className={label}>Bill</span><input type="number" className={input} value={bill} onChange={(e) => setBill(+e.target.value)} /></label>
        <label className="space-y-1"><span className={label}>Tip %</span><input type="number" className={input} value={tip} onChange={(e) => setTip(+e.target.value)} /></label>
        <label className="space-y-1"><span className={label}>People</span><input type="number" min={1} className={input} value={people} onChange={(e) => setPeople(Math.max(1, +e.target.value))} /></label>
      </div>
      <div className="flex flex-wrap gap-2">{[5, 10, 15, 20].map((p) => <button key={p} className={tip === p ? btnPrimary : btn} onClick={() => setTip(p)}>{p}%</button>)}</div>
      <div className="grid gap-3 sm:grid-cols-3"><Stat k="Tip" v={(bill * tip / 100).toFixed(2)} /><Stat k="Total" v={total.toFixed(2)} /><Stat k="Per person" v={(total / people).toFixed(2)} /></div>
    </div>
  );
}

/* 20. BMI calculator */
function Bmi() {
  const [unit, setUnit] = useState("metric");
  const [h, setH] = useState(170);
  const [w, setW] = useState(65);
  const kg = unit === "metric" ? w : w * 0.453592;
  const m = unit === "metric" ? h / 100 : h * 0.0254;
  const bmi = kg / (m * m);
  const cat = !isFinite(bmi) ? "—" : bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy" : bmi < 30 ? "Overweight" : "Obese";
  return (
    <div className={card}>
      <div className="flex gap-2">{["metric", "imperial"].map((u) => <button key={u} className={unit === u ? btnPrimary : btn} onClick={() => setUnit(u)}>{u}</button>)}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1"><span className={label}>Height ({unit === "metric" ? "cm" : "in"})</span><input type="number" className={input} value={h} onChange={(e) => setH(+e.target.value)} /></label>
        <label className="space-y-1"><span className={label}>Weight ({unit === "metric" ? "kg" : "lb"})</span><input type="number" className={input} value={w} onChange={(e) => setW(+e.target.value)} /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2"><Stat k="BMI" v={isFinite(bmi) ? bmi.toFixed(1) : "—"} /><Stat k="Category" v={cat} /></div>
      <p className="text-[11px] text-slate-400">General guide matrame. Medical advice kosam doctor ni kalavandi.</p>
    </div>
  );
}

/* 21. Date calculator */
function DateCalc() {
  const today = new Date().toISOString().slice(0, 10);
  const [a, setA] = useState(today);
  const [b, setB] = useState(today);
  const [add, setAdd] = useState(30);
  const days = Math.round((new Date(b) - new Date(a)) / 86400000);
  const plus = new Date(a); plus.setDate(plus.getDate() + add);
  return (
    <div className={card}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1"><span className={label}>From</span><input type="date" className={input} value={a} onChange={(e) => setA(e.target.value)} /></label>
        <label className="space-y-1"><span className={label}>To</span><input type="date" className={input} value={b} onChange={(e) => setB(e.target.value)} /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2"><Stat k="Days between" v={days} /><Stat k="Weeks" v={(days / 7).toFixed(1)} /></div>
      <div className="flex items-center gap-3"><span className="text-sm">Add days to From:</span><input type="number" className={input + " w-24"} value={add} onChange={(e) => setAdd(+e.target.value)} /><span className="text-sm font-bold">{plus.toDateString()}</span></div>
    </div>
  );
}

export const UTILITY_TOOLS = [
  { id: "util-wordcount", title: "Word Counter", desc: "Words, characters, reading time", Comp: WordCount },
  { id: "util-case", title: "Case Converter", desc: "UPPER, Title, camelCase, slug-case", Comp: CaseConverter },
  { id: "util-lorem", title: "Lorem Generator", desc: "Placeholder text by paragraph or word", Comp: Lorem },
  { id: "util-password", title: "Password Generator", desc: "Strong random passwords", Comp: Password },
  { id: "util-palette", title: "Color Palette", desc: "Harmonious colours and CSS variables", Comp: Palette },
  { id: "util-units", title: "Unit Converter", desc: "Length, weight, volume", Comp: Units },
  { id: "util-pomodoro", title: "Pomodoro Timer", desc: "Focus and break timer", Comp: Pomodoro },
  { id: "util-stopwatch", title: "Stopwatch", desc: "Precise timing with laps", Comp: Stopwatch },
  { id: "util-json", title: "JSON Formatter", desc: "Format, minify, validate", Comp: JsonTool },
  { id: "util-base64", title: "Base64", desc: "Encode and decode text", Comp: Base64 },
  { id: "util-hash", title: "SHA-256 Hash", desc: "Hash text in your browser", Comp: Hash },
  { id: "util-regex", title: "Regex Tester", desc: "Live matches and flags", Comp: RegexTool },
  { id: "util-csv", title: "CSV to JSON", desc: "Convert and download", Comp: CsvJson },
  { id: "util-markdown", title: "Markdown Preview", desc: "Write and preview side by side", Comp: Markdown },
  { id: "util-resize", title: "Image Resizer", desc: "Resize and export, all local", Comp: ImageResize },
  { id: "util-slug", title: "Slug Generator", desc: "URL-safe slugs from titles", Comp: Slug },
  { id: "util-picker", title: "Random Picker", desc: "Pick a winner or shuffle a list", Comp: RandomPicker },
  { id: "util-dice", title: "Dice Roller", desc: "d4 to d20, multiple dice", Comp: Dice },
  { id: "util-tip", title: "Tip Splitter", desc: "Tip and split the bill", Comp: Tip },
  { id: "util-bmi", title: "BMI Calculator", desc: "Metric and imperial", Comp: Bmi },
  { id: "util-dates", title: "Date Calculator", desc: "Days between and add days", Comp: DateCalc },
];

/* Renders the utilities grid (tool = "util") or one tool. */
export default function UtilityTools({ tool = "util", onOpen, onBack }) {
  const current = UTILITY_TOOLS.find((u) => u.id === tool);
  const store = readStore();
  if (!current) {
    const sorted = [...UTILITY_TOOLS].sort((a, b) => Number(!!store[b.id]?.fav) - Number(!!store[a.id]?.fav) || (store[b.id]?.uses || 0) - (store[a.id]?.uses || 0));
    const recent = Object.entries(store).filter(([, v]) => v.last).sort((a, b) => b[1].last - a[1].last).slice(0, 4).map(([k]) => UTILITY_TOOLS.find((u) => u.id === k)).filter(Boolean);
    return (
      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-400">Utilities</p>
          <h2 className="text-2xl font-black">{UTILITY_TOOLS.length} tools, ready to use</h2>
          <p className="text-sm opacity-70">Sab kuch browser lo run avthundi. Files upload avvavu.</p>
        </div>
        {recent.length > 0 && (
          <div className="space-y-2"><div className="text-[11px] font-black uppercase tracking-wider opacity-60">Recently used</div>
            <div className="flex flex-wrap gap-2">{recent.map((u) => <button key={u.id} type="button" onClick={() => onOpen?.(u.id)} className={btn}>{u.title}</button>)}</div></div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map((u, i) => (
            <button key={u.id} type="button" onClick={() => onOpen?.(u.id)} className="group relative rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-xl" style={{ animation: `utilIn .5s ${i * 30}ms both` }}>
              {store[u.id]?.fav && <Star size={13} className="absolute right-3 top-3 fill-amber-400 text-amber-400" />}
              <div className="text-sm font-black">{u.title}</div>
              <div className="mt-1 text-xs opacity-70">{u.desc}</div>
              <div className="mt-3 flex items-center justify-between text-xs"><span className="font-bold text-violet-400 transition group-hover:translate-x-1">Open →</span><span className="opacity-50">{store[u.id]?.uses ? `${store[u.id].uses}× used` : "New"}</span></div>
            </button>
          ))}
        </div>
        <style>{`@keyframes utilIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }`}</style>
      </div>
    );
  }
  const { Comp } = current;
  return (
    <ToolShell id={current.id} title={current.title} onBack={onBack}>
      <Comp />
    </ToolShell>
  );
}