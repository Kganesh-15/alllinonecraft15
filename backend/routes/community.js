// routes/community.js
// Community feed: publish projects, likes, comments, follows, creator leaderboard,
// challenges, and project templates.
const crypto = require('crypto');

const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;
const PAGE_MAX = 30;
const STORAGE_LIMIT = Number(process.env.FREE_STORAGE_MB || 500) * 1024 * 1024;

const CHALLENGES = [
  { id: 'poster-week', title: 'Poster of the week', description: 'Make a festival poster using only 3 colours.' },
  { id: 'story-100', title: '100-word micro story', description: 'Write a complete story in exactly 100 words.' }
];

// Layer shape frontend editor ki match avvali (adjust cheyyandi)
const TEMPLATES = [
  { id: 'ig-post', type: 'design', title: 'Instagram Post', category: 'social',
    data: { width: 1080, height: 1080, background: '#7c3aed', layers: [
      { type: 'text', text: 'Your headline', x: 90, y: 420, fontSize: 96, color: '#ffffff', locked: false, hidden: false }
    ] } },
  { id: 'poster-event', type: 'design', title: 'Event Poster', category: 'poster',
    data: { width: 1240, height: 1754, background: '#0f172a', layers: [
      { type: 'text', text: 'EVENT NAME', x: 120, y: 400, fontSize: 120, color: '#facc15', locked: false, hidden: false },
      { type: 'text', text: 'Date · Venue', x: 120, y: 620, fontSize: 48, color: '#e2e8f0', locked: false, hidden: false }
    ] } },
  { id: 'youtube-banner', type: 'design', title: 'YouTube Banner', category: 'banner',
    data: { width: 2560, height: 1440, background: '#111827', layers: [
      { type: 'text', text: 'Channel name', x: 200, y: 600, fontSize: 140, color: '#ffffff', locked: false, hidden: false }
    ] } },
  { id: 'flyer-clean', type: 'design', title: 'Clean Flyer', category: 'flyer',
    data: { width: 1240, height: 1754, background: '#fef3c7', layers: [
      { type: 'text', text: 'Headline', x: 100, y: 200, fontSize: 110, color: '#1f2937', locked: false, hidden: false }
    ] } },
  { id: 'story-chapters', type: 'story', title: 'Story Chapter Outline', category: 'writing',
    data: { chapters: [
      { title: 'Chapter 1', beat: 'Introduce the hero and the world' },
      { title: 'Chapter 2', beat: 'The inciting incident' },
      { title: 'Chapter 3', beat: 'The turning point' }
    ], notes: '' } }
];

