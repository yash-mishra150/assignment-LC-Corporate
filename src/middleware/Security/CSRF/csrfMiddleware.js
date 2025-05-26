const logger = require("../../Logging/Logger");

const allowedOrigins = [
  "https://trusted-frontend.com",
  "http://localhost:3000", 
  "https://localhost:3000", 
];

const csrfProtectionMiddleware = (req, res, next) => {
  if (!req || !req.headers) {
    logger.error("Request or headers are undefined");
    return res.status(400).json({ error: "Invalid request object" });
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  // console.log('Origin:', origin, 'Referer:', referer);

  if (!origin && !referer) {
    logger.error("CSRF protection: Missing Origin or Referer header");
    return res.status(400).json({ error: "Missing required headers" });
  }

  if (origin && !allowedOrigins.includes(origin)) {
    logger.error("CSRF protection: Invalid origin");
    return res
      .status(403)
      .json({ error: "Unauthorized access from this origin" });
  }

  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (!allowedOrigins.includes(refererOrigin)) {
        logger.error("CSRF protection: Invalid referer");
        return res.status(403).json({ error: "Unauthorized access attempt" });
      }
    } catch (err) {
      logger.error("CSRF protection: Invalid referer format");
      return res.status(400).json({ error: "Invalid referer format" });
    }
  }

  logger.info("Origin and Referer Check passed...");
  next();
};

module.exports = csrfProtectionMiddleware;
