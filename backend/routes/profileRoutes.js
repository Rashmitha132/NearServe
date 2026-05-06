const express = require("express");
const router = express.Router();

const profileController = require("../controllers/profileController");
const validate = require("../middlewares/validateMiddleware");
const {
  updateProfileSchema,
  updateAddressSchema,
  updatePasswordSchema,
} = require("../validators/profileValidator");

router.get("/test", (req, res) => {
  res.json({ message: "profile route working" });
});

// Get full profile by phone
router.get("/:phone", profileController.getProfile);

// Update personal info + avatar
router.put(
  "/:phone",
  validate(updateProfileSchema),
  profileController.updateProfile
);

// Optional separate avatar update route
router.put("/:phone/avatar", profileController.updateAvatar);

// Update address
router.put(
  "/:phone/address",
  validate(updateAddressSchema),
  profileController.updateAddress
);

// Update preferences
router.put("/:phone/preferences", profileController.updatePreferences);

// Update password
router.put(
  "/:phone/password",
  validate(updatePasswordSchema),
  profileController.updatePassword
);

module.exports = router;