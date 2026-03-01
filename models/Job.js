const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
    jobType: String,             // electrician/plumber/carpenter
    assignedTo: String,          // worker phone number
    status: { type: String, enum: ["pending", "completed", "rejected"], default: "pending" },
    customerFeedback: { type: String, default: null }
});

module.exports = mongoose.model("Job", jobSchema);