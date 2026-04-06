const mongoose = require("mongoose");
const Chat = require("../models/chat");
const Booking = require("../models/Booking");
const asyncHandler = require("../utils/asyncHandler");

const getChatByBookingId = asyncHandler(async (req, res) => {
  const bookingId = req.params.bookingId;

  if (!bookingId) {
    return res.status(400).json({ error: "Booking ID is required" });
  }

  let chat = await Chat.findOne({ bookingId });

  if (!chat) {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    chat = await Chat.create({
      bookingId,
      customerPhone: booking.phone,
      workerPhone: booking.chosenWorkerPhone || "support@nearserve.com",
      messages: [],
    });
  }

  res.json({ messages: chat.messages || [] });
});

const sendMessage = asyncHandler(async (req, res) => {
  const {
    bookingId,
    senderPhone,
    senderName,
    senderRole,
    text,
  } = req.body;

  if (!bookingId || !senderPhone || !text) {
    return res.status(400).json({
      error: "bookingId, senderPhone, and text are required",
    });
  }

  const messageText = String(text).trim();
  if (!messageText) {
    return res.status(400).json({ error: "Message cannot be empty" });
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  let chat = await Chat.findOne({ bookingId });

  if (!chat) {
    chat = await Chat.create({
      bookingId,
      customerPhone: booking.phone,
      workerPhone: booking.chosenWorkerPhone || "support@nearserve.com",
      messages: [],
    });
  }

  const message = {
    _id: new mongoose.Types.ObjectId(),
    senderPhone: String(senderPhone).trim(),
    senderName: String(senderName || "User").trim(),
    senderRole: String(senderRole || "customer").toLowerCase(),
    text: messageText,
    timestamp: new Date(),
    createdAt: new Date(),
  };

  chat.messages.push(message);
  await chat.save();

  res.status(201).json({
    ...message,
    _id: message._id.toString(),
  });
});

module.exports = {
  getChatByBookingId,
  sendMessage,
};