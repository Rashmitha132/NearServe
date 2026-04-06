const Joi = require("joi");

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
  newPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.string().required(),
});

module.exports = {
  updateProfileSchema,
  updateAddressSchema,
  updatePasswordSchema,
};