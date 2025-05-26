const { decodeToken } = require("./JWT");
const { connectDB } = require("../../config/database");
const logger = require("../Logging/Logger");

async function checkIfTokenBlacklisted(req, res, next) {
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;

  try {
    logger.info("Checking if tokens are blacklisted", {
      method: req.method,
      url: req.originalUrl,
      hasAccessToken: Boolean(accessToken),
      hasRefreshToken: Boolean(refreshToken),
    });

    if (!accessToken && !refreshToken) {
      return res.status(401).json({ message: "No authentication tokens provided" });
    }

    const db = await connectDB();
    const collection = db.collection("blacklist");

    // Check if either token is blacklisted - fixed schema inconsistency
    const blacklistedAccessToken = accessToken ? 
      await collection.findOne({ token: accessToken }) : null;
    const blacklistedRefreshToken = refreshToken ? 
      await collection.findOne({ token: refreshToken }) : null;

    if (blacklistedAccessToken || blacklistedRefreshToken) {
      logger.warn("Blacklisted token found", {
        method: req.method,
        url: req.originalUrl,
        blacklistedAccessToken: Boolean(blacklistedAccessToken),
        blacklistedRefreshToken: Boolean(blacklistedRefreshToken),
      });

      return res.status(403).json({ message: "Token has been blacklisted" });
    }

    logger.info("Tokens are not blacklisted", {
      method: req.method,
      url: req.originalUrl,
    });

    next();
  } catch (error) {
    logger.error("Error occurred during token validation", {
      errorMessage: error.message,
      stack: error.stack,
      method: req.method,
      url: req.originalUrl,
    });

    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

async function blacklistToken(token) {
  try {
    if (!token) {
      logger.warn("Attempted to blacklist undefined token");
      return;
    }

    const decodedToken = await decodeToken(token);

    if (!decodedToken) {
      throw new Error("Invalid token");
    }

    const db = await connectDB();
    const collection = db.collection("blacklist");

    await collection.insertOne({
      token, // Using consistent field name
      tokenType: decodedToken.type || 'unknown',
      userId: decodedToken.userId || 'unknown',
      createdAt: new Date(),
      exp: decodedToken.exp,
    });

    logger.warn(`Token blacklisted: ${decodedToken.type || 'unknown'} token for user ${decodedToken.userId || 'unknown'}`);
  } catch (error) {
    logger.error("Error blacklisting token", error);
  }
}

async function logout(req, res) {
  const refreshToken = req.cookies.refreshToken;
  const accessToken = req.cookies.accessToken;

  if (!refreshToken && !accessToken) {
    return res.status(400).json({ message: "Already Logged out" }); // Fixed typo
  }

  // Blacklist both tokens if they exist
  if (refreshToken) await blacklistToken(refreshToken);
  if (accessToken) await blacklistToken(accessToken);

  const isProduction = process.env.NODE_ENV === "production";

  // Use consistent sameSite policy
  res.clearCookie("accessToken", {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: "Lax", // Changed to match JWT.js
  });

  res.clearCookie("refreshToken", {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: "Lax", // Changed to match JWT.js
  });

  return res.status(200).json({ message: "Logged out successfully" });
}

async function createTTLIndex() {
  try {
    const db = await connectDB();
    const collection = db.collection("blacklist");

    await collection.createIndex({ exp: 1 }, { expireAfterSeconds: 0 });
    // Add additional indexes for faster lookups
    await collection.createIndex({ token: 1 }, { unique: true });
    await collection.createIndex({ userId: 1 });

    logger.info("Blacklist indexes created successfully.");
  } catch (error) {
    logger.error("Error creating blacklist indexes", error);
  }
}

// Run on startup
createTTLIndex();

module.exports = {
  checkIfTokenBlacklisted,
  blacklistToken,
  logout,
};
