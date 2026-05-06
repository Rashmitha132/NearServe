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
const paymentRoutes = require("./routes/paymentRoutes");

// keep model imports only if needed elsewhere now
require("./models/Booking");
require("./models/User");
require("./models/PasswordResetToken");
require("./models/Job");
require("./models/VerificationLog");
require("./models/Review");
require("./models/chat");

const app = express();
const PORT = process.env.PORT || 5000;
const uploadsDir = path.join(__dirname, "uploads");
const defaultAllowedOrigins = [
  "http://localhost:5000",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "https://nearserve.web.app",
  "https://nearserve.firebaseapp.com",
  "https://nearserve-connect.web.app",
  "https://nearserve-connect.firebaseapp.com",
];
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
  process.env.APP_URL,
]
  .filter(Boolean)
  .join(",")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);
const corsOrigins = new Set([...defaultAllowedOrigins, ...allowedOrigins]);

app.locals.ADMIN_TOKEN = "QS_ADMIN_" + Math.random().toString(36).slice(2);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.has(origin.replace(/\/+$/, ""))) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(path.join(uploadsDir, "videos"))) fs.mkdirSync(path.join(uploadsDir, "videos"), { recursive: true });

app.use("/uploads", express.static(uploadsDir));

app.get("/", (req, res) => {
  res.json({
    message: "NearServe API is running",
    health: "/api/check-server",
  });
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
app.use("/api/payments", requireUser, paymentRoutes);

const hours = Number(process.env.PENDING_EXPIRY_HOURS || 72);

app.use(errorMiddleware);

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
