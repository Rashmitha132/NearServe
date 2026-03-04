const mongoose = require("mongoose");

const verificationLogSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["proof", "job_video"], required: true },

    workerPhone: { type: String, required: true },
    workerRole: { type: String, default: "" },

    // proof -> targetId = userId (optional)
    // job_video -> targetId = jobId
    targetId: { type: String, default: "" },

    decision: { type: String, enum: ["approved", "rejected"], required: true },
    reason: { type: String, default: "" },

    adminUser: { type: String, default: "admin" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("VerificationLog", verificationLogSchema);