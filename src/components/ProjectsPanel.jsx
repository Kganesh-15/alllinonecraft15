// ProjectsPanel.jsx
// - ProjectsPanel: list (create, open, rename, duplicate, share, trash, restore, delete forever)
// - ProjectWorkspace: opens one project and autosaves its notes
// - useProjectAutoSave: debounced save with version-conflict detection
// Needs: api = apiRequest from AiDashboard.jsx (throws errors that carry err.status)
import React, { useCallback, useEffect, useRef, useState } from "react";
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
export function useProjectAutoSave(api, projectId, data, version, delay = 1500) {
  const [status, setStatus] = useState("saved");
  const [savedAt, setSavedAt] = useState(null);
  const [tick, setTick] = useState(0);
  const versionRef = useRef(version);
  const baselineRef = useRef(null);
  const savingRef = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  // New project or freshly loaded version: this becomes the "already saved" baseline
  useEffect(() => {
    versionRef.current = version;
    baselineRef.current = JSON.stringify(data);
    setStatus("saved");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, version]);

  useEffect(() => {
    if (!projectId || baselineRef.current === null) return;
    if (JSON.stringify(data) === baselineRef.current) return;
    if (savingRef.current) return; // in-flight save re-runs this effect through tick when done
    setStatus("dirty");

    const timer = setTimeout(async () => {
      const snapshot = dataRef.current;
      const json = JSON.stringify(snapshot);
      savingRef.current = true;
      setStatus("saving");
      try {
        const res = await api(`/api/projects/${projectId}`, {
          method: "PUT",
          body: JSON.stringify({ data: snapshot, baseVersion: versionRef.current }),
        });
        versionRef.current = res.version;
        baselineRef.current = json;
        setSavedAt(res.updatedAt);
        setStatus("saved");
        setTick(t => t + 1);
      } catch (err) {
        if (err.status === 409) {
          setStatus("conflict"); // do not retry: the user must reload
        } else {
          setStatus("error");
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
  const [projects, setProjects] = useState([]);
  const [usage, setUsage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [list, u] = await Promise.all([
        api(`/api/projects?trashed=${tab === "trash" ? 1 : 0}`),
        api("/api/usage"),
      ]);
      setProjects(list.projects || []);
      setUsage(u.usage);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, [api, tab]);

  useEffect(() => { refresh(); }, [refresh]);

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

  return (
    <div style={{ width: "100%", maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontWeight: 900, fontSize: 24 }}>My Projects</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={type} onChange={e => setType(e.target.value)} style={{ ...btn, padding: "6px 8px" }}>
            {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button type="button" style={btn} disabled={busy} onClick={create}><Plus size={14} /> New</button>
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

      {error && <p style={{ color: "#f87171", marginBottom: 10 }}>{error}</p>}
      {notice && <p style={{ opacity: 0.8, marginBottom: 10, fontSize: 13 }}>{notice}</p>}
      {!projects.length && (
        <p style={{ opacity: 0.7 }}>{tab === "trash" ? "Trash khali undi." : "Inka projects ledu. New click cheyyandi."}</p>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {projects.map(p => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, padding: 12, borderRadius: 14, border: "1px solid rgba(127,127,127,.3)" }}>
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
                  <button type="button" style={btn} onClick={() => onOpen?.(p)} title="Open"><FolderOpen size={14} /> Open</button>
                  <button type="button" style={btn} onClick={() => rename(p)} title="Rename"><Pencil size={14} /></button>
                  <button type="button" style={btn} disabled={busy} onClick={() => run(() => api(`/api/projects/${p.id}/duplicate`, { method: "POST" }))} title="Duplicate"><Copy size={14} /></button>
                  <button type="button" style={btn} disabled={busy} onClick={() => share(p)} title={p.shared ? "Unshare" : "Share"}><Share2 size={14} /></button>
                  <button type="button" style={btn} disabled={busy} onClick={() => run(() => api(`/api/projects/${p.id}`, { method: "DELETE" }))} title="Move to trash"><Trash2 size={14} /></button>
                </>
              ) : (
                <>
                  <button type="button" style={btn} disabled={busy} onClick={() => run(() => api(`/api/projects/${p.id}/restore`, { method: "POST" }))}><RotateCcw size={14} /> Restore</button>
                  <button type="button" style={btn} disabled={busy} onClick={() => forever(p)}><Trash2 size={14} /> Delete forever</button>
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

  const load = useCallback(async () => {
    try {
      const [feed, lb] = await Promise.all([
        api(`/api/community/feed?sort=${sort}`),
        api("/api/community/leaderboard"),
      ]);
      setPosts(feed.posts || []);
      setBoard(lb.leaderboard || []);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, [api, sort]);

  useEffect(() => { load(); }, [load]);

  const like = async (post) => {
    try {
      await api(`/api/community/posts/${post.id}/like`, { method: "POST", body: "{}" });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: 1040, margin: "0 auto", padding: 16, display: "grid", gap: 20, gridTemplateColumns: "minmax(0,1fr) 260px" }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontWeight: 900, fontSize: 24 }}>Community</h2>
          <div style={{ display: "flex", gap: 8 }}>
            {[["new", "New"], ["top", "Top"]].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setSort(id)} style={{ ...btn, background: sort === id ? "var(--pc-accent, #7c3aed)" : "transparent", color: sort === id ? "#fff" : "inherit" }}>{label}</button>
            ))}
          </div>
        </div>
        {error && <p style={{ color: "#f87171", marginBottom: 10 }}>{error}</p>}
        {!posts.length && <p style={{ opacity: 0.7 }}>Inka publish chesina projects ledu.</p>}
        <div style={{ display: "grid", gap: 12 }}>
          {posts.map(p => (
            <div key={p.id} style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(127,127,127,.3)" }}>
              <div style={{ fontWeight: 700 }}>{p.title}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>by {p.authorName} · {p.type}</div>
              {p.description && <p style={{ marginTop: 6, fontSize: 14 }}>{p.description}</p>}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                <button type="button" style={btn} onClick={() => like(p)}>{p.likedByMe ? "♥" : "♡"} {p.likes}</button>
                <span style={{ fontSize: 12, opacity: 0.7 }}>{p.comments} comments</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <aside style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(127,127,127,.3)", alignSelf: "start" }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Top creators</div>
        {!board.length && <div style={{ fontSize: 13, opacity: 0.7 }}>Inka scores ledu.</div>}
        {board.map((r, i) => (
          <div key={r.userId} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "4px 0" }}>
            <span>{i + 1}. {r.name}</span><span>{r.score}</span>
          </div>
        ))}
      </aside>
    </div>
  );
}