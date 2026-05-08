const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const PasswordResetToken = require("../models/PasswordResetToken");
const asyncHandler = require("../utils/asyncHandler");
const nodemailerTransporter = require("../services/emailService");
const { getJwtSecret } = require("../middlewares/authMiddleware");

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const PENDING_OAUTH_SIGNUP_TTL_MS = 10 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_TTL_SECONDS = 20 * 60;
const OAUTH_EXCHANGE_TTL_SECONDS = 2 * 60;
const PASSWORD_RULE_MESSAGE =
  "Password must be at least 8 characters and include one uppercase letter and one special character";

function cleanUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

function getUrlOrigin(value) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

const getBackendUrl = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const backendUrl = isProduction
    ? process.env.BACKEND_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      "https://nearserve-api.onrender.com"
    : process.env.BACKEND_URL ||
      process.env.API_URL ||
      `http://localhost:${process.env.PORT || 5000}`;
  return cleanUrl(backendUrl);
};

const getFrontendUrl = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const frontendUrl = isProduction
    ? process.env.APP_URL ||
      process.env.FRONTEND_URL ||
      "https://nearserve-connect.web.app"
    : process.env.APP_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:5500";
  return cleanUrl(frontendUrl);
};

const oauthProviders = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid email profile",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
  },
  facebook: {
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    userInfoUrl: "https://graph.facebook.com/me?fields=id,name,email",
    scope: "email,public_profile",
    clientIdEnv: "FACEBOOK_CLIENT_ID",
    clientSecretEnv: "FACEBOOK_CLIENT_SECRET",
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    userInfoUrl: "https://api.linkedin.com/v2/userinfo",
    scope: "openid profile email",
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
  },
};

function getOAuthConfig(provider) {
  const config = oauthProviders[provider];
  if (!config) return null;

  const callbackURL = `${getBackendUrl()}/api/auth/${provider}/callback`;

  return {
    ...config,
    clientId: process.env[config.clientIdEnv],
    clientSecret: process.env[config.clientSecretEnv],
    callbackURL,
    redirectUri: callbackURL,
  };
}

function getUserRedirect(user) {
  if (user.role === "customer") return `${getFrontendUrl()}/booking.html`;

  if (["carpenter", "plumber", "electrician"].includes(user.role)) {
    if (user.status === "pending_verification" || user.status === "proof_submitted") {
      return `${getFrontendUrl()}/upload_proof.html`;
    }

    if (user.status === "probation") {
      return `${getFrontendUrl()}/${user.role}_dashboard.html`;
    }

    if (user.status === "full_access") {
      return `${getFrontendUrl()}/${user.role}_requests.html`;
    }
  }

  return `${getFrontendUrl()}/login.html`;
}

function redirectOAuthError(res, message) {
  const error = encodeURIComponent(message);
  return res.redirect(`${getFrontendUrl()}/login.html?oauth_error=${error}#login`);
}

function redirectGoogleLoginError(res) {
  return res.redirect(`${getFrontendUrl()}/login.html?error=google_login#login`);
}

