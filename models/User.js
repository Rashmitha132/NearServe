const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["customer", "electrician", "plumber", "carpenter"],
      default: "customer",
    },

    status: {
      type: String,
      enum: ["full_access", "pending_verification", "proof_submitted", "probation", "blocked"],
      default: "full_access",
    },

    proofFile: {
      type: String,
      default: "",
    },

    proofReview: {
      type: Object,
      default: {},
    },

    // PROFILE PICTURE
    avatarBase64: {
      type: String,
      default: "",
    },

    // ADDRESS
    address: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      default: "",
      trim: true,
    },

    state: {
      type: String,
      default: "",
      trim: true,
    },

    pincode: {
      type: String,
      default: "",
      trim: true,
    },

    country: {
      type: String,
      default: "India",
      trim: true,
    },

    // BIO
    bio: {
      type: String,
      default: "",
      trim: true,
    },

    // WORKER AVAILABILITY
    availability: {
      type: String,
      enum: ["available", "busy", "off"],
      default: "available",
    },

    // PREFERENCES
    serviceLocation: {
      type: String,
      enum: ["", "home", "office", "shop", "other"],
      default: "",
    },

    communicationPref: {
      type: String,
      enum: ["email", "chat", "phone"],
      default: "email",
    },

    preferredTime: {
      type: String,
      enum: ["morning", "afternoon", "evening", "flexible"],
      default: "flexible",
    },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);