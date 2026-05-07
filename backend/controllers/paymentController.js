const crypto = require("crypto");
const Razorpay = require("razorpay");
const Booking = require("../models/Booking");
const asyncHandler = require("../utils/asyncHandler");

const BOOKING_FEE = 29;
const BOOKING_FEE_PAISE = BOOKING_FEE * 100;
const CURRENCY = "INR";

function getRazorpayClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

function validateBookingPayload(body) {
  const requiredFields = [
    "name",
    "phone",
    "service",
    "address",
    "date",
    "chosenWorkerPhone",
    "chosenWorkerRole",
  ];

  const missing = requiredFields.filter((field) => !String(body[field] || "").trim());
  if (missing.length > 0) {
    return `Missing required field(s): ${missing.join(", ")}`;
  }

  if (!["carpenter", "plumber", "electrician"].includes(String(body.service || "").trim().toLowerCase())) {
    return "Invalid service selected";
  }

  if (
    String(body.chosenWorkerRole || "").trim().toLowerCase() !==
    String(body.service || "").trim().toLowerCase()
  ) {
    return "Selected worker does not match the selected service";
  }

  return "";
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
  const validationError = validateBookingPayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

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

  const options = {
    amount: BOOKING_FEE_PAISE,
    currency: CURRENCY,
    receipt: `ns_${Date.now()}`,
    notes: {
      phone,
      service: String(req.body.service || "").trim().toLowerCase(),
      chosenWorkerPhone: String(req.body.chosenWorkerPhone || "").trim(),
    },
  };

  const order = await razorpay.orders.create(options);

  res.json({
    free: false,
    id: order.id,
    amount: order.amount,
    displayAmount: BOOKING_FEE,
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

  const validationError = validateBookingPayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ error: "Payment gateway is not configured" });
  }

  if (!paymentId || !orderId || !signature) {
    return res.status(400).json({ error: "Missing payment verification details" });
  }

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

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(String(signature), "hex");
  const validSignature =
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

  if (!validSignature) {
    return res.status(400).json({
      error: "Payment verification failed. Please contact support.",
    });
  }

  const razorpay = getRazorpayClient();
  const [order, payment] = await Promise.all([
    razorpay.orders.fetch(orderId),
    razorpay.payments.fetch(paymentId),
  ]);

  let verifiedPayment = payment;
  if (String(payment.status || "").toLowerCase() === "authorized") {
    verifiedPayment = await razorpay.payments.capture(paymentId, BOOKING_FEE_PAISE, CURRENCY);
  }

  if (
    Number(order.amount) !== BOOKING_FEE_PAISE ||
    String(order.currency || "").toUpperCase() !== CURRENCY ||
    String(verifiedPayment.order_id || "") !== orderId ||
    Number(verifiedPayment.amount) !== BOOKING_FEE_PAISE ||
    String(verifiedPayment.currency || "").toUpperCase() !== CURRENCY ||
    String(verifiedPayment.status || "").toLowerCase() !== "captured"
  ) {
    return res.status(400).json({
      error: "Invalid payment details. Please contact support.",
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
