const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const resetTokens = require("../utils/resetTokens");
const nodemailerTransporter = require("../services/emailService");

const signup = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  const existingUser = await User.findOne({
    $or: [{ email }, { phone }],
  });

  if (existingUser) {
    return res.status(400).json({
      error: "User with this email or phone already exists",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const status = role === "customer" ? "full_access" : "pending_verification";

  const user = new User({
    name,
    email,
    phone,
    password: hashedPassword,
    role,
    status,
  });

  await user.save();

  res.status(201).json({
    message: "Signup successful",
  });
});

const login = asyncHandler(async (req, res) => {
  const { emailOrPhone, password, role } = req.body;

  const user = await User.findOne({
    $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
  });

  if (!user) {
    return res.status(400).json({ error: "User not found" });
  }

  if (role && user.role !== role) {
    return res
      .status(403)
      .json({ error: `This account is not registered as ${role}` });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(400).json({ error: "Incorrect password" });
  }

  res.json({
    message: "Login successful",
    user: {
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  // Always send generic response for security
  res.json({
    message: "If this email is registered, a reset link has been sent.",
  });

  const user = await User.findOne({ email });
  if (!user) return;

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

  resetTokens.set(token, {
    email: user.email,
    expiresAt,
  });

  const resetLink = `http://localhost:${process.env.PORT || 5000}/reset-password.html?token=${token}`;

  try {
    await nodemailerTransporter.sendMail({
      from: `"NearServe" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "NearServe — Reset Your Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #f4f4f4; padding: 30px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #4f8ef7; margin: 0;">QuickServe</h2>
          </div>
          <div style="background: white; padding: 28px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
            <h3 style="margin-top: 0; color: #1e2140;">Reset Your Password</h3>
            <p style="color: #555; line-height: 1.6;">Hi <strong>${user.name}</strong>,</p>
            <p style="color: #555; line-height: 1.6;">
              We received a request to reset your QuickServe password.
              Click the button below to set a new password:
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetLink}"
                 style="background: linear-gradient(135deg, #4f8ef7, #38e8c6);
                        color: white; padding: 14px 32px; border-radius: 10px;
                        text-decoration: none; font-weight: bold; font-size: 16px;
                        display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #888; font-size: 13px; line-height: 1.6;">
              This link expires in <strong>1 hour</strong>.<br>
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
          <p style="text-align: center; color: #aaa; font-size: 12px; margin-top: 20px;">
            © QuickServe. All rights reserved.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.log("Forgot password email error:", err.message);
  }
});

const verifyResetToken = asyncHandler(async (req, res) => {
  const token = (req.query.token || "").trim();

  if (!token) {
    return res.json({ valid: false });
  }

  const record = resetTokens.get(token);

  if (!record || Date.now() > record.expiresAt) {
    resetTokens.delete(token);
    return res.json({ valid: false });
  }

  res.json({ valid: true });
});

const resetPassword = asyncHandler(async (req, res) => {
  const token = (req.body.token || "").trim();
  const newPassword = (req.body.newPassword || "").trim();

  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ error: "Token and new password are required" });
  }

  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  }

  const record = resetTokens.get(token);

  if (!record || Date.now() > record.expiresAt) {
    resetTokens.delete(token);
    return res.status(400).json({ error: "Invalid or expired token" });
  }

  const user = await User.findOne({ email: record.email });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();

  resetTokens.delete(token);

  res.json({ message: "Password reset successful" });
});

module.exports = {
  signup,
  login,
  forgotPassword,
  verifyResetToken,
  resetPassword,
};