const logger = require("../Logging/Logger");
const validator = require("validator");

const allowedQueries = {
  name: /^[^\d]+$/,
  email: /^[a-zA-Z0-9._%+-]+@(gmail\.com|outlook\.com)$/i,
  phone: /^\d{10}$/,
  password: /^(?=.*[@_])[a-zA-Z0-9@_]{6,}$/,
  // recaptchaToken: /^[A-Za-z0-9_-]+$/,

  
  // Book validation fields
  title: /^[\w\s.,!?:;()\-"'&]+$/,           // Alphanumeric with common punctuation
  author: /^[A-Za-z\s.,'-]+$/,               // Author name (letters, spaces, periods, commas, hyphens, apostrophes)
  price: /^\d+(\.\d{1,2})?$/,                // Valid price format (e.g., 19.99)
  publishedDate: /^\d{4}-\d{2}-\d{2}$/,      // ISO date format (YYYY-MM-DD)
  isbn: /^(?:\d[- ]?){9}[\dXx]$/,            // ISBN format (optional)
  genre: /^[A-Za-z\s&]+$/,                   // Genre (letters, spaces, ampersands)
  description: /^[\s\S]{10,1000}$/,          // Description between 10-1000 chars
  pages: /^\d{1,5}$/,                        // Number of pages (1-99999)
  language: /^[A-Za-z\s]{2,20}$/,            // Language name
  publisher: /^[\w\s.,&'-]+$/,  

  
};

const validate = async (req, res, next) => {
  try {
    const { body } = req;

    for (const [key, value] of Object.entries(body)) {
      if (!allowedQueries[key]) {
        return res.status(400).json({
          message: `Invalid field: ${key} is not allowed.`,
          code: "INVALID_FIELD",
        });
      }

      const regex = allowedQueries[key];
      if (value && !regex.test(value)) {
        return res.status(400).json({
          message: `Invalid ${key} format.`,
          code: `INVALID_${key.toUpperCase()}_FORMAT`,
        });
      }

      if (typeof value === "string") {
        body[key] = validator.escape(validator.trim(value));
      }
    }

    req.body = body;
    next();
  } catch (error) {
    logger.error(error);
    res.status(500).json({
      message: "Internal Server Error",
      code: "INTERNAL_ERROR",
    });
  }
};

module.exports = validate;
