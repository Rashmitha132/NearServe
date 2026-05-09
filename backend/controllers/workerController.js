const User = require("../models/User");
const Job = require("../models/Job");
const Review = require("../models/Review");
const asyncHandler = require("../utils/asyncHandler");
const { uploadMediaToCloudinary } = require("../services/cloudinaryService");

const normalizeProofReview = (proofReview = {}) => {
  return {
    status: proofReview?.status || "none",
    reason: proofReview?.reason || "",
    reviewedAt: proofReview?.reviewedAt || null,
    reviewedBy: proofReview?.reviewedBy || "",
  };
};

const getVideoUrl = (job) => job.videoProof?.mediaUrl || job.videoProofPath || "";

const getUserByPhone = asyncHandler(async (req, res) => {
  const phone = (req.params.phone || "").trim();

  const user = await User.findOne({ phone }).select(
    "role status name email phone proofFile proofReview avatarBase64 bio address city state pincode country availability communicationPref preferredTime createdAt"
  );

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    role: user.role || "",
    status: user.status || "",
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    proofFile: user.proofFile || "",
    proofReview: normalizeProofReview(user.proofReview),
    avatarBase64: user.avatarBase64 || "",
    bio: user.bio || "",
    address: user.address || "",
    city: user.city || "",
    state: user.state || "",
    pincode: user.pincode || "",
    country: user.country || "India",
    availability: user.availability || "available",
    communicationPref: user.communicationPref || "email",
    preferredTime: user.preferredTime || "flexible",
    createdAt: user.createdAt || null,
  });
});

const getProofReview = asyncHandler(async (req, res) => {
  const phone = (req.params.phone || "").trim();

  const user = await User.findOne({ phone }).select(
    "role status name email phone proofFile proofReview"
  );

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    role: user.role || "",
    status: user.status || "",
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    proofFile: user.proofFile || "",
    proofReview: normalizeProofReview(user.proofReview),
  });
});

const getMyJobs = asyncHandler(async (req, res) => {
  const phone = (req.params.phone || "").trim();

  const jobs = await Job.find({ assignedTo: phone }).sort({ videoIndex: 1, createdAt: 1 });

  res.json({
    jobs: jobs.map((job) => ({
      _id: job._id,
      assignedTo: job.assignedTo || "",
      jobType: job.jobType || "",
      workerRole: job.workerRole || "",
      videoIndex: job.videoIndex || null,
      title: job.title || "",
      jobTitle: job.jobTitle || "",
      name: job.name || "",
      description: job.description || "",
      status: job.status || "pending",
      videoProofPath: getVideoUrl(job),
      videoProof: job.videoProof || {},
      videoReview: {
        status: job.videoReview?.status || "none",
        reason: job.videoReview?.reason || "",
        reviewedAt: job.videoReview?.reviewedAt || null,
        reviewedBy: job.videoReview?.reviewedBy || "",
      },
      createdAt: job.createdAt || null,
      updatedAt: job.updatedAt || null,
    })),
  });
});

const uploadProof = asyncHandler(async (req, res) => {
  const phone = (req.params.phone || "").trim();
  const user = await User.findOne({ phone });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

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
    status: user.status,
    proofReview: normalizeProofReview(user.proofReview),
  });
});

const updateJob = asyncHandler(async (req, res) => {
  const jobId = req.params.jobId;
  const status = (req.body.status || "").trim().toLowerCase();

  const job = await Job.findById(jobId);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  if (status === "submitted") {
    if (!req.file) {
      return res.status(400).json({ error: "Video proof is required" });
    }

    const media = await uploadMediaToCloudinary(req.file, {
      resourceType: "video",
      folder: `nearserve/job-videos/${job.workerRole || job.jobType || "workers"}`,
      publicId: `job_${job._id}_${Date.now()}`,
      uploadedBy: job.assignedTo || "",
    });

    job.status = "submitted";
    job.videoProofPath = "";
    job.videoProof = media;
    job.videoReview = {
      status: "none",
      reason: "",
      reviewedAt: null,
      reviewedBy: "",
    };

    await job.save();

    return res.json({
      message: "Job submitted for verification",
      job: {
        _id: job._id,
        assignedTo: job.assignedTo || "",
        workerRole: job.workerRole || "",
        videoIndex: job.videoIndex || null,
        status: job.status || "",
        videoProofPath: getVideoUrl(job),
        videoProof: job.videoProof || {},
        videoReview: {
          status: job.videoReview?.status || "none",
          reason: job.videoReview?.reason || "",
          reviewedAt: job.videoReview?.reviewedAt || null,
          reviewedBy: job.videoReview?.reviewedBy || "",
        },
      },
    });
  }

  if (status === "rejected") {
    job.status = "rejected";
    job.videoReview = {
      status: "rejected",
      reason: req.body.reason || "",
      reviewedAt: new Date(),
      reviewedBy: req.body.reviewedBy || "",
    };

    await job.save();

    return res.json({
      message: "Job marked rejected",
      job: {
        _id: job._id,
        status: job.status,
        videoReview: job.videoReview,
      },
    });
  }

  return res.status(400).json({ error: "Invalid status change" });
});

