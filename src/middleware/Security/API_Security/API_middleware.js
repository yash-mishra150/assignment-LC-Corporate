const logger = require("../../Logging/Logger");
const { findIpAddress } = require("../IPRestriction/utils");

const apiKeyMiddleware = async (req, res, next) => {
  const method = req.method;
  const path = req.originalUrl;
  const ipaddress = await findIpAddress(req);
  const userAgent = req.headers["user-agent"];

  try {
    const apiKey = req.headers["api-key"];
    
    logger.info(`Incoming request: ${method} ${path}`, {
      RequestIp: ipaddress,
      UserAgent: userAgent,
    });

    if (!apiKey) {

      logger.warn(`API key missing from request`, {
        RequestIp: ipaddress,
        Path: path,
        Method: method,
        UserAgent: userAgent,
      });
      return res.status(400).json({ message: "API key is required." });
    }

    if (apiKey !== process.env.API_KEY) {

      logger.warn(`Invalid API key used: ${apiKey}`, {
        RequestIp: ipaddress,
        Path: path,
        Method: method,
        UserAgent: userAgent,
      });
      return res.status(403).json({ message: "Invalid API key." });
    }


    logger.info("Valid API key provided.", {
      RequestIp: ipaddress,
      Path: path,
      Method: method,
      UserAgent: userAgent,
    });
    
    next();
  } catch (error) {
    logger.error("Error in API key middleware", {
      error: error.message,
      stack: error.stack,
      RequestIp: ipaddress,
      Path: path,
      Method: method,
      UserAgent: userAgent,
    });
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = { apiKeyMiddleware };
