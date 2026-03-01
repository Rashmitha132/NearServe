const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    password: String,
    role: { 
        type: String, 
        enum: ["customer", "electrician", "plumber", "carpenter"], 
        default: "customer" 
    },
    status: { 
        type: String, 
        enum: ["pending_verification", "probation", "full_access", "blocked"], 
        default: "pending_verification" 
    }
});

module.exports = mongoose.model("User", userSchema);