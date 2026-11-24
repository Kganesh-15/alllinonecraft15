import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Bold,
  Clock3,
  Download,
  Focus,
  FileText,
  Heading2,
  Italic,
  Milestone,
  Plus,
  Printer,
  Sparkles,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { chatAI } from "../services/openai";

const makeId = (prefix) => {
  const randomId = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${randomId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
};

const DEFAULT_CHAPTER = { id: "chapter-default", title: "Chapter 1" };
const wordCount = (value) => String(value || "").trim().split(/\s+/).filter(Boolean).length;
const safeFileName = (value) => String(value || "untitled").replace(/[<>:"/\\|?*]/g, "-").trim() || "untitled";
const localDateKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function downloadText(contents, name, mime) {
  const url = URL.createObjectURL(new Blob([contents], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function renderMarkdown(value) {
  return String(value || "").split("\n").map((line) => {
    const safeLine = escapeHtml(line)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
    const heading = safeLine.match(/^(#{1,2})\s+(.*)$/);
    if (heading) return `<h${heading[1].length}>${heading[2]}</h${heading[1].length}>`;
    return safeLine ? `<p>${safeLine}</p>` : "<br>";
  }).join("");
}

function ActionButton({ children, onClick, title, disabled = false, secondary = false }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        secondary
          ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10"
          : "border-violet-500/30 bg-violet-600 text-white hover:bg-violet-500"
      }`}
    >
      {children}
    </button>
  );
}

export default function WritingStudio({ project, writingBlocks, writingMode, patchProject, patchSettings, saveStatus }) {
  const editorRef = useRef(null);
  const dailyTrackerRef = useRef(null);
  const [activeTab, setActiveTab] = useState("manuscript");
  const [activeChapterId, setActiveChapterId] = useState("");
  const [activeBlockId, setActiveBlockId] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [dailyWords, setDailyWords] = useState(0);
  const [dailyGoalDraftState, setDailyGoalDraftState] = useState(() => ({
    projectId: project.id,
    value: String(project.writingDailyGoal || 500),
  }));
  const chapters = project.writingChapters?.length ? project.writingChapters : [DEFAULT_CHAPTER];
  const blocks = writingBlocks.map((block) => ({
    ...block,
    chapterId: block.chapterId || chapters[0]?.id || DEFAULT_CHAPTER.id,
  }));
  const chapterId = chapters.some((chapter) => chapter.id === activeChapterId)
    ? activeChapterId
    : chapters[0]?.id;
  const chapterBlocks = blocks.filter((block) => block.chapterId === chapterId);
  const selectedBlock = chapterBlocks.find((block) => block.id === activeBlockId) || chapterBlocks[0] || null;
  const characters = Array.isArray(project.characters) ? project.characters : [];
  const timeline = Array.isArray(project.storyTimeline) ? project.storyTimeline : [];
  const manuscriptText = blocks.map((block) => block.text || "").join("\n");
  const words = wordCount(manuscriptText);
  const charactersCount = manuscriptText.length;
  const readingMinutes = words ? Math.max(1, Math.ceil(words / 200)) : 0;
  const dailyGoal = Number.isFinite(Number(project.writingDailyGoal))
    ? Math.max(50, Math.min(10000, Number(project.writingDailyGoal)))
    : 500;
  const dailyGoalDraft = dailyGoalDraftState.projectId === project.id
    ? dailyGoalDraftState.value
    : String(project.writingDailyGoal || 500);
  const dailyGoalProgress = Math.min(100, Math.round((dailyWords / dailyGoal) * 100));
  const dailyStorageKey = `plotcraft_writing_daily_${project.id || "draft"}`;
  const today = localDateKey();
  const saveLabel = {
    saved: "Saved on this device",
    unsaved: "Saving changes…",
    error: "Save failed — changes are still open",
  }[saveStatus] || "Saving changes…";

  useEffect(() => {
    let tracker = dailyTrackerRef.current;
    if (!tracker || tracker.projectId !== project.id || tracker.date !== today) {
      try {
        const saved = JSON.parse(localStorage.getItem(dailyStorageKey) || "null");
        tracker = saved?.date === today && Number.isFinite(saved.progress) && Number.isFinite(saved.lastWords)
          ? {
              projectId: project.id,
              date: today,
              progress: Math.max(0, saved.progress + words - saved.lastWords),
              lastWords: words,
            }
          : { projectId: project.id, date: today, progress: 0, lastWords: words };
      } catch {
        tracker = { projectId: project.id, date: today, progress: 0, lastWords: words };
      }
    } else {
      tracker = {
        ...tracker,
        progress: Math.max(0, tracker.progress + words - tracker.lastWords),
        lastWords: words,
      };
    }

    dailyTrackerRef.current = tracker;
    setDailyWords(tracker.progress);
    try {
      localStorage.setItem(dailyStorageKey, JSON.stringify({
        date: tracker.date,
        progress: tracker.progress,
        lastWords: tracker.lastWords,
      }));
    } catch {
      // The goal tracker remains available for this session if storage is blocked.
    }
  }, [dailyStorageKey, project.id, today, words]);

  const replaceBlocks = (nextBlocks) => patchProject({ writingBlocks: nextBlocks });
  const updateBlock = (id, patch) => replaceBlocks(
    writingBlocks.map((block) => block.id === id ? { ...block, ...patch } : block)
  );
  const updateCharacter = (id, patch) => patchProject({
    characters: characters.map((character) => character.id === id ? { ...character, ...patch } : character),
  });
  const updateTimelineItem = (id, patch) => patchProject({
    storyTimeline: timeline.map((item) => item.id === id ? { ...item, ...patch } : item),
  });

  const addChapter = () => {
    const chapter = { id: makeId("chapter"), title: `Chapter ${chapters.length + 1}` };
    patchProject({ writingChapters: [...chapters, chapter] });
    setActiveChapterId(chapter.id);
    setActiveBlockId("");
  };

  const addScene = () => {
    const scene = {
      id: makeId("scene"),
      chapterId,
      title: `${writingMode === "Comic script" ? "Panel" : "Scene"} ${blocks.length + 1}`,
      text: "",
    };
    replaceBlocks([...writingBlocks, scene]);
    setActiveChapterId(chapterId);
    setActiveBlockId(scene.id);
  };

  const moveScene = (direction) => {
    if (!selectedBlock) return;
    const index = writingBlocks.findIndex((block) => block.id === selectedBlock.id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= writingBlocks.length) return;
    const nextBlocks = [...writingBlocks];
    [nextBlocks[index], nextBlocks[nextIndex]] = [nextBlocks[nextIndex], nextBlocks[index]];
    replaceBlocks(nextBlocks);
  };

  const formatSelection = (format) => {
    const editor = editorRef.current;
    if (!editor || !selectedBlock) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = selectedBlock.text || "";
    const selected = value.slice(start, end) || "text";
    let before;
    let after;
    let replacement;
    if (format === "bold") {
      before = "**";
      after = "**";
      replacement = `${before}${selected}${after}`;
    } else if (format === "italic") {
      before = "*";
      after = "*";
      replacement = `${before}${selected}${after}`;
    } else {
      const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
      const lineEnd = value.indexOf("\n", end);
      const endOfLine = lineEnd === -1 ? value.length : lineEnd;
      const line = value.slice(lineStart, endOfLine);
      const unprefixed = line.replace(/^#{1,2}\s/, "");
      const formatted = line.startsWith("## ") ? unprefixed : `## ${unprefixed}`;
      const next = `${value.slice(0, lineStart)}${formatted}${value.slice(endOfLine)}`;
      updateBlock(selectedBlock.id, { text: next });
      requestAnimationFrame(() => {
        editor.focus();
        editor.setSelectionRange(lineStart, lineStart + formatted.length);
      });
      return;
    }
    const next = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
    updateBlock(selectedBlock.id, { text: next });
    requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const runCoWriter = async (action) => {
    if (!selectedBlock?.text.trim()) {
      setError("Write a few lines in this scene before using the AI co-writer.");
      return;
    }
    setError("");
    setAiBusy(true);
    try {
      const editor = editorRef.current;
      const start = editor?.selectionStart ?? 0;
      const end = editor?.selectionEnd ?? 0;
      const hasSelection = end > start;
      const source = hasSelection
        ? selectedBlock.text.slice(start, end)
        : selectedBlock.text;
      const instruction = action === "continue"
        ? "Continue the scene with a concise next passage. Keep the existing characters, point of view, tense, and voice consistent. Return only the new passage."
        : "Rewrite the supplied passage to improve clarity, rhythm, and emotional impact while preserving its meaning and the author's voice. Return only the revised passage.";
      const result = String(await chatAI({
        messages: [
          { role: "system", content: instruction },
          { role: "user", content: `Writing mode: ${writingMode}\nScene: ${selectedBlock.title}\nPassage:\n${source}` },
        ],
      })).trim();
      if (!result) throw new Error("The AI co-writer returned an empty result.");
      let nextText;
      if (action === "continue") {
        nextText = `${selectedBlock.text.trimEnd()}\n\n${result}`;
      } else if (hasSelection) {
        nextText = `${selectedBlock.text.slice(0, start)}${result}${selectedBlock.text.slice(end)}`;
      } else {
        nextText = result;
      }
      updateBlock(selectedBlock.id, { text: nextText });
    } catch (requestError) {
      setError(requestError.message || "Could not reach the AI co-writer. Please try again.");
    } finally {
      setAiBusy(false);
    }
  };

  const exportMarkdown = () => {
    const content = chapters.map((chapter) => {
      const scenes = blocks.filter((block) => block.chapterId === chapter.id);
      return `# ${chapter.title}\n\n${scenes.map((scene) => `## ${scene.title}\n\n${scene.text || ""}`).join("\n\n")}`;
    }).join("\n\n");
    downloadText(content, `${safeFileName(project.title)}.md`, "text/markdown;charset=utf-8");
  };

  const exportText = () => {
    const content = chapters.map((chapter) => {
      const scenes = blocks.filter((block) => block.chapterId === chapter.id);
      return `${chapter.title}\n\n${scenes.map((scene) => `${scene.title}\n${scene.text || ""}`).join("\n\n")}`;
    }).join("\n\n");
    downloadText(content, `${safeFileName(project.title)}.txt`, "text/plain;charset=utf-8");
  };

  const printManuscript = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setError("Your browser blocked the print window. Allow pop-ups to export a PDF.");
      return;
    }
    const content = chapters.map((chapter) => {
      const scenes = blocks.filter((block) => block.chapterId === chapter.id);
      return `<section><h1>${escapeHtml(chapter.title)}</h1>${scenes.map((scene) => (
        `<article><h2>${escapeHtml(scene.title)}</h2><p>${escapeHtml(scene.text).replace(/\n/g, "<br>")}</p></article>`
      )).join("")}</section>`;
    }).join("");
    printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(project.title)}</title><style>body{font:12pt/1.65 Georgia,serif;max-width:760px;margin:48px auto;color:#172033}h1{page-break-before:always}h1:first-child{page-break-before:auto}article{margin:2em 0;white-space:normal}@media print{body{margin:20mm}}</style></head><body><h1>${escapeHtml(project.title)}</h1>${content}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const metrics = [
    ["Words", words],
    ["Characters", charactersCount],
    ["Reading time", `${readingMinutes} min`],
  ];

  return (
    <section className="space-y-5 text-slate-100">
      {focusMode && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-400/20 bg-slate-900/80 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-violet-200">
              Focus mode · {project.title || "Untitled project"} · {selectedBlock?.title || "No scene selected"}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">{dailyWords} of {dailyGoal} words today</p>
          </div>
          <ActionButton secondary title="Exit focus mode" onClick={() => setFocusMode(false)}>
            Exit focus mode
          </ActionButton>
        </div>
      )}
      {!focusMode && <header className="rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/15 via-slate-900 to-cyan-500/10 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-violet-300">
              <BookOpen size={14} /> Writing studio
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">Build your story, one scene at a time.</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Organize chapters, shape characters, track story beats, and keep your manuscript saved as you write.
            </p>
          </div>
          <span role="status" className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-slate-300">
            {saveLabel}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-xl">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-black/15 p-3">
              <p className="text-lg font-black">{value}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 max-w-xl">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <label htmlFor="writing-daily-goal" className="inline-flex items-center gap-1.5 font-bold text-slate-200">
              <Target size={14} className="text-cyan-300" /> Daily writing goal
            </label>
            <span className="text-slate-300">{dailyWords} / {dailyGoal} words · {dailyGoalProgress}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Daily writing goal progress"
            aria-valuemin={0}
            aria-valuemax={dailyGoal}
            aria-valuenow={Math.min(dailyWords, dailyGoal)}
            className="h-2 overflow-hidden rounded-full bg-white/10"
          >
            <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300 transition-[width]" style={{ width: `${dailyGoalProgress}%` }} />
          </div>
          <label htmlFor="writing-daily-goal" className="sr-only">Daily writing goal in words</label>
          <input
            id="writing-daily-goal"
            type="number"
            min="50"
            max="10000"
            step="50"
            value={dailyGoalDraft}
            onChange={(event) => setDailyGoalDraftState({
              projectId: project.id,
              value: event.target.value,
            })}
            onBlur={() => {
              const parsedGoal = Number(dailyGoalDraft);
              const nextGoal = Number.isFinite(parsedGoal)
                ? Math.max(50, Math.min(10000, parsedGoal))
                : dailyGoal;
              setDailyGoalDraftState({ projectId: project.id, value: String(nextGoal) });
              patchProject({ writingDailyGoal: nextGoal });
            }}
            className="mt-2 w-28 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs text-white"
          />
          <span className="ml-2 text-[10px] text-slate-500">50–10,000 words · saved with this project</span>
        </div>
      </header>}

      {!focusMode && <nav className="flex flex-wrap gap-2" aria-label="Writing studio sections">
        {[
          ["manuscript", BookOpen, "Manuscript"],
          ["characters", Users, "Characters"],
          ["timeline", Milestone, "Plot timeline"],
        ].map(([tab, Icon, label]) => (
          <button
            key={tab}
            type="button"
            aria-pressed={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold ${
              activeTab === tab ? "border-violet-400 bg-violet-600 text-white" : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
          {["Story", "Comic script", "Screenplay"].map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={writingMode === mode}
              onClick={() => patchSettings({ writingMode: mode })}
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                writingMode === mode
                  ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
                  : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10"
              }`}
            >
              {mode}
            </button>
          ))}
          <ActionButton secondary onClick={exportText}><Download size={14} /> TXT</ActionButton>
          <ActionButton secondary onClick={exportMarkdown}><FileText size={14} /> Markdown</ActionButton>
          <ActionButton secondary onClick={printManuscript}><Printer size={14} /> Print / PDF</ActionButton>
          <ActionButton secondary title="Enter distraction-free focus mode" onClick={() => setFocusMode(true)}>
            <Focus size={14} /> Focus
          </ActionButton>
        </div>
      </nav>}

      {activeTab === "manuscript" && (
        <div className={`grid gap-4 ${focusMode ? "grid-cols-1" : "xl:grid-cols-[260px_minmax(0,1fr)]"}`}>
          {!focusMode && <aside className="space-y-3 rounded-3xl border border-white/10 bg-slate-900/80 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-black">Chapter binder</h2>
              <ActionButton title="Add chapter" onClick={addChapter}><Plus size={14} /></ActionButton>
            </div>
            {chapters.map((chapter) => (
              <div key={chapter.id} className="space-y-1">
                <button
                  type="button"
                  aria-pressed={chapterId === chapter.id}
                  onClick={() => { setActiveChapterId(chapter.id); setActiveBlockId(""); }}
                  className={`w-full rounded-xl px-3 py-2 text-left text-xs font-black ${
                    chapterId === chapter.id ? "bg-violet-500/20 text-violet-200" : "hover:bg-white/5"
                  }`}
                >
                  {chapter.title}
                  <span className="ml-2 text-[10px] font-medium opacity-60">
                    {blocks.filter((block) => block.chapterId === chapter.id).length} scenes
                  </span>
                </button>
                {chapterId === chapter.id && chapterBlocks.map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    aria-current={selectedBlock?.id === block.id ? "true" : undefined}
                    onClick={() => setActiveBlockId(block.id)}
                    className={`ml-3 w-[calc(100%-0.75rem)] truncate rounded-lg px-3 py-2 text-left text-xs ${
                      selectedBlock?.id === block.id ? "bg-cyan-500/15 text-cyan-200" : "text-slate-400 hover:bg-white/5"
                    }`}
                  >
                    {block.title}
                  </button>
                ))}
              </div>
            ))}
            <ActionButton secondary onClick={addScene}><Plus size={14} /> Add scene</ActionButton>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Changes are autosaved to this device. Keep this browser profile to access your manuscript later.
            </p>
          </aside>}

          <div className="min-w-0 rounded-3xl border border-white/10 bg-slate-900/80 p-4 sm:p-6">
            {!selectedBlock ? (
              <div className="grid min-h-64 place-items-center text-center">
                <div>
                  <BookOpen className="mx-auto text-violet-300" size={28} />
                  <h2 className="mt-3 font-black">Start this chapter</h2>
                  <p className="mt-1 text-sm text-slate-400">Add a scene to begin drafting.</p>
                  <div className="mt-4"><ActionButton onClick={addScene}><Plus size={14} /> Add first scene</ActionButton></div>
                </div>
              </div>
            ) : (
              <>
                <input
                  aria-label="Chapter title"
                  value={chapters.find((chapter) => chapter.id === chapterId)?.title || ""}
                  onChange={(event) => patchProject({
                    writingChapters: chapters.map((chapter) => chapter.id === chapterId
                      ? { ...chapter, title: event.target.value }
                      : chapter),
                  })}
                  className="mb-3 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-base font-black text-violet-200"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    aria-label="Scene title"
                    value={selectedBlock.title || ""}
                    onChange={(event) => updateBlock(selectedBlock.id, { title: event.target.value })}
                    className="min-w-40 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-black text-white"
                  />
                  <select
                    aria-label="Scene chapter"
                    value={selectedBlock.chapterId}
                    onChange={(event) => updateBlock(selectedBlock.id, { chapterId: event.target.value })}
                    className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white"
                  >
                    {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
                  </select>
                  <ActionButton secondary title="Move scene up" onClick={() => moveScene(-1)}><ArrowUp size={14} /></ActionButton>
                  <ActionButton secondary title="Move scene down" onClick={() => moveScene(1)}><ArrowDown size={14} /></ActionButton>
                  <ActionButton secondary title="Delete scene" onClick={() => replaceBlocks(writingBlocks.filter((block) => block.id !== selectedBlock.id))}>
                    <Trash2 size={14} />
                  </ActionButton>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-y border-white/10 py-3">
                  <ActionButton secondary title="Bold selection" onClick={() => formatSelection("bold")}><Bold size={14} /></ActionButton>
                  <ActionButton secondary title="Italic selection" onClick={() => formatSelection("italic")}><Italic size={14} /></ActionButton>
                  <ActionButton secondary title="Heading selection" onClick={() => formatSelection("heading")}><Heading2 size={14} /></ActionButton>
                  <ActionButton
                    secondary
                    title={previewMode ? "Edit manuscript" : "Preview formatting"}
                    onClick={() => setPreviewMode((current) => !current)}
                  >
                    {previewMode ? "Edit" : "Preview"}
                  </ActionButton>
                  <span className="mx-1 h-5 border-l border-white/10" />
                  <ActionButton disabled={aiBusy} onClick={() => runCoWriter("rewrite")}>
                    <Sparkles size={14} /> {aiBusy ? "Working…" : "Rewrite selection"}
                  </ActionButton>
                  <ActionButton secondary disabled={aiBusy} onClick={() => runCoWriter("continue")}>
                    <Sparkles size={14} /> Continue scene
                  </ActionButton>
                </div>

                {previewMode ? (
                  <div
                    aria-label="Formatted scene preview"
                    className="prose prose-invert mt-4 min-h-[420px] max-w-none rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-100 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-black [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_p]:my-2"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedBlock.text) }}
                  />
                ) : (
                  <textarea
                    ref={editorRef}
                    aria-label="Scene text"
                    spellCheck
                    value={selectedBlock.text || ""}
                    onChange={(event) => updateBlock(selectedBlock.id, { text: event.target.value })}
                    onKeyDown={(event) => {
                      if (!(event.ctrlKey || event.metaKey)) return;
                      if (event.key.toLowerCase() === "b") { event.preventDefault(); formatSelection("bold"); }
                      if (event.key.toLowerCase() === "i") { event.preventDefault(); formatSelection("italic"); }
                    }}
                    placeholder="Write your scene here. Select text and use the toolbar to format or ask the AI co-writer for help."
                    className="mt-4 min-h-[420px] w-full resize-y rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-400"
                  />
                )}
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Clock3 size={12} /> {wordCount(selectedBlock.text)} words in this scene · Markdown shortcuts: Ctrl/⌘+B and Ctrl/⌘+I
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === "characters" && (
        <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/80 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black"><Users size={18} className="text-violet-300" /> Character cards</h2>
              <p className="mt-1 text-xs text-slate-400">Keep names, motivations, and character details together while drafting.</p>
            </div>
            <ActionButton onClick={() => patchProject({
              characters: [...characters, { id: makeId("character"), name: "", role: "", goal: "", description: "" }],
            })}><Plus size={14} /> Add character</ActionButton>
          </div>
          {!characters.length && <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">Your character cards will appear here.</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {characters.map((character, index) => (
              <article key={character.id} className="space-y-3 rounded-2xl border border-white/10 bg-black/15 p-4">
                <div className="flex items-center gap-2">
                  <input aria-label={`Character ${index + 1} name`} value={character.name || ""} onChange={(event) => updateCharacter(character.id, { name: event.target.value })} placeholder="Character name" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm font-bold" />
                  <button type="button" onClick={() => patchProject({ characters: characters.filter((item) => item.id !== character.id) })} aria-label={`Delete ${character.name || "character"}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"><Trash2 size={15} /></button>
                </div>
                <input aria-label="Character role" value={character.role || ""} onChange={(event) => updateCharacter(character.id, { role: event.target.value })} placeholder="Role (hero, mentor, antagonist…)" className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-xs" />
                <input aria-label="Character goal" value={character.goal || ""} onChange={(event) => updateCharacter(character.id, { goal: event.target.value })} placeholder="Goal or motivation" className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-xs" />
                <textarea aria-label="Character description" value={character.description || ""} onChange={(event) => updateCharacter(character.id, { description: event.target.value })} placeholder="Appearance, personality, backstory…" rows={3} className="w-full resize-y rounded-lg border border-white/10 bg-transparent px-3 py-2 text-xs leading-5" />
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === "timeline" && (
        <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/80 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black"><Milestone size={18} className="text-cyan-300" /> Plot timeline</h2>
              <p className="mt-1 text-xs text-slate-400">Arrange important story beats and link them to chapters.</p>
            </div>
            <ActionButton onClick={() => patchProject({
              storyTimeline: [...timeline, { id: makeId("beat"), title: "", chapterId, description: "" }],
            })}><Plus size={14} /> Add story beat</ActionButton>
          </div>
          {!timeline.length && <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">Add the turning points, reveals, and other moments that shape your story.</p>}
          <div className="space-y-3">
            {timeline.map((item, index) => (
              <article key={item.id} className="grid gap-3 rounded-2xl border border-white/10 bg-black/15 p-4 md:grid-cols-[48px_minmax(0,1fr)_180px_auto]">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500/10 text-xs font-black text-cyan-200">{index + 1}</span>
                <div className="space-y-2">
                  <input aria-label={`Story beat ${index + 1} title`} value={item.title || ""} onChange={(event) => updateTimelineItem(item.id, { title: event.target.value })} placeholder="What happens?" className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm font-bold" />
                  <textarea aria-label="Story beat details" value={item.description || ""} onChange={(event) => updateTimelineItem(item.id, { description: event.target.value })} placeholder="Why does this moment matter?" rows={2} className="w-full resize-y rounded-lg border border-white/10 bg-transparent px-3 py-2 text-xs leading-5" />
                </div>
                <select aria-label="Timeline chapter" value={item.chapterId || chapters[0]?.id || ""} onChange={(event) => updateTimelineItem(item.id, { chapterId: event.target.value })} className="h-fit rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs">
                  {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
                </select>
                <button type="button" onClick={() => patchProject({ storyTimeline: timeline.filter((beat) => beat.id !== item.id) })} aria-label={`Delete story beat ${index + 1}`} className="h-fit rounded-lg p-2 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"><Trash2 size={15} /></button>
              </article>
            ))}
          </div>
        </section>
      )}

      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
      <p className="text-[11px] text-slate-500">
        <Italic size={11} className="mr-1 inline" /> AI assistance uses your configured PlotCraft AI service; generated text is inserted only into the selected scene.
      </p>
    </section>
  );
}
