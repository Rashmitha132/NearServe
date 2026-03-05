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
// Import Models
// ========================
const Booking = require("./models/Booking");
const User = require("./models/User");
const Job = require("./models/Job");
const VerificationLog = require("./models/VerificationLog");
const Review = require("./models/Review"); // ✅ ratings

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

// ====================================================
// ADMIN (Simple auth token) (kept as-is)
// ====================================================
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

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
// Multer: Proof Upload (PDF only)
// ====================================================
const MAX_PROOF_SIZE = 2 * 1024 * 1024;

const proofStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
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
    if (!isPdf) return cb(new Error("Only PDF files allowed"));
    cb(null, true);
  },
});

// ====================================================
// Multer: Video Upload (Video only)
// ====================================================
const MAX_VIDEO_SIZE = 20 * 1024 * 1024;

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/videos"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, "job_" + req.params.jobId + "_" + Date.now() + ext);
  },
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("video/"))
      return cb(new Error("Only video files allowed"));
    cb(null, true);
  },
});

// ========================
// Root
// ========================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});

// ====================================================
// ✅ IMPORTANT: Dashboard needs this
// GET /user/:phone
// ====================================================
app.get("/user/:phone", async (req, res) => {
  try {
    const phone = (req.params.phone || "").trim();
    const user = await User.findOne({ phone }).select(
      "role status name email phone proofFile proofReview"
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      role: user.role,
      status: user.status,
      name: user.name,
      email: user.email,
      phone: user.phone,
      proofFile: user.proofFile || "",
      proofReview: user.proofReview || {}
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error fetching user" });
  }
});

// ====================================================
// ✅ IMPORTANT: Probation dashboard needs this
// GET /my-jobs/:phone
// ====================================================
app.get("/my-jobs/:phone", async (req, res) => {
  try {
    const phone = (req.params.phone || "").trim();
    const jobs = await Job.find({ assignedTo: phone }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error fetching jobs" });
  }
});

// ====================================================
// ✅ IMPORTANT: Workers upload proof (PDF)
// POST /upload-proof/:phone
// ====================================================
app.post("/upload-proof/:phone", uploadProof.single("proof"), async (req, res) => {
  try {
    const phone = (req.params.phone || "").trim();
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.role === "customer") {
      return res.status(400).json({ error: "Customers do not upload proof" });
    }
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    user.proofFile = req.file.path;
    user.status = "proof_submitted"; // same logic your old project used
    // optional: reset review status
    user.proofReview = { status: "none", reason: "", reviewedAt: null, reviewedBy: "" };

    await user.save();
    res.json({
      message: "Proof uploaded. Waiting for admin verification.",
      fileSavedAs: req.file.filename
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error uploading proof" });
  }
});

// ====================================================
// ✅ IMPORTANT: Workers upload probation job video
// POST /update-job/:jobId   (FormData with videoProof + status=submitted)
// ====================================================
app.post("/update-job/:jobId", uploadVideo.single("videoProof"), async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const status = (req.body.status || "").trim().toLowerCase();

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    if (status === "submitted") {
      if (!req.file) return res.status(400).json({ error: "Video proof is required" });

      job.status = "submitted";
      job.videoProofPath = req.file.path;
      job.videoReview = { status: "none", reason: "", reviewedAt: null, reviewedBy: "" };

      await job.save();
      return res.json({ message: "Job submitted for verification", job });
    }

    if (status === "rejected") {
      job.status = "rejected";
      await job.save();
      return res.json({ message: "Job marked rejected", job });
    }

    return res.status(400).json({ error: "Invalid status change" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error updating job" });
  }
});

// ====================================================
// ✅ WORKER LIST (REAL rating)
// GET /workers?role=carpenter
// ====================================================
app.get("/workers", async (req, res) => {
  try {
    const role = (req.query.role || "").trim().toLowerCase();
    if (!role) return res.status(400).json({ error: "Role is required" });

    const workers = await User.find({
      role: role,
      status: "full_access"
    }).select("name phone email role");

    const phones = workers.map(w => String(w.phone));

    const stats = await Review.aggregate([
      { $match: { workerPhone: { $in: phones } } },
      {
        $group: {
          _id: "$workerPhone",
          avgRating: { $avg: "$rating" },
          reviewsCount: { $sum: 1 }
        }
      }
    ]);

    const map = new Map(stats.map(s => [String(s._id), s]));

    const result = workers.map(w => {
      const s = map.get(String(w.phone));
      return {
        name: w.name,
        phone: w.phone,
        email: w.email,
        role: w.role,
        avgRating: s ? Number(s.avgRating.toFixed(2)) : 0,
        reviewsCount: s ? s.reviewsCount : 0
      };
    });

    res.json(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error fetching workers" });
  }
});

// ====================================================
// ✅ WORKER PROFILE (REAL rating + latest feedback)
// GET /workers/:phone
// ====================================================
app.get("/workers/:phone", async (req, res) => {
  try {
    const phone = String((req.params.phone || "").trim());

    const worker = await User.findOne({ phone }).select("name phone email role status");
    if (!worker) return res.status(404).json({ error: "Worker not found" });

    const stat = await Review.aggregate([
      { $match: { workerPhone: phone } },
      {
        $group: {
          _id: "$workerPhone",
          avgRating: { $avg: "$rating" },
          reviewsCount: { $sum: 1 }
        }
      }
    ]);

    const avgRating = stat.length ? Number(stat[0].avgRating.toFixed(2)) : 0;
    const reviewsCount = stat.length ? stat[0].reviewsCount : 0;

    const latestReviews = await Review.find({ workerPhone: phone })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("rating comment createdAt customerPhone");

    res.json({
      name: worker.name,
      phone: worker.phone,
      email: worker.email,
      role: worker.role,
      avgRating,
      reviewsCount,
      latestReviews
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error fetching worker profile" });
  }
});

// ====================================================
// Booking Routes
// ====================================================

app.post("/book", async (req, res) => {
  try {
    const bookingData = {
      name: req.body.name,
      phone: (req.body.phone || "").trim(),
      service: (req.body.service || "").trim().toLowerCase(),
      address: req.body.address,
      date: req.body.date,

      chosenWorkerPhone: (req.body.chosenWorkerPhone || "").trim(),
      chosenWorkerRole: (req.body.chosenWorkerRole || "").trim().toLowerCase(),

      status: "pending",

      visitTime: "",
      workerMessage: "",
      rejectReason: "",
      completedAt: null,
      reviewed: false
    };

    const booking = new Booking(bookingData);
    await booking.save();

    res.status(201).json({ message: "Booking Successful", booking });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Error fetching bookings" });
  }
});

app.get("/mybookings/:phone", async (req, res) => {
  const phone = (req.params.phone || "").trim();
  try {
    const bookings = await Booking.find({ phone }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Error fetching bookings" });
  }
});

// worker sees only chosen bookings
app.get("/bookings/chosen/:role/:workerPhone", async (req, res) => {
  try {
    const role = (req.params.role || "").trim().toLowerCase();
    const workerPhone = (req.params.workerPhone || "").trim();

    const bookings = await Booking.find({
      chosenWorkerRole: role,
      chosenWorkerPhone: workerPhone
    }).sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Error fetching chosen bookings" });
  }
});

// worker accept/reject + save visitTime/message/rejectReason
app.put("/bookings/:id/status", async (req, res) => {
  try {
    const id = req.params.id;
    const status = (req.body.status || "").trim().toLowerCase();

    if (!["accepted", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const update = { status };

    if (status === "accepted") {
      update.visitTime = (req.body.visitTime || "").trim();
      update.workerMessage = (req.body.workerMessage || "").trim();
      update.rejectReason = "";
      if (!update.visitTime) {
        return res.status(400).json({ error: "visitTime is required to accept" });
      }
    }

    if (status === "rejected") {
      update.rejectReason = (req.body.rejectReason || "").trim();
      update.visitTime = "";
      update.workerMessage = "";
      if (!update.rejectReason) {
        return res.status(400).json({ error: "rejectReason is required to reject" });
      }
    }

    const booking = await Booking.findByIdAndUpdate(id, update, { new: true });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    res.json({ message: "Status updated", booking });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error updating booking status" });
  }
});

// worker marks completed
app.put("/bookings/:id/complete", async (req, res) => {
  try {
    const id = req.params.id;
    const workerPhone = (req.body.workerPhone || "").trim();
    const workerRole = (req.body.workerRole || "").trim().toLowerCase();

    if (!workerPhone || !workerRole) {
      return res.status(400).json({ error: "workerPhone and workerRole are required" });
    }

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (
      String(booking.chosenWorkerPhone || "") !== String(workerPhone) ||
      String(booking.chosenWorkerRole || "").toLowerCase() !== String(workerRole)
    ) {
      return res.status(403).json({ error: "Not allowed to complete this booking" });
    }

    if ((booking.status || "").toLowerCase() !== "accepted") {
      return res.status(400).json({ error: "Only accepted bookings can be completed" });
    }

    booking.status = "completed";
    booking.completedAt = new Date();
    await booking.save();

    res.json({ message: "Marked completed", booking });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error marking completed" });
  }
});

// customer submits review ONLY AFTER completed
app.post("/reviews", async (req, res) => {
  try {
    const bookingId = req.body.bookingId;
    const customerPhone = (req.body.customerPhone || "").trim();
    const rating = Number(req.body.rating);
    const comment = (req.body.comment || "").trim();

    if (!bookingId || !customerPhone || !rating) {
      return res.status(400).json({ error: "bookingId, customerPhone, rating are required" });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (String((booking.phone || "").trim()) !== String(customerPhone)) {
      return res.status(403).json({ error: "Not allowed to review this booking" });
    }

    if (String(booking.status || "").toLowerCase() !== "completed") {
      return res.status(400).json({ error: "You can rate only after job is completed" });
    }

    if (booking.reviewed) {
      return res.status(400).json({ error: "You already reviewed this booking" });
    }

    if (!booking.chosenWorkerPhone || !booking.chosenWorkerRole) {
      return res.status(400).json({ error: "No chosen worker on this booking" });
    }

    const review = await Review.create({
      bookingId: booking._id,
      workerPhone: booking.chosenWorkerPhone,
      workerRole: booking.chosenWorkerRole,
      customerPhone,
      rating,
      comment
    });

    booking.reviewed = true;
    await booking.save();

    res.status(201).json({ message: "Review saved", review });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(400).json({ error: "You already reviewed this booking" });
    }
    console.log(err);
    res.status(500).json({ error: "Error saving review" });
  }
});

// ====================================================
// User Authentication
// ====================================================

app.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    let status = role === "customer" ? "full_access" : "pending_verification";

    const user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      role,
      status
    });

    await user.save();
    res.status(201).json({ message: "Signup successful" });
  } catch (err) {
    res.status(500).json({ error: "Error creating user" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { emailOrPhone, password, role } = req.body;

    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
    });

    if (!user) return res.status(400).json({ error: "User not found" });

    // role check (prevents wrong role login)
    if (role && user.role !== role) {
      return res.status(403).json({ error: `This account is not registered as ${role}` });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Incorrect password" });

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
    res.status(500).json({ error: "Login error" });
  }
});

// ====================================================
// ✅ Multer / Upload Error Handler (VERY IMPORTANT)
// ====================================================
app.use((err, req, res, next) => {
  if (!err) return next();
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large" });
  }
  return res.status(400).json({ error: err.message || "Upload error" });
});

// ========================
// Start server
// ========================
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});