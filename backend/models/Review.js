const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },

    workerPhone: { type: String, required: true, index: true },
    workerRole: { type: String, required: true },

    customerPhone: { type: String, required: true, index: true },
    customerName: { type: String, default: "" },

    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" }
  },
  { timestamps: true }
);

reviewSchema.index({ bookingId: 1, customerPhone: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);