// routes/projects.js
// Projects (autosave, rename, duplicate, trash/restore, version history, sharing),
// user file uploads with a storage quota, usage stats and a daily AI-generation limit.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');

const MAX_PROJECT_BYTES = 2 * 1024 * 1024;   // 2 MB JSON per project
const MAX_VERSIONS = 30;
const SNAPSHOT_GAP_MS = 5 * 60 * 1000;       // one history snapshot per 5 min of editing
const TRASH_DAYS = 30;
const FREE_STORAGE_BYTES = Number(process.env.FREE_STORAGE_MB || 500) * 1024 * 1024;
const FREE_DAILY_AI_LIMIT = Number(process.env.FREE_DAILY_AI_LIMIT || 20);
const PROJECT_TYPES = ['design', 'video', 'audio', 'story', 'writing', 'image'];
const ASSET_TYPES = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
  'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/flac': 'flac',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  'application/pdf': 'pdf'
};

const newId = () => crypto.randomUUID();
const jsonBytes = (value) => Buffer.byteLength(JSON.stringify(value ?? null), 'utf8');
const cleanTitle = (t) => String(t || '').trim().slice(0, 120) || 'Untitled';
const sendError = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const todayKey = () => new Date().toISOString().slice(0, 10);

module.exports = function mountProjects(app, { readDb, writeDb, requireAuth, resolveUserId, dir }) {
  const ASSET_DIR = path.join(dir, 'assets');
  const PRIVATE_ASSET_DIR = path.join(dir, 'user-assets');
  if (!fs.existsSync(ASSET_DIR)) fs.mkdirSync(ASSET_DIR, { recursive: true });
  if (!fs.existsSync(PRIVATE_ASSET_DIR)) fs.mkdirSync(PRIVATE_ASSET_DIR, { recursive: true });
  app.use('/assets', express.static(ASSET_DIR));

  const collections = (db) => {
    db.projects = db.projects || [];
    db.assets = db.assets || [];
    return db;
  };
  const owned = (db, id, userId) => db.projects.find(p => p.id === id && p.userId === userId);
  const usedBytes = (db, userId) =>
    db.projects.filter(p => p.userId === userId)
      .reduce((sum, p) => sum + (p.bytes || 0) + (p.versions || []).reduce((s, v) => s + v.bytes, 0), 0) +
    db.assets.filter(a => a.userId === userId).reduce((sum, a) => sum + a.size, 0);
  const summary = (p) => ({
    id: p.id, title: p.title, type: p.type, version: p.version, bytes: p.bytes,
    createdAt: p.createdAt, updatedAt: p.updatedAt, trashedAt: p.trashedAt,
    shared: !!p.shareId, shareId: p.shareId || null, versionCount: (p.versions || []).length
  });
  const snapshot = (p) => {
    p.versions = p.versions || [];
    p.versions.push({ v: p.version, at: p.updatedAt, bytes: p.bytes, data: p.data });
    if (p.versions.length > MAX_VERSIONS) p.versions.splice(0, p.versions.length - MAX_VERSIONS);
  };
  const purgeTrash = (db) => {
    const cutoff = Date.now() - TRASH_DAYS * 86400000;
    const before = db.projects.length;
    db.projects = db.projects.filter(p => !p.trashedAt || p.trashedAt > cutoff);
    return before !== db.projects.length;
  };

  // ---------- AI daily limit (free plan). Keyed by account, or by IP for guests ----------
  const aiCounts = new Map();
  const aiQuota = (req, res, next) => {
    const uid = resolveUserId(req);
    const key = uid ? `u:${uid}` : `ip:${req.ip}`;
    const day = todayKey();
    let entry = aiCounts.get(key);
    if (!entry || entry.day !== day) {
      entry = { day, count: 0 };
      aiCounts.set(key, entry);
    }
    if (entry.count >= FREE_DAILY_AI_LIMIT) {
      return sendError(res, 429, `Daily free AI limit (${FREE_DAILY_AI_LIMIT}) reached. Try again tomorrow or upgrade to Pro.`);
    }
    entry.count += 1;
    next();
  };
  setInterval(() => {
    const day = todayKey();
    for (const [k, v] of aiCounts) if (v.day !== day) aiCounts.delete(k);
  }, 60 * 60 * 1000);

  // ---------- Projects ----------
  app.get('/api/projects', requireAuth, (req, res) => {
    const db = collections(req.db);
    if (purgeTrash(db)) writeDb(db);
    const wantTrash = req.query.trashed === '1';
    const projects = db.projects
      .filter(p => p.userId === req.user.id && !!p.trashedAt === wantTrash)
      .filter(p => !req.query.type || p.type === req.query.type)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(summary);
    res.json({ success: true, projects });
  });

  app.post('/api/projects', requireAuth, (req, res) => {
    const db = collections(req.db);
    const type = PROJECT_TYPES.includes(req.body?.type) ? req.body.type : 'design';
    const data = req.body?.data ?? {};
    const bytes = jsonBytes(data);
    if (bytes > MAX_PROJECT_BYTES) return sendError(res, 413, 'Project is too large.');
    if (usedBytes(db, req.user.id) + bytes > FREE_STORAGE_BYTES) {
      return sendError(res, 413, 'Storage is full. Delete old projects or files first.');
    }
    const now = Date.now();
    const project = {
      id: newId(), userId: req.user.id, title: cleanTitle(req.body?.title), type, data, bytes,
      version: 1, createdAt: now, updatedAt: now, trashedAt: null, shareId: null, versions: []
    };
    db.projects.push(project);
    writeDb(db);
    res.status(201).json({ success: true, project: { ...summary(project), data } });
  });

  app.get('/api/projects/:id', requireAuth, (req, res) => {
    const p = owned(collections(req.db), req.params.id, req.user.id);
    if (!p) return sendError(res, 404, 'Project not found.');
    res.json({ success: true, project: { ...summary(p), data: p.data } });
  });

  // Autosave. baseVersion = the version the client last loaded/saved.
  // If someone else saved in between, returns 409 instead of silently overwriting.
  app.put('/api/projects/:id', requireAuth, (req, res) => {
    const db = collections(req.db);
    const p = owned(db, req.params.id, req.user.id);
    if (!p) return sendError(res, 404, 'Project not found.');
    if (p.trashedAt) return sendError(res, 409, 'This project is in the trash. Restore it first.');

    const base = req.body?.baseVersion;
    if (base !== undefined && base !== null && Number(base) !== p.version) {
      return sendError(res, 409, 'This project was changed somewhere else. Reload to get the latest version.',
        { conflict: true, currentVersion: p.version });
    }
    const data = req.body?.data;
    if (data === undefined) return sendError(res, 400, 'Nothing to save.');
    const bytes = jsonBytes(data);
    if (bytes > MAX_PROJECT_BYTES) return sendError(res, 413, 'Project is too large.');
    if (usedBytes(db, req.user.id) - (p.bytes || 0) + bytes > FREE_STORAGE_BYTES) {
      return sendError(res, 413, 'Storage is full. Delete old projects or files first.');
    }

    const now = Date.now();
    if (now - p.updatedAt > SNAPSHOT_GAP_MS) snapshot(p);
    p.data = data;
    p.bytes = bytes;
    p.version += 1;
    p.updatedAt = now;
    if (typeof req.body?.title === 'string') p.title = cleanTitle(req.body.title);
    writeDb(db);
    res.json({ success: true, version: p.version, updatedAt: now });
  });

  app.patch('/api/projects/:id', requireAuth, (req, res) => {
    const db = collections(req.db);
    const p = owned(db, req.params.id, req.user.id);
    if (!p) return sendError(res, 404, 'Project not found.');
    if (typeof req.body?.title === 'string') p.title = cleanTitle(req.body.title);
    writeDb(db);
    res.json({ success: true, project: summary(p) });
  });

  app.post('/api/projects/:id/duplicate', requireAuth, (req, res) => {
    const db = collections(req.db);
    const src = owned(db, req.params.id, req.user.id);
    if (!src) return sendError(res, 404, 'Project not found.');
    if (usedBytes(db, req.user.id) + (src.bytes || 0) > FREE_STORAGE_BYTES) {
      return sendError(res, 413, 'Storage is full.');
    }
    const now = Date.now();
    const copy = {
      ...src, id: newId(), title: cleanTitle(`${src.title} (copy)`),
      data: JSON.parse(JSON.stringify(src.data ?? null)),
      version: 1, createdAt: now, updatedAt: now, trashedAt: null, shareId: null, versions: []
    };
    db.projects.push(copy);
    writeDb(db);
    res.status(201).json({ success: true, project: summary(copy) });
  });

  // Soft delete -> Trash (kept 30 days)
  app.delete('/api/projects/:id', requireAuth, (req, res) => {
    const db = collections(req.db);
    const p = owned(db, req.params.id, req.user.id);
    if (!p) return sendError(res, 404, 'Project not found.');
    p.trashedAt = Date.now();
    p.shareId = null;
    writeDb(db);
    res.json({ success: true });
  });

  app.post('/api/projects/:id/restore', requireAuth, (req, res) => {
    const db = collections(req.db);
    const p = owned(db, req.params.id, req.user.id);
    if (!p) return sendError(res, 404, 'Project not found.');
    p.trashedAt = null;
    p.updatedAt = Date.now();
    writeDb(db);
    res.json({ success: true, project: summary(p) });
  });

  // Permanent delete, only from the trash
  app.delete('/api/projects/:id/forever', requireAuth, (req, res) => {
    const db = collections(req.db);
    const p = owned(db, req.params.id, req.user.id);
    if (!p) return sendError(res, 404, 'Project not found.');
    if (!p.trashedAt) return sendError(res, 400, 'Move the project to the trash first.');
    db.projects = db.projects.filter(x => x !== p);
    writeDb(db);
    res.json({ success: true });
  });

  // ---------- Version history ----------
  app.get('/api/projects/:id/versions', requireAuth, (req, res) => {
    const p = owned(collections(req.db), req.params.id, req.user.id);
    if (!p) return sendError(res, 404, 'Project not found.');
    res.json({
      success: true,
      current: p.version,
      versions: (p.versions || []).map(({ v, at, bytes }) => ({ v, at, bytes })).reverse()
    });
  });

  app.post('/api/projects/:id/versions/:v/restore', requireAuth, (req, res) => {
    const db = collections(req.db);
    const p = owned(db, req.params.id, req.user.id);
    if (!p) return sendError(res, 404, 'Project not found.');
    const snap = (p.versions || []).find(x => x.v === Number(req.params.v));
    if (!snap) return sendError(res, 404, 'Version not found.');
    snapshot(p); // keep what we are about to replace
    p.data = JSON.parse(JSON.stringify(snap.data));
    p.bytes = jsonBytes(p.data);
    p.version += 1;
    p.updatedAt = Date.now();
    writeDb(db);
    res.json({ success: true, version: p.version });
  });

  // ---------- Sharing (read-only public link) ----------
  app.post('/api/projects/:id/share', requireAuth, (req, res) => {
    const db = collections(req.db);
    const p = owned(db, req.params.id, req.user.id);
    if (!p) return sendError(res, 404, 'Project not found.');
    p.shareId = p.shareId ? null : crypto.randomBytes(9).toString('base64url');
    writeDb(db);
    res.json({ success: true, shared: !!p.shareId, shareId: p.shareId });
  });

  app.get('/api/public/projects/:shareId', (req, res) => {
    const db = collections(readDb());
    const p = db.projects.find(x => x.shareId && x.shareId === req.params.shareId && !x.trashedAt);
    if (!p) return sendError(res, 404, 'This shared project is not available.');
    res.json({ success: true, project: { title: p.title, type: p.type, data: p.data, updatedAt: p.updatedAt } });
  });

  // ---------- Uploads (image / audio / video) with quota ----------
  app.post('/api/assets', requireAuth,
    express.raw({ type: Object.keys(ASSET_TYPES), limit: '80mb' }),
    (req, res) => {
      const mime = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      const ext = ASSET_TYPES[mime];
      if (!ext) return sendError(res, 415, 'Only PNG, JPG, WEBP, GIF, MP3, WAV, FLAC, MP4, WEBM, MOV and PDF are allowed.');
      if (!Buffer.isBuffer(req.body) || req.body.length < 10) return sendError(res, 400, 'No file received.');

      const db = collections(req.db);
      if (usedBytes(db, req.user.id) + req.body.length > FREE_STORAGE_BYTES) {
        return sendError(res, 413, 'Storage is full. Delete old files or upgrade.');
      }
      const id = newId();
      const file = `${id}.${ext}`;
      fs.writeFileSync(path.join(PRIVATE_ASSET_DIR, file), req.body);
      const name = String(req.query.name || `upload.${ext}`).replace(/[^\w.\- ]/g, '').slice(0, 120) || `upload.${ext}`;
      const asset = { id, userId: req.user.id, name, mime, file, size: req.body.length, createdAt: Date.now() };
      db.assets.push(asset);
      writeDb(db);
      res.status(201).json({
        success: true,
        asset: { id, name, mime, size: asset.size, url: `${req.protocol}://${req.get('host')}/api/assets/${id}` }
      });
    }
  );

  app.get('/api/assets', requireAuth, (req, res) => {
    const db = collections(req.db);
    const assets = db.assets
      .filter(a => a.userId === req.user.id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(a => ({
        id: a.id, name: a.name, mime: a.mime, size: a.size, createdAt: a.createdAt,
        url: `${req.protocol}://${req.get('host')}/api/assets/${a.id}`
      }));
    res.json({ success: true, assets });
  });

  app.get('/api/assets/:id', requireAuth, (req, res) => {
    const asset = collections(req.db).assets.find(a => a.id === req.params.id && a.userId === req.user.id);
    if (!asset) return sendError(res, 404, 'File not found.');
    const privatePath = path.join(PRIVATE_ASSET_DIR, asset.file);
    const legacyPath = path.join(ASSET_DIR, asset.file);
    const filePath = fs.existsSync(privatePath) ? privatePath : legacyPath;
    if (!fs.existsSync(filePath)) return sendError(res, 404, 'Stored file is missing.');
    res.set('Cache-Control', 'private, no-store');
    res.type(asset.mime);
    res.sendFile(filePath);
  });

  app.delete('/api/assets/:id', requireAuth, (req, res) => {
    const db = collections(req.db);
    const a = db.assets.find(x => x.id === req.params.id && x.userId === req.user.id);
    if (!a) return sendError(res, 404, 'File not found.');
    const privatePath = path.join(PRIVATE_ASSET_DIR, a.file);
    const legacyPath = path.join(ASSET_DIR, a.file);
    const filePath = fs.existsSync(privatePath) ? privatePath : legacyPath;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.assets = db.assets.filter(x => x !== a);
    writeDb(db);
    res.json({ success: true });
  });

  // ---------- Usage (Settings > Storage Usage, Analytics) ----------
  app.get('/api/usage', requireAuth, (req, res) => {
    const db = collections(req.db);
    const mine = db.projects.filter(p => p.userId === req.user.id);
    const ai = aiCounts.get(`u:${req.user.id}`);
    res.json({
      success: true,
      usage: {
        projects: mine.filter(p => !p.trashedAt).length,
        trashed: mine.filter(p => p.trashedAt).length,
        shared: mine.filter(p => p.shareId).length,
        versions: mine.reduce((s, p) => s + (p.versions || []).length, 0),
        assets: db.assets.filter(a => a.userId === req.user.id).length,
        storageUsed: usedBytes(db, req.user.id),
        storageLimit: FREE_STORAGE_BYTES,
        aiToday: ai && ai.day === todayKey() ? ai.count : 0,
        aiLimit: FREE_DAILY_AI_LIMIT
      }
    });
  });

  return { aiQuota };
};