import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyLinkedFile,
  getVideoEmbed,
  normalizePublicUrl,
  safeDownloadName,
} from "./linkReader.js";

test("accepts public HTTP and HTTPS URLs and normalizes whitespace", () => {
  assert.equal(normalizePublicUrl("  https://example.com/files/report.pdf  "), "https://example.com/files/report.pdf");
  assert.equal(normalizePublicUrl("http://example.org/image.png"), "http://example.org/image.png");
});

test("rejects unsafe schemes, embedded credentials, and local network addresses", () => {
  for (const url of [
    "javascript:alert(1)",
    "file:///C:/private/report.pdf",
    "https://user:pass@example.com/file.pdf",
    "http://localhost/private",
    "http://printer.local/document.pdf",
    "http://192.168.1.20/file.pdf",
    "http://[::1]/file.pdf",
  ]) {
    assert.throws(() => normalizePublicUrl(url));
  }
});

test("classifies supported linked files using MIME types or file extensions", () => {
  assert.equal(classifyLinkedFile("application/pdf", "download"), "pdf");
  assert.equal(classifyLinkedFile("application/octet-stream", "guide.DOCX"), "docx");
  assert.equal(classifyLinkedFile("image/png", "image"), "image");
  assert.equal(classifyLinkedFile("video/mp4", "clip"), "video");
  assert.equal(classifyLinkedFile("text/html", "page"), "html");
  assert.equal(classifyLinkedFile("application/octet-stream", "archive.zip"), "unsupported");
});

test("creates privacy-enhanced YouTube embeds for watch, short, and playlist URLs", () => {
  assert.deepEqual(
    getVideoEmbed("https://www.youtube.com/watch?v=abcdefghijk"),
    { platform: "YouTube", embedUrl: "https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0" }
  );
  assert.deepEqual(
    getVideoEmbed("https://youtu.be/abcdefghijk?t=20"),
    { platform: "YouTube", embedUrl: "https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0" }
  );
  assert.deepEqual(
    getVideoEmbed("https://youtube.com/shorts/abcdefghijk"),
    { platform: "YouTube", embedUrl: "https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0" }
  );
  assert.equal(getVideoEmbed("https://youtube.com/playlist?list=PLdemo123").platform, "YouTube playlist");
  assert.equal(getVideoEmbed("https://youtube.com/watch?v=short"), null);
});

test("creates official embeds for Instagram Reels, TikTok, and Vimeo", () => {
  assert.deepEqual(
    getVideoEmbed("https://www.instagram.com/reel/Abc_123/"),
    { platform: "Instagram Reel", embedUrl: "https://www.instagram.com/reel/Abc_123/embed/" }
  );
  assert.deepEqual(
    getVideoEmbed("https://www.tiktok.com/@creator/video/1234567890"),
    { platform: "TikTok", embedUrl: "https://www.tiktok.com/player/v1/1234567890?description=1" }
  );
  assert.deepEqual(
    getVideoEmbed("https://vimeo.com/12345678?h=privacyhash"),
    { platform: "Vimeo", embedUrl: "https://player.vimeo.com/video/12345678?h=privacyhash" }
  );
});

test("does not turn unsupported or unsafe URLs into embeds", () => {
  assert.equal(getVideoEmbed("https://example.com/watch?v=abcdefghijk"), null);
  assert.equal(getVideoEmbed("http://localhost/watch?v=abcdefghijk"), null);
});

test("sanitizes downloaded filenames and supplies a fallback", () => {
  assert.equal(safeDownloadName("../private:clip?.mp4"), "-private-clip-.mp4");
  assert.equal(safeDownloadName(""), "linked-file");
});
