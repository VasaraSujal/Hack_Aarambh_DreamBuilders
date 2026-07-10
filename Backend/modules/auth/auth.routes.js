import express from "express";
import {
  signup,
  login,
  logout,
  getProfile,
  updateProfile,
  deleteAccount,
  verifyToken,
} from "./auth.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// Public routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-token", verifyToken);

// Protected routes
router.get("/me", authMiddleware, getProfile);
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);
router.delete("/account", authMiddleware, deleteAccount);
router.post("/logout", authMiddleware, logout);

export default router;
