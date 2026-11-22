import { useEffect, useRef, useState } from "react";
import { BookOpen, MessageSquare, Image as ImageIcon, Video, Volume2, Palette, ChevronDown, Heart, Star, Sparkles, FolderOpen, LayoutGrid, Users, Search } from "lucide-react";
import PlotCraftLogo from "./PlotCraftLogo";
import { fetchStats } from "../services/api";

const useAboutCountUp = (target, run) => {
  const [value, setValue] = useState(0);
  const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (!run || target == null || reduceMotion) return;
    const start = performance.now();
    const duration = 1400;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(target * (1 - Math.pow(1 - t, 4))); // ease-out
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, reduceMotion]);
  return reduceMotion && target != null ? target : value;
};

function AboutStat({ label, value, decimals = 0, run }) {
  const v = useAboutCountUp(value, run);
  return (
    <div className="group relative text-center p-5 rounded-3xl bg-white/5 dark:bg-black/20 border border-white/10 dark:border-white/5 backdrop-blur-xl hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-purple-500/10 hover:border-purple-500/30 transition-all duration-500">
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <p className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-500 bg-clip-text text-transparent tracking-tight">
        {value == null ? "—" : v.toFixed(decimals)}
      </p>
      <p className="text-[11px] font-semibold opacity-70 mt-1.5 uppercase tracking-wider">{label}</p>
    </div>
  );
}

const ABOUT_FEATURES = [
  {
    id: "story",
    icon: BookOpen,
    title: "Story & Writing",
    text: "Give a title and a hero's name, pick a genre, and get a complete story. Open it as a full page, listen to it, or download it.",
    tip: "Try: 'The Clever Rabbit and the Lion' with the hero 'Felix'.",
  },
  {
    id: "chat",
    icon: MessageSquare,
    title: "AI Chat & Story Check",
    text: "Paste a story or idea and PlotChat tells you whether it already exists or is original. It can also review files for errors. Every chat is saved to your account.",
    tip: "Try: 'Is Cinderella an original story?'",
  },
  {
    id: "image",
    icon: ImageIcon,
    title: "AI Image Generator",
    text: "Turn a scene into a storybook-style picture in 2D or 3D style, then download it.",
    tip: "Describe the scene in one or two sentences.",
  },
  {
    id: "video",
    icon: Video,
    title: "AI Video Generator",
    text: "Describe a scene and get a short AI video clip that plays right here. Free video engines can be busy, so a render can take a few minutes.",
    tip: "Short clips take a minute or two when the engines are free.",
  },
  {
    id: "projects",
    icon: FolderOpen,
    title: "Projects",
    text: "Keep your work in one place. Rename, duplicate, share with a link, or move to Trash. Trashed projects stay for 30 days before they are deleted for good. Notes autosave as you type.",
    tip: "Workspace → Projects in the sidebar.",
  },
  {
    id: "templates",
    icon: LayoutGrid,
    title: "Templates",
    text: "Start from ready-made layouts for Instagram posts, posters, banners and flyers, or from a story chapter outline. Using one creates a new project for you.",
    tip: "Create → Templates in the sidebar.",
  },
  {
    id: "voice",
    icon: Volume2,
    title: "Read Aloud",
    text: "Every story and answer can be read aloud in any language your device has a voice for, including mixed English and Telugu.",
    tip: "Tap the Read aloud button under any answer.",
  },
  {
    id: "community",
    icon: Users,
    title: "Community",
    text: "Publish your projects to the community feed, get likes and comments, and climb the creator leaderboard.",
    tip: "Community → Community Feed in the sidebar.",
  },
  {
    id: "themes",
    icon: Palette,
    title: "Themes & Dream Mode",
    text: "Eight moods, each with its own look, plus a soft Dream Mode that changes the layout and moves the logo.",
    tip: "Pick a theme from Appearance & Theme at the bottom of the sidebar.",
  },
  {
    id: "search",
    icon: Search,
    title: "Search & Favorites",
    text: "Can't find a tool? Type in the 'Search tools...' box at the top of the sidebar. Star the tools you use most and they stay at the top.",
    tip: "Try typing 'video' in the search box.",
  },
];

const ABOUT_FAQ = [
  { q: "Is PlotCraft free?", a: "Yes. Free accounts get a daily AI limit (20 AI generations per day by default). The free AI engines also get busy at times, so heavy use may need to wait a little." },
  { q: "Are my chats and projects private?", a: "Yes. Chats and projects belong to your account and only you can open them. A project is visible to others only if you share its link or publish it to the Community." },
  { q: "Can the AI be wrong about whether a story already exists?", a: "Yes. It checks using what it knows, so treat the answer as a strong hint, not proof." },
  { q: "Why do I need an account?", a: "To save chats and projects across devices, create images and videos, publish to the Community, and leave a review." },
];

