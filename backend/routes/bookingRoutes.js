const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const validate = require("../middlewares/validateMiddleware");
const {
  createBookingSchema,
  bookingStatusSchema,
  completeBookingSchema,
  rescheduleBookingSchema,
} = require("../validators/bookingValidator");

router.post("/", validate(createBookingSchema), bookingController.createBooking);
router.get("/", bookingController.getAllBookings);
router.get("/my/:phone", bookingController.getMyBookings);
router.get("/chosen/:role/:workerPhone", bookingController.getChosenBookings);
router.put(
  "/:id/status",
  validate(bookingStatusSchema),
  bookingController.updateBookingStatus
);
router.put(
  "/:id/complete",
  validate(completeBookingSchema),
  bookingController.completeBooking
);
router.put("/:id/cancel", bookingController.cancelBooking);
router.put(
  "/:id/reschedule",
  validate(rescheduleBookingSchema),
  bookingController.rescheduleBooking
);
router.get("/dashboard/:phone", bookingController.getDashboard);

module.exports = router;