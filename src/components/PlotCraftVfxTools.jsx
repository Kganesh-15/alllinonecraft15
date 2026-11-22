import { useState } from "react";

const MOTIONS = {
  "No motion": { from: { x: 0, y: 0, zoom: 1 }, to: { x: 0, y: 0, zoom: 1 } },
  "Slow push": { from: { x: 0, y: 0, zoom: 1 }, to: { x: 0, y: 0, zoom: 1.18 } },
  "Pull back": { from: { x: 0, y: 0, zoom: 1.18 }, to: { x: 0, y: 0, zoom: 1 } },
  "Pan left": { from: { x: 4, y: 0, zoom: 1.08 }, to: { x: -4, y: 0, zoom: 1.08 } },
  "Pan right": { from: { x: -4, y: 0, zoom: 1.08 }, to: { x: 4, y: 0, zoom: 1.08 } },
  "Drift up": { from: { x: 0, y: 4, zoom: 1.08 }, to: { x: 0, y: -4, zoom: 1.08 } },
  "Dolly in": { from: { x: 2, y: 1, zoom: 1.02 }, to: { x: -2, y: -1, zoom: 1.2 } },
};

const ASPECTS = [
  ["16:9", "Landscape"],
  ["9:16", "Portrait"],
  ["1:1", "Square"],
  ["4:5", "Social"],
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function ActionButton({ children, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${
        active
          ? "border-violet-400 bg-violet-500/20 text-violet-100"
          : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function RangeControl({ label, value, min, max, step = 0.01, onChange, unit = "" }) {
  return (
    <label className="block text-[11px] font-bold text-slate-300">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="text-violet-300">{Number(value).toFixed(2)}{unit}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full accent-violet-500"
      />
    </label>
  );
}

export default function PlotCraftVfxTools({
  tool,
  clip,
  editClip,
  renderOpts,
  setRenderOpts,
  totalSec,
  audio = [],
  onAddCaption,
  onAddBeatEffects,
}) {
  const [caption, setCaption] = useState("");
  const motion = clip?.motion || MOTIONS["No motion"];
  const from = motion.from || MOTIONS["No motion"].from;
  const to = motion.to || MOTIONS["No motion"].to;
  const patchMotion = (edge, key, value) => {
    if (!clip) return;
    editClip(clip.id, { motion: { ...motion, [edge]: { ...motion[edge], [key]: value } } });
  };

  return (
    <section className="vfx-panel-enter space-y-3 rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.08] via-white/[0.03] to-cyan-400/[0.05] p-3">
      <style>{`
        @keyframes vfxPanelEnter {
          from { opacity: 0; transform: translateY(10px) scale(.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .vfx-panel-enter { animation: vfxPanelEnter .3s cubic-bezier(.2,.8,.2,1) both; }
        .kine-editor[data-theme="standard"] .vfx-panel-enter .text-white:not(select),
        .kine-editor[data-theme="world"] .vfx-panel-enter .text-white:not(select),
        .kine-editor[data-theme="emerald"] .vfx-panel-enter .text-white:not(select),
        .kine-editor[data-theme="sunset"] .vfx-panel-enter .text-white:not(select),
        .kine-editor[data-theme="party"] .vfx-panel-enter .text-white:not(select),
        .kine-editor[data-theme="rainy"] .vfx-panel-enter .text-white:not(select) { color: #172033 !important; }
        .kine-editor[data-theme="standard"] .vfx-panel-enter .text-slate-300,
        .kine-editor[data-theme="standard"] .vfx-panel-enter .text-slate-400,
        .kine-editor[data-theme="standard"] .vfx-panel-enter .text-slate-500,
        .kine-editor[data-theme="world"] .vfx-panel-enter .text-slate-300,
        .kine-editor[data-theme="world"] .vfx-panel-enter .text-slate-400,
        .kine-editor[data-theme="world"] .vfx-panel-enter .text-slate-500,
        .kine-editor[data-theme="emerald"] .vfx-panel-enter .text-slate-300,
        .kine-editor[data-theme="emerald"] .vfx-panel-enter .text-slate-400,
        .kine-editor[data-theme="emerald"] .vfx-panel-enter .text-slate-500,
        .kine-editor[data-theme="sunset"] .vfx-panel-enter .text-slate-300,
        .kine-editor[data-theme="sunset"] .vfx-panel-enter .text-slate-400,
        .kine-editor[data-theme="sunset"] .vfx-panel-enter .text-slate-500,
        .kine-editor[data-theme="party"] .vfx-panel-enter .text-slate-300,
        .kine-editor[data-theme="party"] .vfx-panel-enter .text-slate-400,
        .kine-editor[data-theme="party"] .vfx-panel-enter .text-slate-500,
        .kine-editor[data-theme="rainy"] .vfx-panel-enter .text-slate-300,
        .kine-editor[data-theme="rainy"] .vfx-panel-enter .text-slate-400,
        .kine-editor[data-theme="rainy"] .vfx-panel-enter .text-slate-500 { color: #475569 !important; }
        .kine-editor[data-theme="standard"] .vfx-panel-enter .text-violet-100,
        .kine-editor[data-theme="world"] .vfx-panel-enter .text-violet-100,
        .kine-editor[data-theme="emerald"] .vfx-panel-enter .text-violet-100,
        .kine-editor[data-theme="sunset"] .vfx-panel-enter .text-violet-100,
        .kine-editor[data-theme="party"] .vfx-panel-enter .text-violet-100,
        .kine-editor[data-theme="rainy"] .vfx-panel-enter .text-violet-100 { color: #5b21b6 !important; }
        .kine-editor[data-theme="standard"] .vfx-panel-enter .text-violet-300,
        .kine-editor[data-theme="world"] .vfx-panel-enter .text-violet-300,
        .kine-editor[data-theme="emerald"] .vfx-panel-enter .text-violet-300,
        .kine-editor[data-theme="sunset"] .vfx-panel-enter .text-violet-300,
        .kine-editor[data-theme="party"] .vfx-panel-enter .text-violet-300,
        .kine-editor[data-theme="rainy"] .vfx-panel-enter .text-violet-300 { color: #6d28d9 !important; }
        @media (prefers-reduced-motion: reduce) {
          .vfx-panel-enter { animation: none; }
        }
      `}</style>

      {tool === "keys" && (
        <>
          <div>
            <p className="text-sm font-black text-white">Camera keyframes</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              Animate position and zoom from the start to the end of the selected clip.
            </p>
          </div>
          {!clip ? (
            <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
              Import and select a clip to add camera motion.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(MOTIONS).map(([name, preset]) => (
                  <ActionButton
                    key={name}
                    active={JSON.stringify(motion.from) === JSON.stringify(preset.from) && JSON.stringify(motion.to) === JSON.stringify(preset.to)}
                    onClick={() => editClip(clip.id, { motion: { ...preset, easing: "easeInOut" } })}
                  >
                    {name}
                  </ActionButton>
                ))}
              </div>
              <div className="space-y-2 rounded-xl border border-white/10 bg-black/10 p-3">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-300">Start keyframe</p>
                <RangeControl label="Zoom" value={from.zoom ?? 1} min={1} max={2.5} unit="×" onChange={(value) => patchMotion("from", "zoom", value)} />
                <RangeControl label="Horizontal" value={from.x ?? 0} min={-10} max={10} unit="%" onChange={(value) => patchMotion("from", "x", value)} />
                <RangeControl label="Vertical" value={from.y ?? 0} min={-10} max={10} unit="%" onChange={(value) => patchMotion("from", "y", value)} />
              </div>
              <div className="space-y-2 rounded-xl border border-white/10 bg-black/10 p-3">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-300">End keyframe</p>
                <RangeControl label="Zoom" value={to.zoom ?? 1} min={1} max={2.5} unit="×" onChange={(value) => patchMotion("to", "zoom", value)} />
                <RangeControl label="Horizontal" value={to.x ?? 0} min={-10} max={10} unit="%" onChange={(value) => patchMotion("to", "x", value)} />
                <RangeControl label="Vertical" value={to.y ?? 0} min={-10} max={10} unit="%" onChange={(value) => patchMotion("to", "y", value)} />
              </div>
              <label className="block text-[11px] font-bold text-slate-300">
                Motion easing
                <select
                  value={motion.easing || "easeInOut"}
                  onChange={(event) => editClip(clip.id, { motion: { ...motion, easing: event.target.value } })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2.5 py-2 text-xs text-white"
                >
                  <option value="linear">Linear</option>
                  <option value="easeIn">Ease in</option>
                  <option value="easeOut">Ease out</option>
                  <option value="easeInOut">Ease in / out</option>
                </select>
              </label>
            </>
          )}
        </>
      )}

      {tool === "beat" && (
        <>
          <div>
            <p className="text-sm font-black text-white">Beat accents</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              Use the imported track waveform to place short flash effects on prominent beats.
            </p>
          </div>
          <button
            type="button"
            disabled={!audio.some((track) => track.peaks?.length)}
            onClick={onAddBeatEffects}
            className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-3 py-2.5 text-xs font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add beat-synced flashes
          </button>
          {!audio.length && <p className="text-[11px] text-slate-400">Import a song first from the Music tab.</p>}
        </>
      )}

      {tool === "captions" && (
        <>
          <div>
            <p className="text-sm font-black text-white">Caption studio</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              Add a timed, animated caption at the current playhead.
            </p>
          </div>
          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={180}
            rows={3}
            placeholder="Type a caption…"
            className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white placeholder:text-slate-500"
          />
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Lower-third · slide-up motion</span>
            <span>{caption.length}/180</span>
          </div>
          <button
            type="button"
            disabled={!caption.trim()}
            onClick={() => {
              onAddCaption?.({ text: caption.trim(), duration: clamp(Number(renderOpts.captionDuration) || 3, 0.5, 10) });
              setCaption("");
            }}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-3 py-2.5 text-xs font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add caption at playhead
          </button>
          <RangeControl
            label="Caption duration"
            value={Number(renderOpts.captionDuration) || 3}
            min={0.5}
            max={10}
            step={0.5}
            unit=" s"
            onChange={(captionDuration) => setRenderOpts((current) => ({ ...current, captionDuration }))}
          />
        </>
      )}

      {tool === "export" && (
        <>
          <div>
            <p className="text-sm font-black text-white">Export framing</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              Choose a canvas shape for the next render. The top Render button uses these settings.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ASPECTS.map(([ratio, label]) => (
              <ActionButton
                key={ratio}
                active={(renderOpts.aspect || "16:9") === ratio}
                onClick={() => setRenderOpts((current) => ({ ...current, aspect: ratio }))}
              >
                <span className="block">{label}</span>
                <span className="mt-0.5 block text-[10px] font-medium text-slate-400">{ratio}</span>
              </ActionButton>
            ))}
          </div>
          <div className="rounded-xl border border-white/10 bg-black/10 p-3 text-[11px] text-slate-300">
            Timeline length: <strong className="text-white">{Number(totalSec || 0).toFixed(1)} s</strong>
            <span className="mt-1 block text-slate-500">Resolution and frame rate are available in the studio toolbar.</span>
          </div>
        </>
      )}
    </section>
  );
}
