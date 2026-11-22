// Accounts, saved chats and online reviews (all stored by the backend, so every visitor sees the same data)
import { API_BASE } from './config';

const TOKEN_KEY = 'plotcraft_auth_token';
const LEGACY_TOKEN_KEY = 'plotcraft_token';

export const getToken = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) return token;
    const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY) || '';
    if (legacyToken) {
      localStorage.setItem(TOKEN_KEY, legacyToken);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    }
    return legacyToken;
  } catch {
    return '';
  }
};
export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
};

export const apiRequest = async (path, {
  method = 'GET',
  body,
  headers: optionHeaders,
  raw = false,
  ...options
} = {}) => {
  const headers = {};
  const isBinaryBody =
    (typeof Blob !== 'undefined' && body instanceof Blob) ||
    (typeof FormData !== 'undefined' && body instanceof FormData);
  if (body !== undefined && !isBinaryBody) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  Object.assign(headers, optionHeaders || {});

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined || isBinaryBody || typeof body === 'string'
        ? body
        : JSON.stringify(body),
      ...options,
    });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }

  if (raw && response.ok) return response;

  let data = {};
  try {
    data = await response.json();
  } catch {
    /* non-JSON response */
  }
  if (!response.ok || data.success === false) {
    const err = new Error(data.message || `Server error (${response.status})`);
    err.status = response.status;
    throw err;
  }
  return data;
};

export const uploadUserAsset = async (file) => {
  if (!file) throw new Error('Choose a file first.');
  const mime = String(file.type || '').split(';')[0].trim().toLowerCase();
  const allowedTypes = new Set([
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac',
    'video/mp4', 'video/webm', 'video/quicktime', 'application/pdf',
  ]);
  if (!allowedTypes.has(mime)) {
    throw new Error('This file type cannot be saved to your account. It is still available as a local preview.');
  }
  if (file.size > 80 * 1024 * 1024) throw new Error('Files must be 80 MB or smaller.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);
  try {
    const name = new URLSearchParams({ name: file.name || 'upload' }).toString();
    const data = await apiRequest(`/api/assets?${name}`, {
      method: 'POST',
      headers: { 'Content-Type': mime },
      body: file,
      signal: controller.signal,
    });
    if (!data.asset?.id || !data.asset?.url) throw new Error('Upload completed without a file reference.');
    return { ...data.asset, mime };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('File upload timed out. The local preview is still available.', { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

/* ---------- accounts ---------- */
export const registerUser = async ({ name, email, password }) => {
  const data = await apiRequest('/api/auth/register', { method: 'POST', body: { name, email, password } });
  setToken(data.token);
  return data.user;
};

export const loginUser = async ({ email, password }) => {
  const data = await apiRequest('/api/auth/login', { method: 'POST', body: { email, password } });
  setToken(data.token);
  return data.user;
};

export const fetchMe = async () => (await apiRequest('/api/auth/me')).user;

export const logoutUser = async () => {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } catch {
    /* ignore: we clear the local token anyway */
  }
  setToken('');
};

/* ---------- saved chats ---------- */
export const listChats = async () => (await apiRequest('/api/chats')).chats;
export const getChat = async (id) => (await apiRequest(`/api/chats/${encodeURIComponent(id)}`)).chat;
export const saveChat = async (id, messages) => apiRequest(`/api/chats/${encodeURIComponent(id)}`, { method: 'PUT', body: { messages } });
export const deleteChat = async (id) => apiRequest(`/api/chats/${encodeURIComponent(id)}`, { method: 'DELETE' });

/* ---------- reviews ---------- */
export const fetchReviews = async () => apiRequest('/api/reviews');
export const postReview = async ({ rating, comment }) => (await apiRequest('/api/reviews', { method: 'POST', body: { rating, comment } })).review;
export const deleteReview = async (id) => apiRequest(`/api/reviews/${id}`, { method: 'DELETE' });

/* ---------- creations + site numbers ---------- */
export const fetchMyStories = async () => (await apiRequest('/api/my-stories')).stories;
export const fetchStats = async () => (await apiRequest('/api/stats')).stats;

export default {
  apiRequest,
  getToken,
  setToken,
  registerUser,
  loginUser,
  fetchMe,
  logoutUser,
  listChats,
  getChat,
  saveChat,
  deleteChat,
  fetchReviews,
  postReview,
  deleteReview,
  fetchMyStories,
  fetchStats,
};