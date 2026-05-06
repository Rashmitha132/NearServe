function createRateLimiter({ windowMs, max, message }) {
  const hits = new Map();

  return function rateLimit(req, res, next) {
    const now = Date.now();
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";
    const key = `${ip}:${req.method}:${req.originalUrl.split("?")[0]}`;
    const record = hits.get(key) || { count: 0, resetAt: now + windowMs };

    if (record.resetAt <= now) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }

    record.count += 1;
    hits.set(key, record);

    if (record.count > max) {
      res.set("Retry-After", String(Math.ceil((record.resetAt - now) / 1000)));
      return res.status(429).json({
        error: message || "Too many requests. Please try again shortly.",
      });
    }

    next();
  };
}

module.exports = {
  createRateLimiter,
};
