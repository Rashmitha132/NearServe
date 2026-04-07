const crypto = require("crypto");
const Razorpay = require("razorpay");
const Booking = require("../models/Booking");
const asyncHandler = require("../utils/asyncHandler");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = asyncHandler(async (req, res) => {
  const amount = 29;
  const currency = "INR";

  const options = {
    amount: amount * 100,
    currency,
    receipt: "order_" + Date.now(),
  };

  const order = await razorpay.orders.create(options);

  res.json({
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    key_id: process.env.RAZORPAY_KEY_ID,
  });
});

const bookWithPayment = asyncHandler(async (req, res) => {
  const {
    name,
    phone,
    service,
    address,
    date,
    chosenWorkerPhone,
    chosenWorkerRole,
    paymentId,
    orderId,
    signature,
  } = req.body;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(orderId + "|" + paymentId)
    .digest("hex");

  if (expectedSignature !== signature) {
    return res.status(400).json({
      error: "Payment verification failed. Please contact support.",
    });
  }

  const booking = new Booking({
    name: (name || "").trim(),
    phone: (phone || "").trim(),
    service: (service || "").trim().toLowerCase(),
    address: (address || "").trim(),
    date,
    chosenWorkerPhone: (chosenWorkerPhone || "").trim(),
    chosenWorkerRole: (chosenWorkerRole || "").trim().toLowerCase(),
    status: "pending",
    paymentId,
    orderId,
    visitTime: "",
    workerMessage: "",
    rejectReason: "",
    completedAt: null,
    reviewed: false,
  });

  await booking.save();

  res.status(201).json({
    message: "Booking confirmed and payment verified!",
    booking,
  });
});

module.exports = {
  createOrder,
  bookWithPayment,
};