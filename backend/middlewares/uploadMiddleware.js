const multer = require("multer");
const path = require("path");
const fs = require("fs");

const MAX_PROOF_SIZE = 2 * 1024 * 1024;
const MAX_VIDEO_SIZE = 8 * 1024 * 1024;
const uploadsDir = path.join(__dirname, "..", "uploads");
const adminUploadsDir = path.join(__dirname, "..", "admin_uploads");
const proofDir = path.join(adminUploadsDir, "aadhaar");
const videosDir = path.join(uploadsDir, "videos");

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const proofStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDir(proofDir);
    cb(null, proofDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safePhone = String(req.params.phone || "worker").replace(/[^\dA-Za-z_-]/g, "");
    cb(null, `aadhaar_${safePhone}_${Date.now()}${ext}`);
  },
});

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDir(videosDir);
    cb(null, videosDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".mp4";
    const safeJobId = String(req.params.jobId || "job").replace(/[^\dA-Za-z_-]/g, "");
    cb(null, `upload_${safeJobId}_${Date.now()}${ext}`);
  },
});

const uploadProof = multer({
  storage: proofStorage,
  limits: { fileSize: MAX_PROOF_SIZE },
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");

    if (!isPdf) return cb(new Error("Only PDF files allowed"));
    cb(null, true);
  },
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("video/")) {
      return cb(new Error("Only video files allowed"));
    }
    cb(null, true);
  },
});

module.exports = { uploadProof, uploadVideo };
