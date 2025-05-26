const express = require("express");
const { createUser, loginUsers } = require("../controllers/userController");
const { tokenCheckMiddleware } = require("../middleware/JWT/TokenCheck");
const { logout, checkIfTokenBlacklisted } = require("../middleware/JWT/BlackListingTokens");

const router = express.Router();

// Authentication routes
router.post("/users/login", loginUsers);
router.post("/users/register", createUser);


// Logout route
router.post("/users/logout", async (req, res) => {
  try {
    await logout(req, res);
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Error during logout" });
  }
});

// Test route - protected by token check
router.get("/test", checkIfTokenBlacklisted, tokenCheckMiddleware, (req, res) => {
  res.status(200).json({ message: "Authentication successful" });
});

module.exports = router;
