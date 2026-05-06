require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const connectDB = require("./config/db");
const errorMiddleware = require("./middlewares/errorMiddleware");
const { requireUser } = require("./middlewares/authMiddleware");
const autoExpirePendingBookings = require("./services/autoExpiryService");

const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const workerRoutes = require("./routes/workerRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const profileRoutes = require("./routes/profileRoutes");
const chatRoutes = require("./routes/chatRoutes");
// const paymentRoutes = require("./routes/paymentRoutes");

// keep model imports only if needed elsewhere now
require("./models/Booking");
require("./models/User");
require("./models/Job");
require("./models/VerificationLog");
require("./models/Review");
require("./models/chat");

const app = express();

app.locals.ADMIN_TOKEN = "QS_ADMIN_" + Math.random().toString(36).slice(2);

app.use(cors());
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("uploads/videos")) fs.mkdirSync("uploads/videos", { recursive: true });

app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});

app.get("/api/check-server", (req, res) => {
  res.json({ message: "server route working" });
});

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/bookings", requireUser, bookingRoutes);
app.use("/api/workers", requireUser, workerRoutes);
app.use("/api/reviews", requireUser, reviewRoutes);
app.use("/api/profile", requireUser, profileRoutes);
app.use("/api/chat", requireUser, chatRoutes);
// app.use("/api/payment", paymentRoutes);

const hours = Number(process.env.PENDING_EXPIRY_HOURS || 24);

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    autoExpirePendingBookings(hours);
    setInterval(() => autoExpirePendingBookings(hours), 60 * 60 * 1000);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup error:", error.message);
    process.exit(1);
  }
}

startServer();
