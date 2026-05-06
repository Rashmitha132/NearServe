const Booking = require("../models/Booking");

async function autoExpirePendingBookings(hours) {
  try {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const result = await Booking.updateMany(
      {
        status: "pending",
        createdAt: { $lt: cutoff },
      },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          refundStatus: "non-refundable",
          refundAmount: 0,
          notes: `Auto-cancelled: Worker did not respond within ${hours} hours.`,
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`Auto-expired ${result.modifiedCount} pending booking(s)`);
    }
  } catch (err) {
    console.error("Auto-expiry error:", err);
  }
}

module.exports = autoExpirePendingBookings;