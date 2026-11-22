import { useMemo, useState } from "react";
import { Check, Copy, Image, Loader2, Sparkles, Video, Wand2 } from "lucide-react";
import { chatAI } from "../services/openai";

const PRESETS = [
  {
    label: "Storybook",
    subject: "A young fox discovering a glowing forest",
    style: "Whimsical storybook illustration",
    lighting: "Warm golden-hour light",
    mood: "Curious and magical",
    composition: "Wide cinematic composition",
  },
  {
    label: "Product",
    subject: "A premium glass perfume bottle on dark stone",
    style: "Luxury product photography",
    lighting: "Soft studio lighting with crisp reflections",
    mood: "Elegant and refined",
    composition: "Centered hero shot",
  },
  {
    label: "Sci-fi",
    subject: "A tiny explorer standing before an enormous space station",
    style: "Cinematic science-fiction concept art",
    lighting: "Blue rim light with a warm distant glow",
    mood: "Awe-inspiring",
    composition: "Low-angle wide shot",
  },
];

const STYLE_OPTIONS = [
  "Cinematic concept art",
  "Whimsical storybook illustration",
  "Photorealistic",
  "Watercolor painting",
  "Minimal 3D render",
  "Editorial photography",
];
const LIGHTING_OPTIONS = [
  "Soft cinematic light",
  "Warm golden-hour light",
  "Moody dramatic shadows",
  "Bright natural daylight",
  "Neon rim lighting",
  "Soft studio lighting",
];
const COMPOSITIONS = [
  "Wide cinematic composition",
  "Centered hero shot",
  "Close-up portrait",
  "Top-down composition",
  "Low-angle wide shot",
];

