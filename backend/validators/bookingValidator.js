const Joi = require("joi");

const createBookingSchema = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().required(),
  service: Joi.string().required(),
  address: Joi.string().required(),
  date: Joi.string().required(),
  chosenWorkerPhone: Joi.string().allow("").optional(),
  chosenWorkerRole: Joi.string().allow("").optional(),
});

const bookingStatusSchema = Joi.object({
  status: Joi.string().valid("accepted", "rejected", "pending").required(),
  visitTime: Joi.string().allow("").optional(),
  workerMessage: Joi.string().allow("").optional(),
  rejectReason: Joi.string().allow("").optional(),
});

const completeBookingSchema = Joi.object({
  workerPhone: Joi.string().required(),
  workerRole: Joi.string().required(),
});

const rescheduleBookingSchema = Joi.object({
  date: Joi.string().required(),
});

module.exports = {
  createBookingSchema,
  bookingStatusSchema,
  completeBookingSchema,
  rescheduleBookingSchema,
};