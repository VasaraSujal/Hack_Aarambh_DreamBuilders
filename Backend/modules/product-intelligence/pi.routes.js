import express from "express";
import { authMiddleware, adminMiddleware } from "../../middlewares/auth.middleware.js";
import { overviewHandler, intelligenceHandler } from "./pi.controller.js";

const router = express.Router();

// All routes require authentication + admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/product-intelligence/overview — all products summary
router.get("/overview", overviewHandler);

// GET /api/product-intelligence/:productId — single product deep-dive
router.get("/:productId", intelligenceHandler);

export default router;
