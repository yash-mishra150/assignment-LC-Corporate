const { ObjectId } = require("mongodb");
const { connectDB } = require("../config/database");
const bcrypt = require("bcryptjs");
const logger = require("../middleware/Logging/Logger");
const { findIpAddress } = require("../middleware/Security/IPRestriction/utils");
const { encodeTokens } = require("../middleware/JWT/JWT");
const axios = require("axios");

const loginUsers = async (req, res) => {
  try {
    // Modified to make recaptchaToken optional
    const { email, password, recaptchaToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Missing credentials",
        code: "MISSING_CREDENTIALS",
      });
    }

    const db = await connectDB();
    const ip = await findIpAddress(req);

    /* 
    // reCAPTCHA verification - commented out
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: process.env.SECRET_KEY,
          response: recaptchaToken,
          remoteip: ip,
        },
      }
    );

    if (!response.data.success) {
      return res.status(401).json({
        message: "Verification failed",
        errors: response.data["error-codes"],
      });
    }
    */

    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Passwords do not match.",
        code: "PASSWORD_WRONG",
      });
    }

    const payload = {
      userId: user._id.toString(), // Changed id to userId for consistency with TokenCheck
      name: user.name,
      email,
      // role: admin
    };

    await encodeTokens(payload, res);

    return res.status(200).json({
      message: "Login successful",
    });
  } catch (error) {
    logger.error(error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const db = await connectDB();

    // Modified to make recaptchaToken optional
    const { name, email, phone, password, recaptchaToken } = req.body;

    if (!name || !email || !phone || !password) {
      logger.error("Missing Data Input", {
        error: "Missing Data Credentials",
      });

      return res.status(400).json({
        error: "Missing Data Credentials",
      });
    }

    const ip = await findIpAddress(req);

    /*
    // reCAPTCHA verification - commented out
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: process.env.SECRET_KEY,
          response: recaptchaToken,
          remoteip: ip,
        },
      }
    );

    if (!response.data.success) {
      return res.status(401).json({
        message: "Verification failed",
        errors: response.data["error-codes"],
      });
    }
    */

    const userExists = await db.collection("users").findOne({ email });
    if (userExists) {
      logger.warn("User already exists in the database", {
        email: email.replace(/^(.)(.*)(@.*)$/, "$1*****$3"),
      });
      return res.status(400).json({
        error: "User already exists",
        code: "USER_EXISTS",
      });
    }

    const saltRounds = process.env.SALT_ROUNDS || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await db.collection("users").insertOne({
      name,
      email,
      phone,
      password: hashedPassword,
      createdAt: new Date(),
    });

    logger.info("User created successfully", { userId: result.insertedId });
    res.status(201).json({
      message: "User created successfully",
    });
  } catch (err) {
    if (err.code && err.code.startsWith("INVALID")) {
      logger.error("Error in Validating", {
        error: err.message,
        code: err.code,
      });
      return res.status(400).json({
        error: err.message,
        code: err.code,
      });
    }

    logger.error("Server Error", {
      error: err,
    });
    return res.status(500).json({
      error: err.message || "Internal Server Error",
      code: "SERVER_ERROR",
    });
  }
};

module.exports = { loginUsers, createUser };
