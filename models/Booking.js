const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    name: String,
    phone: String,
    service: String,
    address: String,
    date: String
});

module.exports = mongoose.model("Booking", bookingSchema);