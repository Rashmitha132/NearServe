const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
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
      enum: ["full_access", "pending_verification", "proof_submitted", "probation"],
      default: "full_access",
    },
    proofFile: String,
    proofReview: {
      type: Object,
      default: {}
    },

    // ADDRESS FIELDS
    address: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    state: {
      type: String,
      default: "",
    },
    pincode: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "India",
    },

    // BIO
    bio: {
      type: String,
      default: "",
    },

    // PREFERENCES
    preferredService: {
      type: String,
      default: "",
    },
    communicationPref: {
      type: String,
      enum: ["email", "sms", "both"],
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

// ✅ REMOVED pre-save hook — server.js already hashes password with bcrypt.hash()
// Keeping pre-save hook caused "next is not a function" error on signup

// ✅ KEPT — useful for password change feature (profile page)
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);