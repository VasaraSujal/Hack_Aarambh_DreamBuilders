/**
 * Real-Time Copilot — Transcription Service (Groq Whisper)
 *
 * Takes an audio buffer, saves to a temp file, and sends to Groq Whisper.
 * Uses the same proven pattern as the existing transcription.service.js.
 */

import fs from "fs";
import path from "path";
import os from "os";
import Groq from "groq-sdk";
import "dotenv/config.js";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 30_000,
});

/**
 * Transcribe an audio buffer using Groq Whisper.
 *
 * @param {Buffer} audioBuffer - Raw audio data (WebM/Opus)
 * @param {string} [language="en"] - Language hint
 * @returns {Promise<string|null>} - Transcribed text or null
 */
export const transcribeBuffer = async (audioBuffer, language = "en") => {
  // Write to temp file (same approach as the working transcription service)
  const tmpPath = path.join(os.tmpdir(), `copilot-audio-${Date.now()}.webm`);

  try {
    // Save the raw buffer as a .webm file
    fs.writeFileSync(tmpPath, audioBuffer);

    const fileSize = fs.statSync(tmpPath).size;
    console.log(`[Copilot Transcription] Temp file: ${tmpPath} (${fileSize} bytes)`);

    // Read it back and create a File object (proven pattern)
    const fileBuffer = fs.readFileSync(tmpPath);
    const file = new File([fileBuffer], "audio-chunk.webm");

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
      language,
    });

    const text = (transcription?.text || "").trim();

    console.log(
      `[Copilot Transcription] Result: "${text.substring(0, 80) || "(silence)"}"`
    );

    if (!text || text.length < 2) return null;
    return text;
  } catch (error) {
    if (error.status === 429) {
      console.warn("[Copilot Transcription] Rate limited by Groq.");
      return null;
    }
    if (error.status === 400) {
      console.warn(
        `[Copilot Transcription] Groq rejected (${audioBuffer.length} bytes): ${error.message?.substring(0, 120)}`
      );
      return null;
    }
    console.error("[Copilot Transcription] Error:", error.status, error.message);
    return null;
  } finally {
    // Clean up temp file
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
  }
};
