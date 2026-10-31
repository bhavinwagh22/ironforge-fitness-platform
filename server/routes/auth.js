const bcrypt = require('bcrypt');

function registerAuthRoutes(app, deps = {}) {
  const {
    db,
    loginAttempts,
    registerAttempts,
    loginLimiter,
    registerLimiter,
    authMiddleware,
    isValidEmail,
    signToken,
    setAuthCookie,
    clearAuthCookie,
    escapeHtml
  } = deps;

  // ---------- RESET LIMITS (testing only) ----------
  // Disable in production to prevent abuse
  if (process.env.NODE_ENV !== 'production') {
    app.post('/api/reset-limits', (req, res) => {
      if (loginAttempts) loginAttempts.clear();
      if (registerAttempts) registerAttempts.clear();
      res.json({ ok: true, message: 'Rate limits cleared' });
    });
  } else {
    // In production, return 404 for the endpoint to avoid leaking existence
    app.post('/api/reset-limits', (req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  // ---------- REGISTER ----------
  app.post('/api/register', registerLimiter, async (req, res) => {
    try {
      const { name, email, password } = req.body || {};
      if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
      if (!isValidEmail || !isValidEmail(email)) return res.status(400).json({ error: 'Invalid email format' });
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      const cleanName = escapeHtml ? escapeHtml(name) : String(name).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
      const cleanEmail = email.toLowerCase().trim();

      const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
      if (exists) return res.status(409).json({ error: 'Email already registered' });

      const hash = await bcrypt.hash(password, 10);
      db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(cleanName, cleanEmail, hash);
      console.log(`[REGISTER] Created user: "${cleanEmail}"`);
      const user = { id: Date.now(), name: cleanName, email: cleanEmail };
      const token = signToken(user);
      setAuthCookie(res, token);
      res.json({ ok: true, user: { id: user.id, name: cleanName, email: cleanEmail } });
    } catch (e) {
      console.error('Register error:', e.message);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ---------- LOGIN ----------
  app.post('/api/login', loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
      const cleanEmail = email.toLowerCase().trim();

      const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
      const user = db.prepare('SELECT id, name, email, password FROM users WHERE email = ?').get(cleanEmail);
      console.log(`[LOGIN] Email searched: "${cleanEmail}" | Users in DB: ${userCount} | Found: ${!!user}`);
      if (!user) return res.status(401).json({ error: 'Account not found. Please sign up.' });

      const match = await bcrypt.compare(password, user.password);
      console.log(`[LOGIN] Password verify: ${match ? 'PASS' : 'FAIL'}`);
      if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

      const token = signToken(user);
      setAuthCookie(res, token);
      res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (e) {
      console.error('Login error:', e.message);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ---------- LOGOUT ----------
  app.post('/api/logout', (req, res) => {
    clearAuthCookie(res);
    res.json({ ok: true });
  });

  // ---------- ME (current user) ----------
  app.get('/api/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
  });
}

module.exports = { registerAuthRoutes };