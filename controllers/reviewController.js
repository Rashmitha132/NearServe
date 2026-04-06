const Review = require("../models/Review");
const Booking = require("../models/Booking");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const createReview = asyncHandler(async (req, res) => {
  const bookingId = req.body.bookingId;
  const customerPhone = (req.body.customerPhone || "").trim();
  const rating = Number(req.body.rating);
  const comment = (req.body.comment || "").trim();

  if (!bookingId || !customerPhone || !rating) {
    return res.status(400).json({
      error: "bookingId, customerPhone, rating are required",
    });
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
    comment,
  });

  booking.reviewed = true;
  await booking.save();

  res.status(201).json({ message: "Review saved", review });
});

module.exports = { createReview };