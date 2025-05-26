const express = require("express");
const { 
  getAllBooks, 
  getBookById, 
  createBook, 
  updateBook, 
  deleteBook 
} = require("../controllers/bookController");
const { checkIfTokenBlacklisted } = require("../middleware/JWT/BlackListingTokens");
const { tokenCheckMiddleware } = require("../middleware/JWT/TokenCheck");

const router = express.Router();

// Authentication middleware for all book routes
const authenticate = [checkIfTokenBlacklisted, tokenCheckMiddleware];

// All routes require authentication
router.get("/books", authenticate, getAllBooks);
router.get("/books/:id", authenticate, getBookById);
router.post("/books", authenticate, createBook);
router.put("/books/:id", authenticate, updateBook);
router.delete("/books/:id", authenticate, deleteBook);

module.exports = router;