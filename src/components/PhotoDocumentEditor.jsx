import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Crop,
  Download,
  FlipHorizontal,
  FlipVertical,
  Image as ImageIcon,
  Layers,
  Paintbrush,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";

const INITIAL_ADJUSTMENTS = { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, gray: 0, sepia: 0 };
const PAGE_LAYOUTS = [
  { id: "original", label: "Original photo", ratio: null },
  { id: "square", label: "Square · 1:1", ratio: 1 },
  { id: "portrait", label: "Portrait · 4:5", ratio: 4 / 5 },
  { id: "story", label: "Story · 9:16", ratio: 9 / 16 },
  { id: "document", label: "Document · A4", ratio: 210 / 297 },
];
const FILTER_PRESETS = [
  { id: "original", label: "Original", adjustments: INITIAL_ADJUSTMENTS },
  { id: "cinema", label: "Cinema", adjustments: { ...INITIAL_ADJUSTMENTS, contrast: 116, saturation: 112, brightness: 94, hue: -4 } },
  { id: "vivid", label: "Vivid", adjustments: { ...INITIAL_ADJUSTMENTS, contrast: 112, saturation: 145, brightness: 104 } },
  { id: "warm", label: "Golden hour", adjustments: { ...INITIAL_ADJUSTMENTS, brightness: 104, saturation: 112, sepia: 20, hue: -8 } },
  { id: "cool", label: "Cool tone", adjustments: { ...INITIAL_ADJUSTMENTS, contrast: 106, saturation: 92, hue: 16 } },
  { id: "mono", label: "Mono", adjustments: { ...INITIAL_ADJUSTMENTS, contrast: 115, gray: 100 } },
  { id: "vintage", label: "Vintage", adjustments: { ...INITIAL_ADJUSTMENTS, contrast: 92, saturation: 78, sepia: 34, brightness: 106 } },
  { id: "soft", label: "Soft focus", adjustments: { ...INITIAL_ADJUSTMENTS, contrast: 94, brightness: 106, blur: 0.6 } },
];
const EDITOR_THEMES = [
  { id: "midnight", label: "Midnight", accent: "#a78bfa", surface: "#111827", stage: "#080d17" },
  { id: "paper", label: "Paper", accent: "#2563eb", surface: "#ffffff", stage: "#e8edf5" },
  { id: "rose", label: "Rose", accent: "#e879a8", surface: "#24141f", stage: "#130d14" },
  { id: "ocean", label: "Ocean", accent: "#38bdf8", surface: "#0e1c2b", stage: "#07111b" },
];
const PAGE_BACKGROUNDS = [
  { id: "transparent", label: "Transparent", color: null },
  { id: "paper", label: "Paper white", color: "#ffffff" },
  { id: "cream", label: "Warm paper", color: "#fff7e8" },
  { id: "ink", label: "Midnight", color: "#111827" },
  { id: "blush", label: "Blush", color: "#fce7f3" },
];
const FONT_OPTIONS = ["Arial", "Georgia", "Trebuchet MS", "Courier New", "Impact"];
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function RangeControl({ label, value, min, max, step = 1, onChange, suffix = "" }) {
  return (
    <label className="pde-control">
      <span><span>{label}</span><b>{value}{suffix}</b></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function IconButton({ icon: Icon, label, active = false, disabled = false, onClick }) {
  return (
    <button type="button" className={`pde-icon-button ${active ? "is-active" : ""}`} aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
}

function outputSize(width, height, layout) {
  if (!layout.ratio) return { width, height };
  const maxSide = Math.min(4096, Math.max(width, height));
  if (layout.ratio >= 1) return { width: maxSide, height: Math.max(1, Math.round(maxSide / layout.ratio)) };
  return { width: Math.max(1, Math.round(maxSide * layout.ratio)), height: maxSide };
}

export default function PhotoDocumentEditor({ file, notify }) {
  const sourceRef = useRef(null);
  const previewRef = useRef(null);
  const historyRef = useRef({ past: [], future: [] });
  const pointerRef = useRef({ start: null, dragId: null });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [loadResult, setLoadResult] = useState({ url: "", error: "" });
  const [historyStatus, setHistoryStatus] = useState({ canUndo: false, canRedo: false });
  const [activePanel, setActivePanel] = useState("edit");
  const [themeId, setThemeId] = useState("midnight");
  const [presetId, setPresetId] = useState("original");
  const [adjustments, setAdjustments] = useState(INITIAL_ADJUSTMENTS);
  const [pageLayout, setPageLayout] = useState("original");
  const [pageBackground, setPageBackground] = useState("transparent");
  const [frame, setFrame] = useState("none");
  const [layers, setLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState(null);
  const [cropRatio, setCropRatio] = useState("free");
  const [keepRatio, setKeepRatio] = useState(true);
  const [resize, setResize] = useState({ width: 0, height: 0 });
  const [format, setFormat] = useState("png");
  const [quality, setQuality] = useState(0.92);
  const [showOriginal, setShowOriginal] = useState(false);
  const [busy, setBusy] = useState(false);
  const activeTheme = EDITOR_THEMES.find((theme) => theme.id === themeId) || EDITOR_THEMES[0];
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);
  const layout = PAGE_LAYOUTS.find((item) => item.id === pageLayout) || PAGE_LAYOUTS[0];
  const background = PAGE_BACKGROUNDS.find((item) => item.id === pageBackground) || PAGE_BACKGROUNDS[0];

  useEffect(() => {
    let active = true;
    const image = new Image();
    sourceRef.current = null;
    image.onload = () => {
      if (!active) return;
      const scale = Math.min(1, 4096 / Math.max(image.naturalWidth, image.naturalHeight));
      const source = document.createElement("canvas");
      source.width = Math.max(1, Math.round(image.naturalWidth * scale));
      source.height = Math.max(1, Math.round(image.naturalHeight * scale));
      source.getContext("2d").drawImage(image, 0, 0, source.width, source.height);
      sourceRef.current = source;
      historyRef.current = { past: [], future: [] };
      setDimensions({ width: source.width, height: source.height });
      setResize({ width: source.width, height: source.height });
      setLoadResult({ url: file.url, error: "" });
      setHistoryStatus({ canUndo: false, canRedo: false });
      setLayers([]);
      setSelectedLayerId(null);
      setPresetId("original");
      setAdjustments(INITIAL_ADJUSTMENTS);
      setCropMode(false);
      setCropRect(null);
    };
    image.onerror = () => {
      if (active) setLoadResult({ url: file.url, error: "This image could not be opened. Try a PNG, JPG, or WebP file." });
    };
    image.src = file.url;
    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [file.url]);

  const draw = useCallback((canvas, originalOnly = false) => {
    const source = sourceRef.current;
    if (!canvas || !source?.width || !source?.height) return;
    const size = outputSize(source.width, source.height, layout);
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, size.width, size.height);
    if (background.color || format === "jpg") {
      context.fillStyle = background.color || "#ffffff";
      context.fillRect(0, 0, size.width, size.height);
    }

    const padding = pageLayout === "original" ? 0 : Math.round(Math.min(size.width, size.height) * 0.045);
    const scale = Math.min((size.width - padding * 2) / source.width, (size.height - padding * 2) / source.height);
    const imageWidth = Math.max(1, Math.round(source.width * scale));
    const imageHeight = Math.max(1, Math.round(source.height * scale));
    const imageX = Math.round((size.width - imageWidth) / 2);
    const imageY = Math.round((size.height - imageHeight) / 2);

    context.save();
    if (!originalOnly) {
      const a = adjustments;
      context.filter = `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%) hue-rotate(${a.hue}deg) blur(${a.blur}px) grayscale(${a.gray}%) sepia(${a.sepia}%)`;
    }
    context.drawImage(source, imageX, imageY, imageWidth, imageHeight);
    context.restore();

    if (!originalOnly && frame !== "none") {
      context.save();
      const line = Math.max(2, Math.round(Math.min(imageWidth, imageHeight) * 0.012));
      if (frame === "shadow") {
        context.shadowColor = "rgba(0,0,0,.45)";
        context.shadowBlur = line * 2;
      }
      context.lineWidth = line;
      context.strokeStyle = frame === "film" ? "#111827" : "#ffffff";
      context.strokeRect(imageX + line / 2, imageY + line / 2, imageWidth - line, imageHeight - line);
      if (frame === "film") {
        context.setLineDash([line * 1.8, line * 1.2]);
        context.lineWidth = Math.max(1, line * 0.55);
        context.strokeStyle = "#f8fafc";
        context.strokeRect(imageX + line * 1.6, imageY + line * 1.6, imageWidth - line * 3.2, imageHeight - line * 3.2);
      }
      context.restore();
    }

    if (!originalOnly) {
      layers.forEach((layer) => {
        const x = (layer.x / 100) * size.width;
        const y = (layer.y / 100) * size.height;
        context.save();
        context.globalAlpha = layer.opacity ?? 1;
        if (layer.kind === "shape") {
          const shapeSize = Math.max(12, (layer.size / 100) * Math.min(size.width, size.height));
          context.fillStyle = layer.color;
          if (layer.shape === "circle") {
            context.beginPath();
            context.arc(x, y, shapeSize / 2, 0, Math.PI * 2);
            context.fill();
          } else {
            context.fillRect(x - shapeSize / 2, y - shapeSize / 3, shapeSize, shapeSize * 0.66);
          }
        } else {
          const fontSize = Math.max(12, (layer.size / 100) * size.height);
          const weight = layer.bold ? "700" : "400";
          const style = layer.italic ? "italic " : "";
          context.font = `${style}${weight} ${fontSize}px "${layer.font}"`;
          context.textAlign = layer.align || "center";
          context.textBaseline = "middle";
          context.lineJoin = "round";
          context.shadowColor = layer.shadow ? "rgba(0,0,0,.65)" : "transparent";
          context.shadowBlur = layer.shadow ? Math.max(4, fontSize * 0.18) : 0;
          const lines = String(layer.text || "").split("\n");
          const lineHeight = fontSize * 1.2;
          const startY = y - ((lines.length - 1) * lineHeight) / 2;
          lines.forEach((text, index) => {
            const lineY = startY + index * lineHeight;
            if (layer.outline) {
              context.strokeStyle = "rgba(0,0,0,.75)";
              context.lineWidth = Math.max(2, fontSize * 0.08);
              context.strokeText(text, x, lineY, size.width * 0.88);
            }
            context.fillStyle = layer.color;
            context.fillText(text, x, lineY, size.width * 0.88);
          });
        }
        context.restore();
      });
    }

    if (!originalOnly && cropMode && cropRect && pageLayout === "original") {
      context.save();
      context.fillStyle = "rgba(3,7,18,.62)";
      context.fillRect(0, 0, size.width, size.height);
      context.beginPath();
      context.rect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
      context.clip();
      context.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) hue-rotate(${adjustments.hue}deg) blur(${adjustments.blur}px) grayscale(${adjustments.gray}%) sepia(${adjustments.sepia}%)`;
      context.drawImage(source, 0, 0);
      context.filter = "none";
      context.restore();
      context.strokeStyle = "#fff";
      context.lineWidth = Math.max(2, size.width / 500);
      context.setLineDash([8, 6]);
      context.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
    }
  }, [adjustments, background.color, cropMode, cropRect, format, frame, layers, layout, pageLayout]);

  useEffect(() => {
    draw(previewRef.current, showOriginal);
  }, [draw, showOriginal, dimensions]);

  const updateSource = (next) => {
    const source = sourceRef.current;
    if (!source || !next.width || !next.height) return;
    historyRef.current.past.push(source.toDataURL("image/png"));
    if (historyRef.current.past.length > 10) historyRef.current.past.shift();
    historyRef.current.future = [];
    setHistoryStatus({ canUndo: historyRef.current.past.length > 0, canRedo: false });
    source.width = next.width;
    source.height = next.height;
    source.getContext("2d").drawImage(next, 0, 0);
    setDimensions({ width: source.width, height: source.height });
    setResize({ width: source.width, height: source.height });
    setCropMode(false);
    setCropRect(null);
  };

  const restoreHistory = (direction) => {
    const history = historyRef.current;
    const from = direction === "undo" ? history.past : history.future;
    const to = direction === "undo" ? history.future : history.past;
    const data = from.pop();
    if (!data || !sourceRef.current) return;
    to.push(sourceRef.current.toDataURL("image/png"));
    setHistoryStatus({ canUndo: history.past.length > 0, canRedo: history.future.length > 0 });
    const image = new Image();
    image.onload = () => {
      const source = sourceRef.current;
      source.width = image.width;
      source.height = image.height;
      source.getContext("2d").drawImage(image, 0, 0);
      setDimensions({ width: source.width, height: source.height });
      setResize({ width: source.width, height: source.height });
    };
    image.src = data;
  };

  const rotate = (direction) => {
    const source = sourceRef.current;
    if (!source) return;
    const next = document.createElement("canvas");
    next.width = source.height;
    next.height = source.width;
    const context = next.getContext("2d");
    context.translate(next.width / 2, next.height / 2);
    context.rotate((direction * Math.PI) / 2);
    context.drawImage(source, -source.width / 2, -source.height / 2);
    updateSource(next);
  };

  const flip = (horizontal) => {
    const source = sourceRef.current;
    if (!source) return;
    const next = document.createElement("canvas");
    next.width = source.width;
    next.height = source.height;
    const context = next.getContext("2d");
    context.translate(horizontal ? next.width : 0, horizontal ? 0 : next.height);
    context.scale(horizontal ? -1 : 1, horizontal ? 1 : -1);
    context.drawImage(source, 0, 0);
    updateSource(next);
  };

  const applyCrop = (selection = cropRect) => {
    const source = sourceRef.current;
    if (!source || !selection || selection.width < 5 || selection.height < 5) return;
    const x = clamp(Math.round(selection.x), 0, source.width - 1);
    const y = clamp(Math.round(selection.y), 0, source.height - 1);
    const width = clamp(Math.round(selection.width), 1, source.width - x);
    const height = clamp(Math.round(selection.height), 1, source.height - y);
    const next = document.createElement("canvas");
    next.width = width;
    next.height = height;
    next.getContext("2d").drawImage(source, x, y, width, height, 0, 0, width, height);
    updateSource(next);
  };

  const resizeImage = () => {
    const source = sourceRef.current;
    if (!source) return;
    const width = clamp(Math.round(Number(resize.width) || source.width), 1, 4096);
    const height = clamp(Math.round(Number(resize.height) || source.height), 1, 4096);
    const next = document.createElement("canvas");
    next.width = width;
    next.height = height;
    next.getContext("2d").drawImage(source, 0, 0, width, height);
    updateSource(next);
    notify(`Resized image to ${width} × ${height}px.`);
  };

  const addText = (kind) => {
    const layer = {
      id: `text-${Date.now()}`,
      kind: "text",
      text: kind === "title" ? "Your headline" : "Add a caption",
      x: 50,
      y: kind === "title" ? 16 : 84,
      size: kind === "title" ? 7 : 4,
      color: "#ffffff",
      font: kind === "title" ? "Georgia" : "Arial",
      align: "center",
      bold: kind === "title",
      italic: false,
      outline: true,
      shadow: true,
      opacity: 1,
    };
    setLayers((current) => [...current, layer]);
    setSelectedLayerId(layer.id);
  };

  const addShape = (shape) => {
    const layer = { id: `shape-${Date.now()}`, kind: "shape", shape, x: 50, y: 50, size: 12, color: activeTheme.accent, opacity: 0.8 };
    setLayers((current) => [...current, layer]);
    setSelectedLayerId(layer.id);
  };

  const patchLayer = (patch) => setLayers((current) => current.map((layer) => layer.id === selectedLayerId ? { ...layer, ...patch } : layer));
  const removeSelectedLayer = () => {
    setLayers((current) => current.filter((layer) => layer.id !== selectedLayerId));
    setSelectedLayerId(null);
  };

  const pointerPosition = (event) => {
    const canvas = previewRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
    };
  };

  const handlePointerDown = (event) => {
    if (!sourceRef.current || showOriginal) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (cropMode && pageLayout === "original") {
      const canvas = previewRef.current;
      const rect = canvas.getBoundingClientRect();
      const point = {
        x: clamp(((event.clientX - rect.left) / rect.width) * canvas.width, 0, canvas.width),
        y: clamp(((event.clientY - rect.top) / rect.height) * canvas.height, 0, canvas.height),
      };
      pointerRef.current.start = point;
      setCropRect({ x: point.x, y: point.y, width: 0, height: 0 });
      return;
    }
    const point = pointerPosition(event);
    const hit = [...layers].reverse().find((layer) => Math.abs(layer.x - point.x) < 15 && Math.abs(layer.y - point.y) < 15);
    if (hit) {
      pointerRef.current.dragId = hit.id;
      setSelectedLayerId(hit.id);
    }
  };

  const handlePointerMove = (event) => {
    if (pointerRef.current.start && previewRef.current) {
      const canvas = previewRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = clamp(((event.clientX - rect.left) / rect.width) * canvas.width, 0, canvas.width);
      const y = clamp(((event.clientY - rect.top) / rect.height) * canvas.height, 0, canvas.height);
      const start = pointerRef.current.start;
      const directionX = x >= start.x ? 1 : -1;
      const directionY = y >= start.y ? 1 : -1;
      let width = Math.abs(x - start.x);
      let height = Math.abs(y - start.y);
      if (cropRatio !== "free" && width && height) {
        const ratio = Number(cropRatio);
        if (width / height > ratio) width = height * ratio;
        else height = width / ratio;
        const maxWidth = directionX > 0 ? canvas.width - start.x : start.x;
        const maxHeight = directionY > 0 ? canvas.height - start.y : start.y;
        const fit = Math.min(1, maxWidth / width, maxHeight / height);
        width *= fit;
        height *= fit;
      }
      setCropRect({
        x: directionX > 0 ? start.x : start.x - width,
        y: directionY > 0 ? start.y : start.y - height,
        width,
        height,
      });
      return;
    }
    if (pointerRef.current.dragId) {
      const point = pointerPosition(event);
      const id = pointerRef.current.dragId;
      setLayers((current) => current.map((layer) => layer.id === id ? { ...layer, x: point.x, y: point.y } : layer));
    }
  };

  const handlePointerUp = () => {
    pointerRef.current = { start: null, dragId: null };
  };

  const setBrightnessPreset = (item) => {
    setPresetId(item.id);
    setAdjustments(item.adjustments);
  };

  const exportImage = () => {
    const canvas = document.createElement("canvas");
    draw(canvas);
    const mime = format === "jpg" ? "image/jpeg" : `image/${format}`;
    setBusy(true);
    canvas.toBlob((blob) => {
      setBusy(false);
      if (!blob) {
        notify("Could not export this image. Try PNG or a smaller canvas.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${file.name.replace(/\.[^.]+$/, "")}-edited.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify(`Edited image downloaded as ${format.toUpperCase()}.`);
    }, mime, format === "png" ? undefined : quality);
  };

  const updateWidth = (value) => {
    const width = Math.max(1, Number(value) || 1);
    const ratio = dimensions.width / Math.max(1, dimensions.height);
    setResize((current) => ({ width, height: keepRatio ? Math.round(width / ratio) : current.height }));
  };

  const loadError = loadResult.url === file.url ? loadResult.error : "";
  const imageReady = loadResult.url === file.url && !loadError;
  if (loadError) return <p role="alert" className="p-8 text-center text-sm text-rose-300">{loadError}</p>;

  return (
    <section
      className={`photo-document-editor pde-${themeId}`}
      style={{ "--pde-accent": activeTheme.accent, "--pde-surface": activeTheme.surface, "--pde-stage": activeTheme.stage }}
      aria-label="Photo and document editor"
    >
      <style>{`
        .photo-document-editor{--pde-line:rgba(255,255,255,.1);--pde-muted:#9ca3af;overflow:hidden;border:1px solid var(--pde-line);border-radius:20px;background:var(--pde-surface);color:#f8fafc}
        .pde-paper{--pde-line:rgba(15,23,42,.12);--pde-muted:#64748b;color:#172033}
        .photo-document-editor button{font:inherit}
        .pde-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid var(--pde-line)}
        .pde-brand{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:800}
        .pde-brand-mark{display:grid;width:30px;height:30px;place-items:center;border-radius:10px;background:color-mix(in srgb,var(--pde-accent) 20%,transparent);color:var(--pde-accent)}
        .pde-tabs{display:flex;gap:4px;padding:4px;border:1px solid var(--pde-line);border-radius:12px;background:rgba(0,0,0,.12)}
        .pde-tabs button,.pde-icon-button,.pde-action{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid transparent;border-radius:10px;padding:8px 10px;background:transparent;color:inherit;font-size:11px;font-weight:700;cursor:pointer;transition:background .18s ease,border-color .18s ease,transform .18s ease}
        .pde-tabs button:hover,.pde-icon-button:hover,.pde-action:hover{background:color-mix(in srgb,var(--pde-accent) 12%,transparent)}
        .pde-tabs button.active,.pde-icon-button.is-active{background:color-mix(in srgb,var(--pde-accent) 18%,transparent);border-color:color-mix(in srgb,var(--pde-accent) 45%,transparent);color:var(--pde-accent)}
        .pde-icon-button:disabled{opacity:.4;cursor:not-allowed}
        .pde-icon-button span{display:none}
        .pde-theme-list{display:flex;gap:5px}
        .pde-theme-dot{width:18px;height:18px;border:2px solid rgba(255,255,255,.32);border-radius:50%;cursor:pointer}
        .pde-theme-dot.active{outline:2px solid var(--pde-accent);outline-offset:2px}
        .pde-workspace{display:grid;min-height:520px;grid-template-columns:minmax(0,1fr) 310px}
        .pde-stage{display:grid;min-width:0;min-height:520px;place-items:center;overflow:auto;padding:20px;background:var(--pde-stage);background-image:linear-gradient(45deg,rgba(148,163,184,.07) 25%,transparent 25%),linear-gradient(-45deg,rgba(148,163,184,.07) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(148,163,184,.07) 75%),linear-gradient(-45deg,transparent 75%,rgba(148,163,184,.07) 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}
        .pde-canvas{display:block;max-width:100%;max-height:68vh;width:auto;height:auto;touch-action:none;box-shadow:0 22px 65px rgba(0,0,0,.32);cursor:default}
        .pde-canvas.crop-mode{cursor:crosshair}
        .pde-canvas.layer-mode{cursor:move}
        .pde-empty{max-width:310px;text-align:center;color:var(--pde-muted);font-size:12px;line-height:1.6}
        .pde-empty svg{margin:0 auto 12px;color:var(--pde-accent)}
        .pde-panel{max-height:680px;overflow:auto;border-left:1px solid var(--pde-line);padding:16px}
        .pde-panel h3{margin:0 0 12px;font-size:13px;font-weight:800}
        .pde-panel-section{padding:14px 0;border-bottom:1px solid var(--pde-line)}
        .pde-panel-section:first-child{padding-top:0}
        .pde-panel-section:last-child{border-bottom:0}
        .pde-control{display:block;margin:11px 0;font-size:11px;font-weight:600}
        .pde-control>span{display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;color:var(--pde-muted)}
        .pde-control b{color:inherit;font-variant-numeric:tabular-nums}
        .pde-control input[type=range]{width:100%;accent-color:var(--pde-accent)}
        .pde-select,.pde-input{width:100%;border:1px solid var(--pde-line);border-radius:10px;padding:9px 10px;background:rgba(0,0,0,.16);color:inherit;font-size:12px}
        .pde-paper .pde-select,.pde-paper .pde-input{background:#fff}
        .pde-preset-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
        .pde-preset{display:flex;align-items:center;gap:8px;min-height:48px;border:1px solid var(--pde-line);border-radius:11px;padding:7px;background:rgba(255,255,255,.035);color:inherit;text-align:left;font-size:10px;font-weight:700;cursor:pointer}
        .pde-preset.active{border-color:var(--pde-accent);background:color-mix(in srgb,var(--pde-accent) 14%,transparent)}
        .pde-preset-swatch{width:30px;height:30px;flex:none;border-radius:8px;background:linear-gradient(135deg,#fb7185,#fbbf24 45%,#60a5fa)}
        .pde-preset[data-preset=cinema] .pde-preset-swatch{filter:contrast(1.2) saturate(1.2) brightness(.86)}
        .pde-preset[data-preset=vivid] .pde-preset-swatch{filter:saturate(1.8)}
        .pde-preset[data-preset=warm] .pde-preset-swatch{filter:sepia(.55)}
        .pde-preset[data-preset=cool] .pde-preset-swatch{filter:hue-rotate(25deg)}
        .pde-preset[data-preset=mono] .pde-preset-swatch{filter:grayscale(1)}
        .pde-preset[data-preset=vintage] .pde-preset-swatch{filter:sepia(.45) saturate(.7)}
        .pde-preset[data-preset=soft] .pde-preset-swatch{filter:blur(1px) brightness(1.1)}
        .pde-actions{display:flex;flex-wrap:wrap;gap:6px}
        .pde-action{border-color:var(--pde-line);background:rgba(255,255,255,.04)}
        .pde-primary{width:100%;margin-top:10px;background:var(--pde-accent);color:#111827}
        .pde-primary:disabled{opacity:.55;cursor:wait}
        .pde-layer-list{display:grid;gap:6px;margin-top:10px}
        .pde-layer-row{display:flex;align-items:center;gap:7px;width:100%;border:1px solid var(--pde-line);border-radius:9px;padding:8px;background:transparent;color:inherit;text-align:left;font-size:11px;cursor:pointer}
        .pde-layer-row.active{border-color:var(--pde-accent)}
        .pde-align{display:flex;gap:5px}
        .pde-align button{flex:1}
        @media(max-width:850px){.pde-workspace{grid-template-columns:1fr}.pde-stage{min-height:360px}.pde-panel{max-height:none;border-top:1px solid var(--pde-line);border-left:0}}
        @media(max-width:560px){.pde-toolbar{align-items:flex-start}.pde-tabs{width:100%;overflow-x:auto}.pde-tabs button{flex:1;padding:8px 6px;font-size:10px}.pde-theme-list{margin-left:auto}.pde-stage{min-height:300px;padding:10px}.pde-panel{padding:12px}}
        @media(prefers-reduced-motion:reduce){.photo-document-editor *{scroll-behavior:auto!important;transition:none!important}}
      `}</style>

      <header className="pde-toolbar">
        <div className="pde-brand"><span className="pde-brand-mark"><ImageIcon size={16} /></span><span>PlotCraft Photo &amp; Page Studio</span></div>
        <nav className="pde-tabs" aria-label="Editor tools">
          {[["edit", SlidersHorizontal, "Edit"], ["design", Type, "Design"], ["page", Layers, "Page"], ["export", Download, "Export"]].map(([id, Icon, label]) => (
            <button type="button" key={id} className={activePanel === id ? "active" : ""} onClick={() => setActivePanel(id)}><Icon size={14} />{label}</button>
          ))}
        </nav>
        <div className="pde-theme-list" aria-label="Editor themes">
          {EDITOR_THEMES.map((theme) => (
            <button
              type="button"
              key={theme.id}
              className={`pde-theme-dot ${themeId === theme.id ? "active" : ""}`}
              style={{ background: theme.accent }}
              title={`${theme.label} theme`}
              aria-label={`Use ${theme.label} theme`}
              onClick={() => setThemeId(theme.id)}
            />
          ))}
        </div>
      </header>

      <div className="pde-workspace">
        <div className="pde-stage">
          {dimensions.width && imageReady ? (
            <canvas
              ref={previewRef}
              className={`pde-canvas ${cropMode ? "crop-mode" : layers.length ? "layer-mode" : ""}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              aria-label="Editable image canvas. Drag to crop or reposition a selected layer."
            />
          ) : (
            <div className="pde-empty"><ImageIcon size={34} /><p>Preparing your image canvas…</p></div>
          )}
        </div>

        <aside className="pde-panel">
          {activePanel === "edit" && (
            <>
              <div className="pde-panel-section">
                <h3>Quick edits</h3>
                <div className="pde-actions">
                  <IconButton icon={RotateCcw} label="Rotate left" onClick={() => rotate(-1)} disabled={!dimensions.width} />
                  <IconButton icon={RotateCw} label="Rotate right" onClick={() => rotate(1)} disabled={!dimensions.width} />
                  <IconButton icon={FlipHorizontal} label="Flip H" onClick={() => flip(true)} disabled={!dimensions.width} />
                  <IconButton icon={FlipVertical} label="Flip V" onClick={() => flip(false)} disabled={!dimensions.width} />
                  <IconButton icon={Undo2} label="Undo" onClick={() => restoreHistory("undo")} disabled={!historyStatus.canUndo} />
                  <IconButton icon={Redo2} label="Redo" onClick={() => restoreHistory("redo")} disabled={!historyStatus.canRedo} />
                  <IconButton icon={Crop} label="Crop" active={cropMode} onClick={() => { setPageLayout("original"); setCropMode((enabled) => !enabled); setCropRect(null); }} disabled={!dimensions.width} />
                </div>
                {cropMode && (
                  <div className="pde-actions" style={{ marginTop: 9 }}>
                    <select className="pde-select" value={cropRatio} onChange={(event) => { setCropRatio(event.target.value); setCropRect(null); }}>
                      <option value="free">Free crop</option><option value="1">Square · 1:1</option><option value="0.8">Portrait · 4:5</option><option value="1.7778">Landscape · 16:9</option>
                    </select>
                    <button type="button" className="pde-action" disabled={!cropRect?.width || !cropRect?.height} onClick={() => applyCrop()}>Apply crop</button>
                    <button type="button" className="pde-action" onClick={() => { setCropMode(false); setCropRect(null); }}>Cancel</button>
                  </div>
                )}
              </div>
              <div className="pde-panel-section">
                <h3>Looks</h3>
                <div className="pde-preset-grid">
                  {FILTER_PRESETS.map((item) => (
                    <button type="button" key={item.id} data-preset={item.id} className={`pde-preset ${presetId === item.id ? "active" : ""}`} onClick={() => setBrightnessPreset(item)}>
                      <span className="pde-preset-swatch" /><span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pde-panel-section">
                <h3>Adjust</h3>
                <RangeControl label="Brightness" value={adjustments.brightness} min={30} max={180} onChange={(brightness) => { setPresetId("custom"); setAdjustments((current) => ({ ...current, brightness })); }} suffix="%" />
                <RangeControl label="Contrast" value={adjustments.contrast} min={30} max={180} onChange={(contrast) => { setPresetId("custom"); setAdjustments((current) => ({ ...current, contrast })); }} suffix="%" />
                <RangeControl label="Saturation" value={adjustments.saturation} min={0} max={220} onChange={(saturation) => { setPresetId("custom"); setAdjustments((current) => ({ ...current, saturation })); }} suffix="%" />
                <RangeControl label="Hue" value={adjustments.hue} min={-180} max={180} onChange={(hue) => { setPresetId("custom"); setAdjustments((current) => ({ ...current, hue })); }} suffix="°" />
                <RangeControl label="Blur" value={adjustments.blur} min={0} max={8} step={0.1} onChange={(blur) => { setPresetId("custom"); setAdjustments((current) => ({ ...current, blur })); }} suffix="px" />
                <button type="button" className="pde-action" onClick={() => setBrightnessPreset(FILTER_PRESETS[0])}>Reset adjustments</button>
              </div>
              <div className="pde-panel-section">
                <h3>Resize · {dimensions.width} × {dimensions.height}px</h3>
                <div className="pde-actions">
                  <input aria-label="Image width" className="pde-input" type="number" min="1" max="4096" value={resize.width} onChange={(event) => updateWidth(event.target.value)} />
                  <input aria-label="Image height" className="pde-input" type="number" min="1" max="4096" value={resize.height} onChange={(event) => setResize((current) => ({ ...current, height: Math.max(1, Number(event.target.value) || 1) }))} />
                </div>
                <label className="pde-control"><span><span>Keep aspect ratio</span><input type="checkbox" checked={keepRatio} onChange={(event) => setKeepRatio(event.target.checked)} /></span></label>
                <button type="button" className="pde-action" onClick={resizeImage}>Apply resize</button>
              </div>
            </>
          )}

          {activePanel === "design" && (
            <>
              <div className="pde-panel-section">
                <h3>Text &amp; graphics</h3>
                <div className="pde-actions">
                  <button type="button" className="pde-action" onClick={() => addText("title")}><Type size={14} /> Headline</button>
                  <button type="button" className="pde-action" onClick={() => addText("caption")}><Plus size={14} /> Caption</button>
                  <button type="button" className="pde-action" onClick={() => addShape("circle")}><Sparkles size={14} /> Circle</button>
                  <button type="button" className="pde-action" onClick={() => addShape("rectangle")}><Paintbrush size={14} /> Shape</button>
                </div>
                <div className="pde-layer-list">
                  {layers.map((layer) => (
                    <button type="button" key={layer.id} className={`pde-layer-row ${layer.id === selectedLayerId ? "active" : ""}`} onClick={() => setSelectedLayerId(layer.id)}>
                      <Layers size={13} /><span>{layer.kind === "shape" ? `${layer.shape} layer` : layer.text || "Text layer"}</span>
                    </button>
                  ))}
                  {!layers.length && <p style={{ color: "var(--pde-muted)", fontSize: 11 }}>Add a headline, caption, or shape. Drag it directly on the canvas to position it.</p>}
                </div>
              </div>
              {selectedLayer && (
                <div className="pde-panel-section">
                  <div className="pde-actions" style={{ justifyContent: "space-between" }}>
                    <h3>Selected layer</h3>
                    <button type="button" className="pde-action" aria-label="Delete selected layer" onClick={removeSelectedLayer}><Trash2 size={14} /></button>
                  </div>
                  {selectedLayer.kind === "text" && (
                    <>
                      <textarea className="pde-input" rows={3} value={selectedLayer.text} onChange={(event) => patchLayer({ text: event.target.value })} aria-label="Text content" />
                      <select className="pde-select" value={selectedLayer.font} onChange={(event) => patchLayer({ font: event.target.value })}>{FONT_OPTIONS.map((font) => <option key={font} value={font}>{font}</option>)}</select>
                      <div className="pde-align" style={{ marginTop: 9 }}>
                        {[["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]].map(([align, Icon]) => <button type="button" key={align} aria-label={`Align ${align}`} className={`pde-action ${selectedLayer.align === align ? "is-active" : ""}`} onClick={() => patchLayer({ align })}><Icon size={14} /></button>)}
                      </div>
                      <div className="pde-actions" style={{ marginTop: 9 }}>
                        <label className="pde-action"><input type="checkbox" checked={selectedLayer.bold} onChange={(event) => patchLayer({ bold: event.target.checked })} /> Bold</label>
                        <label className="pde-action"><input type="checkbox" checked={selectedLayer.italic} onChange={(event) => patchLayer({ italic: event.target.checked })} /> Italic</label>
                        <label className="pde-action"><input type="checkbox" checked={selectedLayer.outline} onChange={(event) => patchLayer({ outline: event.target.checked })} /> Outline</label>
                        <label className="pde-action"><input type="checkbox" checked={selectedLayer.shadow} onChange={(event) => patchLayer({ shadow: event.target.checked })} /> Shadow</label>
                      </div>
                    </>
                  )}
                  <label className="pde-control"><span><span>Layer color</span></span><input type="color" value={selectedLayer.color} onChange={(event) => patchLayer({ color: event.target.value })} /></label>
                  <RangeControl label="Size" value={selectedLayer.size} min={2} max={18} onChange={(size) => patchLayer({ size })} suffix="%" />
                  <RangeControl label="Opacity" value={Math.round((selectedLayer.opacity ?? 1) * 100)} min={10} max={100} onChange={(value) => patchLayer({ opacity: value / 100 })} suffix="%" />
                </div>
              )}
            </>
          )}

          {activePanel === "page" && (
            <>
              <div className="pde-panel-section">
                <h3>Page layout</h3>
                <select className="pde-select" value={pageLayout} onChange={(event) => setPageLayout(event.target.value)}>
                  {PAGE_LAYOUTS.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
                </select>
                <p style={{ color: "var(--pde-muted)", fontSize: 11, lineHeight: 1.55 }}>Choose a print page or social format. Your photo is fitted without stretching.</p>
              </div>
              <div className="pde-panel-section">
                <h3>Page background</h3>
                <div className="pde-preset-grid">
                  {PAGE_BACKGROUNDS.map((item) => (
                    <button type="button" key={item.id} className={`pde-preset ${pageBackground === item.id ? "active" : ""}`} onClick={() => setPageBackground(item.id)}>
                      <span className="pde-preset-swatch" style={{ background: item.color || "repeating-conic-gradient(#888 0 25%, transparent 0 50%) 0 0/14px 14px" }} /><span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pde-panel-section">
                <h3>Photo frame</h3>
                <select className="pde-select" value={frame} onChange={(event) => setFrame(event.target.value)}>
                  <option value="none">No frame</option><option value="white">Gallery white</option><option value="shadow">Soft shadow</option><option value="film">Film border</option>
                </select>
              </div>
              <div className="pde-panel-section">
                <h3>Before / after</h3>
                <button type="button" className="pde-action" onClick={() => setShowOriginal((value) => !value)}>
                  {showOriginal ? "Show edited image" : "Compare original"}
                </button>
                <p style={{ color: "var(--pde-muted)", fontSize: 11 }}>Tip: add a headline or caption in Design, then drag it into position.</p>
              </div>
            </>
          )}

          {activePanel === "export" && (
            <>
              <div className="pde-panel-section">
                <h3>Export image</h3>
                <label className="pde-control"><span><span>File format</span></span>
                  <select className="pde-select" value={format} onChange={(event) => setFormat(event.target.value)}>
                    <option value="png">PNG · best quality</option><option value="jpg">JPG · smaller file</option><option value="webp">WebP · web ready</option>
                  </select>
                </label>
                {format !== "png" && <RangeControl label="Quality" value={Math.round(quality * 100)} min={40} max={100} onChange={(value) => setQuality(value / 100)} suffix="%" />}
                <p style={{ color: "var(--pde-muted)", fontSize: 11 }}>{outputSize(dimensions.width, dimensions.height, layout).width} × {outputSize(dimensions.width, dimensions.height, layout).height}px · {layout.label}</p>
                <button type="button" className="pde-action pde-primary" disabled={!dimensions.width || busy} onClick={exportImage}>
                  <Download size={15} />{busy ? "Rendering…" : "Download finished design"}
                </button>
              </div>
              <div className="pde-panel-section">
                <h3>Included in export</h3>
                <p style={{ color: "var(--pde-muted)", fontSize: 11, lineHeight: 1.7 }}>Photo adjustments, crop, page size and background, frame, text, shapes, and layer opacity.</p>
                <div className="pde-actions">
                  <button type="button" className="pde-action" onClick={() => setShowOriginal((value) => !value)}>{showOriginal ? "Preview edited" : "Compare original"}</button>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