const getWorkers = asyncHandler(async (req, res) => {
  const role = (req.query.role || "").trim().toLowerCase();

  if (!role) {
    return res.status(400).json({ error: "Role is required" });
  }

  const workers = await User.find({
    role,
    status: "full_access",
  }).select(
    "name phone email role avatarBase64 bio address city state pincode country availability communicationPref preferredTime"
  );

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
      name: w.name || "",
      phone: w.phone || "",
      email: w.email || "",
      role: w.role || "",
      avatarBase64: w.avatarBase64 || "",
      bio: w.bio || "",
      address: w.address || "",
      city: w.city || "",
      state: w.state || "",
      pincode: w.pincode || "",
      country: w.country || "India",
      availability: w.availability || "available",
      communicationPref: w.communicationPref || "email",
      preferredTime: w.preferredTime || "flexible",
      avgRating: s ? Number(s.avgRating.toFixed(1)) : 0,
      reviewsCount: s ? s.reviewsCount : 0,
    };
  });

  res.json(result);
});

const getWorkerProfile = asyncHandler(async (req, res) => {
  const phone = (req.params.phone || "").trim();

  const worker = await User.findOne({
    phone,
    role: { $in: ["electrician", "plumber", "carpenter"] },
  }).select("-password");

  if (!worker) {
    return res.status(404).json({ error: "Worker not found" });
  }

  const reviews = await Review.find({ workerPhone: phone }).sort({ createdAt: -1 });

  const reviewsCount = reviews.length;
  let avgRating = 0;

  if (reviewsCount > 0) {
    const total = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
    avgRating = Number((total / reviewsCount).toFixed(1));
  }

  const reviewsList = await Promise.all(
    reviews.map(async (r) => {
      let customerName = r.customerName || "";

      if (!customerName && r.customerPhone) {
        const customer = await User.findOne({ phone: r.customerPhone }).select("name");
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
    _id: worker._id,
    name: worker.name || "",
    role: worker.role || "",
    phone: worker.phone || "",
    email: worker.email || "",
    status: worker.status || "",
    proofFile: worker.proofFile || "",
    proofReview: normalizeProofReview(worker.proofReview),

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
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  let job = await Job.findOne({
    assignedTo: phone,
    videoIndex: Number(videoIndex),
  });

  if (job) {
    if (job.status === "rejected") {
      job.status = "pending";
      job.videoProofPath = "";
      job.videoProof = {
        mediaUrl: "",
        public_id: "",
        filename: "",
        uploadedBy: "",
        createdAt: null,
      };
      job.videoReview = {
        status: "none",
        reason: "",
        reviewedAt: null,
        reviewedBy: "",
      };
      await job.save();
    }

    return res.json({
      jobId: job._id,
      message: "Job slot ready",
      job: {
        _id: job._id,
        assignedTo: job.assignedTo || "",
        workerRole: job.workerRole || "",
        videoIndex: job.videoIndex || null,
        status: job.status || "pending",
      },
    });
  }

  job = await Job.create({
    assignedTo: phone,
    jobType: role,
    workerRole: role,
    videoIndex: Number(videoIndex),
    title: `Video ${videoIndex}`,
    description: `Probation video ${videoIndex} — ${role}`,
    status: "pending",
    videoReview: {
      status: "none",
      reason: "",
      reviewedAt: null,
      reviewedBy: "",
    },
  });

  res.json({
    jobId: job._id,
    message: "Job slot created",
    job: {
      _id: job._id,
      assignedTo: job.assignedTo || "",
      workerRole: job.workerRole || "",
      videoIndex: job.videoIndex || null,
      status: job.status || "pending",
    },
  });
});

module.exports = {
  getUserByPhone,
  getProofReview,
  getMyJobs,
  uploadProof,
  updateJob,
  getWorkers,
  getWorkerProfile,
  createProbationJob,
};
