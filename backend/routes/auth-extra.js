// routes/auth-extra.js
// Email OTP login, forgot/reset password, Google + GitHub login, rate limiting.
const crypto = require('crypto');

const MIN = 60 * 1000;
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const safeEq = (a, b) => {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const normEmail = (e) => String(e || '').trim().toLowerCase().slice(0, 120);
const isEmail = (e) => /^\S+@\S+\.\S+$/.test(e);
const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => ({
  salt,
  hash: crypto.scryptSync(password, salt, 64).toString('hex')
});
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });
const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:5173';

const sendEmail = async (to, subject, text) => {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === 'production') throw new Error('RESEND_API_KEY is not set');
    console.log(`[email:dev] to=${to} subject="${subject}"\n${text}`); // dev lo code console lo kanipistundi
    return;
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || 'PlotCraft <onboarding@resend.dev>',
      to, subject, text
    }),
    signal: AbortSignal.timeout(15000)
  });
  if (!r.ok) throw new Error(`Email provider returned ${r.status}`);
};

// Simple in-memory rate limiter: max requests per IP per path per window
const hits = new Map();
const rateLimit = (max, windowMs) => (req, res, next) => {
  const key = `${req.path}|${req.ip}`;
  const now = Date.now();
  let e = hits.get(key);
  if (!e || e.reset < now) {
    e = { reset: now + windowMs, n: 0 };
    hits.set(key, e);
  }
  e.n += 1;
  if (e.n > max) return res.status(429).json({ success: false, message: 'Too many attempts. Please wait a few minutes.' });
  next();
};
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
}, 10 * MIN);

