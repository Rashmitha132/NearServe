const multer = require("multer");
const path = require("path");

const MAX_PROOF_SIZE = 2 * 1024 * 1024;
const MAX_VIDEO_SIZE = 20 * 1024 * 1024;

const proofStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, req.params.phone + "_" + Date.now() + ext);
  },
});

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/videos"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, "job_" + req.params.jobId + "_" + Date.now() + ext);
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