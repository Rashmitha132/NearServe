const nodemailer = require("nodemailer");

const emailUser = String(process.env.EMAIL_USER || "").trim();
const emailPass = String(process.env.EMAIL_PASS || "").trim();

const nodemailerTransporter = nodemailer.createTransport({
  service: "gmail",
  connectionTimeout: 10 * 1000,
  greetingTimeout: 10 * 1000,
  socketTimeout: 15 * 1000,
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

module.exports = nodemailerTransporter;
