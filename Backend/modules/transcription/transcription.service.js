import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 10 * 60 * 1000, // explicit 10-minute timeout
});

const execFileAsync = promisify(execFile);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_RETRIES = 3;
const VIDEO_EXTS = new Set([".mp4", ".mov", ".avi", ".mkv"]);

// Try to extract audio track from video using system ffmpeg (graceful fallback if not installed)
async function extractAudio(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  if (!VIDEO_EXTS.has(ext)) return null;

  const outputPath = inputPath.replace(/\.[^.]+$/, "_audio.mp3");
  try {
    await execFileAsync("ffmpeg", [
      "-i", inputPath,
      "-vn",            // drop video track
      "-acodec", "libmp3lame",
      "-ar", "16000",   // 16 kHz – optimal for speech recognition
      "-ac", "1",       // mono
      "-b:a", "64k",    // compact bitrate
      "-y",             // overwrite without prompt
      outputPath,
    ]);
    return outputPath;
  } catch {
    // ffmpeg not installed or conversion failed – fall back to original file
    return null;
  }
}

export const transcribeAudio = async (filePath) => {
  // Convert video to audio when possible (reduces payload, avoids container issues)
  const tempAudio = await extractAudio(filePath);
  const fileToSend = tempAudio ?? filePath;

  if (tempAudio) {
    console.log(`[transcription] Extracted audio → ${path.basename(tempAudio)}`);
  }

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Read entire file into memory before sending to avoid mid-stream ECONNRESET
      const fileBuffer = fs.readFileSync(fileToSend);
      const fileName   = path.basename(fileToSend);
      const file       = new File([fileBuffer], fileName);

      const transcription = await groq.audio.transcriptions.create({
        file,
        model: "whisper-large-v3-turbo",
      });

      if (tempAudio) {
        try { fs.unlinkSync(tempAudio); } catch { /* ignore cleanup errors */ }
      }

      return transcription.text;
    } catch (error) {
      lastError = error;

      const isRetryable =
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT"  ||
        error.code === "ENOTFOUND"  ||
        error.message?.includes("socket hang up") ||
        error.message?.includes("network") ||
        (typeof error.status === "number" && error.status >= 500);

      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1500; // 3 s, 6 s
        console.warn(
          `[transcription] Attempt ${attempt} failed (${error.code ?? error.message}). ` +
          `Retrying in ${delay / 1000}s...`
        );
        await sleep(delay);
      } else {
        break;
      }
    }
  }

  if (tempAudio) {
    try { fs.unlinkSync(tempAudio); } catch { /* ignore */ }
  }

  console.error("[transcription] All retries exhausted:", lastError);
  throw new Error(`Transcription failed: ${lastError.message}`);
};
