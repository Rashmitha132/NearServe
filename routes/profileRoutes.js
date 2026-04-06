const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const validate = require("../middlewares/validateMiddleware");
const {
  updateProfileSchema,
  updateAddressSchema,
  updatePasswordSchema,
} = require("../validators/profileValidator");

router.get("/:phone", profileController.getProfile);
router.put("/:phone", validate(updateProfileSchema), profileController.updateProfile);
router.put("/:phone/avatar", profileController.updateAvatar);
router.put("/:phone/address", validate(updateAddressSchema), profileController.updateAddress);
router.put("/:phone/preferences", profileController.updatePreferences);
router.put("/:phone/password", validate(updatePasswordSchema), profileController.updatePassword);

module.exports = router;