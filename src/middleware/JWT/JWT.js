const path = require("path");
const fs = require("fs");
const util = require("util");
const jwt = require("jsonwebtoken");
const { serialize } = require("cookie");
const logger = require("../Logging/Logger");

const readFileAsync = util.promisify(fs.readFile);

const privateKeyPath = path.join(__dirname, "../../../keys/private.pem");
const publicKeyPath = path.join(__dirname, "../../../keys/public.pem");

async function readPrivateKey() {
  try {
    return await readFileAsync(privateKeyPath, "utf8");
  } catch (error) {
    throw new Error("Unable to read private key");
  }
}

async function readPublicKey() {
  try {
    return await readFileAsync(publicKeyPath, "utf8");
  } catch (error) {
    throw new Error("Unable to read public key");
  }
}

async function generateAccessToken(refreshtoken, res) {
  try {
    // Use public key for verification, not private key
    const publicKey = await readPublicKey();
    const privateKey = await readPrivateKey();

    const decodedRefreshToken = jwt.verify(refreshtoken, publicKey, {
      algorithms: ["RS256"],
    });

    // Verify it's actually a refresh token
    if (!decodedRefreshToken || decodedRefreshToken.type !== "refresh") {
      logger.error("Invalid refresh token");
      return null; // Return null instead of sending response
    }

    // Create a new payload without the exp property
    const { exp, iat, ...payloadWithoutExpiry } = decodedRefreshToken;
    
    // Sign with the new payload that doesn't have exp
    const accessToken = jwt.sign(
      { ...payloadWithoutExpiry, type: "access" },
      privateKey,
      { algorithm: "RS256", expiresIn: "1h" }
    );

    const isProduction = process.env.NODE_ENV === "production";
    const accessTokenCookie = serialize("accessToken", accessToken, {
      path: "/",
      maxAge: 60 * 60,
      httpOnly: true,
      secure: isProduction ? true : false,
      sameSite: "Lax", // Consistent sameSite policy
    });

    res.setHeader("Set-Cookie", accessTokenCookie);

    logger.info("New access token generated and sent.");

    return accessToken;
  } catch (error) {
    logger.error("Error generating new access token", error);
    return null; // Return null instead of sending response
  }
}

async function encodeTokens(payload, res) {
  try {
    const privateKey = await readPrivateKey(); 

    const accessToken = jwt.sign({ ...payload, type: "access" }, privateKey, {
      algorithm: "RS256",
      expiresIn: "1h",
    });

    const refreshToken = jwt.sign({ ...payload, type: "refresh" }, privateKey, {
      algorithm: "RS256",
      expiresIn: "24h",
    });

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("accessToken", accessToken, {
      path: "/",
      maxAge: 60 * 60 * 1000, 
      httpOnly: true,
      secure: isProduction, 
      sameSite: "Lax", // Changed to be consistent
    });

    res.cookie("refreshToken", refreshToken, {
      path: "/",
      maxAge: 24 * 60 * 60 * 1000, 
      httpOnly: true,
      secure: isProduction,
      sameSite: "Lax", // Changed to be consistent
    });

    return { accessToken, refreshToken };
  } catch (error) {
    logger.error("Error encoding tokens:", error);
    res.status(500).json({ message: "Internal Server Error" });
    return null; // Added missing return
  }
}

async function decodeToken(token) {
  const publicKey = await readPublicKey();

  try {
    const decoded = jwt.verify(token, publicKey);
    
    // Add type checking if needed
    if (!decoded) {
      throw new Error("Invalid token");
    }
    
    return decoded;
  } catch (error) {
    throw new Error("Token verification failed: " + error.message);
  }
}

module.exports = {
  encodeTokens,
  decodeToken,
  generateAccessToken,
};
