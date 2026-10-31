const crypto = require('crypto');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const express = require('express');
const path = require('path');

function setupSecurity(app) {
  // --- Security headers with nonce-based CSP ---
  app.use((req, res, next) => {
    const nonce = crypto.randomBytes(16).toString('base64');
    res.locals.nonce = nonce;
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy',
      `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src https://fonts.gstatic.com; img-src * data:;`);
    next();
  });

  const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim());
  app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use('/css', express.static(path.join(__dirname, '..', 'public', 'css')));
  app.use('/js', express.static(path.join(__dirname, '..', 'public', 'js')));
  app.use('/pages', express.static(path.join(__dirname, '..', 'public', 'pages')));
  app.use(express.static(path.join(__dirname, '..')));

  // --- Passport session middleware (needed for OAuth callback) ---
  app.use((req, res, next) => {
    if (!req.session) {
      req.session = {};
    }
    next();
  });
}

module.exports = { setupSecurity };