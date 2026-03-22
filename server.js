// server.js
require("dotenv").config();
const crypto     = require("crypto");
const nodemailer = require("nodemailer");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const Chat = require("./models/chat");
const PENDING_EXPIRY_HOURS = 24; // change to 48 if you want

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
app.use(bodyParser.json({ limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));
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
// ✅ ADDED: ADMIN LOGIN + DASHBOARD ROUTES
// ====================================================

// Admin Login
app.post("/admin/login", (req, res) => {
  try {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return res.json({
        success: true,
        token: ADMIN_TOKEN,
        message: "Admin login successful"
      });
    }

    return res.status(401).json({
      success: false,
      error: "Invalid admin username or password"
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Admin login error" });
  }
});

// Get workers whose proof is pending verification
app.get("/admin/workers", requireAdmin, async (req, res) => {
  try {
    const workers = await User.find({
      role: { $ne: "customer" },
      status: "proof_submitted"
    }).sort({ createdAt: -1 });

    res.json({ workers });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error fetching workers for admin" });
  }
});

// Approve / Reject worker proof
app.post("/admin/verify-proof/:phone", requireAdmin, async (req, res) => {
  try {
    const phone = (req.params.phone || "").trim();
    const decision = (req.body.decision || "").trim().toLowerCase();
    const reason = (req.body.reason || "").trim();

    if (!["approve", "reject"].includes(decision)) {
      return res.status(400).json({ error: "Decision must be approve or reject" });
    }

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: "Worker not found" });

    if (user.role === "customer") {
      return res.status(400).json({ error: "Customers do not require proof verification" });
    }

    if (decision === "approve") {
      user.status = "probation";
      user.proofReview = {
        status: "approved",
        reason: "",
        reviewedAt: new Date(),
        reviewedBy: ADMIN_USERNAME
      };

      await user.save();

      await VerificationLog.create({
        type: "proof",
        workerPhone: user.phone,
        workerRole: user.role,
        decision: "approved",
        reason: "",
        createdAt: new Date()
      });

      return res.json({
        message: "Worker proof approved successfully",
        user
      });
    }

    // reject
    if (!reason) {
      return res.status(400).json({ error: "Reason is required for rejection" });
    }

    user.status = "pending_verification";
    user.proofReview = {
      status: "rejected",
      reason,
      reviewedAt: new Date(),
      reviewedBy: ADMIN_USERNAME
    };

    await user.save();

    await VerificationLog.create({
      type: "proof",
      workerPhone: user.phone,
      workerRole: user.role,
      decision: "rejected",
      reason,
      createdAt: new Date()
    });

    return res.json({
      message: "Worker proof rejected",
      user
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error verifying worker proof" });
  }
});

// Get submitted jobs whose videos are pending verification
app.get("/admin/submitted-jobs", requireAdmin, async (req, res) => {
  try {
    const jobs = await Job.find({
      status: "submitted"
    }).sort({ createdAt: -1 });

    res.json({ jobs });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error fetching submitted jobs" });
  }
});

// Approve / Reject submitted job video
// Approve / Reject submitted job video
app.post("/admin/verify-job/:jobId", requireAdmin, async (req, res) => {
  try {
    const jobId    = req.params.jobId;
    const decision = (req.body.decision || "").trim().toLowerCase();
    const reason   = (req.body.reason   || "").trim();

    if (!["approve", "reject"].includes(decision)) {
      return res.status(400).json({ error: "Decision must be approve or reject" });
    }

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const worker = await User.findOne({ phone: job.assignedTo });

    if (decision === "approve") {
      job.status = "completed";
      job.videoReview = {
        status:     "approved",
        reason:     "",
        reviewedAt: new Date(),
        reviewedBy: ADMIN_USERNAME
      };
      await job.save();

      // ✅ NO createdAt — timestamps:true handles it automatically
      await VerificationLog.create({
        type:        "job_video",
        workerPhone: job.assignedTo || "",
        workerRole:  worker ? worker.role : "",
        decision:    "approved",
        reason:      ""
      });

      // ✅ Check if all 3 probation videos approved → promote to full_access
      if (worker) {
        const allJobs = await Job.find({ assignedTo: job.assignedTo });
        const approvedCount = allJobs.filter(
          j => (j.status || "").toLowerCase() === "completed" && Number(j.videoIndex) > 0
        ).length;

        console.log(`Worker ${job.assignedTo} approved videos: ${approvedCount}/3`);

        if (approvedCount >= 3) {
          worker.status = "full_access";
          await worker.save();
          console.log(`🎉 Worker ${job.assignedTo} promoted to full_access!`);
          return res.json({
            message: "✅ Video approved! All 3 videos done — worker now has full access!",
            job,
            promoted: true
          });
        }
      }

      return res.json({
        message: "Job video approved successfully.",
        job,
        promoted: false
      });
    }

    // ── REJECT ──
    if (!reason) {
      return res.status(400).json({ error: "Reason is required for rejection" });
    }

    job.status = "rejected";
    job.videoReview = {
      status:     "rejected",
      reason,
      reviewedAt: new Date(),
      reviewedBy: ADMIN_USERNAME
    };
    await job.save();

    // ✅ NO createdAt — timestamps:true handles it automatically
    await VerificationLog.create({
      type:        "job_video",
      workerPhone: job.assignedTo || "",
      workerRole:  worker ? worker.role : "",
      decision:    "rejected",
      reason
    });

    return res.json({
      message: "Job video rejected",
      job
    });

  } catch (err) {
    console.log("Verify job error:", err.message);
    res.status(500).json({ error: "Error verifying submitted job video" });
  }
});

// Admin verification history
app.get("/admin/history", requireAdmin, async (req, res) => {
  try {
    const logs = await VerificationLog.find().sort({ createdAt: -1 });
    res.json({ logs });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error fetching verification history" });
  }
});

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
    user.status = "proof_submitted";
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

    const customer = await User.findOne({ phone: customerPhone });

    const review = await Review.create({
      bookingId: booking._id,
      workerPhone: booking.chosenWorkerPhone,
      workerRole: booking.chosenWorkerRole,
      customerPhone,
      customerName: customer?.name || "",
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

// ============================================================
// Nodemailer transporter setup (add near top of server.js)
// ============================================================
const nodemailerTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ============================================================
// In-memory token store (simple — no extra DB collection needed)
// token → { email, expiresAt }
// ============================================================
const resetTokens = new Map();

// ============================================================
// ROUTE 1: POST /forgot-password
// User submits their email → send reset link
// ============================================================
app.post("/forgot-password", async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Always respond with success (security: don't reveal if email exists)
    res.json({ message: "If this email is registered, a reset link has been sent." });

    // Find user silently after responding
    const user = await User.findOne({ email });
    if (!user) return; // don't send email, but user already got success message

    // Generate a secure random token
    const token     = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour from now

    // Store token in memory
    resetTokens.set(token, { email: user.email, expiresAt });

    // Build reset link
    const resetLink = `http://localhost:5000/reset-password.html?token=${token}`;

    // Send email
    await nodemailerTransporter.sendMail({
      from: `"NearServe" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "NearServe — Reset Your Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #f4f4f4; padding: 30px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #4f8ef7; margin: 0;">QuickServe</h2>
          </div>
          <div style="background: white; padding: 28px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
            <h3 style="margin-top: 0; color: #1e2140;">Reset Your Password</h3>
            <p style="color: #555; line-height: 1.6;">Hi <strong>${user.name}</strong>,</p>
            <p style="color: #555; line-height: 1.6;">
              We received a request to reset your QuickServe password.
              Click the button below to set a new password:
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetLink}"
                 style="background: linear-gradient(135deg, #4f8ef7, #38e8c6);
                        color: white; padding: 14px 32px; border-radius: 10px;
                        text-decoration: none; font-weight: bold; font-size: 16px;
                        display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #888; font-size: 13px; line-height: 1.6;">
              ⏰ This link expires in <strong>1 hour</strong>.<br>
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
          <p style="text-align: center; color: #aaa; font-size: 12px; margin-top: 20px;">
            © QuickServe. All rights reserved.
          </p>
        </div>
      `,
    });

  } catch (err) {
    console.log("Forgot password error:", err);
    // Don't expose errors to user
  }
});

// ============================================================
// ROUTE 2: GET /verify-reset-token?token=xxx
// Frontend checks if token is still valid on page load
// ============================================================
app.get("/verify-reset-token", (req, res) => {
  const token = (req.query.token || "").trim();

  if (!token) {
    return res.json({ valid: false });
  }

  const record = resetTokens.get(token);

  if (!record || Date.now() > record.expiresAt) {
    resetTokens.delete(token); // cleanup expired
    return res.json({ valid: false });
  }

  res.json({ valid: true });
});

// ============================================================
// ROUTE 3: POST /reset-password
// User submits new password with the token
// ============================================================
app.post("/reset-password", async (req, res) => {
  try {
    const token       = (req.body.token       || "").trim();
    const newPassword = (req.body.newPassword || "").trim();

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Check token
    const record = resetTokens.get(token);
    if (!record || Date.now() > record.expiresAt) {
      resetTokens.delete(token);
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // Find user by email stored in token
    const user = await User.findOne({ email: record.email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Hash new password and save
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Delete token so it can't be reused
    resetTokens.delete(token);

    res.json({ message: "Password reset successful" });

  } catch (err) {
    console.log("Reset password error:", err);
    res.status(500).json({ error: "Error resetting password" });
  }
});


// ============================================================
// ROUTE 1: POST /create-payment-order
// Frontend calls this to create a Razorpay order before payment
// ============================================================
app.post("/create-payment-order", async (req, res) => {
  try {
    const amount   = 29;   // ₹29 fixed
    const currency = "INR";
 
    const options = {
      amount:   amount * 100,  // Razorpay uses paise (₹29 = 2900 paise)
      currency: currency,
      receipt:  "order_" + Date.now(),
    };
 
    const order = await razorpay.orders.create(options);
 
    res.json({
      id:       order.id,
      amount:   order.amount,
      currency: order.currency,
      key_id:   process.env.RAZORPAY_KEY_ID   // safe to send to frontend
    });
  } catch (err) {
    console.log("Razorpay order error:", err);
    res.status(500).json({ error: "Could not create payment order" });
  }
});
 
// ============================================================
// ROUTE 2: POST /book-with-payment
// Verifies Razorpay signature + saves booking in one step
// Your ₹29 is already in your Razorpay account at this point
// ============================================================
app.post("/book-with-payment", async (req, res) => {
  try {
    const {
      name, phone, service, address, date,
      chosenWorkerPhone, chosenWorkerRole,
      paymentId, orderId, signature
    } = req.body;
 
    // ── Verify Razorpay signature (SECURITY — prevents fake payments) ──
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(orderId + "|" + paymentId)
      .digest("hex");
 
    if (expectedSignature !== signature) {
      return res.status(400).json({ error: "Payment verification failed. Please contact support." });
    }
 
    // ── Signature valid → save booking ──
    const booking = new Booking({
      name:             (name   || "").trim(),
      phone:            (phone  || "").trim(),
      service:          (service|| "").trim().toLowerCase(),
      address:          (address|| "").trim(),
      date:             date,
      chosenWorkerPhone:(chosenWorkerPhone || "").trim(),
      chosenWorkerRole: (chosenWorkerRole  || "").trim().toLowerCase(),
      status:           "pending",
      paymentId:        paymentId,   // store for records
      orderId:          orderId,
      visitTime:        "",
      workerMessage:    "",
      rejectReason:     "",
      completedAt:      null,
      reviewed:         false
    });
 
    await booking.save();
 
    res.status(201).json({
      message: "Booking confirmed and payment verified!",
      booking
    });
  } catch (err) {
    console.log("Book with payment error:", err);
    res.status(500).json({ error: "Error confirming booking" });
  }
});
 
// ============================================================
// ROUTE 3: PUT /update-profile/:phone
// Allows user to update their name and email from Edit Profile
// ============================================================
app.put("/update-profile/:phone", async (req, res) => {
  try {
    const phone = (req.params.phone || "").trim();
    const name  = (req.body.name  || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
 
    if (!name)  return res.status(400).json({ error: "Name is required" });
    if (!email) return res.status(400).json({ error: "Email is required" });
 
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: "User not found" });
 
    // Check email not taken by someone else
    const existing = await User.findOne({ email, phone: { $ne: phone } });
    if (existing) return res.status(400).json({ error: "Email already in use" });
 
    user.name  = name;
    user.email = email;
    await user.save();
 
    res.json({ message: "Profile updated", user: { name: user.name, email: user.email } });
  } catch (err) {
    console.log("Update profile error:", err);
    res.status(500).json({ error: "Error updating profile" });
  }
});


// ============================================================
// ✅ FIXED CANCEL BOOKING ENDPOINT
// PUT /bookings/:id/cancel — cancel a pending booking
// REPLACE THE OLD CANCEL ENDPOINT WITH THIS
// ============================================================

app.put("/bookings/:id/cancel", async (req, res) => {
  try {
    const bookingId = req.params.id;

    if (!bookingId) {
      return res.status(400).json({ error: "Booking ID is required" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const currentStatus = (booking.status || "pending").toLowerCase();
    if (currentStatus !== "pending") {
      return res.status(400).json({ 
        error: `Cannot cancel ${currentStatus} booking. Only pending bookings can be cancelled.`
      });
    }

    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    booking.refundStatus = "non-refundable";
    booking.refundAmount = 0;
    booking.notes = "Booking cancelled by customer. ₹29 fee is non-refundable.";

    await booking.save();

    res.status(200).json({ 
      success: true,
      message: "✅ Booking cancelled successfully. ₹29 is non-refundable.",
      booking
    });

  } catch (err) {
    console.error("Cancel booking error:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// ============================================================
// ✅ COMPLETE CHAT ENDPOINTS
// REPLACE ALL OLD CHAT CODE WITH THIS
// ============================================================

// GET /messages/:bookingId
app.get("/messages/:bookingId", async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    if (!bookingId) {
      return res.status(400).json({ error: "Booking ID is required" });
    }

    let chat = await Chat.findOne({ bookingId });
    if (!chat) {
      return res.json([]);
    }

    res.json(chat.messages || []);

  } catch (err) {
    console.error("Chat fetch error:", err);
    res.status(500).json({ error: "Error fetching messages" });
  }
});

// POST /messages/send
app.post("/messages/send", async (req, res) => {
  try {
    const {
      bookingId,
      senderPhone,
      senderName,
      senderRole,
      text
    } = req.body;

    if (!bookingId || !senderPhone || !text) {
      return res.status(400).json({
        error: "bookingId, senderPhone, and text are required"
      });
    }

    const messageText = String(text).trim();
    if (!messageText) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    let chat = await Chat.findOne({ bookingId });

    if (!chat) {
      chat = await Chat.create({
        bookingId,
        customerPhone: booking.phone,
        workerPhone: booking.chosenWorkerPhone || "",
        messages: []
      });
    }

    const message = {
      _id: new mongoose.Types.ObjectId(),
      senderPhone: String(senderPhone).trim(),
      senderName: String(senderName || "User").trim(),
      senderRole: String(senderRole || "customer").toLowerCase(),
      text: messageText,
      timestamp: new Date(),
      createdAt: new Date()
    };

    chat.messages.push(message);
    await chat.save();

    res.status(201).json({
      ...message,
      _id: message._id.toString()
    });

  } catch (err) {
    console.error("Chat send error:", err);
    res.status(500).json({ error: "Error sending message: " + err.message });
  }
});

// ============================================================
// DASHBOARD & PROFILE ENDPOINTS
// Add these BEFORE app.listen() in server.js
// ============================================================

// GET /dashboard/:phone — Get dashboard stats and bookings
app.get("/dashboard/:phone", async (req, res) => {
  try {
    const phone = (req.params.phone || "").trim();

    // Get user info
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Get all bookings for this customer
    const bookings = await Booking.find({ phone }).sort({ createdAt: -1 });

    // Calculate stats
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === "completed").length;
    const upcomingBookings = bookings.filter(b => b.status === "pending" || b.status === "accepted");
    const totalSpent = totalBookings * 29; // Each booking costs ₹29

    // Get member since date
    const memberSince = user.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();

    // Get recent bookings (last 5)
    const recentBookings = bookings.slice(0, 5).map(b => ({
      _id: b._id,
      service: b.service,
      status: b.status,
      date: b.date,
      worker: b.chosenWorkerRole,
      createdAt: b.createdAt
    }));

    // Get upcoming bookings (pending or accepted, sorted by date)
    const upcomingList = upcomingBookings
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3)
      .map(b => ({
        _id: b._id,
        service: b.service,
        status: b.status,
        date: b.date,
        worker: b.chosenWorkerRole || "Not assigned",
        address: b.address
      }));

    res.json({
      user: {
        name: user.name,
        phone: user.phone,
        email: user.email
      },
      stats: {
        totalBookings,
        completedBookings,
        totalSpent,
        memberSince
      },
      recentBookings,
      upcomingBookings: upcomingList
    });

  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Error fetching dashboard data" });
  }
});

app.put("/profile/:phone/avatar", async (req, res) => {
  try {
    const phone = (req.params.phone || "").trim();
    const avatarBase64 = req.body.avatarBase64 || "";
    const user = await User.findOneAndUpdate(
      { phone },
      { avatarBase64 },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "Avatar saved" });
  } catch (err) {
    res.status(500).json({ error: "Error saving avatar" });
  }
});

// ========== ADDRESS ENDPOINT ==========
app.put("/profile/:phone/address", async (req, res) => {
  try {
    const { phone } = req.params;
    const { address, city, state, pincode, country } = req.body;

    if (!address || !city || !state || !pincode) {
      return res.status(400).json({ error: "All address fields are required" });
    }

    const user = await User.findOneAndUpdate(
      { phone },
      { address, city, state, pincode, country: country || "India" },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Address saved successfully", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== PREFERENCES ENDPOINT ==========
app.put("/profile/:phone/preferences", async (req, res) => {
  try {
    const { phone } = req.params;
    const { availability, communicationPref, preferredTime, preferredService, serviceLocation } = req.body;
 
    const updateData = {};
    if (availability)      updateData.availability      = availability;
    if (communicationPref) updateData.communicationPref = communicationPref;
    if (preferredTime)     updateData.preferredTime     = preferredTime;
    if (preferredService)  updateData.preferredService  = preferredService;
    if (serviceLocation)   updateData.preferredService  = serviceLocation; // customer alias
 
    const user = await User.findOneAndUpdate({ phone }, updateData, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
 
    res.json({ message: "Preferences saved successfully", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /profile/:phone/password — Change password
app.put("/profile/:phone/password", async (req, res) => {
  try {
    const phone = (req.params.phone || "").trim();
    const currentPassword = req.body.currentPassword || "";
    const newPassword = req.body.newPassword || "";
    const confirmPassword = req.body.confirmPassword || "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All password fields are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "New passwords do not match" });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({
      message: "Password changed successfully"
    });

  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({ error: "Error changing password" });
  }
});

// ========== UPDATE PROFILE ENDPOINT (add bio field) ==========
// If you already have a PUT /profile/:phone endpoint, UPDATE IT to include bio:
app.put("/profile/:phone", async (req, res) => {
  try {
    const { phone } = req.params;
    const { name, email, bio, avatarBase64 } = req.body;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    if (email) {
      const existingUser = await User.findOne({ email, phone: { $ne: phone } });
      if (existingUser) return res.status(400).json({ error: "Email already in use" });
    }

    const updateData = {};
    if (name)                    updateData.name         = name;
    if (email)                   updateData.email        = email;
    if (bio !== undefined)       updateData.bio          = bio;
    if (avatarBase64 !== undefined) updateData.avatarBase64 = avatarBase64;

    const user = await User.findOneAndUpdate({ phone }, updateData, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== GET PROFILE ENDPOINT (returns all data including address) ==========
// ── 1. GET /profile/:phone — returns ALL fields including avatar + availability ──
app.get("/profile/:phone", async (req, res) => {
  try {
    const { phone } = req.params;
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: "User not found" });
 
    res.json({
      name:              user.name              || "",
      email:             user.email             || "",
      phone:             user.phone             || "",
      role:              user.role              || "",
      createdAt:         user.createdAt,
      avatarBase64:      user.avatarBase64      || "",   // ✅ profile picture
      bio:               user.bio               || "",
      address:           user.address           || "",
      city:              user.city              || "",
      state:             user.state             || "",
      pincode:           user.pincode           || "",
      country:           user.country           || "India",
      availability:      user.availability      || "available",  // ✅ worker availability
      communicationPref: user.communicationPref || "email",
      preferredTime:     user.preferredTime     || "flexible",
      preferredService:  user.preferredService  || "",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ADD THIS TO server.js BEFORE app.listen()
// PUT /bookings/:id/reschedule — customer reschedules a pending booking
// ============================================================
app.put("/bookings/:id/reschedule", async (req, res) => {
  try {
    const bookingId = req.params.id;
    const newDate   = (req.body.date || "").trim();

    if (!newDate) {
      return res.status(400).json({ error: "New date is required" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const currentStatus = (booking.status || "pending").toLowerCase();
    if (currentStatus !== "pending") {
      return res.status(400).json({
        error: `Cannot reschedule a ${currentStatus} booking. Only pending bookings can be rescheduled.`
      });
    }

    booking.date = newDate;
    await booking.save();

    res.json({
      success: true,
      message: `Booking rescheduled to ${newDate}`,
      booking
    });

  } catch (err) {
    console.error("Reschedule error:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// ============================================================
// AUTO-EXPIRY: Cancel pending bookings older than 24 hours
// Runs every hour automatically
// ============================================================
async function autoExpirePendingBookings() {
  try {
    const cutoff = new Date(Date.now() - PENDING_EXPIRY_HOURS * 60 * 60 * 1000);

    const result = await Booking.updateMany(
      {
        status: "pending",
        createdAt: { $lt: cutoff }
      },
      {
        $set: {
          status:       "cancelled",
          cancelledAt:  new Date(),
          refundStatus: "non-refundable",
          refundAmount: 0,
          notes:        "Auto-cancelled: Worker did not respond within 24 hours."
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`⏰ Auto-expired ${result.modifiedCount} pending booking(s)`);
    }
  } catch (err) {
    console.error("Auto-expiry error:", err);
  }
}

// Run once on server start, then every hour
autoExpirePendingBookings();
setInterval(autoExpirePendingBookings, 60 * 60 * 1000);

// ============================================================
// REPLACE your existing /probation-job/create route in server.js
// ============================================================

app.post("/probation-job/create", async (req, res) => {
  console.log("PROBATION CREATE HIT:", req.body); // ← ADD THIS
  try {
    const { phone, role, videoIndex } = req.body;
    if (!phone || !role || !videoIndex) {
      return res.status(400).json({ error: "phone, role and videoIndex are required" });
    }
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: "User not found" });

    let job = await Job.findOne({ assignedTo: phone, videoIndex: Number(videoIndex) });
    if (job) {
      if (job.status === "rejected") {
        job.status = "pending";
        job.videoProofPath = "";
        job.videoReview = { status: "none", reason: "", reviewedAt: null, reviewedBy: "" };
        await job.save();
      }
      return res.json({ jobId: job._id, message: "Job slot ready" });
    }

    // ✅ FIXED: jobType is required field
    job = await Job.create({
      assignedTo:  phone,
      jobType:     role,
      workerRole:  role,
      videoIndex:  Number(videoIndex),
      description: `Probation video ${videoIndex} — ${role}`,
      status:      "pending",
      videoReview: { status: "none", reason: "", reviewedAt: null, reviewedBy: "" }
    });

    res.json({ jobId: job._id, message: "Job slot created" });
  } catch (err) {
    console.log("Probation job create error:", err.message);
    res.status(500).json({ error: err.message || "Error creating job slot" });
  }
});

// ============================================================
// ADD THIS TO server.js BEFORE app.listen()
// Handles chat for UNASSIGNED pending bookings (no worker yet)
// ============================================================

// GET /chat/:bookingId — UPDATED to handle unassigned bookings
app.get("/chat/:bookingId", async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    if (!bookingId) {
      return res.status(400).json({ error: "Booking ID is required" });
    }

    let chat = await Chat.findOne({ bookingId });
    
    // If chat doesn't exist, check if booking exists
    if (!chat) {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      // Create empty chat for this booking
      chat = await Chat.create({
        bookingId,
        customerPhone: booking.phone,
        workerPhone: booking.chosenWorkerPhone || "support@nearserve.com",
        messages: []
      });
    }

    res.json({ messages: chat.messages || [] });

  } catch (err) {
    console.error("Chat fetch error:", err);
    res.status(500).json({ error: "Error fetching messages" });
  }
});

// POST /chat/send — UPDATED to handle unassigned bookings
app.post("/chat/send", async (req, res) => {
  try {
    const {
      bookingId,
      senderPhone,
      senderName,
      senderRole,
      text
    } = req.body;

    if (!bookingId || !senderPhone || !text) {
      return res.status(400).json({
        error: "bookingId, senderPhone, and text are required"
      });
    }

    const messageText = String(text).trim();
    if (!messageText) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    let chat = await Chat.findOne({ bookingId });

    if (!chat) {
      // Create new chat for unassigned booking
      chat = await Chat.create({
        bookingId,
        customerPhone: booking.phone,
        workerPhone: booking.chosenWorkerPhone || "support@nearserve.com",
        messages: []
      });
    }

    const message = {
      _id: new mongoose.Types.ObjectId(),
      senderPhone: String(senderPhone).trim(),
      senderName: String(senderName || "User").trim(),
      senderRole: String(senderRole || "customer").toLowerCase(),
      text: messageText,
      timestamp: new Date(),
      createdAt: new Date()
    };

    chat.messages.push(message);
    await chat.save();

    res.status(201).json({
      ...message,
      _id: message._id.toString()
    });

  } catch (err) {
    console.error("Chat send error:", err);
    res.status(500).json({ error: "Error sending message: " + err.message });
  }
});

// DELETE OLD DUPLICATE ENDPOINTS IF THEY EXIST IN YOUR server.js

// ── 4. GET /workers/:phone — returns ALL fields customers can see ──
// REPLACE your existing GET /workers/:phone with this:
app.get("/workers/:phone", async (req, res) => {
  try {
    const phone  = req.params.phone.trim();
    const worker = await User.findOne({ phone });
    if (!worker) return res.status(404).json({ error: "Worker not found" });
 
    const reviews = await Review.find({ workerPhone: phone }).sort({ createdAt: -1 });
 
    let avgRating    = 0;
    let reviewsCount = reviews.length;
    if (reviews.length > 0) {
      const total = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
      avgRating   = (total / reviews.length).toFixed(1);
    }
 
    const reviewsList = await Promise.all(
      reviews
        .filter(r => r.comment && String(r.comment).trim() !== "")
        .map(async (r) => {
          let customerName = r.customerName || "";
          if (!customerName && r.customerPhone) {
            const customer = await User.findOne({ phone: r.customerPhone });
            customerName   = customer?.name || "Customer";
          }
          return {
            rating:        r.rating       || 0,
            comment:       r.comment      || "",
            customerName,
            customerPhone: r.customerPhone || "",
            createdAt:     r.createdAt    || null
          };
        })
    );
 
res.json({
  name:              worker.name              || "",
  role:              worker.role              || "",
  phone:             worker.phone             || "",
  email:             worker.email             || "",
  avatarBase64:      worker.avatarBase64      || "",
  bio:               worker.bio               || "",
  address:           worker.address           || "",
  city:              worker.city              || "",
  state:             worker.state             || "",
  pincode:           worker.pincode           || "",
  country:           worker.country           || "India",
  availability:      worker.availability      || "available",
  communicationPref: worker.communicationPref || "email",
  preferredTime:     worker.preferredTime     || "flexible",
  avgRating,
  reviewsCount,
  reviewsList
});
  } catch (err) {
    console.error("Error loading worker profile:", err);
    res.status(500).json({ error: "Server error loading worker profile" });
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