const express = require('express');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const path = require('path');
const { db, DB_PATH } = require('./db/database');
const { isValidEmail, signToken, setAuthCookie, clearAuthCookie, authMiddleware, escapeHtml } = require('./middleware/auth');
const { loginAttempts, registerAttempts, loginLimiter, registerLimiter, RATE_WINDOW, RATE_MAX } = require('./middleware/rateLimit');
const { setupSecurity } = require('./middleware/security');
const { registerPageRoutes } = require('./routes/pages');
const { registerAuthRoutes } = require('./routes/auth');
const { registerFoodRoutes } = require('./routes/foods');
const { registerHistoryRoutes } = require('./routes/history');
const { registerInsightsRoutes } = require('./routes/insights');
const https = require('https');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

// Trust proxy for Render (behind load balancer)
app.set('trust proxy', 1);

setupSecurity(app);
registerPageRoutes(app, { authMiddleware, escapeHtml });
registerAuthRoutes(app, { db, loginAttempts, registerAttempts, loginLimiter, registerLimiter, authMiddleware, isValidEmail, signToken, setAuthCookie, clearAuthCookie, escapeHtml });
registerFoodRoutes(app, { db, authMiddleware });
registerHistoryRoutes(app, { db, authMiddleware });
registerInsightsRoutes(app, { db, authMiddleware });
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required.');
  console.error('Set it before starting: export JWT_SECRET="your-strong-secret"');
  process.exit(1);
}


// --- DB (shared connection imported from ./db/database) ---
// --- Google OAuth ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `${BASE_URL}/api/auth/google/callback`
    },
    (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value.toLowerCase().trim();
        const name = profile.displayName || email.split('@')[0];
        let user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email);
        if (!user) {
          const info = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, '');
          user = { id: info.lastInsertRowid, name, email };
        }
        done(null, user);
      } catch (e) {
        done(e, null);
      }
    }
  ));

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/pages/login.html?error=google' }),
    (req, res) => {
      const user = req.user;
      const token = signToken(user);
      setAuthCookie(res, token);
      res.redirect(`${BASE_URL}/`);
    }
  );

  console.log(`[OAUTH] Google OAuth enabled (client: ${GOOGLE_CLIENT_ID ? 'set' : 'MISSING'})`);
} else {
  console.log('[OAUTH] Google OAuth disabled (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable)');
}


app.listen(PORT, () => console.log(`Gym server running at http://localhost:${PORT}`));
