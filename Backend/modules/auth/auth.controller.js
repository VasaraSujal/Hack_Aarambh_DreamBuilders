// Authentication Controller
// Handles HTTP requests and responses for authentication

import AuthService from "./auth.service.js";

export const signup = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, company_name } = req.body;

    // Validation
    if (!name || !email || !password || !confirmPassword || !company_name) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    const result = await AuthService.signup(email, password, name, company_name);

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        token: result.token,
        user: result.user,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Signup failed",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const result = await AuthService.login(email, password);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        token: result.token,
        user: result.user,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // Set by auth middleware

    const user = await AuthService.getUserById(userId);

    res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(404).json({
      success: false,
      message: error.message || "Failed to get profile",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, email, company_name, currentPassword, newPassword } = req.body;

    const user = await AuthService.updateUserProfile(userId, {
      name,
      email,
      company_name,
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

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    await AuthService.deleteUserAccount(userId);
    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete account",
    });
  }
};

export const logout = async (req, res) => {
  try {
    // With JWT, logout is handled on the client side by removing the token
    // Server can optionally implement token blacklisting here
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

export const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token not provided",
      });
    }

    const decoded = await AuthService.verifyToken(token);

    res.status(200).json({
      success: true,
      message: "Token is valid",
      data: decoded,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message || "Invalid token",
    });
  }
};
