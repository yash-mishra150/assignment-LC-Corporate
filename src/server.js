const express = require("express");
const userRoutes = require("./routes/userRoutes");
const { dbClient } = require("./config/database");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();
const csrfProtectionMiddleware = require("./middleware/Security/CSRF/csrfMiddleware");
const {
  checkIfTokenBlacklisted,
} = require("./middleware/JWT/BlackListingTokens");
const {
  restrictIpAddress,
} = require("./middleware/Security/IPRestriction/security");
const { TokenCheck } = require("./middleware/JWT/TokenCheck");
const {
  apiKeyMiddleware,
} = require("./middleware/Security/API_Security/API_middleware");
const sanitizeInput = require("./middleware/Validation/Sanitization/Sanitization");
const strictLimiter = require("./middleware/Security/RateLimiting/RateLimit");
const validate = require("./middleware/Validation/validateUser");
const bookRoutes = require("./routes/bookRoutes");
const PORT = process.env.PORT || 5000;
const app = express();
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? "https://your-production-domain.com"
      : "http://localhost:3000",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "api-key"],
  credentials: true,
};

app.use(cors(corsOptions));
// app.options("*", cors(corsOptions)); // Uncomment if preflight requests are needed

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser()); 
app.use(csrfProtectionMiddleware);

app.use(helmet()); 
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://trusted-scripts.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "https://images.com"],
      connectSrc: ["'self'", "https://api.example.com"],
      fontSrc: ["'self'", "https://fonts.com"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  })
);

// app.use(checkIfTokenBlacklisted);
app.use(restrictIpAddress("*"));
app.use(apiKeyMiddleware);
app.use(sanitizeInput);
app.use(strictLimiter);
app.use(validate);

app.use("/api", userRoutes); // Route handler should come after security middleware
app.use("/store", bookRoutes); // Book routes

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful Shutdown
const gracefulShutdown = () => {
  console.log("Gracefully shutting down...");

  server.close(() => {
    console.log("Server stopped");

    if (dbClient) {
      dbClient.close(() => {
        console.log("MongoDB connection closed");
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
};

// Process Signals
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.on("exit", () => {
  if (dbClient) {
    dbClient.close(() => {
      console.log("MongoDB connection closed on exit");
    });
  }
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  gracefulShutdown();
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});
