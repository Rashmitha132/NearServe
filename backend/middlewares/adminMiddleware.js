function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : (req.query.token || "");

  const adminToken = req.app.locals.ADMIN_TOKEN;

  if (token !== adminToken) {
    return res.status(401).json({ error: "Unauthorized admin" });
  }

  next();
}

module.exports = requireAdmin;
