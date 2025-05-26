const rateLimit = require("express-rate-limit");


const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 30, 
  standardHeaders: true, 
  legacyHeaders: false, 
  message: {
    message: "Too many requests from this IP. Please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  handler: (req, res) => {
    return res.status(429).json({
      message: "Too many requests. Slow down!",
      code: "RATE_LIMIT_EXCEEDED",
    });
  },
});

module.exports = strictLimiter;
