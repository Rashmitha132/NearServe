function errorMiddleware(err, req, res, next) {
  console.error(err);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large" });
  }

  return res.status(400).json({
    error: err.message || "Server error",
  });
}

module.exports = errorMiddleware;