function signUserToken(user) {
  return jwt.sign(
    {
      type: "user",
      id: String(user._id),
      phone: user.phone,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    getJwtSecret(),
    { expiresIn: SESSION_TTL_SECONDS }
  );
}

function signOAuthExchangeCode(user) {
  return jwt.sign(
    {
      type: "oauth_exchange",
      id: String(user._id),
    },
    getJwtSecret(),
    { expiresIn: OAUTH_EXCHANGE_TTL_SECONDS }
  );
}

function signOAuthState(provider) {
  return jwt.sign(
    {
      type: "oauth_state",
      provider,
      nonce: crypto.randomBytes(12).toString("hex"),
    },
    getJwtSecret(),
    { expiresIn: Math.floor(OAUTH_STATE_TTL_MS / 1000) }
  );
}

function verifyOAuthState(state) {
  try {
    const payload = jwt.verify(String(state || ""), getJwtSecret());
    return payload && payload.type === "oauth_state" ? payload : null;
  } catch {
    return null;
  }
}

function signOAuthSetupToken(record) {
  return jwt.sign(
    {
      type: "oauth_setup",
      provider: record.provider,
      email: record.email,
      name: record.name,
    },
    getJwtSecret(),
    { expiresIn: Math.floor(PENDING_OAUTH_SIGNUP_TTL_MS / 1000) }
  );
}

function verifyOAuthSetupToken(token) {
  try {
    const payload = jwt.verify(String(token || ""), getJwtSecret());
    return payload && payload.type === "oauth_setup" ? payload : null;
  } catch {
    return null;
  }
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  parts.push(`SameSite=${options.sameSite || "Strict"}`);
  parts.push(`Path=${options.path || "/"}`);
  return parts.join("; ");
}

function setAuthCookies(res, user) {
  const maxAge = SESSION_TTL_SECONDS;
  const csrfToken = crypto.randomBytes(32).toString("hex");
  const backendOrigin = getUrlOrigin(getBackendUrl());
  const frontendOrigin = getUrlOrigin(getFrontendUrl());
  const isCrossOriginFrontend = backendOrigin && frontendOrigin && backendOrigin !== frontendOrigin;
  const useSecureCookie =
    process.env.NODE_ENV === "production" ||
    getBackendUrl().startsWith("https://") ||
    getFrontendUrl().startsWith("https://");
  const sameSite = isCrossOriginFrontend ? "None" : "Lax";

  res.setHeader("Set-Cookie", [
    serializeCookie("ns_auth", signUserToken(user), {
      httpOnly: true,
      secure: sameSite === "None" || useSecureCookie,
      sameSite,
      maxAge,
    }),
    serializeCookie("ns_csrf", csrfToken, {
      secure: sameSite === "None" || useSecureCookie,
      sameSite,
      maxAge,
    }),
  ]);

  return csrfToken;
}

function clearAuthCookies(res) {
  const backendOrigin = getUrlOrigin(getBackendUrl());
  const frontendOrigin = getUrlOrigin(getFrontendUrl());
  const isCrossOriginFrontend = backendOrigin && frontendOrigin && backendOrigin !== frontendOrigin;
  const useSecureCookie =
    process.env.NODE_ENV === "production" ||
    getBackendUrl().startsWith("https://") ||
    getFrontendUrl().startsWith("https://");
  const sameSite = isCrossOriginFrontend ? "None" : "Lax";
  res.setHeader("Set-Cookie", [
    serializeCookie("ns_auth", "", {
      httpOnly: true,
      secure: sameSite === "None" || useSecureCookie,
      sameSite,
      maxAge: 0,
    }),
    serializeCookie("ns_csrf", "", {
      secure: sameSite === "None" || useSecureCookie,
      sameSite,
      maxAge: 0,
    }),
  ]);
}

function getUserResponse(user) {
  return {
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

function createTemporaryPassword() {
  return crypto.randomBytes(24).toString("base64url") + "A!";
}

function createEmailVerificationToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  };
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isStrongPassword(password) {
  return /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
}

async function sendVerificationEmail(user, token) {
  const verifyLink = `${getBackendUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(user.name);

  await nodemailerTransporter.sendMail({
    from: `"NearServe" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Verify your NearServe email",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f4f7f2; padding: 30px; border-radius: 12px;">
        <div style="background: white; padding: 28px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
          <h2 style="color: #145c3f; margin-top: 0;">Verify your email</h2>
          <p style="color: #45544c; line-height: 1.6;">Hi <strong>${safeName}</strong>,</p>
          <p style="color: #45544c; line-height: 1.6;">
            Please confirm this email address to activate your NearServe account.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${verifyLink}"
               style="background: #145c3f; color: white; padding: 13px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p style="color: #667085; font-size: 13px; line-height: 1.6;">
            This link expires in 24 hours. If you did not create this account, you can ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}

function sendOAuthSuccess(res, user) {
  setAuthCookies(res, user);
  const redirectUrl = new URL(`${getFrontendUrl()}/login.html`);
  redirectUrl.searchParams.set("oauth_code", signOAuthExchangeCode(user));
  redirectUrl.hash = "login";
  return res.redirect(redirectUrl.toString());
}

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
  const verification = createEmailVerificationToken();

  const user = new User({
    name,
    email,
    phone,
    password: hashedPassword,
    role,
    status,
    emailVerified: false,
    emailVerificationTokenHash: verification.tokenHash,
    emailVerificationExpiresAt: verification.expiresAt,
  });

  await user.save();
  await sendVerificationEmail(user, verification.token);

  res.status(201).json({
    message: "Signup successful. Please verify your email before logging in.",
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

  if (user.emailVerified !== true) {
    const expired =
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt.getTime() <= Date.now();

    if (!user.emailVerificationTokenHash || expired) {
      const verification = createEmailVerificationToken();
      user.emailVerificationTokenHash = verification.tokenHash;
      user.emailVerificationExpiresAt = verification.expiresAt;
      await user.save();
      await sendVerificationEmail(user, verification.token);
    }

    return res.status(403).json({
      code: "EMAIL_NOT_VERIFIED",
      error: expired
        ? "Your verification link expired, so we sent a new one. Please check your inbox."
        : "Please verify your email before logging in. Check your inbox for the NearServe verification link.",
      email: user.email,
    });
  }

  const csrfToken = setAuthCookies(res, user);

  res.json({
    message: "Login successful",
    user: getUserResponse(user),
    csrfToken,
    token: signUserToken(user),
  });
});

const getSession = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("name phone email role status emailVerified");
  if (!user) {
    clearAuthCookies(res);
    return res.status(401).json({ error: "Invalid login session" });
  }

  res.json({ user: getUserResponse(user), csrfToken: req.cookies?.ns_csrf || "" });
});

