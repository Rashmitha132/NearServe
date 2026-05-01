const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const validate = require("../middlewares/validateMiddleware");
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validators/authValidator");

router.get("/google", authController.startOAuth);
router.get("/google/callback", authController.handleOAuthCallback);
router.get("/facebook", authController.startOAuth);
router.get("/facebook/callback", authController.handleOAuthCallback);
router.get("/linkedin", authController.startOAuth);
router.get("/linkedin/callback", authController.handleOAuthCallback);
router.post("/signup", validate(signupSchema), authController.signup);
router.post("/login", validate(loginSchema), authController.login);
router.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.get("/verify-reset-token", authController.verifyResetToken);
router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  authController.resetPassword
);

module.exports = router;
