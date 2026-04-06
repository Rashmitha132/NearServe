const User = require("../models/User");
const Job = require("../models/Job");
const Review = require("../models/Review");
const asyncHandler = require("../utils/asyncHandler");

const getUserByPhone = asyncHandler(async (req, res) => {
  const phone = (req.params.phone || "").trim();

  const user = await User.findOne({ phone }).select(
    "role status name email phone proofFile proofReview"
  );

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    role: user.role,
    status: user.status,
    name: user.name,
    email: user.email,
    phone: user.phone,
    proofFile: user.proofFile || "",
    proofReview: user.proofReview || {},
  });
});

const getMyJobs = asyncHandler(async (req, res) => {
  const phone = (req.params.phone || "").trim();
  const jobs = await Job.find({ assignedTo: phone }).sort({ createdAt: -1 });
  res.json(jobs);
});

const uploadProof = asyncHandler(async (req, res) => {
  const phone = (req.params.phone || "").trim();
  const user = await User.findOne({ phone });

  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.role === "customer") {
    return res.status(400).json({ error: "Customers do not upload proof" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  user.proofFile = req.file.path;
  user.status = "proof_submitted";
  user.proofReview = {
    status: "none",
    reason: "",
    reviewedAt: null,
    reviewedBy: "",
  };

  await user.save();

  res.json({
    message: "Proof uploaded. Waiting for admin verification.",
    fileSavedAs: req.file.filename,
  });
});

const updateJob = asyncHandler(async (req, res) => {
  const jobId = req.params.jobId;
  const status = (req.body.status || "").trim().toLowerCase();

  const job = await Job.findById(jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });

  if (status === "submitted") {
    if (!req.file) {
      return res.status(400).json({ error: "Video proof is required" });
    }

    job.status = "submitted";
    job.videoProofPath = req.file.path;
    job.videoReview = {
      status: "none",
      reason: "",
      reviewedAt: null,
      reviewedBy: "",
    };

    await job.save();
    return res.json({ message: "Job submitted for verification", job });
  }

  if (status === "rejected") {
    job.status = "rejected";
    await job.save();
    return res.json({ message: "Job marked rejected", job });
  }

  return res.status(400).json({ error: "Invalid status change" });
});

const getWorkers = asyncHandler(async (req, res) => {
  const role = (req.query.role || "").trim().toLowerCase();
  if (!role) return res.status(400).json({ error: "Role is required" });

  const workers = await User.find({
    role,
    status: "full_access",
  }).select("name phone email role");

  const phones = workers.map((w) => String(w.phone));

  const stats = await Review.aggregate([
    { $match: { workerPhone: { $in: phones } } },
    {
      $group: {
        _id: "$workerPhone",
        avgRating: { $avg: "$rating" },
        reviewsCount: { $sum: 1 },
      },
    },
  ]);

  const map = new Map(stats.map((s) => [String(s._id), s]));

  const result = workers.map((w) => {
    const s = map.get(String(w.phone));
    return {
      name: w.name,
      phone: w.phone,
      email: w.email,
      role: w.role,
      avgRating: s ? Number(s.avgRating.toFixed(2)) : 0,
      reviewsCount: s ? s.reviewsCount : 0,
    };
  });

  res.json(result);
});

const getWorkerProfile = asyncHandler(async (req, res) => {
  const phone = req.params.phone.trim();
  const worker = await User.findOne({ phone });

  if (!worker) {
    return res.status(404).json({ error: "Worker not found" });
  }

  const reviews = await Review.find({ workerPhone: phone }).sort({ createdAt: -1 });

  let avgRating = 0;
  const reviewsCount = reviews.length;

  if (reviews.length > 0) {
    const total = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
    avgRating = (total / reviews.length).toFixed(1);
  }

  const reviewsList = await Promise.all(
    reviews
      .filter((r) => r.comment && String(r.comment).trim() !== "")
      .map(async (r) => {
        let customerName = r.customerName || "";
        if (!customerName && r.customerPhone) {
          const customer = await User.findOne({ phone: r.customerPhone });
          customerName = customer?.name || "Customer";
        }

        return {
          rating: r.rating || 0,
          comment: r.comment || "",
          customerName,
          customerPhone: r.customerPhone || "",
          createdAt: r.createdAt || null,
        };
      })
  );

  res.json({
    name: worker.name || "",
    role: worker.role || "",
    phone: worker.phone || "",
    email: worker.email || "",
    avatarBase64: worker.avatarBase64 || "",
    bio: worker.bio || "",
    address: worker.address || "",
    city: worker.city || "",
    state: worker.state || "",
    pincode: worker.pincode || "",
    country: worker.country || "India",
    availability: worker.availability || "available",
    communicationPref: worker.communicationPref || "email",
    preferredTime: worker.preferredTime || "flexible",
    avgRating,
    reviewsCount,
    reviewsList,
  });
});

const createProbationJob = asyncHandler(async (req, res) => {
  const { phone, role, videoIndex } = req.body;

  if (!phone || !role || !videoIndex) {
    return res.status(400).json({ error: "phone, role and videoIndex are required" });
  }

  const user = await User.findOne({ phone });
  if (!user) return res.status(404).json({ error: "User not found" });

  let job = await Job.findOne({
    assignedTo: phone,
    videoIndex: Number(videoIndex),
  });

  if (job) {
    if (job.status === "rejected") {
      job.status = "pending";
      job.videoProofPath = "";
      job.videoReview = {
        status: "none",
        reason: "",
        reviewedAt: null,
        reviewedBy: "",
      };
      await job.save();
    }

    return res.json({ jobId: job._id, message: "Job slot ready" });
  }

  job = await Job.create({
    assignedTo: phone,
    jobType: role,
    workerRole: role,
    videoIndex: Number(videoIndex),
    description: `Probation video ${videoIndex} — ${role}`,
    status: "pending",
    videoReview: {
      status: "none",
      reason: "",
      reviewedAt: null,
      reviewedBy: "",
    },
  });

  res.json({ jobId: job._id, message: "Job slot created" });
});

module.exports = {
  getUserByPhone,
  getMyJobs,
  uploadProof,
  updateJob,
  getWorkers,
  getWorkerProfile,
  createProbationJob,
};