// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();

// ========================
// Middleware
// ========================
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Ensure uploads folders exist
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("uploads/videos")) fs.mkdirSync("uploads/videos", { recursive: true });

// ========================
// MongoDB connection
// ========================
mongoose
  .connect(
    "mongodb+srv://quickadmin:Quick1234@cluster0.coz93wy.mongodb.net/quickserve?retryWrites=true&w=majority"
  )
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// ========================
// Import Models
// ========================
const Booking = require("./models/Booking");
const User = require("./models/User");
const Job = require("./models/Job");
const VerificationLog = require("./models/VerificationLog"); // ✅ ADDED (history)

// ====================================================
// ADMIN (Simple auth token)
// ====================================================
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

// simple in-memory token
const ADMIN_TOKEN = "QS_ADMIN_" + Math.random().toString(36).slice(2);

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized admin" });
  }
  next();
}

// ====================================================
// Multer: Proof Upload (PDF ONLY + 2MB)
// ====================================================
const MAX_PROOF_SIZE = 2 * 1024 * 1024; // 2MB

const proofStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, req.params.phone + "_" + Date.now() + ext);
  },
});

const uploadProof = multer({
  storage: proofStorage,
  limits: { fileSize: MAX_PROOF_SIZE },
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");
    if (!isPdf) return cb(new Error("Only PDF files are allowed"));
    cb(null, true);
  },
});

// ====================================================
// Multer: Video Upload (VIDEO ONLY + 20MB)
// ====================================================
const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20MB

const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/videos");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, "job_" + req.params.jobId + "_" + Date.now() + ext);
  },
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("video/")) {
      return cb(new Error("Only video files are allowed"));
    }
    cb(null, true);
  },
});

// ====================================================
// Helpers: Probation Job Descriptions
// ====================================================
function getProbationTasks(role) {
  switch (role) {
    case "carpenter":
      return [
        "Task 1: Upload a video showing you fixing a door hinge OR installing a lock properly.",
        "Task 2: Upload a video showing you repairing a wooden chair/table OR drilling & fitting a wall shelf."
      ];
    case "electrician":
      return [
        "Task 1: Upload a video showing safe wiring of a plug/top (with power OFF) or replacing a switch/socket.",
        "Task 2: Upload a video showing installation/testing of a bulb holder/MCB demo (safety first)."
      ];
    case "plumber":
      return [
        "Task 1: Upload a video showing you fixing a leaking tap/pipe joint using correct tools.",
        "Task 2: Upload a video showing you installing/repairing a water connection or flushing mechanism."
      ];
    default:
      return [
        "Task 1: Upload a video proof of your work related to your field.",
        "Task 2: Upload another video proof of your work related to your field."
      ];
  }
}

// ========================
// Redirect root to login page
// ========================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});

// ====================================================
// ADMIN ROUTES
// ====================================================
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.json({ message: "Admin login ok", token: ADMIN_TOKEN });
  }
  return res.status(401).json({ error: "Invalid admin credentials" });
});

// A) workers waiting for proof verification
app.get("/admin/workers", requireAdmin, async (req, res) => {
  try {
    const workers = await User.find({
      role: { $ne: "customer" },
      status: "proof_submitted"
    }).select("name phone role status proofFile proofReview");

    res.json({ workers });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error fetching workers" });
  }
});