module.exports = function mountAuthExtra(app, { readDb, writeDb, port }) {
  const apiBase = () => process.env.API_PUBLIC_URL || `http://localhost:${port}`;
  const ensure = (db) => {
    db.users = db.users || [];
    db.sessions = db.sessions || [];
    return db;
  };
  const newSession = (db, userId) => {
    const token = crypto.randomBytes(32).toString('hex');
    db.sessions.push({ token, userId, createdAt: Date.now() });
    db.sessions = db.sessions.slice(-500);
    return token;
  };
  const findOrCreateUser = (db, email, name) => {
    let user = db.users.find(u => u.email === email);
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        name: String(name || email.split('@')[0]).slice(0, 60),
        email,
        salt: null, // OAuth/OTP users have no password; password login stays disabled for them
        hash: null,
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
    }
    return user;
  };

  // ---------- Email OTP ----------
  const otps = new Map(); // email -> { hash, expires, attempts }

  app.post('/api/auth/otp/request', rateLimit(5, 10 * MIN), async (req, res) => {
    const email = normEmail(req.body?.email);
    if (!isEmail(email)) return res.status(400).json({ success: false, message: 'Please enter a valid email.' });
    const code = String(crypto.randomInt(100000, 1000000));
    otps.set(email, { hash: sha(code), expires: Date.now() + 10 * MIN, attempts: 0 });
    try {
      await sendEmail(email, 'Your PlotCraft login code',
        `Your code is ${code}. It expires in 10 minutes. If you did not ask for this, ignore this email.`);
    } catch (err) {
      console.error('[otp] email failed:', err.message);
      return res.status(502).json({ success: false, message: 'Could not send the email right now. Try again.' });
    }
    res.json({ success: true, message: 'Code sent to your email.' });
  });

  app.post('/api/auth/otp/verify', rateLimit(20, 10 * MIN), (req, res) => {
    const email = normEmail(req.body?.email);
    const code = String(req.body?.code || '').trim();
    const rec = otps.get(email);
    if (!rec || rec.expires < Date.now()) {
      return res.status(400).json({ success: false, message: 'Code expired. Request a new one.' });
    }
    rec.attempts += 1;
    if (rec.attempts > 5) {
      otps.delete(email);
      return res.status(429).json({ success: false, message: 'Too many wrong codes. Request a new one.' });
    }
    if (!safeEq(sha(code), rec.hash)) return res.status(400).json({ success: false, message: 'Wrong code.' });
    otps.delete(email);

    const db = ensure(readDb());
    const user = findOrCreateUser(db, email);
    const token = newSession(db, user.id);
    writeDb(db);
    res.json({ success: true, token, user: publicUser(user) });
  });

  // ---------- Forgot / reset password ----------
  const resets = new Map(); // sha(token) -> { userId, expires }

  app.post('/api/auth/forgot', rateLimit(5, 15 * MIN), async (req, res) => {
    const email = normEmail(req.body?.email);
    const user = ensure(readDb()).users.find(u => u.email === email);
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      resets.set(sha(token), { userId: user.id, expires: Date.now() + 30 * MIN });
      try {
        await sendEmail(email, 'Reset your PlotCraft password',
          `Reset link (valid 30 minutes): ${FRONTEND_URL()}/?reset=${token}\nIf you did not ask for this, ignore this email.`);
      } catch (err) {
        console.error('[forgot] email failed:', err.message);
      }
    }
    // Same answer whether the email exists or not (no account enumeration)
    res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
  });

  app.post('/api/auth/reset', rateLimit(10, 15 * MIN), (req, res) => {
    const token = String(req.body?.token || '');
    const password = String(req.body?.password || '');
    if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    const key = sha(token);
    const rec = resets.get(key);
    if (!rec || rec.expires < Date.now()) {
      return res.status(400).json({ success: false, message: 'Reset link expired or invalid.' });
    }
    resets.delete(key);

    const db = ensure(readDb());
    const user = db.users.find(u => u.id === rec.userId);
    if (!user) return res.status(400).json({ success: false, message: 'Reset link expired or invalid.' });
    const { salt, hash } = hashPassword(password);
    user.salt = salt;
    user.hash = hash;
    db.sessions = db.sessions.filter(s => s.userId !== user.id); // password change = logout everywhere
    writeDb(db);
    res.json({ success: true, message: 'Password updated. Please log in.' });
  });

  // ---------- Google / GitHub OAuth ----------
  // Login success ayyaka token URL lo pettam kaadu (history/referrer lo leak avvachu).
  // Bade one-time code ichhi, frontend POST /api/auth/exchange lo token teesukuntundi.
  const states = new Map();   // oauth state -> expires
  const handoffs = new Map(); // one-time code -> { token, userId, expires }

  const newState = () => {
    const s = crypto.randomBytes(16).toString('hex');
    states.set(s, Date.now() + 10 * MIN);
    return s;
  };
  const takeState = (s) => {
    const exp = states.get(s);
    states.delete(s);
    return !!exp && exp > Date.now();
  };
  const loginWithEmail = (email, name) => {
    const db = ensure(readDb());
    const user = findOrCreateUser(db, email, name);
    const token = newSession(db, user.id);
    writeDb(db);
    return { token, userId: user.id };
  };
  const redirectWithCode = (res, { token, userId }) => {
    const code = crypto.randomBytes(24).toString('hex');
    handoffs.set(code, { token, userId, expires: Date.now() + 60 * 1000 });
    res.redirect(`${FRONTEND_URL()}/?auth_code=${code}`);
  };

  app.post('/api/auth/exchange', rateLimit(30, 10 * MIN), (req, res) => {
    const code = String(req.body?.code || '');
    const rec = handoffs.get(code);
    handoffs.delete(code);
    if (!rec || rec.expires < Date.now()) return res.status(400).json({ success: false, message: 'Login expired. Try again.' });
    const user = ensure(readDb()).users.find(u => u.id === rec.userId);
    if (!user) return res.status(400).json({ success: false, message: 'Login failed. Try again.' });
    res.json({ success: true, token: rec.token, user: publicUser(user) });
  });

  // Google
  app.get('/api/auth/google', (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ success: false, message: 'Google login is not configured yet.' });
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', `${apiBase()}/api/auth/google/callback`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('prompt', 'select_account');
    url.searchParams.set('state', newState());
    res.redirect(url.toString());
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    try {
      if (req.query.error || !takeState(String(req.query.state || ''))) throw new Error('bad state');
      const tokRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(req.query.code || ''),
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: `${apiBase()}/api/auth/google/callback`,
          grant_type: 'authorization_code'
        }),
        signal: AbortSignal.timeout(15000)
      });
      const tok = await tokRes.json();
      if (!tok.access_token) throw new Error('no access token');
      const info = await (await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tok.access_token}` },
        signal: AbortSignal.timeout(15000)
      })).json();
      if (!info.email || !info.email_verified) throw new Error('unverified email');
      redirectWithCode(res, loginWithEmail(normEmail(info.email), info.name));
    } catch (err) {
      console.error('[google login]', err.message);
      res.redirect(`${FRONTEND_URL()}/?auth_error=google`);
    }
  });

  // GitHub
  app.get('/api/auth/github', (req, res) => {
    if (!process.env.GITHUB_CLIENT_ID) return res.status(503).json({ success: false, message: 'GitHub login is not configured yet.' });
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID);
    url.searchParams.set('redirect_uri', `${apiBase()}/api/auth/github/callback`);
    url.searchParams.set('scope', 'read:user user:email');
    url.searchParams.set('state', newState());
    res.redirect(url.toString());
  });

  app.get('/api/auth/github/callback', async (req, res) => {
    try {
      if (!takeState(String(req.query.state || ''))) throw new Error('bad state');
      const tok = await (await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code: String(req.query.code || ''),
          redirect_uri: `${apiBase()}/api/auth/github/callback`
        }),
        signal: AbortSignal.timeout(15000)
      })).json();
      if (!tok.access_token) throw new Error('no access token');

      const headers = {
        Authorization: `Bearer ${tok.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'PlotCraftAI'
      };
      const profile = await (await fetch('https://api.github.com/user', { headers, signal: AbortSignal.timeout(15000) })).json();
      const emails = await (await fetch('https://api.github.com/user/emails', { headers, signal: AbortSignal.timeout(15000) })).json();
      const primary = (Array.isArray(emails) ? emails : []).find(e => e.primary && e.verified);
      if (!primary) throw new Error('no verified email on GitHub');
      redirectWithCode(res, loginWithEmail(normEmail(primary.email), profile.name || profile.login));
    } catch (err) {
      console.error('[github login]', err.message);
      res.redirect(`${FRONTEND_URL()}/?auth_error=github`);
    }
  });
};