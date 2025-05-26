const { findIpAddress } = require("./utils");
const logger = require("../../Logging/Logger");

function restrictIpAddress(ipAddress) {
  return (req, res, next) => {
    try {
      const ip = findIpAddress(req);

      // If no IP address is found, log the error with additional request details
      if (!ip) {
        logger.error("IP address not found in the request", {
          method: req.method,
          url: req.originalUrl,
          headers: req.headers,
        });
        return res.status(403).json({ message: "IP Address not recognized" });
      }

      if (ipAddress === "*") {
        logger.warn("Allowing access from unknown IP address", {
          ip,
          method: req.method,
          url: req.originalUrl,
        });
        return next();
      }


      const allowedIps = Array.isArray(ipAddress) ? ipAddress : [ipAddress];

      if (!allowedIps.includes(ip)) {
        logger.warn("Unauthorized access attempt", {
          ip,
          method: req.method,
          url: req.originalUrl,
          allowedIps,
        });
        return res.status(403).json({ message: "Permission denied" });
      }

      logger.info("Access granted", {
        ip,
        method: req.method,
        url: req.originalUrl,
      });

      next();
    } catch (error) {

      logger.error("Error in IP restriction middleware", {
        error: error.message,
        stack: error.stack,
        method: req.method,
        url: req.originalUrl,
      });
      res.status(500).json({ message: "Internal Server Error" });
    }
  };
}

module.exports = { restrictIpAddress };
