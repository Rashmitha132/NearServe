const Joi = require("joi");

const phoneSchema = Joi.string()
  .pattern(/^[6-9]\d{9}$/)
  .message("Please enter a valid phone number");

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

const signupSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  phone: phoneSchema.required(),
  password: strongPasswordSchema,
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
  newPassword: strongPasswordSchema,
});

module.exports = {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
