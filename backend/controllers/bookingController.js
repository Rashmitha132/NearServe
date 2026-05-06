const Booking = require("../models/Booking");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const createBooking = asyncHandler(async (req, res) => {
  const phone = (req.body.phone || "").trim();
  if (req.user && req.user.phone && phone !== req.user.phone) {
    return res.status(403).json({ error: "Invalid customer session" });
  }

  const existingBookingCount = await Booking.countDocuments({ phone });

  if (existingBookingCount > 0) {
    return res.status(402).json({
      error: "Payment required. First booking is free, then each booking costs ₹29.",
    });
  }

  const bookingData = {
    name: req.body.name,
    phone,
    service: (req.body.service || "").trim().toLowerCase(),
    address: req.body.address,
    date: req.body.date,
    chosenWorkerPhone: (req.body.chosenWorkerPhone || "").trim(),
    chosenWorkerRole: (req.body.chosenWorkerRole || "").trim().toLowerCase(),
    status: "pending",
    visitTime: "",
    workerMessage: "",
    rejectReason: "",
    completedAt: null,
    reviewed: false,
    paymentMode: "free",
    paymentStatus: "free",
    amountPaid: 0,
  };

  const booking = new Booking(bookingData);
  await booking.save();

  res.status(201).json({ message: "Booking Successful", booking });
});

const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find().sort({ createdAt: -1 });
  res.json(bookings);
});

const getMyBookings = asyncHandler(async (req, res) => {
  const phone = (req.params.phone || "").trim();
  const bookings = await Booking.find({ phone }).sort({ createdAt: -1 });
  res.json(bookings);
});

const getChosenBookings = asyncHandler(async (req, res) => {
  const role = (req.params.role || "").trim().toLowerCase();
  const workerPhone = (req.params.workerPhone || "").trim();

  const bookings = await Booking.find({
    chosenWorkerRole: role,
    chosenWorkerPhone: workerPhone,
  }).sort({ createdAt: -1 });

  res.json(bookings);
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const status = (req.body.status || "").trim().toLowerCase();

  if (!["accepted", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const update = { status };

  if (status === "accepted") {
    update.visitTime = (req.body.visitTime || "").trim();
    update.workerMessage = (req.body.workerMessage || "").trim();
    update.rejectReason = "";

    if (!update.visitTime) {
      return res.status(400).json({ error: "visitTime is required to accept" });
    }
  }

  if (status === "rejected") {
    update.rejectReason = (req.body.rejectReason || "").trim();
    update.visitTime = "";
    update.workerMessage = "";

    if (!update.rejectReason) {
      return res.status(400).json({ error: "rejectReason is required to reject" });
    }
  }

  const booking = await Booking.findByIdAndUpdate(id, update, { new: true });
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  res.json({ message: "Status updated", booking });
});

const completeBooking = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const workerPhone = (req.body.workerPhone || "").trim();
  const workerRole = (req.body.workerRole || "").trim().toLowerCase();

  if (!workerPhone || !workerRole) {
    return res.status(400).json({ error: "workerPhone and workerRole are required" });
  }

  const booking = await Booking.findById(id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  if (
    String(booking.chosenWorkerPhone || "") !== String(workerPhone) ||
    String(booking.chosenWorkerRole || "").toLowerCase() !== String(workerRole)
  ) {
    return res.status(403).json({ error: "Not allowed to complete this booking" });
  }

  if ((booking.status || "").toLowerCase() !== "accepted") {
    return res.status(400).json({ error: "Only accepted bookings can be completed" });
  }

  booking.status = "completed";
  booking.completedAt = new Date();
  await booking.save();

  res.json({ message: "Marked completed", booking });
});

const cancelBooking = asyncHandler(async (req, res) => {
  const bookingId = req.params.id;

  if (!bookingId) {
    return res.status(400).json({ error: "Booking ID is required" });
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  const currentStatus = (booking.status || "pending").toLowerCase();
  if (currentStatus !== "pending") {
    return res.status(400).json({
      error: `Cannot cancel ${currentStatus} booking. Only pending bookings can be cancelled.`,
    });
  }

  booking.status = "cancelled";
  booking.cancelledAt = new Date();
  booking.refundStatus = "non-refundable";
  booking.refundAmount = 0;
  booking.notes = "Booking cancelled by customer. ₹29 fee is non-refundable.";

  await booking.save();

  res.status(200).json({
    success: true,
    message: "Booking cancelled successfully. ₹29 is non-refundable.",
    booking,
  });
});

const rescheduleBooking = asyncHandler(async (req, res) => {
  const bookingId = req.params.id;
  const newDate = (req.body.date || "").trim();

  if (!newDate) {
    return res.status(400).json({ error: "New date is required" });
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  const currentStatus = (booking.status || "pending").toLowerCase();
  if (currentStatus !== "pending") {
    return res.status(400).json({
      error: `Cannot reschedule a ${currentStatus} booking. Only pending bookings can be rescheduled.`,
    });
  }

  booking.date = newDate;
  await booking.save();

  res.json({
    success: true,
    message: `Booking rescheduled to ${newDate}`,
    booking,
  });
});

const getDashboard = asyncHandler(async (req, res) => {
  const phone = (req.params.phone || "").trim();

  const user = await User.findOne({ phone });
  if (!user) return res.status(404).json({ error: "User not found" });

  const bookings = await Booking.find({ phone }).sort({ createdAt: -1 });

  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b) => b.status === "completed").length;
  const upcomingBookings = bookings.filter(
    (b) => b.status === "pending" || b.status === "accepted"
  );
  const totalSpent = bookings.reduce((sum, booking) => sum + Number(booking.amountPaid || 0), 0);

  const memberSince = user.createdAt
    ? new Date(user.createdAt).getFullYear()
    : new Date().getFullYear();

  const recentBookings = bookings.slice(0, 5).map((b) => ({
    _id: b._id,
    service: b.service,
    status: b.status,
    date: b.date,
    worker: b.chosenWorkerRole,
    createdAt: b.createdAt,
  }));

  const upcomingList = upcomingBookings
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3)
    .map((b) => ({
      _id: b._id,
      service: b.service,
      status: b.status,
      date: b.date,
      worker: b.chosenWorkerRole || "Not assigned",
      address: b.address,
    }));

  res.json({
    user: {
      name: user.name,
      phone: user.phone,
      email: user.email,
    },
    stats: {
      totalBookings,
      completedBookings,
      totalSpent,
      memberSince,
    },
    recentBookings,
    upcomingBookings: upcomingList,
  });
});

module.exports = {
  createBooking,
  getAllBookings,
  getMyBookings,
  getChosenBookings,
  updateBookingStatus,
  completeBooking,
  cancelBooking,
  rescheduleBooking,
  getDashboard,
};
