const fs = require("fs");
const path = require("path");
const User = require("../models/User");
const Job = require("../models/Job");
const VerificationLog = require("../models/VerificationLog");
const asyncHandler = require("../utils/asyncHandler");

const backendRoot = path.join(__dirname, "..");
const privateProofRoot = path.join(backendRoot, "admin_uploads", "aadhaar");
const legacyUploadsRoot = path.join(backendRoot, "uploads");

function resolveProofPath(storedPath) {
  if (!storedPath) return "";

  const normalized = String(storedPath).replace(/\\/g, "/");
  const candidates = [];

  if (path.isAbsolute(storedPath)) {
    candidates.push(path.resolve(storedPath));
  }

  candidates.push(path.resolve(backendRoot, normalized));
  candidates.push(path.resolve(privateProofRoot, path.basename(normalized)));
  candidates.push(path.resolve(legacyUploadsRoot, path.basename(normalized)));

  return candidates.find((candidate) => {
    const allowed =
      candidate.startsWith(privateProofRoot + path.sep) ||
      candidate.startsWith(legacyUploadsRoot + path.sep);
    return allowed && fs.existsSync(candidate);
  }) || "";
}

const adminLogin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    return res.json({
      success: true,
      token: req.app.locals.ADMIN_TOKEN,
      message: "Admin login successful",
    });
  }

  return res.status(401).json({
    success: false,
    error: "Invalid admin username or password",
  });
});

const getPendingWorkers = asyncHandler(async (req, res) => {
  const workers = await User.find({
    role: { $ne: "customer" },
    proofFile: { $nin: ["", null] },
    $or: [
      { status: "proof_submitted" },
      { "proofReview.status": "approved" },
    ],
  }).sort({ createdAt: -1 });

  res.json({ workers });
});

const viewWorkerProof = asyncHandler(async (req, res) => {
  const phone = (req.params.phone || "").trim();
  const user = await User.findOne({
    phone,
    role: { $ne: "customer" },
    proofFile: { $nin: ["", null] },
  }).select("name phone role proofFile");

  if (!user) {
    return res.status(404).json({ error: "Proof not found" });
  }

  const proofPath = resolveProofPath(user.proofFile);
  if (!proofPath) {
    return res.status(404).json({ error: "Proof file is missing on server" });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="aadhaar_${user.phone}.pdf"`
  );
  return res.sendFile(proofPath);
});

const verifyProof = asyncHandler(async (req, res) => {
  const phone = (req.params.phone || "").trim();
  const decision = (req.body.decision || "").trim().toLowerCase();
  const reason = (req.body.reason || "").trim();

  if (!["approve", "reject"].includes(decision)) {
    return res.status(400).json({
      error: "Decision must be approve or reject",
    });
  }

  const user = await User.findOne({ phone });
  if (!user) {
    return res.status(404).json({ error: "Worker not found" });
  }

  if (user.role === "customer") {
    return res.status(400).json({
      error: "Customers do not require proof verification",
    });
  }

  if (decision === "approve") {
    user.status = "probation";
    user.proofReview = {
      status: "approved",
      reason: "",
      reviewedAt: new Date(),
      reviewedBy: process.env.ADMIN_USERNAME,
    };

    await user.save();

    await VerificationLog.create({
      type: "proof",
      workerPhone: user.phone,
      workerRole: user.role,
      decision: "approved",
      reason: "",
      createdAt: new Date(),
    });

    return res.json({
      message: "Worker proof approved successfully",
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        proofReview: user.proofReview,
      },
    });
  }

  if (!reason) {
    return res.status(400).json({
      error: "Reason is required for rejection",
    });
  }

  user.status = "pending_verification";
  user.proofReview = {
    status: "rejected",
    reason,
    reviewedAt: new Date(),
    reviewedBy: process.env.ADMIN_USERNAME,
  };

  await user.save();

  await VerificationLog.create({
    type: "proof",
    workerPhone: user.phone,
    workerRole: user.role,
    decision: "rejected",
    reason,
    createdAt: new Date(),
  });

  return res.json({
    message: "Worker proof rejected",
    user: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      proofReview: user.proofReview,
    },
  });
});

const getSubmittedJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.find({
    status: "submitted",
  }).sort({ createdAt: -1 });

  res.json({ jobs });
});

const verifyJob = asyncHandler(async (req, res) => {
  const jobId = req.params.jobId;
  const decision = (req.body.decision || "").trim().toLowerCase();
  const reason = (req.body.reason || "").trim();

  if (!["approve", "reject"].includes(decision)) {
    return res.status(400).json({
      error: "Decision must be approve or reject",
    });
  }

  const job = await Job.findById(jobId);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  const worker = await User.findOne({ phone: job.assignedTo });

  if (decision === "approve") {
    job.status = "completed";
    job.videoReview = {
      status: "approved",
      reason: "",
      reviewedAt: new Date(),
      reviewedBy: process.env.ADMIN_USERNAME,
    };
    await job.save();

    await VerificationLog.create({
      type: "job_video",
      workerPhone: job.assignedTo || "",
      workerRole: worker ? worker.role : "",
      decision: "approved",
      reason: "",
    });

    if (worker) {
      const allJobs = await Job.find({ assignedTo: job.assignedTo });
      const approvedCount = allJobs.filter(
        (j) =>
          (j.status || "").toLowerCase() === "completed" &&
          Number(j.videoIndex) > 0
      ).length;

      if (approvedCount >= 3) {
        worker.status = "full_access";
        await worker.save();

        return res.json({
          message:
            "Video approved! All 3 videos done — worker now has full access!",
          job,
          promoted: true,
        });
      }
    }

    return res.json({
      message: "Job video approved successfully.",
      job,
      promoted: false,
    });
  }

  if (!reason) {
    return res.status(400).json({
      error: "Reason is required for rejection",
    });
  }

  job.status = "rejected";
  job.videoReview = {
    status: "rejected",
    reason,
    reviewedAt: new Date(),
    reviewedBy: process.env.ADMIN_USERNAME,
  };
  await job.save();

  await VerificationLog.create({
    type: "job_video",
    workerPhone: job.assignedTo || "",
    workerRole: worker ? worker.role : "",
    decision: "rejected",
    reason,
  });

  return res.json({
    message: "Job video rejected",
    job,
  });
});

const getHistory = asyncHandler(async (req, res) => {
  const logs = await VerificationLog.find().sort({ createdAt: -1 });
  res.json({ logs });
});

module.exports = {
  adminLogin,
  getPendingWorkers,
  viewWorkerProof,
  verifyProof,
  getSubmittedJobs,
  verifyJob,
  getHistory,
};
