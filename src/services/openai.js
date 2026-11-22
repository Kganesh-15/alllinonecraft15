// PlotCraft AI service client.
// All provider secrets stay on the Node.js server; the browser only calls API_BASE.
import { API_BASE } from './config';
import { getToken } from './api';

const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const readJson = async (response) => {
  try {
    const data = await response.json();
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
};

const request = async (url, options = {}, timeoutMs = 120000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) },
      signal: options.signal || controller.signal,
    });
    const data = await readJson(response);
    if (!response.ok || data.success === false) {
      const error = new Error(data.message || `Request failed (${response.status})`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('The request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const jsonBody = (value) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(value),
});

export const generateText = async (promptOrData) => {
  const isObject = typeof promptOrData === 'object' && promptOrData !== null;
  const payload = {
    userId: isObject ? (promptOrData.userId || 'guest') : 'guest',
    storyTitle: isObject
      ? (promptOrData.storyTitle || promptOrData.title || 'Untitled Story')
      : (promptOrData || 'Untitled Story'),
    heroName: isObject ? (promptOrData.heroName || 'Hero') : 'Hero',
    genre: isObject ? (promptOrData.genre || 'Moral Story') : 'Moral Story',
  };
  try {
    const data = await request(`${API_BASE}/api/stories/generate`, jsonBody(payload));
    return data.story;
  } catch (error) {
    console.error('Story Generation Error:', error);
    throw error;
  }
};

// style: '2d' | '3d' (optional). Returns { imageUrl, provider }.
export const generateImageWithInfo = async (prompt, { style } = {}) => {
  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt) throw new Error('Please describe the image first.');
  const data = await request(
    `${API_BASE}/api/generate-image`,
    jsonBody({ prompt: cleanPrompt, style }),
    180000
  );
  if (!data.imageUrl) throw new Error('The image service returned no image.');
  return { imageUrl: data.imageUrl, provider: data.provider || '' };
};

export const generateImage = async (prompt, options) =>
  (await generateImageWithInfo(prompt, options)).imageUrl;

// ---------- Long stories ----------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pollStory = async (jobId, { onProgress, existing = [], signal } = {}) => {
  if (!jobId) throw new Error('The story service did not return a job ID.');
  const pages = [...(Array.isArray(existing) ? existing : [])];
  while (true) {
    if (signal?.aborted) throw new Error('Story generation was cancelled.');
    const data = await request(
      `${API_BASE}/api/stories/status/${encodeURIComponent(jobId)}?from=${pages.length}`,
      { method: 'GET', signal },
      30000
    );
    if (Array.isArray(data.pages) && data.pages.length) pages.push(...data.pages);
    onProgress?.({
      done: Number(data.done) || pages.length,
      total: Number(data.total) || pages.length,
      message: data.message || '',
      pages: [...pages],
    });
    if (data.status === 'done') {
      return { jobId, pages, storyId: data.storyId, providers: data.providers || [] };
    }
    if (data.status === 'error') {
      const error = new Error(data.message || 'Story writing stopped.');
      error.jobId = jobId;
      error.pages = pages;
      error.canContinue = true;
      throw error;
    }
    await sleep(2500);
  }
};

export const generateStory = async (params, { onProgress, signal } = {}) => {
  const data = await request(`${API_BASE}/api/stories/start`, jsonBody(params), 30000);
  return pollStory(data.jobId, { onProgress, signal });
};

export const continueStory = async (jobId, existingPages = [], { onProgress, signal } = {}) => {
  const data = await request(
    `${API_BASE}/api/stories/continue/${encodeURIComponent(jobId)}`,
    { method: 'POST' },
    30000
  );
  return pollStory(jobId, { onProgress, existing: existingPages, signal });
};

export const generateVideo = async (
  prompt,
  { duration = 5, onProgress, timeoutMs = 10 * 60 * 1000, signal } = {}
) => {
  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt) throw new Error('Please describe the video first.');
  const requestedDuration = Number(duration);
  if (![5, 8].includes(requestedDuration)) {
    throw new Error('Video duration must be 5 or 8 seconds.');
  }
  const cleanDuration = requestedDuration;
  const startData = await request(
    `${API_BASE}/api/generate-video`,
    jsonBody({ prompt: cleanPrompt, duration: cleanDuration }),
    45000
  );
  if (!startData.jobId) throw new Error('The video service did not return a job ID.');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error('Video generation was cancelled.');
    await sleep(3000);
    const data = await request(
      `${API_BASE}/api/video-status/${encodeURIComponent(startData.jobId)}`,
      { method: 'GET', signal },
      30000
    );
    if (data.status === 'done') {
      if (!data.videoUrl) throw new Error('Video completed but no video URL was returned.');
      return data.videoUrl;
    }
    if (data.status === 'error') throw new Error(data.message || 'Video generation failed.');
    if (data.message) onProgress?.(data.message);
  }
  throw new Error('Video generation took too long. Please try again.');
};

// Upload a video as a raw binary body. Server route must accept application/octet-stream/video MIME.
export const uploadVideoFile = async (file) => {
  if (!file) throw new Error('Choose a video file first.');
  if (file.size > 80 * 1024 * 1024) throw new Error('Video must be 80 MB or smaller.');
  const data = await request(
    `${API_BASE}/api/upload-video`,
    {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'video/mp4' },
      body: file,
    },
    180000
  );
  if (!data.videoUrl) throw new Error('Upload completed without a video URL.');
  return data.videoUrl;
};

// ---------- AI Chat ----------
export const chatAI = async ({ messages, file } = {}) => {
  if (!Array.isArray(messages) || !messages.length) {
    throw new Error('Add a message before sending.');
  }
  const data = await request(
    `${API_BASE}/api/chat`,
    jsonBody({ messages, file }),
    180000
  );
  if (!data.reply) throw new Error('The AI assistant returned an empty reply.');
  return data.reply;
};