const exchangeOAuthCode = asyncHandler(async (req, res) => {
  const code = String(req.body.code || "").trim();
  if (!code) {
    return res.status(400).json({ error: "Missing Google login code" });
  }

  let payload;
  try {
    payload = jwt.verify(code, getJwtSecret());
  } catch {
    return res.status(401).json({ error: "Google login expired. Please try again." });
  }

  if (!payload || payload.type !== "oauth_exchange" || !payload.id) {
    return res.status(401).json({ error: "Invalid Google login code" });
  }

  const user = await User.findById(payload.id).select("name phone email role status emailVerified");
  if (!user) {
    return res.status(401).json({ error: "Invalid Google login session" });
  }

  const csrfToken = setAuthCookies(res, user);
  res.json({
    message: "Google login successful",
    redirectTo: getUserRedirect(user),
    user: getUserResponse(user),
    csrfToken,
    token: signUserToken(user),
  });
});

const logout = asyncHandler(async (_req, res) => {
  clearAuthCookies(res);
  res.json({ message: "Logged out" });
});

const resendVerification = asyncHandler(async (req, res) => {
  const emailOrPhone = (req.body.emailOrPhone || req.body.email || "").trim().toLowerCase();

  if (!emailOrPhone) {
    return res.status(400).json({ error: "Enter your email or phone number first" });
  }

  const user = await User.findOne({
    $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
  });

  if (!user) {
    return res.json({
      message: "If this account exists and is unverified, a verification email has been sent.",
    });
  }

  if (user.emailVerified === true) {
    return res.json({ message: "This email is already verified. Please log in." });
  }

  const verification = createEmailVerificationToken();
  user.emailVerificationTokenHash = verification.tokenHash;
  user.emailVerificationExpiresAt = verification.expiresAt;
  await user.save();
  await sendVerificationEmail(user, verification.token);

  res.json({ message: "Verification email sent. Please check your inbox." });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.json({
      message: "If this email is registered, a reset link has been sent.",
    });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await PasswordResetToken.deleteMany({ userId: user._id });
  await PasswordResetToken.create({
    tokenHash,
    userId: user._id,
    email: user.email,
    expiresAt,
  });

  const resetLink = `${getFrontendUrl()}/reset-password.html?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(user.name);

  try {
    await nodemailerTransporter.sendMail({
      from: `"NearServe" <${String(process.env.EMAIL_USER || "").trim()}>`,
      to: user.email,
      subject: "NearServe — Reset Your Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #f4f4f4; padding: 30px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #4f8ef7; margin: 0;">NearServe</h2>
          </div>
          <div style="background: white; padding: 28px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
            <h3 style="margin-top: 0; color: #1e2140;">Reset Your Password</h3>
            <p style="color: #555; line-height: 1.6;">Hi <strong>${safeName}</strong>,</p>
            <p style="color: #555; line-height: 1.6;">
              We received a request to reset your NearServe password.
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
            © NearServe. All rights reserved.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Forgot password email error:", err.message);
    await PasswordResetToken.deleteOne({ tokenHash }).catch(() => {});
    return res.status(500).json({
      error: "Could not send reset email. Please check the server email configuration.",
    });
  }

  return res.json({
    message: "If this email is registered, a reset link has been sent.",
  });
});

const verifyResetToken = asyncHandler(async (req, res) => {
  const token = (req.query.token || "").trim();

  if (!token) {
    return res.json({ valid: false });
  }

  const tokenHash = hashToken(token);
  const record = await PasswordResetToken.findOne({ tokenHash });

  if (!record || record.expiresAt.getTime() <= Date.now()) {
    if (record) await PasswordResetToken.deleteOne({ _id: record._id });
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

  if (!isStrongPassword(newPassword)) {
    return res
      .status(400)
      .json({ error: PASSWORD_RULE_MESSAGE });
  }

  const tokenHash = hashToken(token);
  const record = await PasswordResetToken.findOne({ tokenHash });

  if (!record || record.expiresAt.getTime() <= Date.now()) {
    if (record) await PasswordResetToken.deleteOne({ _id: record._id });
    return res.status(400).json({ error: "Invalid or expired token" });
  }

  const user = await User.findById(record.userId);
  if (!user) {
    await PasswordResetToken.deleteOne({ _id: record._id });
    return res.status(404).json({ error: "User not found" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();

  await PasswordResetToken.deleteOne({ _id: record._id });

  res.json({ message: "Password reset successful" });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const token = (req.query.token || "").trim();

  if (!token) {
    return redirectOAuthError(res, "Verification link is missing");
  }

  const tokenHash = hashToken(token);
  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    return redirectOAuthError(res, "Verification link is invalid or expired");
  }

  user.emailVerified = true;
  user.emailVerificationTokenHash = "";
  user.emailVerificationExpiresAt = null;
  await user.save();

  return res.redirect(`${getFrontendUrl()}/login.html?verified=1#login`);
});

