const jwt = require("jsonwebtoken");

function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || "nearserve-dev-secret";
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return header.split(";").reduce((cookies, part) => {
    const index = part.indexOf("=");
    if (index === -1) return cookies;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function requireUser(req, res, next) {
  const cookies = parseCookies(req);
  const authHeader = req.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const token = bearerToken || cookies.ns_auth || "";
  const tokenSource = bearerToken ? "bearer" : "cookie";

  if (!token) {
    return res.status(401).json({ error: "Please login first" });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (!payload || payload.type !== "user") {
      return res.status(401).json({ error: "Invalid login session" });
    }

    req.user = payload;
    req.cookies = cookies;

    if (tokenSource === "cookie" && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const csrfHeader = req.headers["x-csrf-token"] || "";
      if (!cookies.ns_csrf || csrfHeader !== cookies.ns_csrf) {
        return res.status(403).json({ error: "Invalid CSRF token" });
      }
    }

    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired login session" });
  }
}

module.exports = {
  getJwtSecret,
  parseCookies,
  requireUser,
};
