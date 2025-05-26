const mongoSanitize = require('mongo-sanitize');
const logger = require("../../Logging/Logger");

function sanitizeInput(req, res, next) {
  try {
  
    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    req.params = sanitizeObject(req.params);

    next(); 
  } catch (error) {
    logger.error('Sanitization error:', error);
    res.status(500).send('Internal Server Error');
  }
}


function sanitizeObject(obj) {
  if (typeof obj === 'object' && obj !== null) {
    for (let key in obj) {
      obj[key] = sanitizeValue(obj[key]);
    }
  }
  return obj;
}


function sanitizeValue(value) {
  if (typeof value === 'string') {
    return mongoSanitize(value).replace(/[<>$]/g, '');
  }
  if (typeof value === 'object' && value !== null) {
    return sanitizeObject(value); 
  }
  return value; 
}

module.exports = sanitizeInput;
