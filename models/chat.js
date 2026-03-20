// models/chat.js
const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    customerPhone: {
      type: String,
      required: true
    },

    workerPhone: {
      type: String,
      default: ""
    },

    messages: [
      {
        senderPhone: String,
        senderName: String,
        senderRole: String,
        text: String,
        timestamp: Date,
        createdAt: Date
      }
    ],

    createdAt: {
      type: Date,
      default: Date.now
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);