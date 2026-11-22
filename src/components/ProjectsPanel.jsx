// ProjectsPanel.jsx
// - ProjectsPanel: list (create, open, rename, duplicate, share, trash, restore, delete forever)
// - ProjectWorkspace: opens one project and autosaves its notes
// - useProjectAutoSave: debounced save with version-conflict detection
// Needs: api = apiRequest from AiDashboard.jsx (throws errors that carry err.status)
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus, FolderOpen, Copy, Pencil, Trash2, RotateCcw, Share2, ArrowLeft,
  Cloud, CloudOff, AlertTriangle, CheckCircle2, Loader2,
} from "lucide-react";

const PROJECT_TYPES = ["design", "video", "audio", "story", "writing", "image"];
const mb = (bytes) => `${((bytes || 0) / 1024 / 1024).toFixed(1)} MB`;

/* Debounced autosave.
   api        = apiRequest
   projectId  = open project id (null = nothing to save)
   data       = JSON-serializable editor state. Images as URLs, not data: URIs (2 MB limit).
   version    = project.version as loaded from the server
   Returns { status: "saved" | "dirty" | "saving" | "conflict" | "error", savedAt } */
function useProjectAutoSave(api, projectId, data, version, delay = 1500) {
  const [statusState, setStatusState] = useState({ projectId, value: "saved" });
  const [savedAt, setSavedAt] = useState(null);
  const [tick, setTick] = useState(0);
  const versionRef = useRef(version);
  const baselineRef = useRef(null);
  const savingRef = useRef(false);
  const dataRef = useRef(data);
  const status = statusState.projectId === projectId ? statusState.value : "saved";

  // New project or freshly loaded version: this becomes the "already saved" baseline
  useEffect(() => {
    versionRef.current = version;
    baselineRef.current = JSON.stringify(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, version]);

  useEffect(() => {
    dataRef.current = data;
    if (!projectId || baselineRef.current === null) return;
    if (JSON.stringify(data) === baselineRef.current) return;
    if (savingRef.current) return; // in-flight save re-runs this effect through tick when done
    setStatusState({ projectId, value: "dirty" });

    const timer = setTimeout(async () => {
      const snapshot = dataRef.current;
      const json = JSON.stringify(snapshot);
      savingRef.current = true;
      setStatusState({ projectId, value: "saving" });
      try {
        const res = await api(`/api/projects/${projectId}`, {
          method: "PUT",
          body: JSON.stringify({ data: snapshot, baseVersion: versionRef.current }),
        });
        versionRef.current = res.version;
        baselineRef.current = json;
        setSavedAt(res.updatedAt);
        setStatusState({ projectId, value: "saved" });
        setTick(t => t + 1);
      } catch (err) {
        if (err.status === 409) {
          setStatusState({ projectId, value: "conflict" }); // do not retry: the user must reload
        } else {
          setStatusState({ projectId, value: "error" });
          setTick(t => t + 1); // retry after the delay
        }
      } finally {
        savingRef.current = false;
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [data, projectId, delay, api, tick]);

  return { status, savedAt };
}

export function AutoSaveBadge({ status }) {
  const map = {
    saved: ["Saved", CheckCircle2],
    dirty: ["Unsaved changes", Cloud],
    saving: ["Saving…", Loader2],
    conflict: ["Changed elsewhere, reload", AlertTriangle],
    error: ["Save failed, retrying…", CloudOff],
  };
  const [label, Icon] = map[status] || map.saved;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8 }}>
      <Icon size={14} className={status === "saving" ? "animate-spin" : ""} />
      {label}
    </span>
  );
}

const btn = {
  padding: "6px 10px", borderRadius: 10, border: "1px solid currentColor",
  background: "transparent", cursor: "pointer", display: "inline-flex",
  alignItems: "center", gap: 6, fontSize: 13, color: "inherit",
};

export default function ProjectsPanel({ api, onOpen }) {
  const [tab, setTab] = useState("active");
  const [type, setType] = useState("design");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [projects, setProjects] = useState([]);
  const [usage, setUsage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadProjects = useCallback(async () => {
    const [list, u] = await Promise.all([
      api(`/api/projects?trashed=${tab === "trash" ? 1 : 0}`),
      api("/api/usage"),
    ]);
    return { projects: list.projects || [], usage: u.usage };
  }, [api, tab]);

  const refresh = useCallback(async () => {
    try {
      const result = await loadProjects();
      setProjects(result.projects);
      setUsage(result.usage);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, [loadProjects]);

  useEffect(() => {
    let active = true;
    loadProjects().then(({ projects: nextProjects, usage: nextUsage }) => {
      if (!active) return;
      setProjects(nextProjects);
      setUsage(nextUsage);
      setError("");
    }).catch((e) => {
      if (active) setError(e.message);
    });
    return () => { active = false; };
  }, [loadProjects]);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const create = () => run(async () => {
    const res = await api("/api/projects", {
      method: "POST",
      body: JSON.stringify({ title: "Untitled", type, data: {} }),
    });
    onOpen?.(res.project);
  });

  const rename = (p) => {
    const title = window.prompt("New name", p.title);
    if (title && title.trim() && title !== p.title) {
      run(() => api(`/api/projects/${p.id}`, { method: "PATCH", body: JSON.stringify({ title }) }));
    }
  };

  const share = (p) => run(async () => {
    const res = await api(`/api/projects/${p.id}/share`, { method: "POST" });
    if (res.shareId) {
      await navigator.clipboard?.writeText(`${window.location.origin}/share/${res.shareId}`).catch(() => {});
      setNotice("Share link copied");
    } else {
      setNotice("Sharing turned off");
    }
  });

  const forever = (p) => {
    if (window.confirm(`"${p.title}" permanent ga delete cheyyala?`)) {
      run(() => api(`/api/projects/${p.id}/forever`, { method: "DELETE" }));
    }
  };

  const pct = usage ? Math.min(100, (usage.storageUsed / usage.storageLimit) * 100) : 0;
  const shownProjects = projects
    .filter((project) => `${project.title} ${project.type}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => sort === "title"
      ? a.title.localeCompare(b.title)
      : (b.updatedAt || 0) - (a.updatedAt || 0));

  return (
    <div style={{ width: "100%", maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", opacity: .6 }}>Workspace</p>
          <h2 style={{ fontWeight: 900, fontSize: 26, margin: "4px 0 0" }}>My Projects</h2>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={type} onChange={e => setType(e.target.value)} style={{ ...btn, padding: "6px 8px" }}>
            {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button type="button" style={btn} disabled={busy} onClick={create}><Plus size={14} /> New project</button>
        </div>
      </div>

      {usage && (
        <div style={{ margin: "14px 0", fontSize: 13 }}>
          <div style={{ height: 6, borderRadius: 6, background: "rgba(127,127,127,.25)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--pc-accent, #7c3aed)" }} />
          </div>
          <div style={{ marginTop: 6, opacity: 0.8 }}>
            {mb(usage.storageUsed)} / {mb(usage.storageLimit)} · {usage.projects} projects · AI today {usage.aiToday}/{usage.aiLimit}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[["active", "Projects"], ["trash", "Trash"]].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            style={{ ...btn, background: tab === id ? "var(--pc-accent, #7c3aed)" : "transparent", color: tab === id ? "#fff" : "inherit" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects..."
          aria-label="Search projects"
          style={{ ...btn, flex: "1 1 220px", minWidth: 0, textAlign: "left", cursor: "text" }}
        />
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort projects" style={btn}>
          <option value="recent">Recently updated</option>
          <option value="title">Title A-Z</option>
        </select>
      </div>

      {error && <p style={{ color: "#f87171", marginBottom: 10 }}>{error}</p>}
      {notice && <p style={{ opacity: 0.8, marginBottom: 10, fontSize: 13 }}>{notice}</p>}
      {!shownProjects.length && (
        <div style={{ padding: 28, borderRadius: 18, border: "1px dashed rgba(127,127,127,.4)", textAlign: "center", opacity: .75 }}>
          {query ? `No projects match “${query}”.` : tab === "trash" ? "Trash khali undi." : "Inka projects ledu. New project create cheyyandi."}
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {shownProjects.map(p => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, padding: 14, borderRadius: 18, border: "1px solid rgba(127,127,127,.3)", background: "rgba(127,127,127,.04)", transition: "transform .2s ease, border-color .2s ease" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{p.title}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {p.type} · v{p.version} · {new Date(tab === "trash" ? p.trashedAt : p.updatedAt).toLocaleString()}
                {p.shared ? " · shared" : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {tab === "active" ? (
                <>
                  <button type="button" style={btn} onClick={() => onOpen?.(p)} title="Open" aria-label={`Open ${p.title}`}><FolderOpen size={14} /> Open</button>
                  <button type="button" style={btn} onClick={() => rename(p)} title="Rename" aria-label={`Rename ${p.title}`}><Pencil size={14} /></button>
                  <button type="button" style={btn} disabled={busy} onClick={() => run(() => api(`/api/projects/${p.id}/duplicate`, { method: "POST" }))} title="Duplicate" aria-label={`Duplicate ${p.title}`}><Copy size={14} /></button>
                  <button type="button" style={btn} disabled={busy} onClick={() => share(p)} title={p.shared ? "Unshare" : "Share"} aria-label={`${p.shared ? "Unshare" : "Share"} ${p.title}`}><Share2 size={14} /></button>
                  <button type="button" style={btn} disabled={busy} onClick={() => run(() => api(`/api/projects/${p.id}`, { method: "DELETE" }))} title="Move to trash" aria-label={`Move ${p.title} to trash`}><Trash2 size={14} /></button>
                </>
              ) : (
                <>
                  <button type="button" style={btn} disabled={busy} onClick={() => run(() => api(`/api/projects/${p.id}/restore`, { method: "POST" }))} aria-label={`Restore ${p.title}`}><RotateCcw size={14} /> Restore</button>
                  <button type="button" style={btn} disabled={busy} onClick={() => forever(p)} aria-label={`Delete ${p.title} forever`}><Trash2 size={14} /> Delete forever</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Opens one project. The full project data is loaded and saved back as a whole (so AI-generated
   fields like plan/posters are never dropped); only `notes` is edited here. */
export function ProjectWorkspace({ api, projectId, onBack }) {
  const [project, setProject] = useState(null);
  const [data, setData] = useState({});
  const [error, setError] = useState("");
  const notes = typeof data.notes === "string" ? data.notes : "";

  useEffect(() => {
    let alive = true;
    api(`/api/projects/${projectId}`)
      .then(res => {
        if (!alive) return;
        setProject(res.project);
        setData(res.project.data && typeof res.project.data === "object" ? res.project.data : {});
      })
      .catch(e => alive && setError(e.message));
    return () => { alive = false; };
  }, [api, projectId]);

  const { status } = useProjectAutoSave(api, project?.id, data, project?.version);

  if (error) return <p style={{ color: "#f87171", padding: 16 }}>{error}</p>;
  if (!project) return <p style={{ padding: 16, opacity: 0.7 }}>Loading project…</p>;

  return (
    <div style={{ width: "100%", maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="button" style={btn} onClick={onBack}><ArrowLeft size={14} /> Back</button>
        <AutoSaveBadge status={status} />
      </div>
      <h2 style={{ fontWeight: 900, fontSize: 22, margin: "14px 0 10px" }}>{project.title}</h2>
      <textarea
        value={notes}
        onChange={e => setData(d => ({ ...d, notes: e.target.value }))}
        rows={20}
        placeholder="Ikkada notes / script / ideas rayandi. Automatic ga save avutundi."
        style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid rgba(127,127,127,.3)", background: "transparent", color: "inherit", fontFamily: "inherit", fontSize: 14, lineHeight: 1.6 }}
      />
    </div>
  );
}

/* Templates: pick a starter layout, it becomes a new project in My Projects. */
export function TemplatesGallery({ api, onCreated }) {
  const [templates, setTemplates] = useState([]);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/templates").then(r => setTemplates(r.templates || [])).catch(e => setError(e.message));
  }, [api]);

  const categories = ["all", ...new Set(templates.map(t => t.category))];
  const shown = templates.filter(t => filter === "all" || t.category === filter);

  const use = async (t) => {
    setBusy(t.id); setError("");
    try {
      const res = await api(`/api/templates/${t.id}/use`, { method: "POST", body: "{}" });
      onCreated?.(res.project);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h2 style={{ fontWeight: 900, fontSize: 24, marginBottom: 12 }}>Templates</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {categories.map(c => (
          <button key={c} type="button" onClick={() => setFilter(c)} style={{ ...btn, background: filter === c ? "var(--pc-accent, #7c3aed)" : "transparent", color: filter === c ? "#fff" : "inherit" }}>{c}</button>
        ))}
      </div>
      {error && <p style={{ color: "#f87171", marginBottom: 10 }}>{error}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {shown.map(t => (
          <div key={t.id} style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(127,127,127,.3)" }}>
            <div style={{ fontWeight: 700 }}>{t.title}</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>{t.type} · {t.category}</div>
            <button type="button" style={btn} disabled={!!busy} onClick={() => use(t)}>
              {busy === t.id ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Use template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Community: public feed of published projects, likes, and creator leaderboard. */
export function CommunityFeed({ api }) {
  const [sort, setSort] = useState("new");
  const [posts, setPosts] = useState([]);
  const [board, setBoard] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState("");
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const [feedResult, boardResult] = await Promise.allSettled([
        api(`/api/community/feed?sort=${sort}`),
        api("/api/community/leaderboard"),
      ]);
      if (!mounted.current) return;
      setError("");
      if (feedResult.status === "fulfilled") {
        setPosts(feedResult.value.posts || []);
      } else {
        setError(feedResult.reason?.message || "Could not load the community feed.");
      }
      if (boardResult.status === "fulfilled") {
        setBoard(boardResult.value.leaderboard || []);
      } else {
        setError((message) => message || boardResult.reason?.message || "Could not load the creator leaderboard.");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [api, sort]);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => { mounted.current = false; };
  }, [load]);

  const like = async (post) => {
    if (liking) return;
    setLiking(post.id);
    setError("");
    try {
      const result = await api(`/api/community/posts/${encodeURIComponent(post.id)}/like`, { method: "POST", body: "{}" });
      setPosts((items) => items.map((item) => item.id === post.id
        ? { ...item, likedByMe: result.liked, likes: result.likes }
        : item));
    } catch (e) {
      setError(e.message);
    } finally {
      setLiking("");
    }
  };

  return (
    <div className="cf-layout" style={{ width: "100%", maxWidth: 1040, margin: "0 auto", padding: 16, display: "grid", gap: 20, gridTemplateColumns: "minmax(0,1fr)" }}>
      <style>{`
        .cf-layout { grid-template-columns: minmax(0, 1fr) !important; }
        @media (min-width: 760px) { .cf-layout { grid-template-columns: minmax(0, 1fr) 260px !important; } }
      `}</style>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", opacity: .6 }}>Share, discover, and support</p>
            <h2 style={{ fontWeight: 900, fontSize: 26, margin: "4px 0 0" }}>Community</h2>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["new", "New"], ["top", "Top"]].map(([id, label]) => (
              <button key={id} type="button" onClick={() => { setLoading(true); setSort(id); }} style={{ ...btn, background: sort === id ? "var(--pc-accent, #7c3aed)" : "transparent", color: sort === id ? "#fff" : "inherit" }}>{label}</button>
            ))}
            <button type="button" style={btn} onClick={() => { setLoading(true); load(); }} disabled={loading} aria-label="Refresh community">
              <RotateCcw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>
        {error && <p style={{ color: "#f87171", marginBottom: 10 }}>{error}</p>}
        {loading && !posts.length && <p role="status" style={{ opacity: 0.7 }}>Loading community posts…</p>}
        {!loading && !posts.length && !error && <p style={{ opacity: 0.7 }}>Inka publish chesina projects ledu.</p>}
        <div style={{ display: "grid", gap: 12 }}>
          {posts.map(p => (
            <div key={p.id} style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(127,127,127,.3)" }}>
              <div style={{ fontWeight: 700 }}>{p.title}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>by {p.authorName} · {p.type}</div>
              {p.description && <p style={{ marginTop: 6, fontSize: 14 }}>{p.description}</p>}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                <button type="button" style={btn} onClick={() => like(p)} disabled={liking === p.id} aria-pressed={!!p.likedByMe} aria-label={`${p.likedByMe ? "Unlike" : "Like"} ${p.title}`}>
                  {p.likedByMe ? "♥" : "♡"} {p.likes}
                </button>
                <span style={{ fontSize: 12, opacity: 0.7 }}>{p.comments} comments</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <aside style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(127,127,127,.3)", alignSelf: "start" }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Top creators</div>
        {loading && !board.length && <div role="status" style={{ fontSize: 13, opacity: 0.7 }}>Loading creators…</div>}
        {!loading && !board.length && <div style={{ fontSize: 13, opacity: 0.7 }}>Inka scores ledu.</div>}
        {board.map((r, i) => (
          <div key={r.userId} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "4px 0" }}>
            <span>{i + 1}. {r.name}</span><span>{r.score}</span>
          </div>
        ))}
      </aside>
    </div>
  );
}