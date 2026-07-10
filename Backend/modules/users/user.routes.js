import express from "express";
import { addEmployee, getEmployees, updateEmployeeProfile } from "./user.controller.js";
import { authMiddleware, adminMiddleware } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// All employee management routes require authentication
router.use(authMiddleware);

// Admin-only routes for managing employees in their company
router.post("/employees", adminMiddleware, addEmployee);
router.get("/employees", adminMiddleware, getEmployees);

// Employee features (and admin features) for managing their own profile
router.patch("/profile", updateEmployeeProfile);

export default router;
