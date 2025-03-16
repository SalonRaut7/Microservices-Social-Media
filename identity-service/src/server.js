// Load environment variables from .env file
require('dotenv').config();

const mongoose = require('mongoose'); // Import Mongoose for MongoDB connection
const logger = require('./utils/logger'); // Import logger utility (Winston)
const express = require('express'); // Import Express framework
const app = express(); // Initialize Express application
const helmet = require('helmet'); // Security middleware for setting HTTP headers
const cors = require('cors'); // Enable Cross-Origin Resource Sharing (CORS)
const { RateLimiterRedis } = require('rate-limiter-flexible'); // Redis-based rate limiting
const Redis = require('ioredis'); // Import Redis client
const { rateLimit } = require('express-rate-limit'); // Express middleware for rate limiting
const { RedisStore } = require('rate-limit-redis'); // Redis store for express-rate-limit
const routes = require('./routes/identity-service'); // Import application routes
const errorHandler = require('./middleware/errorHandler'); // Import global error handler

const PORT = process.env.PORT || 3001; // Define server port from environment variables

// ==========================
// 📌 MongoDB Connection Setup
// ==========================
mongoose
    .connect(process.env.MONGODB_URI) // Connect to MongoDB using environment variable
    .then(() => logger.info('Connected to MongoDB')) // Log success message if connected
    .catch(e => logger.error('MongoDB connection error', e)); // Log error if connection fails

const redisClient = new Redis(process.env.REDIS_URL); // Initialize Redis client

// ==========================
// 📌 Middlewares
// ==========================

app.use(helmet()); // Adds security headers to responses
app.use(cors()); // Enables CORS for handling cross-origin requests
app.use(express.json()); // Parses incoming JSON request bodies

// Logging middleware for incoming requests
app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`); // Log request method and URL
    logger.info(`Request body: ${JSON.stringify(req.body)}`); // Log request body
    next(); // Continue to the next middleware
});

// ==========================
// 📌 Rate Limiting (DDoS Protection)
// ==========================

const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient, // Use Redis as the store
    keyPrefix: 'middleware', // Prefix for rate limiter keys in Redis
    points: 10, // Maximum allowed requests
    duration: 1 // Reset requests every 1 second
});

// Apply the rate limiter to **all** requests
app.use((req, res, next) => {
    rateLimiter.consume(req.ip)
        .then(() => next()) // Allow request if within limit
        .catch(() => {
            logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
            res.status(429).json({ success: false, message: "Too many requests" });
        });
});

// ==========================
// 📌 Rate Limiting for Sensitive Endpoints (Brute Force Protection)
// ==========================

const sensitiveEndpointsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Max 50 requests per 15 minutes per IP
    standardHeaders: true, // Send rate limit headers in responses
    legacyHeaders: false, // Disable old `X-RateLimit-*` headers
    handler: (req, res) => {
        logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({ success: false, message: "Too many requests" });
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args) // Store rate limits in Redis
    }),
});

// Apply stricter rate limiting **only on the registration endpoint**
app.use('/api/auth/register', sensitiveEndpointsLimiter);

// ==========================
// 📌 Routes
// ==========================

app.use('/api/auth', routes); // Attach authentication routes

// ==========================
// 📌 Global Error Handler
// ==========================
app.use(errorHandler); // Middleware to handle errors across the application

// ==========================
// 📌 Start Server
// ==========================

app.listen(PORT, () => {
    logger.info(`Identity service running on PORT: ${PORT}`);
});

// ==========================
// 📌 Unhandled Promise Rejection Handler
// ==========================

// This handles unexpected errors from asynchronous operations
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled rejection at ${promise}, reason: ${reason}`);
});
