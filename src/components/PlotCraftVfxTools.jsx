import React, { useMemo, useState } from "react";

/* Video & VFX extra tools: Keyframes, Beat sync, Captions, Export.
   Works with the existing clip model (clip.id, clip.start, clip.end, clip.speed) and editClip(id, patch). */

const KEY_PROPS = [
  { id: "scale", label: "Scale", min: 0.5, max: 2, step: 0.01, def: 1 },
  { id: "opacity", label: "Opacity", min: 0, max: 1, step: 0.01, def: 1 },
  { id: "rotate", label: "Rotate °", min: -180, max: 180, step: 1, def: 0 },
  { id: "x", label: "Move X %", min: -50, max: 50, step: 1, def: 0 },
];

const RESOLUTIONS = [
  { label: "720p", w: 1280, h: 720, mbps: 8 },
  { label: "1080p", w: 1920, h: 1080, mbps: 16 },
  { label: "1440p", w: 2560, h: 1440, mbps: 28 },
  { label: "4K", w: 3840, h: 2160, mbps: 45 },
];

/* Smoothstep interpolation between keyframes. t is 0..1 across the clip. */
export function interpolateKeys(keys, t) {
  if (!keys || !keys.length) return null;
  const k = [...keys].sort((a, b) => a.t - b.t);
  if (t <= k[0].t) return k[0].v;
  if (t >= k[k.length - 1].t) return k[k.length - 1].v;
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i], b = k[i + 1];
    if (t >= a.t && t <= b.t) {
      const u = (t - a.t) / (b.t - a.t || 1);
      const e = u * u * (3 - 2 * u);
      return a.v + (b.v - a.v) * e;
    }
  }
  return k[0].v;
}

const pill = (on) =>
  `rounded-lg border px-2.5 py-1.5 text-[11px] font-black transition ${on ? "border-violet-400 bg-violet-600 text-white" : "border-white/10 text-slate-300 hover:bg-white/10"}`;
const btn = "rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-black text-slate-200 hover:bg-white/10 disabled:opacity-40";
const input = "w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-slate-100 focus:border-violet-400 focus:outline-none";

