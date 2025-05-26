const { connectDB } = require("../config/database");
const { ObjectId } = require("mongodb");
const logger = require("../middleware/Logging/Logger");

/**
 * Format book data for API response
 * @param {Object} book - MongoDB book document
 * @returns {Object} Formatted book object with clean properties
 */
const formatBookResponse = (book) => {
  if (!book) return null;
  
  // Extract only the fields we want to expose in the API
  const {
    _id,
    title,
    author,
    price,
    publishedDate,
    isbn,
    genre,
    language,
    publisher,
    description,
    pages
  } = book;
  
  // Build a clean response object
  const formattedBook = {
    id: _id.toString(),
    title,
    author,
    price
  };
  
  // Only add optional fields if they exist
  if (publishedDate) formattedBook.publishedDate = publishedDate.toISOString().split('T')[0];
  if (isbn) formattedBook.isbn = isbn;
  if (genre) formattedBook.genre = genre;
  if (language) formattedBook.language = language;
  if (publisher) formattedBook.publisher = publisher;
  if (description) formattedBook.description = description;
  if (pages) formattedBook.pages = pages;
  
  return formattedBook;
};

/**
 * Get all books with optional filtering
 */
const getAllBooks = async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection("books");
    
    // Support filtering by query parameters
    const filter = {};
    
    if (req.query.title) {
      filter.title = { $regex: req.query.title, $options: 'i' };
    }
    
    if (req.query.author) {
      filter.author = { $regex: req.query.author, $options: 'i' };
    }
    
    if (req.query.minPrice) {
      filter.price = { ...filter.price, $gte: parseFloat(req.query.minPrice) };
    }
    
    if (req.query.maxPrice) {
      filter.price = { ...filter.price, $lte: parseFloat(req.query.maxPrice) };
    }
    
    // Add pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const total = await collection.countDocuments(filter);
    
    // Get paginated results
    const books = await collection.find(filter)
      .sort({ title: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Format response
    const formattedBooks = books.map(formatBookResponse);
    
    logger.info(`Retrieved ${books.length} books`);
    return res.status(200).json({
      status: "success",
      data: {
        books: formattedBooks,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error("Error fetching books", { error: error.message });
    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve books",
      error: error.message
    });
  }
};

/**
 * Get a single book by ID
 */
const getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid book ID format",
        details: "Book ID must be a valid MongoDB ObjectId"
      });
    }
    
    const db = await connectDB();
    const collection = db.collection("books");
    
    const book = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!book) {
      return res.status(404).json({
        status: "error",
        message: "Book not found",
        details: "The requested book does not exist or has been removed"
      });
    }
    
    // Format response
    const formattedBook = formatBookResponse(book);
    
    return res.status(200).json({
      status: "success",
      data: {
        book: formattedBook
      }
    });
  } catch (error) {
    logger.error("Error fetching book", { error: error.message, bookId: req.params.id });
    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve book details",
      error: error.message
    });
  }
};

/**
 * Create a new book
 */
const createBook = async (req, res) => {
  try {
    const { title, author, price, publishedDate, isbn, genre, language, publisher, description, pages } = req.body;
    
    // Validate required fields
    if (!title || !author || !price) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields",
        requiredFields: ["title", "author", "price"]
      });
    }
    
    // Validate price is a number
    if (isNaN(parseFloat(price))) {
      return res.status(400).json({
        status: "error",
        message: "Invalid price format",
        details: "Price must be a valid number"
      });
    }
    
    const db = await connectDB();
    const collection = db.collection("books");
    
    // Check if book with same title and author already exists
    const existingBook = await collection.findOne({ 
      title: { $regex: new RegExp(`^${title}$`, 'i') },
      author: { $regex: new RegExp(`^${author}$`, 'i') }
    });
    
    if (existingBook) {
      return res.status(409).json({
        status: "error",
        message: "Book already exists",
        details: "A book with the same title and author already exists",
        existingBookId: existingBook._id.toString()
      });
    }
    
    // Format the book object
    const newBook = {
      title,
      author,
      price: parseFloat(price),
      publishedDate: publishedDate ? new Date(publishedDate) : null,
      createdBy: req.user?.userId || null, // For database tracking only
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Add optional fields only if they exist
    if (isbn) newBook.isbn = isbn;
    if (genre) newBook.genre = genre;
    if (language) newBook.language = language;
    if (publisher) newBook.publisher = publisher;
    if (description) newBook.description = description;
    if (pages) newBook.pages = parseInt(pages);
    
    const result = await collection.insertOne(newBook);
    
    // Get the complete book with _id
    const insertedBook = await collection.findOne({ _id: result.insertedId });
    
    // Format for response
    const formattedBook = formatBookResponse(insertedBook);
    
    logger.info("Book created", { bookId: result.insertedId, userId: req.user?.userId });
    
    return res.status(201).json({
      status: "success",
      message: "Book created successfully",
      data: {
        book: formattedBook
      }
    });
  } catch (error) {
    logger.error("Error creating book", { error: error.message });
    return res.status(500).json({
      status: "error",
      message: "Unable to create book",
      error: error.message
    });
  }
};

