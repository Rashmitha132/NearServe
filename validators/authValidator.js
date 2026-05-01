const Joi = require("joi");

const phoneSchema = Joi.string()
  .pattern(/^[6-9]\d{9}$/)
  .message("Phone number must be 10 digits and start with 6, 7, 8, or 9");

const signupSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  phone: phoneSchema.required(),
  password: Joi.string().min(6).required(),
  role: Joi.string()
    .valid("customer", "electrician", "plumber", "carpenter")
    .required(),
});

const loginSchema = Joi.object({
  emailOrPhone: Joi.alternatives()
    .try(Joi.string().email(), phoneSchema)
    .required()
    .messages({
      "alternatives.match": "Enter a valid email or a 10-digit phone number starting with 6, 7, 8, or 9",
    }),
  password: Joi.string().required(),
  role: Joi.string()
    .valid("customer", "electrician", "plumber", "carpenter")
    .optional(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

module.exports = {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
