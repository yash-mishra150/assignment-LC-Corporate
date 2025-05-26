const { generateAccessToken, decodeToken } = require("./JWT");
const logger = require("../Logging/Logger");
const { logout } = require("./BlackListingTokens");

/**
 * Middleware to validate JWT tokens and add user info to request
 * Automatically refreshes access tokens when expired if refresh token is valid
 */
const tokenCheckMiddleware = async (req, res, next) => {
  // Set a flag to track if response has been sent
  res.locals.responseSent = false;

  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;

  try {
    // Case 1: No refresh token - must login again
    if (!refreshToken) {
      logger.error("Missing refresh token");
      return res.status(401).json({
        message: "Authentication required",
        code: "NO_REFRESH_TOKEN",
        details: "Please log in to access this resource",
      });
    }

    // Try to decode refresh token first
    let decodedRefreshToken;
    try {
      decodedRefreshToken = await decodeToken(refreshToken);

      // Verify it's actually a refresh token
      if (!decodedRefreshToken || decodedRefreshToken.type !== "refresh") {
        logger.error("Invalid refresh token type");
        await logout(req, res);
        return res.status(401).json({
          message: "Invalid authentication token",
          code: "INVALID_REFRESH_TOKEN",
          details: "Please log in again",
        });
      }

      // Check if refresh token is expired
      const currentTime = Math.floor(Date.now() / 1000);
      if (decodedRefreshToken.exp < currentTime) {
        logger.warn("Refresh token expired");
        await logout(req, res);
        return res.status(401).json({
          message: "Session expired",
          code: "REFRESH_TOKEN_EXPIRED",
          details: "Your session has expired, please log in again",
        });
      }
    } catch (error) {
      logger.error("Error decoding refresh token", { error: error.message });
      await logout(req, res);
      return res.status(401).json({
        message: "Invalid authentication token",
        code: "INVALID_REFRESH_TOKEN",
        details: "Please log in again",
      });
    }

    // Case 2: No access token but valid refresh token - generate new access token
    if (!accessToken) {
      logger.info(
        "Missing access token but valid refresh token - generating new one"
      );
      // IMPORTANT: Don't call res methods in generateAccessToken
      const newToken = await generateAccessToken(refreshToken, res);
      if (newToken) {
        req.user = decodedRefreshToken;
        return next();
      } else {
        // Handle token generation failure
        return res.status(401).json({
          message: "Failed to refresh token",
          code: "TOKEN_REFRESH_FAILED",
        });
      }
    }

    // Case 3: Both tokens present - verify access token
    let decodedAccessToken;
    try {
      decodedAccessToken = await decodeToken(accessToken);

      // Verify it's actually an access token
      if (!decodedAccessToken || decodedAccessToken.type !== "access") {
        logger.error("Invalid access token type");
        // IMPORTANT: Don't call res methods in generateAccessToken
        const newToken = await generateAccessToken(refreshToken, res);
        if (newToken) {
          req.user = decodedRefreshToken;
          return next();
        } else {
          return res.status(401).json({
            message: "Failed to refresh token",
            code: "TOKEN_REFRESH_FAILED",
          });
        }
      }

      // Verify both tokens belong to the same user
      if (decodedAccessToken.userId !== decodedRefreshToken.userId) {
        logger.error("Token mismatch: Access and refresh tokens don't match");
        await logout(req, res);
        return res.status(401).json({
          message: "Token mismatch detected",
          code: "TOKEN_MISMATCH",
          details: "Please log in again",
        });
      }

      // Check if access token is expired
      const currentTime = Math.floor(Date.now() / 1000);
      if (decodedAccessToken.exp < currentTime) {
        logger.info(
          "Access token expired but refresh token valid - generating new access token"
        );
        // IMPORTANT: Don't call res methods in generateAccessToken
        const newToken = await generateAccessToken(refreshToken, res);
        if (newToken) {
          req.user = decodedRefreshToken;
          return next();
        } else {
          return res.status(401).json({
            message: "Failed to refresh token",
            code: "TOKEN_REFRESH_FAILED",
          });
        }
      }

      // Case 4: Both tokens valid and not expired
      req.user = decodedAccessToken;
      return next();
    } catch (error) {
      logger.error("Error decoding access token", { error: error.message });
      // IMPORTANT: Don't call res methods in generateAccessToken
      const newToken = await generateAccessToken(refreshToken, res);
      if (newToken) {
        req.user = decodedRefreshToken;
        return next();
      } else {
        return res.status(401).json({
          message: "Failed to refresh token",
          code: "TOKEN_REFRESH_FAILED",
        });
      }
    }
  } catch (error) {
    logger.error("Error in token validation", { error: error.message });
    return res.status(500).json({
      message: "Authentication error",
      code: "AUTH_ERROR",
      details: "An error occurred during authentication",
    });
  }
};

module.exports = { tokenCheckMiddleware };