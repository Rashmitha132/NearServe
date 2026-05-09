const nodemailer = require("nodemailer");
const { Resend } = require("resend");

const emailUser = String(process.env.EMAIL_USER || "").trim();
const emailPass = String(process.env.EMAIL_PASS || "").trim();
const emailProvider = String(process.env.EMAIL_PROVIDER || "smtp").trim().toLowerCase();
const resendApiKey = String(process.env.RESEND_API_KEY || "").trim();
const emailFrom = String(process.env.EMAIL_FROM || `"NearServe" <${emailUser}>`).trim();

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

const resend = resendApiKey ? new Resend(resendApiKey) : null;

async function sendMail(options) {
  if (emailProvider === "resend") {
    if (!resend) {
      throw new Error("RESEND_API_KEY is missing");
    }

    const response = await resend.emails.send({
      from: options.from || emailFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (response.error) {
      throw new Error(response.error.message || "Resend email failed");
    }

    return response.data;
  }

  return nodemailerTransporter.sendMail({
    ...options,
    from: options.from || emailFrom,
  });
}

async function verify() {
  if (emailProvider === "resend") {
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is missing");
    }

    return true;
  }

  return nodemailerTransporter.verify();
}

module.exports = {
  sendMail,
  verify,
};
