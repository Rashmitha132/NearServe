const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
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
        enum: [
            "pending_verification",   // worker signed up but no proof yet
            "proof_submitted",        // proof uploaded, waiting admin approval
            "probation",              // admin approved proof
            "full_access",            // probation jobs completed
            "blocked"
        ], 
        default: "pending_verification"
    },

    // PDF proof uploaded by worker
    proofFile: {
        type: String,
        default: ""
    },

    // ===============================
    // Admin review result for proof
    // ===============================
    proofReview: {
        status: {
            type: String,
            enum: ["none", "approved", "rejected"],
            default: "none"
        },

        reason: {
            type: String,
            default: ""
        },

        reviewedAt: {
            type: Date,
            default: null
        },

        reviewedBy: {
            type: String,
            default: ""
        }
    }

},
{ timestamps: true }
);

module.exports = mongoose.model("User", userSchema);