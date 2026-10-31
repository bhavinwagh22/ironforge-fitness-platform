// --- In-memory rate limit stores (reset on server restart) ---
const loginAttempts = new Map();  // ip -> {count, resetTime}
const registerAttempts = new Map();

const RATE_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_MAX = process.env.NODE_ENV === 'production' ? 20 : 100;

function getRateLimit(store, key, windowMs, max) {
  const now = Date.now();
  const record = store.get(key) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  record.count++;
  store.set(key, record);

  const remaining = Math.max(0, max - record.count);
  const retryAfter = Math.ceil((record.resetTime - now) / 1000);

  return {
    isLimited: record.count > max,
    remaining,
    retryAfter,
    limit: max
  };
}

function rateLimitMiddleware(store) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const result = getRateLimit(store, ip, RATE_WINDOW, RATE_MAX);

    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil((Date.now() + RATE_WINDOW) / 1000));

    if (result.isLimited) {
      res.setHeader('Retry-After', result.retryAfter);
      return res.status(429).json({
        error: 'Too many attempts. Please try again later.',
        retryAfter: result.retryAfter
      });
    }
    next();
  };
}

const loginLimiter = rateLimitMiddleware(loginAttempts);
const registerLimiter = rateLimitMiddleware(registerAttempts);

module.exports = {
  loginAttempts,
  registerAttempts,
  getRateLimit,
  rateLimitMiddleware,
  loginLimiter,
  registerLimiter,
  RATE_WINDOW,
  RATE_MAX
};