const Joi = require("joi");

const createReviewSchema = Joi.object({
  bookingId: Joi.string().required(),
  customerPhone: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().allow("").optional(),
});

module.exports = { createReviewSchema };