export default function PromptHelper({ currentStyle, onUsePrompt }) {
  const [mode, setMode] = useState("image");
  const [form, setForm] = useState({
    subject: "",
    style: STYLE_OPTIONS[0],
    lighting: LIGHTING_OPTIONS[0],
    mood: "",
    composition: COMPOSITIONS[0],
    details: "",
    avoid: "",
    motion: "",
  });
  const [refinedPrompt, setRefinedPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const generatedPrompt = useMemo(() => {
    const parts = [
      form.subject.trim(),
      form.style,
      form.composition,
      form.lighting,
      form.mood.trim() && `${form.mood.trim()} mood`,
      form.details.trim(),
      mode === "video" && form.motion.trim() && `Camera and subject motion: ${form.motion.trim()}`,
      mode === "video" ? "Coherent movement, stable subject, clean cinematic frames" : "Clear subject, thoughtful detail, polished composition",
    ].filter(Boolean);
    const avoid = form.avoid.trim();
    return `${parts.join(", ")}${avoid ? `\nAvoid: ${avoid}` : ""}`;
  }, [form, mode]);

  const prompt = refinedPrompt || generatedPrompt;
  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setRefinedPrompt("");
    setError("");
  };
  const applyPreset = (preset) => {
    setForm((current) => ({ ...current, ...preset }));
    setRefinedPrompt("");
    setError("");
  };

  const refine = async () => {
    if (!form.subject.trim()) {
      setError("First add a subject or scene to build the prompt.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await chatAI({
        messages: [
          {
            role: "system",
            content: "Improve the user's image or video-generation prompt. Keep their subject and intent, add concise visual specificity, avoid unsupported claims, and return only the finished prompt.",
          },
          {
            role: "user",
            content: `Mode: ${mode}\nPrompt:\n${generatedPrompt}`,
          },
        ],
      });
      setRefinedPrompt(String(result || "").trim());
    } catch (requestError) {
      setError(requestError.message || "Could not refine this prompt. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Clipboard access is unavailable in this browser.");
    }
  };

  const card = `${currentStyle?.bgCard || "bg-white/5"} min-w-0 rounded-3xl border border-white/10 p-5 shadow-xl sm:p-7`;
  const field = `w-full rounded-xl border px-3 py-2.5 text-sm ${currentStyle?.bgInput || "border-white/10 bg-black/20 text-current"}`;

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <header className={`${card} relative overflow-hidden`}>
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
        <p className="relative flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-violet-400">
          <Wand2 size={15} /> Prompt workshop
        </p>
        <h1 className="relative mt-3 text-2xl font-black tracking-tight sm:text-4xl">Turn a rough idea into a ready-to-create prompt.</h1>
        <p className="relative mt-2 max-w-2xl text-sm opacity-70">
          Shape the scene, refine it with AI, then send it directly to the image or video studio.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.9fr)]">
        <div className={`${card} space-y-5`}>
          <div className="flex flex-wrap gap-2" aria-label="Prompt type">
            {[["image", Image, "Image"], ["video", Video, "Video"]].map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => { setMode(value); setRefinedPrompt(""); }}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition ${
                  mode === value ? "border-violet-400 bg-violet-600 text-white" : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <Icon size={15} /> {label} prompt
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="prompt-subject" className="mb-1.5 block text-xs font-bold">What should the scene show?</label>
            <textarea
              id="prompt-subject"
              rows={3}
              value={form.subject}
              onChange={(event) => update("subject", event.target.value)}
              placeholder="A small astronaut exploring a garden on the moon..."
              className={field}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-bold">
              Visual style
              <select value={form.style} onChange={(event) => update("style", event.target.value)} className={field}>
                {STYLE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-bold">
              Composition
              <select value={form.composition} onChange={(event) => update("composition", event.target.value)} className={field}>
                {COMPOSITIONS.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-bold">
              Lighting
              <select value={form.lighting} onChange={(event) => update("lighting", event.target.value)} className={field}>
                {LIGHTING_OPTIONS.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-bold">
              Mood
              <input value={form.mood} onChange={(event) => update("mood", event.target.value)} placeholder="Dreamy, tense, joyful..." className={field} />
            </label>
          </div>

          {mode === "video" && (
            <label className="block space-y-1.5 text-xs font-bold">
              Motion and camera direction
              <input value={form.motion} onChange={(event) => update("motion", event.target.value)} placeholder="Slow dolly-in, leaves drift in the breeze..." className={field} />
            </label>
          )}

          <label className="block space-y-1.5 text-xs font-bold">
            Extra details
            <textarea rows={2} value={form.details} onChange={(event) => update("details", event.target.value)} placeholder="Characters, setting, colors, textures..." className={field} />
          </label>
          <label className="block space-y-1.5 text-xs font-bold">
            Avoid
            <input value={form.avoid} onChange={(event) => update("avoid", event.target.value)} placeholder="Blurry details, text, watermarks..." className={field} />
          </label>

          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wider opacity-60">Quick starts</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button key={preset.label} type="button" onClick={() => applyPreset(preset)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold transition hover:border-violet-400 hover:bg-violet-500/10">
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className={`${card} flex min-w-0 flex-col gap-4`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-violet-400">Live preview</p>
              <p className="mt-1 text-[11px] opacity-60">{mode === "image" ? "Image prompt" : "Video prompt"}</p>
            </div>
            <button type="button" onClick={refine} disabled={busy || !form.subject.trim()} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${currentStyle?.btnPrimary || "bg-violet-600 text-white"} disabled:cursor-not-allowed disabled:opacity-50`}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {busy ? "Refining..." : "Refine with AI"}
            </button>
          </div>

          <pre aria-live="polite" className="min-h-48 flex-1 whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/20 p-4 font-sans text-sm leading-7">
            {prompt || "Your assembled prompt will appear here as you add details."}
          </pre>
          {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}

          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={copy} disabled={!prompt.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-xs font-bold hover:bg-white/10 disabled:opacity-50">
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy prompt"}
            </button>
            <button type="button" onClick={() => onUsePrompt?.(prompt, mode)} disabled={!form.subject.trim()} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black ${currentStyle?.btnPrimary || "bg-violet-600 text-white"} disabled:opacity-50`}>
              {mode === "image" ? <Image size={15} /> : <Video size={15} />}
              Open {mode === "image" ? "Image" : "Video"} studio
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