/* ---------- Keyframes ---------- */
function KeyframesTool({ clip, editClip }) {
  const [prop, setProp] = useState("scale");
  const [at, setAt] = useState(0.5);
  const def = KEY_PROPS.find((p) => p.id === prop);
  const keys = (clip.keys && clip.keys[prop]) || [];
  const value = interpolateKeys(keys, at) ?? def.def;

  const saveKeys = (list) => editClip(clip.id, { keys: { ...(clip.keys || {}), [prop]: list } });
  const addKey = () => {
    const next = [...keys.filter((k) => Math.abs(k.t - at) > 0.001), { t: at, v: value }];
    saveKeys(next.sort((a, b) => a.t - b.t));
  };

  // Curve preview: 60 samples across the clip.
  const path = useMemo(() => {
    const W = 240, H = 80;
    const pts = Array.from({ length: 61 }, (_, i) => {
      const t = i / 60;
      const v = interpolateKeys(keys, t) ?? def.def;
      const y = H - ((v - def.min) / (def.max - def.min)) * H;
      return `${(t * W).toFixed(1)},${Math.max(0, Math.min(H, y)).toFixed(1)}`;
    });
    return pts.join(" ");
  }, [keys, def]);

  return (
    <div className="space-y-3">
      <p className="text-xs font-black">Keyframes</p>
      <div className="flex flex-wrap gap-1.5">
        {KEY_PROPS.map((p) => <button key={p.id} type="button" className={pill(prop === p.id)} onClick={() => setProp(p.id)}>{p.label}</button>)}
      </div>
      <svg viewBox="0 0 240 80" className="w-full rounded-lg bg-black/40">
        <polyline points={path} fill="none" stroke="#a78bfa" strokeWidth="2" />
        {keys.map((k) => {
          const y = 80 - ((k.v - def.min) / (def.max - def.min)) * 80;
          return <circle key={k.t} cx={k.t * 240} cy={Math.max(0, Math.min(80, y))} r="4" fill="#f0abfc" />;
        })}
        <line x1={at * 240} x2={at * 240} y1="0" y2="80" stroke="#fde68a" strokeWidth="1" />
      </svg>
      <label className="block text-[11px] font-bold text-slate-300">
        Position in clip: {Math.round(at * 100)}%
        <input type="range" min={0} max={1} step={0.01} value={at} onChange={(e) => setAt(Number(e.target.value))} className="mt-1 w-full accent-violet-500" />
      </label>
      <p className="text-[11px] text-slate-300">Value here: <span className="text-violet-300">{Number(value).toFixed(2)}</span></p>
      <div className="flex gap-2">
        <button type="button" className={btn} onClick={addKey}>+ Key at {Math.round(at * 100)}%</button>
        <button type="button" className={btn} disabled={!keys.length} onClick={() => saveKeys([])}>Clear {def.label}</button>
      </div>
      <div className="space-y-1">
        {keys.map((k, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-[11px]">
            <span className="w-14 text-slate-400">{Math.round(k.t * 100)}%</span>
            <input type="number" className={input} step={def.step} min={def.min} max={def.max} value={Number(k.v).toFixed(2)}
              onChange={(e) => saveKeys(keys.map((x, j) => (j === i ? { ...x, v: Number(e.target.value) } : x)))} />
            <button type="button" className="text-rose-300 hover:text-rose-200" onClick={() => saveKeys(keys.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        {!keys.length && <p className="text-[11px] text-slate-400">No keys yet. Slider lo position pick chesi "+ Key" nokkandi.</p>}
      </div>
    </div>
  );
}

/* ---------- Beat sync ---------- */
async function detectBeats(file, sensitivity) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  try {
    const buf = await ctx.decodeAudioData(await file.arrayBuffer());
    const data = buf.getChannelData(0);
    const hop = Math.floor(buf.sampleRate * 0.05); // 50 ms blocks
    const energy = [];
    for (let i = 0; i + hop <= data.length; i += hop) {
      let s = 0;
      for (let j = i; j < i + hop; j++) s += data[j] * data[j];
      energy.push(Math.sqrt(s / hop));
    }
    const beats = [];
    const win = 10;
    let last = -1;
    for (let i = win; i < energy.length; i++) {
      const avg = energy.slice(i - win, i).reduce((a, b) => a + b, 0) / win;
      const isPeak = energy[i] > energy[i - 1] && energy[i] >= energy[i + 1 < energy.length ? i + 1 : i];
      if (isPeak && energy[i] > avg * sensitivity && energy[i] > 0.02 && i * 0.05 - last >= 0.3) {
        beats.push(Number((i * 0.05).toFixed(2)));
        last = i * 0.05;
      }
    }
    return { beats, duration: buf.duration };
  } finally {
    ctx.close?.();
  }
}

function BeatTool() {
  const [file, setFile] = useState(null);
  const [sens, setSens] = useState(1.6);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!file) return;
    setBusy(true); setError("");
    try { setResult(await detectBeats(file, sens)); }
    catch { setError("Audio decode avvaledu. MP3/WAV file try cheyandi."); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-black">Beat sync</p>
      <input type="file" accept="audio/*" onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); }} className="text-[11px]" />
      <label className="block text-[11px] font-bold text-slate-300">
        Sensitivity: {sens.toFixed(1)}
        <input type="range" min={1.1} max={3} step={0.1} value={sens} onChange={(e) => setSens(Number(e.target.value))} className="mt-1 w-full accent-violet-500" />
      </label>
      <button type="button" className={btn} disabled={!file || busy} onClick={run}>{busy ? "Analyzing…" : "Detect beats"}</button>
      {error && <p className="text-[11px] text-rose-300">{error}</p>}
      {result && (
        <>
          <p className="text-[11px] text-slate-300">{result.beats.length} beats found in {result.duration.toFixed(1)}s · avg gap {result.beats.length > 1 ? ((result.beats[result.beats.length - 1] - result.beats[0]) / (result.beats.length - 1)).toFixed(2) : "–"}s</p>
          <div className="flex flex-wrap gap-1">
            {result.beats.slice(0, 80).map((b) => <span key={b} className="rounded bg-violet-500/25 px-1.5 py-0.5 text-[10px] text-violet-100">{b}s</span>)}
          </div>
          <p className="text-[11px] text-slate-400">Beat times ni cut points ga use cheyyochu. Sensitivity pettandi ante takkuva beats vasthayi.</p>
        </>
      )}
    </div>
  );
}

