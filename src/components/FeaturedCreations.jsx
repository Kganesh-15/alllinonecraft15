import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Clapperboard,
  Heart,
  Image as ImageIcon,
  Music2,
  Sparkles,
} from "lucide-react";
import { apiRequest } from "../services/api";

const CREATION_TYPES = {
  story: { label: "Story", icon: BookOpen, color: "from-amber-500/30 to-rose-500/20" },
  writing: { label: "Writing", icon: BookOpen, color: "from-amber-500/30 to-rose-500/20" },
  image: { label: "Image", icon: ImageIcon, color: "from-violet-500/30 to-cyan-500/20" },
  design: { label: "Design", icon: ImageIcon, color: "from-violet-500/30 to-cyan-500/20" },
  video: { label: "Video", icon: Clapperboard, color: "from-fuchsia-500/30 to-indigo-500/20" },
  audio: { label: "Audio", icon: Music2, color: "from-emerald-500/30 to-teal-500/20" },
  music: { label: "Music", icon: Music2, color: "from-emerald-500/30 to-teal-500/20" },
};

export default function FeaturedCreations({ onOpenCommunity, onCreate }) {
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    apiRequest("/api/community/feed?sort=top&limit=4", { signal: controller.signal })
      .then((data) => {
        if (!active) return;
        const featured = Array.isArray(data.posts) ? data.posts : [];
        setPosts(featured);
        setStatus(featured.length ? "ready" : "empty");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [refreshKey]);

  return (
    <section
      aria-label="Featured community creations"
      className="px-4 sm:px-8 lg:px-14 py-14 sm:py-20 wx-divider-t"
    >
      <div className="flex flex-wrap items-end justify-between gap-5 mb-7 sm:mb-9 wx-anim-rise">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] wx-accent mb-2 font-semibold">
            Made in PlotCraft
          </p>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight wx-ink">
            Featured creations
          </h2>
          <p className="mt-2 text-sm wx-muted">
            Real work shared by the PlotCraft community.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCommunity}
          className="inline-flex items-center gap-2 text-sm font-bold wx-accent hover:opacity-75"
        >
          Explore community <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {status === "loading" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Loading creations">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="wx-panel rounded-2xl p-3 animate-pulse">
              <div className="h-36 rounded-xl bg-black/5 dark:bg-white/5" />
              <div className="mt-4 h-3 w-2/3 rounded bg-black/5 dark:bg-white/5" />
              <div className="mt-2 h-3 w-1/2 rounded bg-black/5 dark:bg-white/5" />
            </div>
          ))}
        </div>
      )}

      {status === "ready" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {posts.map((post) => {
            const type = CREATION_TYPES[String(post.type || "").toLowerCase()] || {
              label: post.type || "Creation",
              icon: Sparkles,
              color: "from-violet-500/30 to-fuchsia-500/20",
            };
            const TypeIcon = type.icon;

            return (
              <article
                key={post.id}
                className="wx-panel wx-panel-lift rounded-2xl p-3 min-w-0"
              >
                <div
                  className={`relative h-36 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${type.color}`}
                >
                  <div className="absolute -right-7 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
                  <div className="absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-black/10 blur-xl" />
                  <div className="absolute inset-0 flex flex-col justify-between p-4">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
                        <TypeIcon className="h-3 w-3" /> {type.label}
                      </span>
                      <Sparkles className="h-4 w-4 text-white/80" aria-hidden="true" />
                    </div>
                    <p className="line-clamp-2 text-lg font-black leading-tight text-white drop-shadow">
                      {post.title || "Untitled creation"}
                    </p>
                  </div>
                </div>
                <div className="px-1 pt-3">
                  <h3 className="truncate text-sm font-bold wx-ink">
                    {post.title || "Untitled creation"}
                  </h3>
                  <p className="mt-1 min-h-10 line-clamp-2 text-xs leading-relaxed wx-muted">
                    {post.description || `${type.label} shared by ${post.authorName || "a creator"}.`}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2 text-[11px] wx-subtle">
                    <span className="truncate">by {post.authorName || "PlotCraft creator"}</span>
                    <span className="inline-flex shrink-0 items-center gap-1">
                      <Heart className="h-3 w-3" /> {Number(post.likes) || 0}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {status === "empty" && (
        <div className="wx-panel rounded-2xl p-7 sm:p-9 text-center">
          <p className="text-lg font-bold wx-ink">The community gallery is ready for its first feature.</p>
          <p className="mt-2 text-sm wx-muted">Create something, then publish it to share it here.</p>
          <button
            type="button"
            onClick={onCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
            style={{ background: "var(--wx-accent-solid)", color: "var(--wx-accent-ink)" }}
          >
            Create something <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {status === "error" && (
        <div role="status" className="wx-panel rounded-2xl p-7 sm:p-9 text-center">
          <p className="text-lg font-bold wx-ink">Featured creations couldn’t load.</p>
          <p className="mt-2 text-sm wx-muted">Check your connection, or browse the community feed directly.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setStatus("loading");
                setRefreshKey((key) => key + 1);
              }}
              className="rounded-xl border px-4 py-2.5 text-sm font-bold wx-ink"
              style={{ borderColor: "var(--wx-border-strong)" }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={onOpenCommunity}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
              style={{ background: "var(--wx-accent-solid)", color: "var(--wx-accent-ink)" }}
            >
              Open community <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
