import { useEffect, useRef, useState } from "react";
import { Sparkles, BookOpenCheck, Bot, Cloud, Volume2, Wand2, Palette, Star, Compass, ArrowRight, Flame, Zap, FolderOpen, Search } from "lucide-react";

const USAGE_STEPS = [
  { id: "01", icon: BookOpenCheck, title: "Story & Writing", tagline: "Create epic tales instantly!", text: "Sidebar → Create → Story & Writing. Enter a title and hero name, choose a genre, and click Generate Story. Read the full page, listen to it, or download it.", gradient: "from-pink-500 via-rose-500 to-orange-500", glowColor: "group-hover:shadow-[0_0_35px_rgba(244,63,94,0.4)]", badge: "Most Popular" },
  { id: "02", icon: Bot, title: "AI Chat Assistant", tagline: "Smart chat & file analysis", text: "Sidebar → AI Tools → AI Chat. Check whether your story idea is original or inspired, ask complex questions, or attach code files to find bugs.", gradient: "from-purple-600 via-indigo-600 to-blue-500", glowColor: "group-hover:shadow-[0_0_35px_rgba(147,51,234,0.4)]", badge: "Super Smart" },
  { id: "03", icon: Cloud, title: "Auto-Saved Chats", tagline: "Never lose your thoughts", text: "Every conversation is saved. Log in and your chats sync to all your devices. Open old chats anytime from the chat list.", gradient: "from-emerald-500 via-teal-600 to-cyan-500", glowColor: "group-hover:shadow-[0_0_35px_rgba(20,184,166,0.4)]", badge: "Secure" },
  { id: "04", icon: Volume2, title: "Read Aloud Voice", tagline: "Listen to your stories", text: "Click the Read Aloud button under any story or answer. It speaks in the language of the text, handling mixed English and Telugu smoothly.", gradient: "from-amber-500 via-yellow-500 to-lime-500", glowColor: "group-hover:shadow-[0_0_35px_rgba(245,158,11,0.4)]", badge: "Audio FX" },
  { id: "05", icon: Wand2, title: "Image & AI Video", tagline: "Bring imagination to life", text: "Sidebar → AI Tools → AI Image Generator or AI Video Generator. Sign in and describe a scene. Generation can take a minute or two.", gradient: "from-cyan-500 via-sky-600 to-blue-600", glowColor: "group-hover:shadow-[0_0_35px_rgba(6,182,212,0.4)]", badge: "Creative" },
  { id: "06", icon: FolderOpen, title: "Projects & Templates", tagline: "Keep your work organized", text: "Workspace → Projects keeps your work in one place: rename, duplicate, share with a link, or move to Trash (kept 30 days). Create → Templates gives you ready-made layouts to start from.", gradient: "from-indigo-500 via-violet-600 to-purple-600", glowColor: "group-hover:shadow-[0_0_35px_rgba(99,102,241,0.4)]", badge: "Workspace" },
  { id: "07", icon: Search, title: "Search & Favorites", tagline: "Find any tool in seconds", text: "Type in 'Search tools...' at the top of the sidebar, for example 'video'. Star the tools you use most and they stay at the top of the sidebar.", gradient: "from-sky-500 via-cyan-600 to-teal-500", glowColor: "group-hover:shadow-[0_0_35px_rgba(14,165,233,0.4)]", badge: "Power User" },
  { id: "08", icon: Palette, title: "Themes & Dream Mode", tagline: "Customize your vibe", text: "Pick a theme from Appearance & Theme at the bottom of the sidebar. Turn on Dream Mode for a soft, immersive layout.", gradient: "from-fuchsia-500 via-pink-600 to-rose-600", glowColor: "group-hover:shadow-[0_0_35px_rgba(217,70,239,0.4)]", badge: "Aesthetic" },
  { id: "09", icon: Star, title: "Community & Ratings", tagline: "Share your work and your love", text: "Community → Community Feed shows published projects. Community → Top Rated lets you leave a rating after you log in. Your review and story count are shown to visitors.", gradient: "from-yellow-400 via-amber-500 to-orange-500", glowColor: "group-hover:shadow-[0_0_35px_rgba(251,191,36,0.4)]", badge: "Community" }
];


