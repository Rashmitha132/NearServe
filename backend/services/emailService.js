const nodemailer = require("nodemailer");

const emailUser = String(process.env.EMAIL_USER || "").trim();
const emailPass = String(process.env.EMAIL_PASS || "").trim();

const nodemailerTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT || 587),
  secure: String(process.env.EMAIL_SECURE || "false").toLowerCase() === "true",
  connectionTimeout: 10 * 1000,
  greetingTimeout: 10 * 1000,
  socketTimeout: 15 * 1000,
  requireTLS: true,
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

module.exports = nodemailerTransporter;
