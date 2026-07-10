/**
 * Real-Time AI Sales Copilot — WebSocket Handler
 * Phase 4: Fixed audio format — each chunk is now a complete valid file
 */

import jwt from "jsonwebtoken";
import "dotenv/config.js";
import { transcribeBuffer } from "./transcription.service.js";
import { generateHint } from "./hint.service.js";
import { generateSessionSummary } from "./summary.service.js";

const sessions = new Map();

const MAX_TRANSCRIPT_HISTORY = 50;
const HINT_COOLDOWN_MS = 8000;

const authenticateSocket = (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error("Authentication error: No token provided"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    socket.user = decoded;
    next();
  } catch (err) {
    console.error("[Copilot] Socket auth failed:", err.message);
    next(new Error("Authentication error: Invalid token"));
  }
};

/**
 * Process a single complete audio file — transcribe + hint.
 * Each chunk from the frontend is now a COMPLETE valid WebM file.
 */
const processAudioChunk = async (socket, session, audioData) => {
  try {
    // Decode base64 string → Buffer (frontend sends base64 to avoid Socket.IO byte stripping)
    const buffer = typeof audioData === "string"
      ? Buffer.from(audioData, "base64")
      : Buffer.isBuffer(audioData)
        ? audioData
        : Buffer.from(audioData);

    // Skip only truly empty buffers
    if (buffer.length < 200) {
      console.log(`[Copilot] ⏭️  Skipping empty audio (${buffer.length} bytes)`);
      return;
    }

    // DEBUG: Save first audio file to verify the fix
    if (session.audioChunksReceived <= 2) {
      const debugPath = `./debug-audio-${session.audioChunksReceived}.webm`;
      const fs = await import("fs");
      fs.writeFileSync(debugPath, buffer);
      console.log(`[DEBUG] Saved ${debugPath} (${buffer.length} bytes)`);
      console.log(`[DEBUG] First 30 bytes (hex): ${buffer.slice(0, 30).toString("hex")}`);
      console.log(`[DEBUG] WebM magic? ${buffer[0] === 0x1a && buffer[1] === 0x45 ? "YES ✅" : "NO ❌"}`);
    }

    console.log(`[Copilot] 🔄 Sending ${buffer.length} bytes to Groq Whisper...`);

    socket.emit("transcript:status", { status: "processing", message: "Processing audio..." });

    const text = await transcribeBuffer(buffer);

    if (text) {
      const entry = { text, timestamp: Date.now(), chunkIndex: session.transcriptCount++ };
      session.transcriptBuffer.push(entry);
      if (session.transcriptBuffer.length > MAX_TRANSCRIPT_HISTORY) session.transcriptBuffer.shift();

      socket.emit("transcript:final", {
        text,
        timestamp: Date.now(),
        chunkIndex: session.transcriptCount,
        isFinal: true,
      });

      console.log(`[Copilot] 📝 "${text.substring(0, 80)}${text.length > 80 ? "..." : ""}" — socket=${socket.id}`);

      // Trigger hint engine (with cooldown)
      const now = Date.now();
      if (now - (session.lastHintTime || 0) >= HINT_COOLDOWN_MS && session.transcriptBuffer.length >= 2) {
        generateHintAsync(socket, session);
      }
    }

    // Back to listening state
    socket.emit("transcript:status", { status: "listening", message: "Listening..." });
  } catch (error) {
    console.error("[Copilot] Process error:", error.message);
    socket.emit("transcript:status", { status: "error", message: "Processing error, continuing..." });
  }
};

const generateHintAsync = async (socket, session) => {
  try {
    const hint = await generateHint(session.transcriptBuffer, session.callContext, session.lastHintAnalyzedIndex);
    if (hint) {
      session.lastHintTime = Date.now();
      session.lastHintAnalyzedIndex = session.transcriptBuffer.length;
      session.hintsGenerated.push(hint);
      socket.emit("copilot:hint", hint);
      console.log(`[Copilot] 💡 [${hint.type}]: "${hint.hint}" — socket=${socket.id}`);
    } else {
      session.lastHintAnalyzedIndex = session.transcriptBuffer.length;
    }
  } catch (error) {
    console.error("[Copilot] Hint error:", error.message);
  }
};

