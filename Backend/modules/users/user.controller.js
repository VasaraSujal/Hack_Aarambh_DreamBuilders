import UserService from "./user.service.js";
import AuthService from "../auth/auth.service.js"; // Reuse profile update from auth

export const addEmployee = async (req, res) => {
  try {
    const adminUser = req.user; // Extract from auth token
    const { name, email, password, designation } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required fields" });
    }

    const result = await UserService.addEmployee(adminUser, { name, email, password, designation });

    return res.status(201).json({
      success: true,
      message: "Employee successfully added to the company",
      data: result
    });
  } catch (error) {
    console.error("Add employee error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to add employee",
    });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const user = req.user; // Has inherently secure companyId

    const employees = await UserService.getEmployeesByCompany(user.companyId);

    return res.status(200).json({
      success: true,
      message: "Employees fetched successfully",
      data: employees
    });
  } catch (error) {
    console.error("Get employees error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch company employees",
    });
  }
};

export const updateEmployeeProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, currentPassword, newPassword } = req.body;

    // Use auth service to update user details safely
    const user = await AuthService.updateUserProfile(userId, {
      name,
      currentPassword,
      newPassword,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update profile",
    });
  }
};
