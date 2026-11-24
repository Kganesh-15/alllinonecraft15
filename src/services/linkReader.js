const LOCAL_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);

function isPrivateIpv4(hostname) {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false;
  const octets = parts.map(Number);
  if (octets.some((part) => part > 255)) return false;

  const [first, second] = octets;
  return first === 0
    || first === 10
    || first === 127
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 100 && second >= 64 && second <= 127)
    || first >= 224;
}

function isPrivateIpv6(hostname) {
  const address = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const mappedIpv4 = address.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1];
  return address === "::"
    || address === "::1"
    || address.startsWith("fc")
    || address.startsWith("fd")
    || address.startsWith("fe8")
    || address.startsWith("fe9")
    || address.startsWith("fea")
    || address.startsWith("feb")
    || Boolean(mappedIpv4 && isPrivateIpv4(mappedIpv4));
}

export function normalizePublicUrl(input) {
  let url;
  try {
    url = new URL(String(input || "").trim());
  } catch {
    throw new Error("Enter a complete, valid public URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only public HTTP and HTTPS links are supported.");
  }
  if (url.username || url.password) {
    throw new Error("Links containing embedded usernames or passwords are not supported.");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    LOCAL_HOSTNAMES.has(hostname)
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
    || isPrivateIpv4(hostname)
    || isPrivateIpv6(hostname)
  ) {
    throw new Error("Local and private-network URLs are not supported. Use a public file link.");
  }

  return url.href;
}

export function classifyLinkedFile(mimeType = "", fileName = "") {
  const mime = String(mimeType).split(";")[0].trim().toLowerCase();
  const extension = String(fileName).split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() || "";

  if (mime === "application/pdf" || extension === "pdf") return "pdf";
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    || extension === "docx"
  ) return "docx";
  if (mime === "application/msword" || extension === "doc") return "doc";
  if (mime.startsWith("image/") && ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mime)) return "image";
  if (mime.startsWith("video/") && ["video/mp4", "video/webm", "video/ogg", "video/quicktime"].includes(mime)) return "video";
  if (mime === "text/html" || extension === "html" || extension === "htm") return "html";
  if (
    mime.startsWith("text/")
    || mime === "application/json"
    || ["txt", "md", "csv", "json", "xml", "yaml", "yml"].includes(extension)
  ) return "text";
  return "unsupported";
}

export function getVideoEmbed(input) {
  let url;
  try {
    url = new URL(normalizePublicUrl(input));
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "youtube-nocookie.com"].includes(hostname)) {
    const videoId = hostname === "youtu.be"
      ? parts[0]
      : ["shorts", "embed", "live", "v"].includes(parts[0])
        ? parts[1]
        : url.searchParams.get("v");
    if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      return {
        platform: "YouTube",
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`,
      };
    }
    const playlistId = url.searchParams.get("list");
    if (playlistId && /^[A-Za-z0-9_-]+$/.test(playlistId)) {
      return {
        platform: "YouTube playlist",
        embedUrl: `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlistId)}`,
      };
    }
    return null;
  }

  if (["instagram.com", "m.instagram.com"].includes(hostname) && ["reel", "reels"].includes(parts[0])) {
    const shortcode = parts[1];
    if (!shortcode || !/^[A-Za-z0-9_-]+$/.test(shortcode)) return null;
    return {
      platform: "Instagram Reel",
      embedUrl: `https://www.instagram.com/reel/${encodeURIComponent(shortcode)}/embed/`,
    };
  }

  if (["tiktok.com", "m.tiktok.com"].includes(hostname)) {
    const videoId = url.pathname.match(/\/video\/(\d+)(?:\/|$)/)?.[1];
    if (!videoId) return null;
    return {
      platform: "TikTok",
      embedUrl: `https://www.tiktok.com/player/v1/${videoId}?description=1`,
    };
  }

  if (["vimeo.com", "player.vimeo.com"].includes(hostname)) {
    const videoId = parts[parts.length - 1];
    if (!videoId || !/^\d+$/.test(videoId)) return null;
    const privacyHash = url.searchParams.get("h");
    const query = privacyHash ? `?h=${encodeURIComponent(privacyHash)}` : "";
    return {
      platform: "Vimeo",
      embedUrl: `https://player.vimeo.com/video/${videoId}${query}`,
    };
  }

  return null;
}

export function safeDownloadName(value, fallback = "linked-file") {
  const withoutControls = Array.from(String(value || ""))
    .filter((character) => {
      const codePoint = character.charCodeAt(0);
      return codePoint > 31 && codePoint !== 127;
    })
    .join("");
  const name = withoutControls
    .replace(/[<>:"/\\|?*]/g, "-")
    .trim()
    .replace(/^\.+/, "");
  return (name || fallback).slice(0, 160);
}