/**
 * Update a book by ID
 */
const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, price, publishedDate, isbn, genre, language, publisher, description, pages } = req.body;
    
    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid book ID format",
        details: "Book ID must be a valid MongoDB ObjectId"
      });
    }
    
    // Validate that at least one field is being updated
    if (!title && !author && price === undefined && !publishedDate && 
        !isbn && !genre && !language && !publisher && !description && pages === undefined) {
      return res.status(400).json({
        status: "error",
        message: "No update fields provided",
        details: "At least one field must be provided for update"
      });
    }
    
    const db = await connectDB();
    const collection = db.collection("books");
    
    // Check if book exists
    const existingBook = await collection.findOne({ _id: new ObjectId(id) });
    if (!existingBook) {
      return res.status(404).json({
        status: "error",
        message: "Book not found",
        details: "The book you are trying to update does not exist"
      });
    }
    
    // If title and author are being updated, check for duplicates
    if (title && author) {
      const duplicateBook = await collection.findOne({
        _id: { $ne: new ObjectId(id) },
        title: { $regex: new RegExp(`^${title}$`, 'i') },
        author: { $regex: new RegExp(`^${author}$`, 'i') }
      });
      
      if (duplicateBook) {
        return res.status(409).json({
          status: "error",
          message: "Book with this title and author already exists",
          details: "Another book with the same title and author combination already exists",
          existingBookId: duplicateBook._id.toString()
        });
      }
    }
    
    // Create update object with only the fields that are provided
    const updateData = {
      updatedAt: new Date(),
      updatedBy: req.user?.userId || null // For database tracking only
    };
    
    if (title) updateData.title = title;
    if (author) updateData.author = author;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (publishedDate) updateData.publishedDate = new Date(publishedDate);
    if (isbn) updateData.isbn = isbn;
    if (genre) updateData.genre = genre;
    if (language) updateData.language = language;
    if (publisher) updateData.publisher = publisher;
    if (description) updateData.description = description;
    if (pages !== undefined) updateData.pages = parseInt(pages);
    
    // Update the book
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    // Get the updated book
    const updatedBook = await collection.findOne({ _id: new ObjectId(id) });
    
    // Format for response
    const formattedBook = formatBookResponse(updatedBook);
    
    logger.info("Book updated", { 
      bookId: id, 
      userId: req.user?.userId,
      updatedFields: Object.keys(updateData).filter(k => k !== 'updatedAt' && k !== 'updatedBy')
    });
    
    return res.status(200).json({
      status: "success",
      message: "Book updated successfully",
      data: {
        book: formattedBook
      }
    });
  } catch (error) {
    logger.error("Error updating book", { error: error.message, bookId: req.params.id });
    return res.status(500).json({
      status: "error",
      message: "Unable to update book",
      error: error.message
    });
  }
};

/**
 * Delete a book by ID
 */
const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid book ID format",
        details: "Book ID must be a valid MongoDB ObjectId"
      });
    }
    
    const db = await connectDB();
    const collection = db.collection("books");
    
    // Check if book exists first
    const book = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!book) {
      return res.status(404).json({
        status: "error",
        message: "Book not found",
        details: "The book you are trying to delete does not exist"
      });
    }
    
    // Format book for response before deletion
    const formattedBook = formatBookResponse(book);
    
    // Delete the book
    await collection.deleteOne({ _id: new ObjectId(id) });
    
    logger.info("Book deleted", { bookId: id, userId: req.user?.userId });
    
    return res.status(200).json({
      status: "success",
      message: "Book deleted successfully",
      data: {
        book: formattedBook
      }
    });
  } catch (error) {
    logger.error("Error deleting book", { error: error.message, bookId: req.params.id });
    return res.status(500).json({
      status: "error",
      message: "Unable to delete book",
      error: error.message
    });
  }
};

module.exports = {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook
};