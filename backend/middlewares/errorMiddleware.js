function errorMiddleware(err, req, res, next) {
  console.error(err);

  if (err.code === "LIMIT_FILE_SIZE") {
    const isVideoUpload = req.originalUrl && req.originalUrl.includes("/update-job/");
    return res.status(400).json({
      error: isVideoUpload
        ? "Video is too large. Maximum 15 MB allowed."
        : "File too large",
    });
  }

  return res.status(400).json({
    error: err.message || "Server error",
  });
}

module.exports = errorMiddleware;