export const registerCopilotSocket = (io) => {
  const copilotNs = io.of("/copilot");
  copilotNs.use(authenticateSocket);

  copilotNs.on("connection", (socket) => {
    const userId = socket.user?.userId || socket.user?.id || "unknown";
    console.log(`[Copilot] ✅ Connected — socket=${socket.id}  user=${userId}`);

    // ── SESSION START ──
    socket.on("session:start", (payload) => {
      const prev = sessions.get(socket.id);
      if (prev?.intervalId) clearInterval(prev.intervalId);

      const sessionData = {
        userId,
        startedAt: new Date(),
        callContext: payload?.callContext || {},
        audioChunksReceived: 0,
        transcriptBuffer: [],
        transcriptCount: 0,
        isActive: true,
        lastHintTime: 0,
        lastHintAnalyzedIndex: 0,
        hintsGenerated: [],
        processingLock: false, // Prevent concurrent transcriptions
      };

      sessions.set(socket.id, sessionData);
      console.log(`[Copilot] 🎙️  Session started — socket=${socket.id}`, JSON.stringify(payload?.callContext || {}));

      socket.emit("session:ready", {
        sessionId: socket.id,
        message: "Copilot session is live.",
      });
    });

    // ── AUDIO CHUNKS (each one is a COMPLETE valid WebM file) ──
    socket.on("audio:chunk", async (audioData) => {
      const session = sessions.get(socket.id);
      if (!session || !session.isActive) {
        socket.emit("error:copilot", { message: "No active session." });
        return;
      }

      session.audioChunksReceived += 1;
      console.log(`[Copilot] 🎤 Audio file #${session.audioChunksReceived} received (${Buffer.isBuffer(audioData) ? audioData.length : 'blob'} bytes) — socket=${socket.id}`);

      // Process each complete audio file directly (no buffering needed)
      // Use a lock to prevent concurrent Groq API calls
      if (!session.processingLock) {
        session.processingLock = true;
        await processAudioChunk(socket, session, audioData);
        session.processingLock = false;
      } else {
        console.log(`[Copilot] ⏳ Skipping — previous transcription still in progress`);
      }
    });

    // ── SESSION STOP ──
    socket.on("session:stop", async () => {
      const session = sessions.get(socket.id);
      if (!session) return;
      session.isActive = false;

      const fullTranscript = session.transcriptBuffer.map((t) => t.text).join(" ");
      const durationSeconds = Math.round((Date.now() - session.startedAt.getTime()) / 1000);

      console.log(`[Copilot] ⏹️  Session stopped — socket=${socket.id}  chunks=${session.audioChunksReceived}  transcripts=${session.transcriptCount}  hints=${session.hintsGenerated.length}`);

      socket.emit("session:ended", {
        message: "Copilot session ended. Generating AI summary...",
        totalChunks: session.audioChunksReceived,
        totalTranscripts: session.transcriptCount,
        totalHints: session.hintsGenerated.length,
        durationSeconds,
        fullTranscript,
        hints: session.hintsGenerated,
      });

      // Generate AI summary
      if (fullTranscript.trim().length > 20) {
        socket.emit("summary:status", { status: "generating", message: "Generating AI summary..." });
        const aiSummary = await generateSessionSummary(fullTranscript, session.hintsGenerated, session.callContext, durationSeconds);
        if (aiSummary) {
          socket.emit("session:summary", { ...aiSummary, durationSeconds, totalTranscripts: session.transcriptCount, totalHints: session.hintsGenerated.length, totalChunks: session.audioChunksReceived });
          console.log(`[Copilot] 📊 AI Summary generated — socket=${socket.id}`);
        } else {
          socket.emit("summary:status", { status: "failed", message: "Could not generate summary." });
        }
      }
    });

    // ── DISCONNECT ──
    socket.on("disconnect", (reason) => {
      console.log(`[Copilot] ❌ Disconnected — socket=${socket.id}  reason=${reason}`);
      sessions.delete(socket.id);
    });
  });

  console.log("[Copilot] 🚀 /copilot namespace registered (Phase 4 — Fixed Audio)");
};
