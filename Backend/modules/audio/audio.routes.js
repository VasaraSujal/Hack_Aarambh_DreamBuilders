import express from "express";
import upload from "../../middlewares/upload.middleware.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { uploadAudio, uploadText, getAudioByCallId, getAllAudio } from "./audio.controller.js";

const router = express.Router();

// Protected Routes - Require Authentication
// Upload audio file
router.post("/upload", authMiddleware, upload.single("audio"), uploadAudio);

// Upload text transcript
router.post("/upload-text", authMiddleware, uploadText);

// Get audio by call ID
router.get("/:callId", authMiddleware, getAudioByCallId);

// Get all audio records
router.get("/", authMiddleware, getAllAudio);

export default router;
