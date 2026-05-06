const crypto = require("crypto");
const Razorpay = require("razorpay");
const Booking = require("../models/Booking");
const asyncHandler = require("../utils/asyncHandler");

const BOOKING_FEE = 29;

function getRazorpayClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

function getBookingPayload(body, paymentFields = {}) {
  return {
    name: (body.name || "").trim(),
    phone: (body.phone || "").trim(),
    service: (body.service || "").trim().toLowerCase(),
    address: (body.address || "").trim(),
    date: body.date,
    chosenWorkerPhone: (body.chosenWorkerPhone || "").trim(),
    chosenWorkerRole: (body.chosenWorkerRole || "").trim().toLowerCase(),
    status: "pending",
    visitTime: "",
    workerMessage: "",
    rejectReason: "",
    completedAt: null,
    reviewed: false,
    ...paymentFields,
  };
}

async function hasUsedFreeBooking(phone) {
  const count = await Booking.countDocuments({ phone: (phone || "").trim() });
  return count > 0;
}

const createOrder = asyncHandler(async (req, res) => {
  const phone = (req.body.phone || "").trim();
  if (req.user && req.user.phone && phone !== req.user.phone) {
    return res.status(403).json({ error: "Invalid customer session" });
  }

  const alreadyBooked = await hasUsedFreeBooking(phone);

  if (!alreadyBooked) {
    const booking = await Booking.create(
      getBookingPayload(req.body, {
        paymentMode: "free",
        paymentStatus: "free",
        amountPaid: 0,
      })
    );

    return res.status(201).json({
      free: true,
      amount: 0,
      message: "First booking is free. Booking confirmed!",
      booking,
    });
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ error: "Payment gateway is not configured" });
  }

  const razorpay = getRazorpayClient();
  const amount = BOOKING_FEE;
  const currency = "INR";

  const options = {
    amount: amount * 100,
    currency,
    receipt: "order_" + Date.now(),
  };

  const order = await razorpay.orders.create(options);

  res.json({
    free: false,
    id: order.id,
    amount: order.amount,
    displayAmount: amount,
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

  if (req.user && req.user.phone && (phone || "").trim() !== req.user.phone) {
    return res.status(403).json({ error: "Invalid customer session" });
  }

  const alreadyBooked = await hasUsedFreeBooking(phone);
  if (!alreadyBooked) {
    return res.status(400).json({
      error: "This is your first booking. Please submit again to use the free booking option.",
    });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(orderId + "|" + paymentId)
    .digest("hex");

  if (expectedSignature !== signature) {
    return res.status(400).json({
      error: "Payment verification failed. Please contact support.",
    });
  }

  const booking = await Booking.create(
    getBookingPayload(
      {
        name,
        phone,
        service,
        address,
        date,
        chosenWorkerPhone,
        chosenWorkerRole,
      },
      {
        paymentMode: "razorpay",
        paymentStatus: "paid",
        amountPaid: BOOKING_FEE,
        paymentId,
        orderId,
      }
    )
  );

  res.status(201).json({
    message: "Payment verified. Booking confirmed!",
    booking,
  });
});

module.exports = {
  createOrder,
  bookWithPayment,
};