const startOAuth = asyncHandler(async (req, res) => {
  const provider = req.params.provider || req.path.split("/")[1];
  const config = getOAuthConfig(provider);

  if (!config) {
    return redirectGoogleLoginError(res);
  }

  if (!config.clientId || !config.clientSecret) {
    return redirectGoogleLoginError(res);
  }

  const state = signOAuthState(provider);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scope,
    state,
  });

  if (provider === "google") {
    params.set("prompt", "select_account");
  }

  res.redirect(`${config.authUrl}?${params.toString()}`);
});

const handleOAuthCallback = asyncHandler(async (req, res) => {
  const provider = req.params.provider || req.path.split("/")[1];
  const config = getOAuthConfig(provider);
  const { code, state, error } = req.query;

  if (error) {
    return redirectGoogleLoginError(res);
  }

  const stateRecord = verifyOAuthState(state);

  if (!config || !stateRecord || stateRecord.provider !== provider) {
    return redirectGoogleLoginError(res);
  }

  if (!code) {
    return redirectGoogleLoginError(res);
  }

  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody,
  });
  const tokenData = await tokenResponse.json().catch(() => ({}));

  if (!tokenResponse.ok || !tokenData.access_token) {
    return redirectGoogleLoginError(res);
  }

  const profileResponse = await fetch(config.userInfoUrl, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const profile = await profileResponse.json().catch(() => ({}));

  if (!profileResponse.ok) {
    return redirectGoogleLoginError(res);
  }

  const email = (profile.email || "").trim().toLowerCase();

  if (!email) {
    return redirectGoogleLoginError(res);
  }

  const user = await User.findOne({ email });

  if (!user) {
    const setupToken = signOAuthSetupToken({
      provider,
      email,
      name: profile.name || profile.given_name || email.split("@")[0],
    });

    return res.redirect(`${getFrontendUrl()}/login.html?oauth_setup=${setupToken}#login`);
  }

  if (user.emailVerified !== true) {
    user.emailVerified = true;
    user.emailVerificationTokenHash = "";
    user.emailVerificationExpiresAt = null;
    await user.save();
  }

  return sendOAuthSuccess(res, user);
});

const completeOAuthSignup = asyncHandler(async (req, res) => {
  const setupToken = (req.body.setupToken || "").trim();
  const phone = (req.body.phone || "").trim();
  const role = (req.body.role || "").trim().toLowerCase();
  const pending = verifyOAuthSetupToken(setupToken);

  if (!pending) {
    return res.status(400).json({
      error: "Google signup session expired. Please continue with Google again.",
    });
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    return res.status(400).json({
      error: "Please enter a valid phone number",
    });
  }

  if (!["customer", "electrician", "plumber", "carpenter"].includes(role)) {
    return res.status(400).json({ error: "Please select a valid role" });
  }

  const existingUser = await User.findOne({
    $or: [{ email: pending.email }, { phone }],
  });

  if (existingUser) {
    return res.status(400).json({
      error:
        existingUser.email === pending.email
          ? "A NearServe account already exists for this Google email. Please log in again."
          : "This phone number is already registered",
    });
  }

  const status = role === "customer" ? "full_access" : "pending_verification";
  const password = await bcrypt.hash(createTemporaryPassword(), 10);
  const user = await User.create({
    name: pending.name,
    email: pending.email,
    phone,
    password,
    role,
    status,
    emailVerified: true,
    emailVerificationTokenHash: "",
    emailVerificationExpiresAt: null,
  });

  const csrfToken = setAuthCookies(res, user);

  res.status(201).json({
    message: "Google signup completed",
    redirectTo: getUserRedirect(user),
    user: getUserResponse(user),
    csrfToken,
    token: signUserToken(user),
  });
});

module.exports = {
  signup,
  login,
  getSession,
  logout,
  resendVerification,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  verifyEmail,
  startOAuth,
  handleOAuthCallback,
  completeOAuthSignup,
  exchangeOAuthCode,
};
