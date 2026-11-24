const TIME_PATTERN = /^(\d{2,}):([0-5]\d):([0-5]\d)[,.](\d{3})\s+-->\s+(\d{2,}):([0-5]\d):([0-5]\d)[,.](\d{3})$/;

const toSeconds = (hours, minutes, seconds, milliseconds) => (
  Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) + Number(milliseconds) / 1000
);

function toTimestamp(seconds) {
  const totalMilliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMilliseconds / 3600000);
  const minutes = Math.floor((totalMilliseconds % 3600000) / 60000);
  const wholeSeconds = Math.floor((totalMilliseconds % 60000) / 1000);
  const milliseconds = totalMilliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")},${String(milliseconds).padStart(3, "0")}`;
}

export function parseSrt(contents) {
  const normalized = String(contents || "").replace(/^\uFEFF/, "").replace(/\r/g, "").trim();
  if (!normalized) throw new Error("The subtitle file is empty.");
  const blocks = normalized.split(/\n\s*\n/);
  if (blocks.length > 1000) throw new Error("Subtitle files may contain at most 1,000 cues.");

  return blocks.map((block, index) => {
    const lines = block.split("\n").map((line) => line.trimEnd());
    const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
    const match = timeLineIndex >= 0 ? lines[timeLineIndex].trim().match(TIME_PATTERN) : null;
    const text = timeLineIndex >= 0 ? lines.slice(timeLineIndex + 1).join("\n").trim() : "";
    if (!match || !text) {
      throw new Error(`Subtitle block ${index + 1} is invalid. Check its timecode and text.`);
    }

    const start = toSeconds(match[1], match[2], match[3], match[4]);
    const end = toSeconds(match[5], match[6], match[7], match[8]);
    if (end <= start) {
      throw new Error(`Subtitle block ${index + 1} ends before it starts.`);
    }
    return { start, end, text };
  });
}

export function serializeSrt(overlays) {
  const cues = (Array.isArray(overlays) ? overlays : [])
    .filter((overlay) => (
      overlay.kind === "text"
      && String(overlay.text || "").trim()
      && Number.isFinite(Number(overlay.start))
      && Number.isFinite(Number(overlay.end))
      && Number(overlay.end) > Number(overlay.start)
    ))
    .sort((a, b) => Number(a.start) - Number(b.start));
  if (!cues.length) throw new Error("Add at least one timed text layer before exporting subtitles.");

  const contents = cues.map((cue, index) => (
    `${index + 1}\n${toTimestamp(Number(cue.start))} --> ${toTimestamp(Number(cue.end))}\n${String(cue.text).trim()}`
  )).join("\n\n");
  return { contents: `${contents}\n`, count: cues.length };
}
