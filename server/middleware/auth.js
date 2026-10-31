const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1h';
const COOKIE_NAME = 'gym_token';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 1000
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax' });
}

function authMiddleware(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function escapeHtml(str) {
  return String(str).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}

module.exports = {
  isValidEmail,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  authMiddleware,
  escapeHtml,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  COOKIE_NAME
};