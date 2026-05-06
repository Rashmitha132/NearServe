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
    // Booking status (✅ FIXED: Added "cancelled")
    // ======================
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "accepted", "rejected", "completed", "cancelled"] // ✅ ADDED "cancelled"
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
    // Cancellation tracking (✅ ADDED)
    // ======================
    cancelledAt: { type: Date, default: null },
    refundStatus: { type: String, default: "" }, // "non-refundable"
    refundAmount: { type: Number, default: 0 },
    notes: { type: String, default: "" },

    // ======================
    // Payment tracking
    // ======================
    paymentMode: {
      type: String,
      enum: ["free", "razorpay", ""],
      default: "",
    },
    paymentStatus: {
      type: String,
      enum: ["free", "paid", "pending", "failed", ""],
      default: "",
    },
    amountPaid: { type: Number, default: 0 },
    paymentId: { type: String, default: "" },
    orderId: { type: String, default: "" },

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