export default function AboutPage({ currentStyle }) {
  const [active, setActive] = useState("story");
  const [open, setOpen] = useState(0);
  const [stats, setStats] = useState(undefined); // undefined = loading, null = failed
  const [inView, setInView] = useState(false);
  const statsRef = useRef(null);

  useEffect(() => {
    let alive = true;
    fetchStats().then((s) => alive && setStats(s)).catch(() => alive && setStats(null));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const feature = ABOUT_FEATURES.find((f) => f.id === active) || ABOUT_FEATURES[0];
  const FIcon = feature.icon;
  const num = (key) => (stats && typeof stats[key] === "number" ? stats[key] : null);

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8 pb-12">
      <style>{`
        @keyframes aboutSlideUp { 0% { opacity: 0; transform: translateY(24px) scale(0.98); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes aboutFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes aboutFloat { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-10px) rotate(1deg); } }
        @keyframes aboutGlow { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.08); } }
        .about-slide { animation: aboutSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .about-float { animation: aboutFloat 6s ease-in-out infinite; }
        .about-glow { animation: aboutGlow 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .about-slide, .about-float, .about-glow { animation: none !important; }
        }
      `}</style>

      {/* Hero */}
      <section className={`relative overflow-hidden p-8 md:p-14 rounded-[2.5rem] text-center ${currentStyle.bgCard} border border-white/10 shadow-2xl backdrop-blur-2xl about-slide`}>
        <div className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-purple-500/30 blur-[90px] about-glow pointer-events-none" />
        <div className="absolute -bottom-28 -right-16 w-80 h-80 rounded-full bg-pink-500/30 blur-[90px] about-glow pointer-events-none" style={{ animationDelay: "2.5s" }} />

        <div className="relative space-y-6 z-10">
          <div className="flex justify-center">
            <div className="about-float p-3 rounded-3xl bg-white/5 border border-white/10 shadow-xl backdrop-blur-md">
              <PlotCraftLogo size={76} />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold tracking-wide uppercase shadow-sm">
            <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "4s" }} />
            AI Storytelling & Media Studio
          </div>

          <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Where every <span className={currentStyle.logoTheme}>story</span> comes alive
          </h2>

          <p className="text-sm md:text-base opacity-75 max-w-xl mx-auto leading-relaxed font-medium">
            PlotCraft helps students, teachers, parents and young storytellers write stories, check originality,
            turn scenes into pictures and videos, and organize their work in projects.
          </p>
        </div>
      </section>

      {/* Real numbers from the server */}
      <section ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AboutStat label="Stories written" value={num("stories")} run={inView} />
        <AboutStat label="Creators" value={num("creators")} run={inView} />
        <AboutStat label="Chats saved" value={num("chats")} run={inView} />
        <AboutStat label="Average rating" value={num("rating")} decimals={1} run={inView} />
      </section>
      <p className="text-center text-[11px] opacity-50 -mt-2">
        {stats === undefined && "Live statistics loading..."}
        {stats === null && "Statistics abhi load avvaledu. Konchem tarvata try cheyyandi."}
        {stats && `${stats.reviews ?? 0} reviews · numbers are live from the server`}
      </p>

      {/* Feature explorer */}
      <section className={`p-6 md:p-10 rounded-[2.5rem] ${currentStyle.bgCard} border border-white/10 shadow-xl backdrop-blur-xl space-y-6 about-slide`} style={{ animationDelay: "0.15s" }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <h3 className="font-extrabold text-lg tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
            Explore what you can do
          </h3>
          <span className="text-xs opacity-50 font-medium">Click a feature to learn more</span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {ABOUT_FEATURES.map((f) => {
            const Icon = f.icon;
            const isActive = active === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActive(f.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 scale-105 border border-purple-400/30"
                    : `${currentStyle.btnSecondary} hover:scale-[1.02] border border-transparent`
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "opacity-70"}`} />
                {f.title}
              </button>
            );
          })}
        </div>

        <div key={feature.id} className="p-6 rounded-3xl bg-black/10 dark:bg-black/30 border border-white/5 flex flex-col md:flex-row gap-5 items-start animate-[aboutFade_0.4s_cubic-bezier(0.16,1,0.3,1)]">
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-600 text-white shadow-lg shadow-purple-600/30 shrink-0">
            <FIcon className="w-6 h-6" />
          </div>
          <div className="space-y-2.5">
            <h4 className="font-extrabold text-base tracking-wide text-purple-400 dark:text-purple-300">{feature.title}</h4>
            <p className="text-xs md:text-sm leading-relaxed opacity-85 font-normal">{feature.text}</p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] font-semibold">
              <Sparkles className="w-3 h-3" /> {feature.tip}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={`p-6 md:p-10 rounded-[2.5rem] ${currentStyle.bgCard} border border-white/10 shadow-xl backdrop-blur-xl space-y-4 about-slide`} style={{ animationDelay: "0.3s" }}>
        <h3 className="font-extrabold text-lg tracking-tight mb-4">Frequently Asked Questions</h3>
        <div className="space-y-3">
          {ABOUT_FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isOpen ? "bg-white/10 dark:bg-white/5 border-purple-500/30 shadow-lg" : "bg-black/5 border-white/5 hover:border-white/10"}`}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 text-xs md:text-sm font-bold cursor-pointer transition-colors"
                >
                  <span className="tracking-tight">{item.q}</span>
                  <div className={`p-1.5 rounded-full bg-white/10 transition-transform duration-300 ${isOpen ? "rotate-180 bg-purple-500 text-white" : ""}`}>
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  </div>
                </button>
                <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-xs md:text-sm opacity-75 leading-relaxed font-normal">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer card */}
      <section className={`p-6 rounded-[2rem] ${currentStyle.bgCard} border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-4 text-xs font-medium backdrop-blur-xl about-slide`} style={{ animationDelay: "0.45s" }}>
        <span className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-pink-500/10 text-pink-500">
            <Heart className="w-4 h-4 fill-pink-500" />
          </span>
          Designed and developed with passion by <strong className="font-bold tracking-wide">K.Ganesh</strong>
        </span>
        <span className="px-3.5 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-500 font-bold flex items-center gap-1.5 shadow-sm">
          <Star className="w-3.5 h-3.5 fill-yellow-400" /> Version 4.0
        </span>
      </section>
    </div>
  );
}