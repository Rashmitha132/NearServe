const bcrypt = require("bcrypt");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { uploadDataUriToCloudinary } = require("../services/cloudinaryService");

const PASSWORD_RULE_MESSAGE =
  "Password must be at least 8 characters and include one uppercase letter and one special character";

function isStrongPassword(password) {
  return /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
}

const getProfile = asyncHandler(async (req, res) => {
  const phone = (req.params.phone || "").trim();

  const user = await User.findOne({ phone });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    role: user.role || "",
    status: user.status || "",
    createdAt: user.createdAt || null,

    avatarBase64: user.avatarBase64 || "",
    bio: user.bio || "",

    address: user.address || "",
    city: user.city || "",
    state: user.state || "",
    pincode: user.pincode || "",
    country: user.country || "India",

    availability: user.availability || "available",
    communicationPref: user.communicationPref || "email",
    preferredTime: user.preferredTime || "flexible",
    serviceLocation: user.serviceLocation || "",
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const phone = (req.params.phone || "").trim();
  const { name, email, bio, avatarBase64 } = req.body;

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (email) {
    const existingUser = await User.findOne({
      email: String(email).trim().toLowerCase(),
      phone: { $ne: phone },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }
  }

  const updateData = {};

  if (name !== undefined) updateData.name = String(name).trim();
  if (email !== undefined) updateData.email = String(email).trim().toLowerCase();
  if (bio !== undefined) updateData.bio = String(bio).trim();

  if (avatarBase64 !== undefined) {
    const avatarValue = String(avatarBase64 || "");
    if (avatarValue.startsWith("data:image/")) {
      const media = await uploadDataUriToCloudinary(avatarValue, {
        folder: "nearserve/avatars",
        publicId: `avatar_${phone}_${Date.now()}`,
        uploadedBy: phone,
        filename: "avatar",
      });
      updateData.avatarBase64 = media.mediaUrl;
      updateData.avatarMedia = media;
    } else {
      updateData.avatarBase64 = avatarValue;
      if (!avatarValue) {
        updateData.avatarMedia = {
          mediaUrl: "",
          public_id: "",
          filename: "",
          uploadedBy: "",
          createdAt: null,
        };
      }
    }
  }

  const user = await User.findOneAndUpdate(
    { phone },
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    message: "Profile updated successfully",
    user: {
      name: user.name || "",
      email: user.email || "",
      bio: user.bio || "",
      avatarBase64: user.avatarBase64 || "",
    },
  });
});

const updateAvatar = asyncHandler(async (req, res) => {
  const phone = (req.params.phone || "").trim();
  const avatarBase64 = String(req.body.avatarBase64 || "");
  const updateData = {};

  if (avatarBase64.startsWith("data:image/")) {
    const media = await uploadDataUriToCloudinary(avatarBase64, {
      folder: "nearserve/avatars",
      publicId: `avatar_${phone}_${Date.now()}`,
      uploadedBy: phone,
      filename: "avatar",
    });
    updateData.avatarBase64 = media.mediaUrl;
    updateData.avatarMedia = media;
  } else {
    updateData.avatarBase64 = avatarBase64;
    if (!avatarBase64) {
      updateData.avatarMedia = {
        mediaUrl: "",
        public_id: "",
        filename: "",
        uploadedBy: "",
        createdAt: null,
      };
    }
  }

  const user = await User.findOneAndUpdate(
    { phone },
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    message: "Avatar saved successfully",
    user: {
      avatarBase64: user.avatarBase64 || "",
    },
  });
});

const updateAddress = asyncHandler(async (req, res) => {
  const phone = (req.params.phone || "").trim();
  const { address, city, state, pincode, country } = req.body;

  const user = await User.findOneAndUpdate(
    { phone },
    {
      $set: {
        address: address ? String(address).trim() : "",
        city: city ? String(city).trim() : "",
        state: state ? String(state).trim() : "",
        pincode: pincode ? String(pincode).trim() : "",
        country: country ? String(country).trim() : "India",
      },
    },
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    message: "Address saved successfully",
    user: {
      address: user.address || "",
      city: user.city || "",
      state: user.state || "",
      pincode: user.pincode || "",
      country: user.country || "India",
    },
  });
});

const updatePreferences = asyncHandler(async (req, res) => {
  const phone = (req.params.phone || "").trim();
  const {
    availability,
    communicationPref,
    preferredTime,
    serviceLocation,
  } = req.body;

  const updateData = {};

  if (availability !== undefined) updateData.availability = availability;
  if (communicationPref !== undefined) updateData.communicationPref = communicationPref;
  if (preferredTime !== undefined) updateData.preferredTime = preferredTime;
  if (serviceLocation !== undefined) updateData.serviceLocation = serviceLocation;

  const user = await User.findOneAndUpdate(
    { phone },
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    message: "Preferences saved successfully",
    user: {
      availability: user.availability || "available",
      communicationPref: user.communicationPref || "email",
      preferredTime: user.preferredTime || "flexible",
      serviceLocation: user.serviceLocation || "",
    },
  });
});

const updatePassword = asyncHandler(async (req, res) => {
  const phone = (req.params.phone || "").trim();
  const currentPassword = req.body.currentPassword || "";
  const newPassword = req.body.newPassword || "";
  const confirmPassword = req.body.confirmPassword || "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: "All password fields are required" });
  }

  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({ error: PASSWORD_RULE_MESSAGE });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "New passwords do not match" });
  }

  const user = await User.findOne({ phone });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    return res.status(400).json({ error: "Current password is incorrect" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();

  res.json({ message: "Password changed successfully" });
});

module.exports = {
  getProfile,
  updateProfile,
  updateAvatar,
  updateAddress,
  updatePreferences,
  updatePassword,
};