module.exports = function mountCommunity(app, { readDb, writeDb, requireAuth, resolveUserId }) {
  const comm = (db) => {
    db.community = db.community || { posts: [], likes: [], comments: [], follows: [] };
    db.projects = db.projects || [];
    db.users = db.users || [];
    return db.community;
  };

  const summary = (post, viewerId, c) => ({
    id: post.id,
    title: post.title,
    type: post.type,
    description: post.description,
    tags: post.tags,
    authorId: post.userId,
    authorName: post.authorName,
    createdAt: post.createdAt,
    likes: c.likes.filter(l => l.postId === post.id).length,
    comments: c.comments.filter(x => x.postId === post.id).length,
    likedByMe: !!viewerId && c.likes.some(l => l.postId === post.id && l.userId === viewerId),
    followingAuthor: !!viewerId && c.follows.some(f => f.followerId === viewerId && f.userId === post.userId)
  });

  // ---------- Publish ----------
  app.post('/api/community/posts', requireAuth, (req, res) => {
    const db = req.db;
    const c = comm(db);
    const project = db.projects.find(p => p.id === req.body?.projectId && p.userId === req.user.id && !p.trashedAt);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    if ((project.bytes || 0) > MAX_SNAPSHOT_BYTES) return res.status(413).json({ success: false, message: 'Project is too large to publish.' });

    const description = String(req.body?.description || '').trim().slice(0, 500);
    const tags = (Array.isArray(req.body?.tags) ? req.body.tags : []).slice(0, 5)
      .map(t => String(t).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20)).filter(Boolean);
    const snap = JSON.parse(JSON.stringify(project.data ?? null));
    const now = Date.now();

    let post = c.posts.find(p => p.projectId === project.id && p.userId === req.user.id);
    if (post) {
      Object.assign(post, { data: snap, title: project.title, type: project.type, description, tags, updatedAt: now });
    } else {
      post = {
        id: crypto.randomUUID(), projectId: project.id, userId: req.user.id, authorName: req.user.name,
        title: project.title, type: project.type, description, tags, data: snap, createdAt: now, updatedAt: now
      };
      c.posts.push(post);
    }
    writeDb(db);
    res.status(201).json({ success: true, post: summary(post, req.user.id, c) });
  });

  app.delete('/api/community/posts/:id', requireAuth, (req, res) => {
    const c = comm(req.db);
    const post = c.posts.find(p => p.id === req.params.id && p.userId === req.user.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    c.posts = c.posts.filter(p => p !== post);
    c.likes = c.likes.filter(l => l.postId !== post.id);
    c.comments = c.comments.filter(x => x.postId !== post.id);
    writeDb(req.db);
    res.json({ success: true });
  });

  // ---------- Feed (public) ----------
  app.get('/api/community/feed', (req, res) => {
    const db = readDb();
    const c = comm(db);
    const viewer = resolveUserId(req);
    const sort = req.query.sort === 'top' ? 'top' : 'new';
    const type = req.query.type ? String(req.query.type) : null;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(PAGE_MAX, Number(req.query.limit) || 12);

    const items = c.posts.filter(p => !type || p.type === type).map(p => summary(p, viewer, c));
    items.sort(sort === 'top'
      ? (a, b) => (b.likes - a.likes) || (b.createdAt - a.createdAt)
      : (a, b) => b.createdAt - a.createdAt);
    const start = (page - 1) * limit;
    res.json({ success: true, page, total: items.length, posts: items.slice(start, start + limit) });
  });

  app.get('/api/community/posts/:id', (req, res) => {
    const c = comm(readDb());
    const post = c.posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    const viewer = resolveUserId(req);
    res.json({
      success: true,
      post: { ...summary(post, viewer, c), data: post.data },
      comments: c.comments
        .filter(x => x.postId === post.id)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(x => ({ id: x.id, authorName: x.authorName, text: x.text, createdAt: x.createdAt, mine: x.userId === viewer }))
    });
  });

  // ---------- Likes, comments, follows ----------
  app.post('/api/community/posts/:id/like', requireAuth, (req, res) => {
    const c = comm(req.db);
    if (!c.posts.some(p => p.id === req.params.id)) return res.status(404).json({ success: false, message: 'Post not found.' });
    const i = c.likes.findIndex(l => l.postId === req.params.id && l.userId === req.user.id);
    let liked;
    if (i >= 0) {
      c.likes.splice(i, 1);
      liked = false;
    } else {
      c.likes.push({ postId: req.params.id, userId: req.user.id, createdAt: Date.now() });
      liked = true;
    }
    writeDb(req.db);
    res.json({ success: true, liked, likes: c.likes.filter(l => l.postId === req.params.id).length });
  });

  app.post('/api/community/posts/:id/comments', requireAuth, (req, res) => {
    const c = comm(req.db);
    if (!c.posts.some(p => p.id === req.params.id)) return res.status(404).json({ success: false, message: 'Post not found.' });
    const text = String(req.body?.text || '').trim().slice(0, 500);
    if (!text) return res.status(400).json({ success: false, message: 'Write a comment first.' });
    const comment = {
      id: crypto.randomUUID(), postId: req.params.id, userId: req.user.id,
      authorName: req.user.name, text, createdAt: Date.now()
    };
    c.comments.push(comment);
    writeDb(req.db);
    res.status(201).json({
      success: true,
      comment: { id: comment.id, authorName: comment.authorName, text, createdAt: comment.createdAt, mine: true }
    });
  });

  app.delete('/api/community/comments/:id', requireAuth, (req, res) => {
    const c = comm(req.db);
    const cm = c.comments.find(x => x.id === req.params.id);
    if (!cm) return res.status(404).json({ success: false, message: 'Comment not found.' });
    const post = c.posts.find(p => p.id === cm.postId);
    if (cm.userId !== req.user.id && post?.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }
    c.comments = c.comments.filter(x => x !== cm);
    writeDb(req.db);
    res.json({ success: true });
  });

  app.post('/api/community/follow/:userId', requireAuth, (req, res) => {
    if (req.params.userId === req.user.id) return res.status(400).json({ success: false, message: 'You cannot follow yourself.' });
    const db = req.db;
    const c = comm(db);
    if (!db.users.some(u => u.id === req.params.userId)) return res.status(404).json({ success: false, message: 'User not found.' });
    const i = c.follows.findIndex(f => f.followerId === req.user.id && f.userId === req.params.userId);
    let following;
    if (i >= 0) {
      c.follows.splice(i, 1);
      following = false;
    } else {
      c.follows.push({ followerId: req.user.id, userId: req.params.userId, createdAt: Date.now() });
      following = true;
    }
    writeDb(db);
    res.json({ success: true, following, followers: c.follows.filter(f => f.userId === req.params.userId).length });
  });

  // ---------- Creator score + leaderboard ----------
  // Score: published post = 5, like received = 2, follower = 3
  app.get('/api/community/leaderboard', (req, res) => {
    const db = readDb();
    const c = comm(db);
    const owner = new Map(c.posts.map(p => [p.id, p.userId]));
    const score = new Map();
    const bump = (userId, n) => score.set(userId, (score.get(userId) || 0) + n);
    for (const p of c.posts) bump(p.userId, 5);
    for (const l of c.likes) if (owner.has(l.postId)) bump(owner.get(l.postId), 2);
    for (const f of c.follows) bump(f.userId, 3);

    const rows = [...score.entries()]
      .map(([userId, points]) => {
        const u = db.users.find(x => x.id === userId);
        return { userId, name: u ? u.name : 'Creator', score: points, posts: c.posts.filter(p => p.userId === userId).length };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
    res.json({ success: true, leaderboard: rows });
  });

  app.get('/api/community/challenges', (req, res) => {
    res.json({ success: true, challenges: CHALLENGES });
  });

  // ---------- Templates ----------
  app.get('/api/templates', (req, res) => {
    const type = req.query.type ? String(req.query.type) : null;
    const templates = TEMPLATES
      .filter(t => !type || t.type === type)
      .map(({ id, type: t, title, category }) => ({ id, type: t, title, category }));
    res.json({ success: true, templates });
  });

  app.get('/api/templates/:id', (req, res) => {
    const t = TEMPLATES.find(x => x.id === req.params.id);
    if (!t) return res.status(404).json({ success: false, message: 'Template not found.' });
    res.json({ success: true, template: t });
  });

  app.post('/api/templates/:id/use', requireAuth, (req, res) => {
    const t = TEMPLATES.find(x => x.id === req.params.id);
    if (!t) return res.status(404).json({ success: false, message: 'Template not found.' });
    const db = req.db;
    comm(db);
    const bytes = Buffer.byteLength(JSON.stringify(t.data), 'utf8');
    const used = db.projects.filter(p => p.userId === req.user.id).reduce((s, p) => s + (p.bytes || 0), 0);
    if (used + bytes > STORAGE_LIMIT) return res.status(413).json({ success: false, message: 'Storage is full.' });

    const now = Date.now();
    const project = {
      id: crypto.randomUUID(), userId: req.user.id, title: t.title, type: t.type,
      data: JSON.parse(JSON.stringify(t.data)), bytes, version: 1,
      createdAt: now, updatedAt: now, trashedAt: null, shareId: null, versions: []
    };
    db.projects.push(project);
    writeDb(db);
    res.status(201).json({ success: true, project: { id: project.id, title: project.title, type: project.type, version: 1, data: project.data } });
  });
};