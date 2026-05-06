const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    jobType:    { type: String, default: "" },      // electrician/plumber/carpenter
    workerRole: { type: String, default: "" },      // same as jobType — kept for compatibility
    assignedTo: { type: String, required: true },   // worker phone number

    // ✅ ADDED: which video slot this is (1, 2, or 3)
    videoIndex: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["pending", "submitted", "completed", "rejected"],
      default: "pending"
    },

    description:    { type: String, default: "" },
    videoProofPath: { type: String, default: "" },

    videoReview: {
      status:     { type: String, enum: ["none", "approved", "rejected"], default: "none" },
      reason:     { type: String, default: "" },
      reviewedAt: { type: Date,   default: null },
      reviewedBy: { type: String, default: "" }
    },

    customerFeedback: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);