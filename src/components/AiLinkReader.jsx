import { useEffect, useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Sparkles,
  Video,
} from "lucide-react";
import { chatAI } from "../services/openai";
import {
  classifyLinkedFile,
  getVideoEmbed,
  normalizePublicUrl,
  safeDownloadName,
} from "../services/linkReader";

const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_ANALYSIS_CHARS = 60000;

let pdfJsPromise;
let mammothPromise;

function loadBrowserLibrary(globalName, src) {
  if (window[globalName]) return Promise.resolve(window[globalName]);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      if (window[globalName]) resolve(window[globalName]);
      else reject(new Error("The document reader library did not initialize."));
    };
    script.onerror = () => reject(new Error("Could not load the document reader. Check your connection and try again."));
    document.head.appendChild(script);
  });
}

function getPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = loadBrowserLibrary(
      "pdfjsLib",
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
    ).then((library) => {
      library.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      return library;
    }).catch((error) => {
      pdfJsPromise = null;
      throw error;
    });
  }
  return pdfJsPromise;
}

function getMammoth() {
  if (!mammothPromise) {
    mammothPromise = loadBrowserLibrary(
      "mammoth",
      "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js"
    ).catch((error) => {
      mammothPromise = null;
      throw error;
    });
  }
  return mammothPromise;
}

function responseFilename(response, sourceUrl) {
  const disposition = response.headers.get("content-disposition") || "";
  const encodedName = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  if (encodedName) {
    try {
      return safeDownloadName(decodeURIComponent(encodedName));
    } catch {
      return safeDownloadName(encodedName);
    }
  }
  const regularName = disposition.match(/filename\s*=\s*"?([^";]+)"?/i)?.[1];
  if (regularName) return safeDownloadName(regularName);
  const url = new URL(sourceUrl);
  const lastSegment = url.pathname.split("/").filter(Boolean).pop() || "";
  try {
    return safeDownloadName(decodeURIComponent(lastSegment), "linked-file");
  } catch {
    return safeDownloadName(lastSegment, "linked-file");
  }
}

async function readResponseBlob(response, maxBytes, mimeType) {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`This file is too large. The limit is ${Math.round(maxBytes / (1024 * 1024))} MB.`);
  }

  if (!response.body?.getReader) {
    const blob = await response.blob();
    if (blob.size > maxBytes) {
      throw new Error(`This file is too large. The limit is ${Math.round(maxBytes / (1024 * 1024))} MB.`);
    }
    return new Blob([blob], { type: mimeType || blob.type });
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`This file is too large. The limit is ${Math.round(maxBytes / (1024 * 1024))} MB.`);
    }
    chunks.push(value);
  }
  return new Blob(chunks, { type: mimeType });
}

async function extractPdfText(blob) {
  const library = await getPdfJs();
  const pdf = await library.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  const pageLimit = Math.min(pdf.numPages, 75);
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str || "").join(" "));
  }
  if (pdf.numPages > pageLimit) pages.push(`[Only the first ${pageLimit} of ${pdf.numPages} pages were read.]`);
  const text = pages.join("\n\n");
  if (!text.trim()) {
    throw new Error("This PDF has no selectable text. Scanned-page OCR is not available in this reader.");
  }
  return text;
}

function extractHtmlText(markup) {
  const documentCopy = new DOMParser().parseFromString(markup, "text/html");
  documentCopy.querySelectorAll("script, style, noscript, nav, footer, header").forEach((node) => node.remove());
  return (documentCopy.querySelector("main, article") || documentCopy.body)?.innerText?.trim()
    || documentCopy.body?.textContent?.trim()
    || "";
}

async function readFileText(blob, kind) {
  if (kind === "pdf") return extractPdfText(blob);
  if (kind === "docx") {
    const mammoth = await getMammoth();
    const result = await mammoth.extractRawText({ arrayBuffer: await blob.arrayBuffer() });
    return result.value.trim();
  }
  const text = await blob.text();
  return kind === "html" ? extractHtmlText(text) : text;
}

function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = safeDownloadName(filename);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

const actionButton = "inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50";

