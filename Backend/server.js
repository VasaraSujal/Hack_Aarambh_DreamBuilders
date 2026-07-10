import http from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { registerCopilotSocket } from "./modules/copilot/copilot.socket.js";
import "dotenv/config.js";

const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://dream-builders-charusat.vercel.app",
  process.env.FRONTEND_URL,
]
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ""));

// Create HTTP server from Express app so Socket.IO can attach to it
const httpServer = http.createServer(app);

// Attach Socket.IO to the same HTTP server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/$/, "");
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(new Error(`Socket CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  },
  maxHttpBufferSize: 1e7, // 10 MB — audio chunks can be large
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();

    // Register the real-time copilot WebSocket namespace
    registerCopilotSocket(io);

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`WebSocket (Socket.IO) ready on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");
  await disconnectDB();
  process.exit(0);
});

startServer();
