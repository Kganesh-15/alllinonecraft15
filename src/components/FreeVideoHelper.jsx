import React, { useRef, useState } from "react";
import { ExternalLink, Upload, Copy, Check, Loader2, ChevronDown, Sparkles, Video, PlayCircle, ShieldCheck } from "lucide-react";

// Expanded 7 Free high-performance video generation engines
const SITES = [
  { name: "Upsampler Instant Video", url: "https://upsampler.com/free-video-generator-no-signup", badge: "No Login" },
  { name: "LTX Video (Hugging Face)", url: "https://huggingface.co/spaces/Lightricks/ltx-video-distilled", badge: "Fast" },
  { name: "SANA Video Studio", url: "https://huggingface.co/spaces/Efficient-Large-Model/sana-video2-5b-720p-demo", badge: "HD" },
  { name: "Hunyuan Video Engine", url: "https://huggingface.co/spaces/tencent/HunyuanVideo", badge: "Cinematic" },
  { name: "CogVideoX-Fun", url: "https://huggingface.co/spaces/THUDM/CogVideoX-Fun", badge: "Popular" },
  { name: "Kling AI Free Web", url: "https://klingai.org/", badge: "Advanced" },
  { name: "Luma Dream Machine", url: "https://lumalabs.ai/dream-machine", badge: "Pro" },
];

const MAX_BYTES = 80 * 1024 * 1024; // 80 MB limit

export default function FreeVideoHelper({ 
  currentStyle = {}, 
  prompt = "", 
  message = "", 
  defaultOpen = false, 
  currentUser = null, 
  onRequireLogin = () => {}, 
  onUploaded = () => {} 
}) {
  const [open, setOpen] = useState(!!defaultOpen || !!message);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const isLightMode = 
    !currentStyle?.bgMain?.includes("slate-950") && 
    !currentStyle?.bgMain?.includes("black") && 
    !currentStyle?.bgMain?.includes("emerald") && 
    !currentStyle?.bgMain?.includes("blue") && 
    !currentStyle?.bgMain?.includes("slate-900") &&
    !currentStyle?.bgMain?.includes("indigo");

  const btnSecondary = currentStyle?.btnSecondary || "bg-black/10 hover:bg-black/20 text-black dark:bg-white/10 dark:hover:bg-white/20 dark:text-white";
  const btnPrimary = currentStyle?.btnPrimary || "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white";

  React.useEffect(() => {
    if (defaultOpen || message) {
      setOpen(true);
    }
  }, [defaultOpen, message]);

  const copyPrompt = async (index = null) => {
    try {
      await navigator.clipboard.writeText(prompt || "Cinematic masterpiece, smooth camera movement, highly detailed");
      if (index !== null) {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      }
    } catch {}
  };

  const handleLaunchSite = async (url, index) => {
    await copyPrompt(index);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const processFile = async (file) => {
    setError("");
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      return setError("Dayachesi valid video file (.mp4, .webm, .mov) ni matrame select cheyandi.");
    }
    if (file.size > MAX_BYTES) {
      return setError("Video file size chala peddaga undi (Maximum allowed limit: 80 MB).");
    }
    if (!currentUser) {
      return onRequireLogin();
    }

    setBusy(true);
    try {
      if (typeof onUploaded === "function") {
        await onUploaded(file);
      }
    } catch (err) {
      setError(err?.message || "Video file upload avvatledu. Malli try cheyandi.");
    } finally {
      setBusy(false);
    }
  };

  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  return (
    <div className={`rounded-[2rem] ${isLightMode ? 'bg-white/90 border-slate-200 text-slate-900 shadow-xl' : 'bg-slate-900/80 border-purple-500/30 text-white shadow-2xl'} border backdrop-blur-2xl overflow-hidden transition-all duration-300`}>
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        .animate-glow {
          animation: pulseGlow 4s ease-in-out infinite;
        }
      `}</style>

      {/* Header Banner */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-3 px-6 py-4 text-xs md:text-sm font-extrabold cursor-pointer transition-colors ${
          isLightMode ? 'hover:bg-purple-50 text-purple-950' : 'hover:bg-purple-950/40 text-purple-200'
        }`}
      >
        <span className="flex items-center gap-3 text-left">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-md">
            <Video className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <span className="block text-sm font-black">
              {message || "AI Video Engine Busy? Instant Free Generator Hub"}
            </span>
            <span className="text-[11px] font-normal opacity-70">
              Click any free platform below — prompt copies instantly & launches generator!
            </span>
          </div>
        </span>
        <div className={`p-1.5 rounded-full ${isLightMode ? 'bg-purple-100' : 'bg-white/10'} transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          <ChevronDown className="w-4 h-4 shrink-0" />
        </div>
      </button>

      {/* Expanded Content */}
      {open && (
        <div className="px-6 pb-6 space-y-5 border-t border-purple-500/20 pt-5">
          {/* Active Prompt Preview Box */}
          <div className={`p-4 rounded-2xl ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-black/30 border-white/10'} border relative group`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Target Scene Prompt
              </span>
              <button
                type="button"
                onClick={() => copyPrompt('main')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${btnSecondary} transition-all`}
              >
                {copiedIndex === 'main' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copiedIndex === 'main' ? "Copied!" : "Copy Text"}
              </button>
            </div>
            <p className="text-xs opacity-85 italic font-medium line-clamp-2">
              "{prompt || "Cinematic atmospheric shot, high detail, masterpiece animation..."}"
            </p>
          </div>

          {/* Platforms Grid */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold opacity-80 uppercase tracking-wider flex items-center gap-1.5">
              <PlayCircle className="w-3.5 h-3.5 text-pink-500" /> Choose Free Generator (Auto-copies prompt):
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {SITES.map((site, idx) => {
                const isCopied = copiedIndex === idx;
                return (
                  <button
                    key={site.url}
                    type="button"
                    onClick={() => handleLaunchSite(site.url, idx)}
                    className={`p-3 rounded-2xl border text-left flex items-center justify-between gap-2 cursor-pointer transition-all duration-300 group hover:scale-[1.02] ${
                      isLightMode 
                        ? 'bg-slate-50/80 border-slate-200 hover:border-purple-500 shadow-sm' 
                        : 'bg-white/5 border-white/10 hover:border-pink-500/50 shadow-md'
                    }`}
                  >
                    <div className="space-y-0.5 truncate">
                      <div className="text-xs font-bold truncate group-hover:text-purple-400 transition-colors">
                        {site.name}
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-semibold">
                        {site.badge}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-purple-500/10 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                      {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div className="space-y-3 pt-2">
            <input 
              ref={inputRef} 
              type="file" 
              accept="video/*" 
              onChange={handleFilePick} 
              className="hidden" 
            />

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => (currentUser ? inputRef.current?.click() : onRequireLogin())}
              className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all duration-300 ${
                dragOver 
                  ? 'border-purple-500 bg-purple-500/10 scale-[1.01]' 
                  : isLightMode 
                    ? 'border-slate-300 hover:border-purple-500 bg-slate-50' 
                    : 'border-white/20 hover:border-pink-500 bg-white/5'
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25">
                  {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-xs md:text-sm font-black tracking-tight">
                    {currentUser ? "Drag & drop your generated video here, or browse" : "Log in to upload your generated video"}
                  </p>
                  <p className="text-[11px] opacity-60 mt-0.5">
                    Supports MP4, WebM, MOV up to 80MB
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}