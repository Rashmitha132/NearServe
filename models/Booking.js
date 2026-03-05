const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    // ======================
    // Customer details
    // ======================
    name: { type: String, required: true },
    phone: { type: String, required: true, index: true }, // customer phone
    service: { type: String, required: true }, // carpenter / electrician / plumber
    address: { type: String, required: true },
    date: { type: String, required: true },

    // ======================
    // Which worker customer chose
    // ======================
    chosenWorkerPhone: { type: String, default: "", index: true },
    chosenWorkerRole: { type: String, default: "" },

    // ======================
    // Booking status
    // ======================
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "accepted", "rejected", "completed"] // ✅ added completed
    },

    // ======================
    // Worker response
    // ======================
    visitTime: { type: String, default: "" }, // shown to customer
    workerMessage: { type: String, default: "" },
    rejectReason: { type: String, default: "" },

    // ======================
    // Completion tracking
    // ======================
    completedAt: { type: Date, default: null },

    // ======================
    // Rating tracking
    // ======================
    reviewed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// ======================
// Index for fast worker queries
// ======================
bookingSchema.index({
  chosenWorkerRole: 1,
  chosenWorkerPhone: 1,
  status: 1
});

module.exports = mongoose.model("Booking", bookingSchema);