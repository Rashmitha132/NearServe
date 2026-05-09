const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const validate = require("../middlewares/validateMiddleware");
const { requireUser } = require("../middlewares/authMiddleware");
const { createRateLimiter } = require("../middlewares/rateLimitMiddleware");
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validators/authValidator");

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many attempts. Please try again after a few minutes.",
});

router.get("/google", authController.startOAuth);
router.get("/google/callback", authController.handleOAuthCallback);
router.get("/facebook", authController.startOAuth);
router.get("/facebook/callback", authController.handleOAuthCallback);
router.get("/linkedin", authController.startOAuth);
router.get("/linkedin/callback", authController.handleOAuthCallback);
router.get("/verify-email", authController.verifyEmail);
router.get("/email-config", authController.checkEmailConfig);
router.get("/session", requireUser, authController.getSession);
router.post("/logout", authController.logout);
router.post("/oauth/complete", authLimiter, authController.completeOAuthSignup);
router.post("/oauth/exchange", authLimiter, authController.exchangeOAuthCode);
router.post("/signup", authLimiter, validate(signupSchema), authController.signup);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/resend-verification", authLimiter, authController.resendVerification);
router.post("/email-test", authLimiter, authController.sendEmailTest);
router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.get("/verify-reset-token", authController.verifyResetToken);
router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);

module.exports = router;
