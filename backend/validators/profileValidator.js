const Joi = require("joi");

const passwordMessage =
  "Password must be at least 8 characters and include one uppercase letter and one special character";

const strongPasswordSchema = Joi.string()
  .min(8)
  .pattern(/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/)
  .required()
  .messages({
    "string.min": passwordMessage,
    "string.pattern.base": passwordMessage,
  });

const updateProfileSchema = Joi.object({
  name: Joi.string().optional(),
  email: Joi.string().email().optional(),
  bio: Joi.string().allow("").optional(),
  avatarBase64: Joi.string().allow("").optional(),
});

const updateAddressSchema = Joi.object({
  address: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  pincode: Joi.string().required(),
  country: Joi.string().allow("").optional(),
});

const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: strongPasswordSchema,
  confirmPassword: Joi.string().required(),
});

module.exports = {
  updateProfileSchema,
  updateAddressSchema,
  updatePasswordSchema,
};
