// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt"); // password hashing
const path = require("path");
const multer = require("multer"); // for proof uploads

const app = express();

// ========================
// Middleware
// ========================
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public")); // serve static files
app.use("/uploads", express.static("uploads")); // serve uploaded proof files

// ========================
// MongoDB connection
// ========================
mongoose.connect(
    "mongodb+srv://quickadmin:Quick1234@cluster0.coz93wy.mongodb.net/quickserve?retryWrites=true&w=majority"
)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// ========================
// Import Models
// ========================
const Booking = require("./models/Booking");
const User = require("./models/User");   // role & status
const Job = require("./models/Job");     // probation/test jobs

// ========================
// Multer Setup for Proof Upload
// ========================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        const ext = file.originalname.split(".").pop();
        cb(null, req.params.phone + "_" + Date.now() + "." + ext);
    }
});
const upload = multer({ storage });

// ========================
// Redirect root to login page
// ========================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/login.html"));
});

// ========================
// Booking Routes
// ========================
app.post("/book", async (req, res) => {
    try {
        const bookingData = {
            name: req.body.name,
            phone: req.body.phone.trim(),
            service: req.body.service,
            address: req.body.address,
            date: req.body.date
        };
        const booking = new Booking(bookingData);
        await booking.save();
        res.status(201).json({ message: "Booking Successful" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/bookings", async (req, res) => {
    try {
        const bookings = await Booking.find();
        res.json(bookings);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Error fetching bookings" });
    }
});

app.get("/mybookings/:phone", async (req, res) => {
    const phone = req.params.phone.trim();
    try {
        const bookings = await Booking.find({ phone });
        res.json(bookings);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Error fetching bookings" });
    }
});

// ========================
// User Authentication Routes
// ========================
app.post("/signup", async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        if (!role || !["customer","electrician","plumber","carpenter"].includes(role)) {
            return res.status(400).json({ error: "Invalid role selected" });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) return res.status(400).json({ error: "Email or phone already registered" });

        const hashedPassword = await bcrypt.hash(password, 10);

        // customers → full_access, workers → pending_verification initially
        let status = role === "customer" ? "full_access" : "pending_verification";

        const user = new User({ name, email, phone, password: hashedPassword, role, status });
        await user.save();

        res.status(201).json({ message: "Signup successful" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Error creating user" });
    }
});

app.post("/login", async (req, res) => {
    try {
        const { emailOrPhone, password, role } = req.body;

        if (!role || !["customer","electrician","plumber","carpenter"].includes(role)) {
            return res.status(400).json({ error: "Invalid role selected" });
        }

        const user = await User.findOne({ $or: [{ email: emailOrPhone }, { phone: emailOrPhone }] });
        if (!user) return res.status(400).json({ error: "User not found" });
        if (user.role !== role) return res.status(403).json({ error: `This account is not registered as ${role}` });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: "Incorrect password" });

        // Worker verification workflow
        if (role !== "customer") {
            if (user.status === "pending_verification") {
                return res.json({
                    message: "Please upload your proof documents to start probation.",
                    user: { name: user.name, phone: user.phone, role: user.role, status: user.status }
                });
            }
            if (user.status === "probation") {
                return res.json({
                    message: "Account under probation. Complete assigned jobs to gain full access.",
                    user: { name: user.name, phone: user.phone, role: user.role, status: user.status }
                });
            }
            if (user.status === "blocked") {
                return res.status(403).json({ error: "Account blocked. Contact admin." });
            }
        }

        res.json({
            message: "Login successful",
            user: {
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Login error" });
    }
});

app.get("/user/:phone", async (req, res) => {
    try {
        const user = await User.findOne({ phone: req.params.phone });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ role: user.role, status: user.status, name: user.name });
    } catch (err) {
        res.status(500).json({ error: "Error fetching user" });
    }
});

// ========================
// Proof Upload Route (Workers)
// ========================
app.post("/upload-proof/:phone", upload.single("proof"), async (req, res) => {
    try {
        const phone = req.params.phone;
        const user = await User.findOne({ phone });

        if (!user) return res.status(404).json({ error: "User not found" });
        if (user.role === "customer") return res.status(400).json({ error: "Customers do not upload proof" });
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        user.proofFile = req.file.path;

        // Move worker to probation automatically
        if (user.status === "pending_verification") user.status = "probation";

        await user.save();

        // Automatically create 2 probation jobs
        const probationJobs = [
            { jobType: user.role, assignedTo: phone, status: "pending" },
            { jobType: user.role, assignedTo: phone, status: "pending" }
        ];
        await Job.insertMany(probationJobs);

        res.json({ message: "Proof uploaded successfully! You are now on probation." });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Error uploading proof" });
    }
});

// ========================
// Probation Job Routes
// ========================
app.get("/my-jobs/:phone", async (req, res) => {
    try {
        const jobs = await Job.find({ assignedTo: req.params.phone });
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ error: "Error fetching jobs" });
    }
});

app.post("/update-job/:jobId", async (req, res) => {
    try {
        const { status, customerFeedback } = req.body;
        const job = await Job.findById(req.params.jobId);
        if (!job) return res.status(404).json({ error: "Job not found" });

        job.status = status;
        if (customerFeedback) job.customerFeedback = customerFeedback;
        await job.save();

        // Automatically upgrade worker status if all probation jobs completed successfully
        const allJobs = await Job.find({ assignedTo: job.assignedTo });
        const failed = allJobs.some(j => j.status === "rejected");

        if (!failed && allJobs.every(j => j.status === "completed")) {
            const worker = await User.findOne({ phone: job.assignedTo });
            if (worker.status === "probation") {
                worker.status = "full_access";
                await worker.save();
            }
        }

        res.json({ message: "Job updated successfully", job });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Error updating job" });
    }
});

// ========================
// Start server
// ========================
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});