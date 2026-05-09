function errorMiddleware(err, req, res, next) {
  console.error(err);

  if (err.code === "LIMIT_FILE_SIZE") {
    const isVideoUpload = req.originalUrl && req.originalUrl.includes("/update-job/");
    const maxVideoMb = Number(process.env.MAX_VIDEO_UPLOAD_MB || 50);
    return res.status(400).json({
      error: isVideoUpload
        ? `Video is too large. Maximum ${maxVideoMb} MB allowed.`
        : "File too large",
    });
  }

  return res.status(400).json({
    error: err.message || "Server error",
  });
}

module.exports = errorMiddleware;