export default function AiLinkReader() {
  const [url, setUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [asset, setAsset] = useState(null);
  const [platformVideo, setPlatformVideo] = useState(null);
  const [analysis, setAnalysis] = useState("");
  const [question, setQuestion] = useState("Summarize this file and list its key points.");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const previewUrlRef = useRef("");

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const loadLink = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    setAnalysis("");
    setSourceUrl("");
    setAsset(null);
    setPlatformVideo(null);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }
    let safeUrl;
    try {
      safeUrl = normalizePublicUrl(url);
    } catch (loadError) {
      setError(loadError.message);
      return;
    }
    setSourceUrl(safeUrl);
    const videoEmbed = getVideoEmbed(safeUrl);
    if (videoEmbed) {
      setPlatformVideo({ ...videoEmbed, sourceUrl: safeUrl });
      return;
    }
    setBusy("fetch");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch(safeUrl, {
        method: "GET",
        credentials: "omit",
        redirect: "follow",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`The link returned HTTP ${response.status}.`);
      const finalUrl = normalizePublicUrl(response.url || safeUrl);
      const filename = responseFilename(response, finalUrl);
      const mimeType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      const kind = classifyLinkedFile(mimeType, filename) === "unsupported"
        ? classifyLinkedFile(mimeType, finalUrl)
        : classifyLinkedFile(mimeType, filename);
      if (kind === "unsupported") {
        throw new Error("That link is not a supported direct file. Use a PDF, DOCX, text/web page, image, or direct video file URL.");
      }
      const maxBytes = kind === "video" ? MAX_VIDEO_BYTES : kind === "image" ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
      const blob = await readResponseBlob(response, maxBytes, mimeType);
      let text = "";
      let readError = "";
      if (["pdf", "docx", "text", "html"].includes(kind)) {
        try {
          text = await readFileText(blob, kind);
          if (!text) readError = "No readable text was found in this file.";
        } catch (parseError) {
          readError = parseError.message || "Could not extract readable text from this file.";
        }
      }
      const previewUrl = URL.createObjectURL(blob);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = previewUrl;
      setAsset({ blob, filename, mimeType: mimeType || blob.type, kind, previewUrl, text, readError });
    } catch (loadError) {
      if (loadError.name === "AbortError") {
        setError("The download timed out. Try a smaller file or a faster direct link.");
      } else if (loadError instanceof TypeError) {
        setError("The source did not allow browser access (CORS). Open the public direct file link instead; streaming pages and protected links are not supported.");
      } else {
        setError(loadError.message || "Could not read this link.");
      }
    } finally {
      window.clearTimeout(timeout);
      setBusy("");
    }
  };

  const analyze = async () => {
    if (!asset || busy) return;
    setError("");
    setAnalysis("");
    setBusy("analyze");
    try {
      const file = asset.kind === "image"
        ? {
          name: asset.filename,
          kind: "image",
          content: await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("Could not prepare the image for analysis."));
            reader.readAsDataURL(asset.blob);
          }),
        }
        : {
          name: asset.filename,
          kind: "text",
          content: asset.text.slice(0, MAX_ANALYSIS_CHARS),
        };
      const prompt = question.trim() || "Summarize this file and list its key points.";
      const answer = await chatAI({
        messages: [{ role: "user", content: `${prompt}${asset.kind === "image" ? " Analyze the attached image." : `\n\nRead the attached file and base your answer only on its contents. The readable text is limited to ${MAX_ANALYSIS_CHARS.toLocaleString()} characters.`}` }],
        file,
      });
      setAnalysis(answer);
    } catch (analysisError) {
      setError(analysisError.message || "AI analysis failed. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const canAnalyze = asset && ["pdf", "docx", "text", "html", "image"].includes(asset.kind);
  const previewText = asset?.text
    ? asset.text.slice(0, 12000) + (asset.text.length > 12000 ? "\n\n[Preview shortened. AI analysis uses up to 60,000 characters.]" : "")
    : "";
  const TypeIcon = asset?.kind === "image" ? ImageIcon : asset?.kind === "video" ? Video : FileText;

  return (
    <div className="w-full space-y-5 text-slate-100">
      <header className="rounded-2xl border border-white/10 bg-gradient-to-r from-violet-500/15 via-indigo-500/10 to-cyan-500/10 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-500/20 text-violet-300"><LinkIcon className="h-5 w-5" /></span>
          <div>
            <p className="text-lg font-black">AI Link Reader & Downloader</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">Read PDFs, DOCX, text or web pages; analyze images; preview and download direct video files; or play supported social video links in their official embedded players.</p>
          </div>
        </div>
      </header>

      <form onSubmit={loadLink} className="space-y-3 rounded-2xl border border-white/10 bg-[#10172b]/95 p-4 sm:p-5">
        <label htmlFor="ai-link-reader-url" className="block text-xs font-black text-slate-200">Public file or page URL</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="ai-link-reader-url"
            type="url"
            required
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/document.pdf"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-violet-400"
          />
          <button type="submit" className={actionButton} disabled={Boolean(busy)}>
            {busy === "fetch" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
            {busy === "fetch" ? "Reading link…" : "Read link"}
          </button>
        </div>
        <p className="text-[11px] leading-5 text-slate-400">Supports PDF, DOCX, TXT/MD/CSV/JSON/HTML, PNG/JPG/WebP/GIF, direct MP4/WebM files, and YouTube, Instagram Reels, TikTok, and Vimeo links. Max 25 MB for documents, 4 MB for images, and 100 MB for direct video files.</p>
      </form>

      {platformVideo && (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#10172b]/95 p-4 sm:p-5" aria-label={`${platformVideo.platform} video player`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-black"><Video className="h-4 w-4 text-violet-300" /> Playing from {platformVideo.platform}</div>
            <a className={actionButton} href={platformVideo.sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> Open on {platformVideo.platform.split(" ")[0]}
            </a>
          </div>
          <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
            <iframe
              title={`${platformVideo.platform} embedded video`}
              src={platformVideo.embedUrl}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <p className="text-[11px] leading-5 text-slate-400">Playback uses the platform’s official embed. Private, age-restricted, region-blocked, or non-embeddable videos may need to be opened on the original platform. Downloading platform streams is not supported.</p>
        </section>
      )}

      {error && (
        <div role="alert" className="space-y-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs leading-5 text-rose-200">
          <p>{error}</p>
          {sourceUrl && <a className="inline-flex items-center gap-1 font-bold underline" href={sourceUrl} target="_blank" rel="noopener noreferrer">Open original link <ExternalLink className="h-3 w-3" /></a>}
        </div>
      )}

      {asset && (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#10172b]/95 p-4 sm:p-5" aria-label="Linked file">
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-500/15 text-cyan-300"><TypeIcon className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black">{asset.filename}</p>
              <p className="text-[11px] text-slate-400">{asset.kind.toUpperCase()} · {(asset.blob.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            <button type="button" className={actionButton} onClick={() => downloadBlob(asset.blob, asset.filename)}>
              <Download className="h-4 w-4" /> Download
            </button>
          </div>

          {asset.kind === "image" && <img src={asset.previewUrl} alt={asset.filename} className="mx-auto max-h-[520px] max-w-full rounded-xl object-contain" />}
          {asset.kind === "video" && <video src={asset.previewUrl} controls preload="metadata" className="max-h-[520px] w-full rounded-xl bg-black" />}
          {asset.kind === "pdf" && <iframe title={`PDF preview: ${asset.filename}`} src={asset.previewUrl} className="h-[520px] w-full rounded-xl border border-white/10 bg-white" />}
          {previewText && <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-slate-200">{previewText}</pre>}

          {asset.kind === "doc" && <p className="text-xs leading-5 text-amber-200">Legacy .DOC files can be downloaded, but browser text extraction supports modern .DOCX documents.</p>}
          {asset.kind === "video" && <p className="text-xs leading-5 text-slate-400">Direct video preview and download are available. Video transcription or frame-by-frame AI analysis needs a video AI provider and is not enabled here.</p>}
          {asset.readError && <p className="text-xs leading-5 text-amber-200">{asset.readError} The original file is still available to preview and download.</p>}

          {canAnalyze && (
            <div className="space-y-3 border-t border-white/10 pt-4">
              <label htmlFor="ai-link-reader-question" className="block text-xs font-black text-slate-200">Ask AI about this file</label>
              <textarea
                id="ai-link-reader-question"
                rows={2}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
              />
              <button type="button" className={actionButton} onClick={analyze} disabled={Boolean(busy) || (!asset.text && asset.kind !== "image")}>
                {busy === "analyze" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {busy === "analyze" ? "Analyzing…" : "Analyze with AI"}
              </button>
              {analysis && <div className="whitespace-pre-wrap rounded-xl border border-violet-400/20 bg-violet-500/10 p-4 text-sm leading-7 text-slate-100">{analysis}</div>}
            </div>
          )}
        </section>
      )}

      <p className="text-[10px] leading-5 text-slate-500">Only public HTTP/HTTPS links are accepted. Login-required files, private links, stream ripping, DRM bypass, and CORS bypass are not supported. When you choose AI analysis, the file content is sent to PlotCraft’s configured AI service.</p>
    </div>
  );
}
