import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  getCalls,
  getCallDetailsHandler,
  getAnalyticsHandler,
  filterCallsHandler,
  getProductAnalysis,
  getCompetitorInsights,
  getRiskRadarHandler,
  downloadCallReportHandler,
  updateCallMetadataHandler,
} from "./dashboard.controller.js";

const router = express.Router();

// GET - Retrieve all analyzed calls with summary
router.get("/calls", authMiddleware, getCalls);

// GET - Retrieve full details of a specific call
router.get("/call/:callId", authMiddleware, getCallDetailsHandler);

// PUT - Update extracted metadata before final save/report
router.put("/call/:callId/metadata", authMiddleware, updateCallMetadataHandler);

// GET - Get dashboard analytics and statistics
router.get("/analytics", authMiddleware, getAnalyticsHandler);

// GET - Filter calls by product_name and/or sentiment and/or call_type
router.get("/filter", authMiddleware, filterCallsHandler);

// GET - Get analysis for a specific product
router.get("/product", authMiddleware, getProductAnalysis);

// GET - Get competitor intelligence
router.get("/competitors", authMiddleware, getCompetitorInsights);

// GET - Get at-risk deals for Risk Radar
router.get("/risk-radar", authMiddleware, getRiskRadarHandler);

// GET - Download a full analysis report as HTML
router.get("/report/:callId", authMiddleware, downloadCallReportHandler);

export default router;