export default function UsagePage({ currentStyle }) {
  const [clickedCard, setClickedCard] = useState(null);

  const isLightMode = 
    !currentStyle?.bgMain?.includes("slate-950") && 
    !currentStyle?.bgMain?.includes("black") && 
    !currentStyle?.bgMain?.includes("emerald") && 
    !currentStyle?.bgMain?.includes("blue") && 
    !currentStyle?.bgMain?.includes("slate-900") &&
    !currentStyle?.bgMain?.includes("indigo");

  const cardRefs = useRef([]);

  useEffect(() => {
    const cards = cardRefs.current.filter(Boolean);
    if (!cards.length) return;

    // Find the actual scrolling container used by AiDashboard.
    // UsagePage itself is not the scroller; AiDashboard uses overflow-y-auto.
    const findScrollParent = (element) => {
      let parent = element?.parentElement;

      while (parent) {
        const style = window.getComputedStyle(parent);
        const canScroll =
          /(auto|scroll)/.test(style.overflowY) &&
          parent.scrollHeight > parent.clientHeight;

        if (canScroll) return parent;
        parent = parent.parentElement;
      }

      return window;
    };

    const scrollParent = findScrollParent(cards[0]);
    let ticking = false;

    const revealCards = () => {
      const viewportTop =
        scrollParent === window
          ? 0
          : scrollParent.getBoundingClientRect().top;

      const viewportBottom =
        scrollParent === window
          ? window.innerHeight
          : scrollParent.getBoundingClientRect().bottom;

      cards.forEach((card) => {
        if (card.classList.contains("usage-card-visible")) return;

        const rect = card.getBoundingClientRect();
        const visibleTop = Math.max(rect.top, viewportTop);
        const visibleBottom = Math.min(rect.bottom, viewportBottom);
        const visibleHeight = visibleBottom - visibleTop;

        // Trigger when a meaningful portion of the card enters the scroll area.
        if (visibleHeight >= Math.min(100, rect.height * 0.18)) {
          card.classList.add("usage-card-visible");
        }
      });

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(revealCards);
        ticking = true;
      }
    };

    // Reveal the first visible cards immediately.
    revealCards();

    scrollParent.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      scrollParent.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ticking = false;
    };
  }, [currentStyle?.bgMain]);



  return (
    <div className={`w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-10 space-y-8 relative overflow-hidden ${isLightMode ? "text-slate-950" : "text-white"}`}>
      <style>{`
        .usage-card {
          opacity: 0;
          transform: translate3d(0, 70px, 0) scale(0.82);
          filter: blur(5px);
          transition:
            opacity 1050ms cubic-bezier(0.16, 1, 0.3, 1),
            transform 1050ms cubic-bezier(0.16, 1, 0.3, 1),
            filter 1050ms cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform, filter;
        }

        .usage-card-visible {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
          filter: blur(0);
        }

        .usage-card:hover {
          transform: translate3d(0, -7px, 0) scale(1.015);
        }

        .usage-header {
          animation: usageHeaderIn 850ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .usage-footer {
          animation: usageFooterIn 900ms cubic-bezier(0.22, 1, 0.36, 1) 250ms both;
        }

        @keyframes usageHeaderIn {
          from {
            opacity: 0;
            transform: translate3d(0, -24px, 0) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @keyframes usageFooterIn {
          from {
            opacity: 0;
            transform: translate3d(0, 35px, 0) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .usage-card,
          .usage-header,
          .usage-footer {
            animation: none !important;
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
          }
        }
      `}</style>
      
      {/* Header Banner */}
      <div className={`usage-header relative overflow-hidden rounded-[2.5rem] p-8 md:p-12 ${currentStyle?.bgCard || 'bg-slate-900/90'} border ${isLightMode ? 'border-slate-300 shadow-xl bg-white text-slate-900' : 'border-white/20 shadow-2xl text-white'} backdrop-blur-xl`}>
        {/* Background Glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${isLightMode ? 'bg-purple-100 border border-purple-300 text-purple-900' : 'bg-purple-500/20 border border-purple-400/40 text-purple-200'} text-xs font-black tracking-wide shadow-sm`}>
              <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" /> PlotCraft Guide & Masterclass
            </div>
            
            {/* New Color Theme Text */}
            <h1 className={`text-3xl md:text-5xl font-black tracking-tight ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
              How to Use <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">PlotCraft</span>
            </h1>
            
            <p className={`text-sm md:text-base ${isLightMode ? 'text-slate-700 font-bold' : 'text-slate-300 font-medium'} max-w-2xl leading-relaxed`}>
              Discover how to easily master all features to build incredible stories, generate stunning AI images, and produce cinematic videos!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className={`flex items-center gap-3 ${isLightMode ? 'bg-slate-100 border border-slate-300 shadow-md text-slate-900' : 'bg-black/40 border border-white/20 shadow-xl text-white'} p-4 rounded-2xl backdrop-blur-md`}>
              <div className="p-3 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-lg">
                <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: "15s" }} />
              </div>
              <div>
                <div className={`text-xs ${isLightMode ? 'text-purple-700 font-black' : 'text-pink-300 font-bold'}`}>Total Steps</div>
                <div className={`text-lg font-black ${isLightMode ? 'text-slate-900' : 'text-amber-300'}`}>{String(USAGE_STEPS.length).padStart(2, "0")} Super Features</div>
              </div>
            </div>

            {/* Smooth Experience Badge */}
            <div className={`px-5 py-4 rounded-2xl flex items-center gap-2.5 ${
              isLightMode
                ? "bg-white border border-slate-300 text-purple-800 shadow-md"
                : "bg-white/10 border border-white/20 text-white shadow-xl"
            } backdrop-blur-md`}>
              <Sparkles className="w-5 h-5 text-pink-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider">
                Smooth Guide
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {USAGE_STEPS.map((step, idx) => {
          const IconComponent = step.icon;
          const isFeatured = idx === 0;
          const isSelected = clickedCard === step.title;

          return (
            <div 
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              key={step.title}
              onClick={() => setClickedCard(step.title)}
              style={{ transitionDelay: `${idx * 110}ms` }}
              className={`usage-card group relative rounded-[2.2rem] p-7 ${currentStyle?.bgCard || 'bg-slate-900/70'} border ${isLightMode ? 'border-slate-300 hover:border-purple-600 shadow-lg bg-white text-slate-900' : 'border-white/15 hover:border-pink-500/50 shadow-xl text-white'} transition-[border-color,box-shadow] duration-300 flex flex-col justify-between cursor-pointer ${step.glowColor} ${isFeatured ? 'lg:col-span-2' : ''} ${isSelected ? 'ring-2 ring-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.3)]' : ''}`}
            >
              {/* Top Row: Icon + Badge */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className={`p-4 rounded-2xl bg-gradient-to-r ${step.gradient} text-white shadow-xl transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full ${isLightMode ? 'bg-slate-100 border border-slate-300 text-slate-900' : 'bg-white/10 border border-white/20 text-amber-300'} text-xs font-black shadow-sm`}>
                      {step.id}
                    </span>
                    <span className={`px-3 py-1 rounded-full ${isLightMode ? 'bg-purple-100 border border-purple-200 text-purple-900' : 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/30 text-pink-300'} text-[11px] font-black`}>
                      {step.badge}
                    </span>
                  </div>
                </div>

                {/* Title & Tagline with updated vibrant colors */}
                <div className="space-y-1.5">
                  <h3 className={`text-lg md:text-xl font-black ${isLightMode ? 'text-slate-950' : 'text-white'} group-hover:text-pink-400 transition-colors duration-300`}>
                    {step.title}
                  </h3>
                  <p className={`text-xs font-black ${isLightMode ? 'text-purple-800' : 'text-pink-300'} tracking-wider uppercase`}>
                    {step.tagline}
                  </p>
                </div>

                {/* Description */}
                <p className={`text-xs md:text-sm ${isLightMode ? 'text-slate-800 font-semibold' : 'text-slate-200 font-medium'} leading-relaxed`}>
                  {step.text}
                </p>
              </div>

              {/* Bottom Footer */}
              <div className={`pt-6 mt-6 border-t ${isLightMode ? 'border-slate-200 text-slate-600' : 'border-white/10 text-slate-400'} flex items-center justify-between text-xs transition-colors`}>
                <span className={`flex items-center gap-1.5 font-black ${isLightMode ? 'text-purple-800' : 'text-amber-300'}`}>
                  <Zap className={`w-3.5 h-3.5 ${isLightMode ? 'text-purple-600' : 'text-amber-400 fill-amber-400'}`} /> Tap to interact
                </span>
                <span className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300 ${isLightMode ? 'text-purple-800 font-black' : 'text-pink-400 font-black'}`}>
                  Explore <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Callout */}
      <div className={`usage-footer p-6 rounded-[2.2rem] ${isLightMode ? 'bg-purple-50 border border-purple-200 text-slate-900 shadow-md' : 'bg-gradient-to-r from-purple-950/70 via-pink-950/70 to-slate-950/90 border border-pink-500/30 text-white shadow-2xl'} text-center space-y-3`}>
        <div className={`inline-flex items-center justify-center p-3 rounded-full ${isLightMode ? 'bg-purple-200 text-purple-800' : 'bg-pink-500/20 text-amber-300'} mb-1 shadow-md`}>
          <Flame className={`w-5 h-5 ${isLightMode ? 'text-purple-700' : 'text-amber-400 fill-amber-400'} animate-bounce`} />
        </div>
        <h4 className={`text-base font-black ${isLightMode ? 'text-slate-950' : 'text-white'}`}>Ready to create your first masterpiece?</h4>
        <p className={`text-xs ${isLightMode ? 'text-slate-700 font-bold' : 'text-slate-300 font-medium'} max-w-md mx-auto`}>
          Bring your imagination to life. Head to Create → Story & Writing or AI Tools → AI Chat and start your journey!
        </p>
      </div>

    </div>
  );
}