// ✅ Approve/Reject worker proof WITH REASON + HISTORY + worker message storage
app.post("/admin/verify-proof/:phone", requireAdmin, async (req, res) => {
  try {
    const { decision, reason = "" } = req.body || {};
    const phone = req.params.phone;

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (decision === "approve") {
      user.status = "probation";
      user.proofReview = {
        status: "approved",
        reason: "",
        reviewedAt: new Date(),
        reviewedBy: ADMIN_USERNAME
      };
      await user.save();

      // create probation jobs only if none exist
      const existing = await Job.find({ assignedTo: phone });
      if (existing.length === 0) {
        const tasks = getProbationTasks(user.role);
        await Job.insertMany([
          { jobType: user.role, assignedTo: phone, status: "pending", description: tasks[0] },
          { jobType: user.role, assignedTo: phone, status: "pending", description: tasks[1] }
        ]);
      }

      await VerificationLog.create({
        type: "proof",
        workerPhone: phone,
        workerRole: user.role,
        targetId: String(user._id),
        decision: "approved",
        reason: "",
        adminUser: ADMIN_USERNAME
      });

      return res.json({ message: "Proof approved. Worker moved to probation." });
    }

    if (decision === "reject") {
      if (!reason.trim()) {
        return res.status(400).json({ error: "Rejection reason is required." });
      }

      user.status = "pending_verification";
      user.proofReview = {
        status: "rejected",
        reason: reason.trim(),
        reviewedAt: new Date(),
        reviewedBy: ADMIN_USERNAME
      };
      // optional: keep proofFile so admin can still open it later
      // if you want to clear it uncomment next line:
      // user.proofFile = "";

      await user.save();

      await VerificationLog.create({
        type: "proof",
        workerPhone: phone,
        workerRole: user.role,
        targetId: String(user._id),
        decision: "rejected",
        reason: reason.trim(),
        adminUser: ADMIN_USERNAME
      });

      return res.json({ message: "Proof rejected. Reason saved and visible to worker." });
    }

    return res.status(400).json({ error: "Invalid decision" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error verifying proof" });
  }
});

// B) List submitted jobs (videos)
app.get("/admin/submitted-jobs", requireAdmin, async (req, res) => {
  try {
    const jobs = await Job.find({ status: "submitted" });
    res.json({ jobs });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error fetching submitted jobs" });
  }
});

// ✅ Approve/Reject job video WITH REASON + HISTORY + worker message storage
app.post("/admin/verify-job/:jobId", requireAdmin, async (req, res) => {
  try {
    const { decision, reason = "" } = req.body || {};
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    if (decision === "approve") {
      job.status = "completed";
      job.videoReview = {
        status: "approved",
        reason: "",
        reviewedAt: new Date(),
        reviewedBy: ADMIN_USERNAME
      };
      await job.save();

      await VerificationLog.create({
        type: "job_video",
        workerPhone: job.assignedTo,
        workerRole: job.jobType,
        targetId: String(job._id),
        decision: "approved",
        reason: "",
        adminUser: ADMIN_USERNAME
      });
    } else if (decision === "reject") {
      if (!reason.trim()) {
        return res.status(400).json({ error: "Rejection reason is required." });
      }

      job.status = "rejected";
      job.videoReview = {
        status: "rejected",
        reason: reason.trim(),
        reviewedAt: new Date(),
        reviewedBy: ADMIN_USERNAME
      };
      await job.save();

      await VerificationLog.create({
        type: "job_video",
        workerPhone: job.assignedTo,
        workerRole: job.jobType,
        targetId: String(job._id),
        decision: "rejected",
        reason: reason.trim(),
        adminUser: ADMIN_USERNAME
      });
    } else {
      return res.status(400).json({ error: "Invalid decision" });
    }

    // Upgrade worker only if all probation jobs completed
    const allJobs = await Job.find({ assignedTo: job.assignedTo });
    const failed = allJobs.some((j) => j.status === "rejected");

    if (!failed && allJobs.length > 0 && allJobs.every((j) => j.status === "completed")) {
      const worker = await User.findOne({ phone: job.assignedTo });
      if (worker && worker.status === "probation") {
        worker.status = "full_access";
        await worker.save();
      }
    }

    res.json({ message: "Job verification saved", job });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error verifying job" });
  }
});

// ✅ Admin history route (approved/rejected + date + reason)
app.get("/admin/history", requireAdmin, async (req, res) => {
  try {
    const type = req.query.type; // optional: proof | job_video
    const filter = {};
    if (type === "proof" || type === "job_video") filter.type = type;

    const logs = await VerificationLog.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ logs });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error loading history" });
  }
});

// ✅ Worker can read their proof review reason/status
app.get("/worker/review/:phone", async (req, res) => {
  try {
    const user = await User.findOne({ phone: req.params.phone })
      .select("status proofReview role name proofFile");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Error fetching review" });
  }
});

