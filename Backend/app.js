import express from "express";
import cors from "cors";
import "dotenv/config.js";
import authRoutes from "./modules/auth/auth.routes.js";
import audioRoutes from "./modules/audio/audio.routes.js";
import transcriptionRoutes from "./modules/transcription/transcription.routes.js";
import aiRoutes from "./modules/ai-analysis/ai.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import productRoutes from "./modules/products/product.routes.js";
import piRoutes from "./modules/product-intelligence/pi.routes.js";
import eiRoutes from "./modules/employee-intelligence/ei.routes.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://dream-builders-charusat.vercel.app",
  process.env.FRONTEND_URL,
]
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ""));

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser tools (curl/postman/server-to-server)
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/$/, "");
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middleware
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded audio files statically
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/audio", audioRoutes);
app.use("/api/transcription", transcriptionRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/product-intelligence", piRoutes);
app.use("/api/employee-intelligence", eiRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI Conversation Intelligence & Action Platform 🚀",
    timestamp: new Date(),
    backend: "aisi",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.path,
  });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: err.message,
    message: "Internal server error",
  });
});

export default app;
