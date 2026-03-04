const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    jobType: { type: String, required: true },      // electrician/plumber/carpenter
    assignedTo: { type: String, required: true },   // worker phone number

    status: {
      type: String,
      enum: ["pending", "submitted", "completed", "rejected"],
      default: "pending"
    },

    // Show meaningful instructions in worker dashboard
    description: { type: String, default: "" },

    // Store uploaded video file path (uploads/videos/....)
    videoProofPath: { type: String, default: "" },

    // ===============================
    // Admin review result for video ✅ ADDED
    // ===============================
    videoReview: {
      status: {
        type: String,
        enum: ["none", "approved", "rejected"],
        default: "none"
      },
      reason: { type: String, default: "" },
      reviewedAt: { type: Date, default: null },
      reviewedBy: { type: String, default: "" }
    },

    customerFeedback: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);