// ========================
// Booking Routes
// ========================
app.post("/book", async (req, res) => {
  try {
    const bookingData = {
      name: req.body.name,
      phone: req.body.phone.trim(),
      service: req.body.service,
      address: req.body.address,
      date: req.body.date,
    };
    const booking = new Booking(bookingData);
    await booking.save();
    res.status(201).json({ message: "Booking Successful" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find();
    res.json(bookings);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error fetching bookings" });
  }
});

app.get("/mybookings/:phone", async (req, res) => {
  const phone = req.params.phone.trim();
  try {
    const bookings = await Booking.find({ phone });
    res.json(bookings);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error fetching bookings" });
  }
});

// ========================
// User Authentication Routes
// ========================
app.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!role || !["customer", "electrician", "plumber", "carpenter"].includes(role)) {
      return res.status(400).json({ error: "Invalid role selected" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) return res.status(400).json({ error: "Email or phone already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    let status = role === "customer" ? "full_access" : "pending_verification";

    const user = new User({ name, email, phone, password: hashedPassword, role, status });
    await user.save();

    res.status(201).json({ message: "Signup successful" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error creating user" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { emailOrPhone, password, role } = req.body;

    if (!role || !["customer", "electrician", "plumber", "carpenter"].includes(role)) {
      return res.status(400).json({ error: "Invalid role selected" });
    }

    const user = await User.findOne({ $or: [{ email: emailOrPhone }, { phone: emailOrPhone }] });
    if (!user) return res.status(400).json({ error: "User not found" });
    if (user.role !== role) return res.status(403).json({ error: `This account is not registered as ${role}` });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Incorrect password" });

    if (role !== "customer") {
      if (user.status === "pending_verification") {
        return res.json({
          message: "Please upload your proof documents.",
          user: { name: user.name, phone: user.phone, role: user.role, status: user.status },
        });
      }

      if (user.status === "proof_submitted") {
        return res.json({
          message: "Proof submitted. Waiting for admin verification.",
          user: { name: user.name, phone: user.phone, role: user.role, status: user.status },
        });
      }

      if (user.status === "probation") {
        return res.json({
          message: "Account under probation. Submit job videos for verification.",
          user: { name: user.name, phone: user.phone, role: user.role, status: user.status },
        });
      }

      if (user.status === "blocked") {
        return res.status(403).json({ error: "Account blocked. Contact admin." });
      }
    }

    res.json({
      message: "Login successful",
      user: {
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Login error" });
  }
});

app.get("/user/:phone", async (req, res) => {
  try {
    const user = await User.findOne({ phone: req.params.phone });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ role: user.role, status: user.status, name: user.name, proofFile: user.proofFile, proofReview: user.proofReview });
  } catch (err) {
    res.status(500).json({ error: "Error fetching user" });
  }
});

// ========================
// Proof Upload Route (Workers) - PDF ONLY
// status becomes proof_submitted
// ========================
app.post("/upload-proof/:phone", uploadProof.single("proof"), async (req, res) => {
  try {
    const phone = req.params.phone;
    const user = await User.findOne({ phone });

    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "customer") return res.status(400).json({ error: "Customers do not upload proof" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    user.proofFile = req.file.path;
    user.status = "proof_submitted";

    // reset proof review when new proof submitted
    user.proofReview = { status: "none", reason: "", reviewedAt: null, reviewedBy: "" };

    await user.save();

    res.json({
      message: "Proof uploaded successfully! Waiting for admin verification.",
      fileSavedAs: req.file.filename,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error uploading proof" });
  }
});

// ========================
// Probation Job Routes
// ========================
app.get("/my-jobs/:phone", async (req, res) => {
  try {
    const jobs = await Job.find({ assignedTo: req.params.phone });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: "Error fetching jobs" });
  }
});

// ========================
// Update Job Route (Workers)
// - submit video => status=submitted (FormData)
// - reject => status=rejected (FormData/JSON both ok if status present)
// ========================
app.post("/update-job/:jobId", uploadVideo.single("videoProof"), async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const status = req.body.status;

    if (status === "submitted") {
      if (!req.file) return res.status(400).json({ error: "Video proof is required" });

      job.status = "submitted";
      job.videoProofPath = req.file.path;

      // reset old review when new video submitted
      job.videoReview = { status: "none", reason: "", reviewedAt: null, reviewedBy: "" };

      await job.save();
      return res.json({ message: "Job submitted for admin verification", job });
    }

    if (status === "rejected") {
      job.status = "rejected";
      await job.save();
      return res.json({ message: "Job rejected", job });
    }

    return res.status(400).json({ error: "Invalid status change" });
  } catch (err) {
    console.log("UPDATE JOB ERROR:", err);
    res.status(500).json({ error: "Error updating job" });
  }
});

// ========================
// Multer / Upload Error Handler
// ========================
app.use((err, req, res, next) => {
  if (err) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large." });
    }
    return res.status(400).json({ error: err.message });
  }
  next();
});

// ========================
// Start server
// ========================
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});