/* ---------- Captions ---------- */
function CaptionsTool({ clip, editClip }) {
  const [script, setScript] = useState("");
  const [style, setStyle] = useState({ pos: "bottom", size: "md", color: "#ffffff" });
  const captions = clip.captions || [];
  const len = Math.max(0.1, (clip.end - clip.start) / (clip.speed || 1));

  const autoTime = () => {
    const words = script.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return;
    const lines = [];
    for (let i = 0; i < words.length; i += 6) lines.push(words.slice(i, i + 6).join(" "));
    const step = len / lines.length;
    editClip(clip.id, { captions: lines.map((text, i) => ({ t0: +(i * step).toFixed(2), t1: +((i + 1) * step).toFixed(2), text })), captionStyle: style });
  };
  const update = (i, patch) => editClip(clip.id, { captions: captions.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

  return (
    <div className="space-y-3">
      <p className="text-xs font-black">Captions</p>
      <textarea rows={4} className={input} placeholder="Script/dialogue paste cheyandi. 6 words ki oka line ga auto-time avthundi." value={script} onChange={(e) => setScript(e.target.value)} />
      <div className="flex flex-wrap gap-1.5">
        {["top", "middle", "bottom"].map((p) => <button key={p} type="button" className={pill(style.pos === p)} onClick={() => setStyle({ ...style, pos: p })}>{p}</button>)}
        {["#ffffff", "#fde68a", "#86efac", "#f9a8d4"].map((c) => <button key={c} type="button" aria-label={c} onClick={() => setStyle({ ...style, color: c })} className="h-6 w-6 rounded-full border border-white/30" style={{ background: c, outline: style.color === c ? "2px solid #a78bfa" : "none" }} />)}
      </div>
      <button type="button" className={btn} disabled={!script.trim()} onClick={autoTime}>Auto-time across clip</button>
      <div className="space-y-1.5">
        {captions.map((c, i) => (
          <div key={i} className="grid grid-cols-[52px_52px_1fr] items-center gap-1.5">
            <input type="number" step="0.1" className={input} value={c.t0} onChange={(e) => update(i, { t0: Number(e.target.value) })} />
            <input type="number" step="0.1" className={input} value={c.t1} onChange={(e) => update(i, { t1: Number(e.target.value) })} />
            <input className={input} value={c.text} onChange={(e) => update(i, { text: e.target.value })} />
          </div>
        ))}
        {!captions.length && <p className="text-[11px] text-slate-400">Captions ledu. Script paste chesi auto-time cheyandi.</p>}
      </div>
      <p className="text-[11px] text-slate-400">Idi script/manual timing. Speech-to-text auto captions kaadu.</p>
    </div>
  );
}

/* ---------- Export settings ---------- */
function ExportTool({ totalSec }) {
  const [res, setRes] = useState(RESOLUTIONS[1]);
  const [fps, setFps] = useState(30);
  const [mbps, setMbps] = useState(RESOLUTIONS[1].mbps);
  const [format, setFormat] = useState("mp4");
  const sizeMb = (mbps * totalSec) / 8;

  const pickRes = (r) => { setRes(r); setMbps(r.mbps); };
  return (
    <div className="space-y-3">
      <p className="text-xs font-black">Export</p>
      <div className="flex flex-wrap gap-1.5">
        {RESOLUTIONS.map((r) => <button key={r.label} type="button" className={pill(res.label === r.label)} onClick={() => pickRes(r)}>{r.label}</button>)}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[24, 30, 60].map((f) => <button key={f} type="button" className={pill(fps === f)} onClick={() => setFps(f)}>{f} fps</button>)}
        {["mp4", "webm", "mov"].map((f) => <button key={f} type="button" className={pill(format === f)} onClick={() => setFormat(f)}>{f.toUpperCase()}</button>)}
      </div>
      <label className="block text-[11px] font-bold text-slate-300">
        Bitrate: {mbps} Mbps
        <input type="range" min={2} max={50} step={1} value={mbps} onChange={(e) => setMbps(Number(e.target.value))} className="mt-1 w-full accent-violet-500" />
      </label>
      <div className="rounded-lg bg-white/5 p-2.5 text-[11px] text-slate-300">
        <div>Output: {res.w}×{res.h} · {fps}fps · {format.toUpperCase()}</div>
        <div>Length: {totalSec.toFixed(1)}s</div>
        <div className="font-black text-violet-300">Estimated size: ~{sizeMb.toFixed(1)} MB</div>
      </div>
    </div>
  );
}

function VfxToolPanel({ tool, clip, editClip, totalSec = 0 }) {
  if (tool === "beat") return <BeatTool />;
  if (tool === "export") return <ExportTool totalSec={totalSec} />;
  if (!clip) return <p className="text-[11px] text-slate-400">Import and select a clip first.</p>;
  if (tool === "keys") return <KeyframesTool clip={clip} editClip={editClip} />;
  if (tool === "captions") return <CaptionsTool clip={clip} editClip={editClip} />;
  return null;
}

export { VfxToolPanel };
export default VfxToolPanel;