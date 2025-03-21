require('dotenv').config()
const express=require('express')
const mongoose = require('mongoose')
const Redis = require('ioredis')
const cors = require('cors')
const helmet = require('helmet')
const postRoutes = require('./routes/post-routes')
const errorHandler = require('./middleware/errorHandler')
const logger = require('./utils/logger')

const { RateLimiterRedis } = require('rate-limiter-flexible'); // Redis-based rate limiting
const { rateLimit } = require('express-rate-limit'); // Express middleware for rate limiting
const { RedisStore } = require('rate-limit-redis'); // Redis store for express-rate-limit
const { connectToRabbitMQ } = require('./utils/rabbitmq')

const app = express();
const PORT = process.env.PORT || 3002

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
    duration: 60 // Reset requests every 60 second
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

//routes -> pass redis client to routes

app.use('/api/posts',(req,res,next)=>{
    req.redisClient = redisClient
    next()
},postRoutes);

app.use(errorHandler);


async function startServer(){
    try {
        await connectToRabbitMQ();
        app.listen(PORT, () => {
            logger.info(`Post service running on PORT: ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to connect to server', error);
        process.exit(1);
    }
}

startServer();

// ==========================
// 📌 Unhandled Promise Rejection Handler
// ==========================

// This handles unexpected errors from asynchronous operations
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled rejection at ${promise}, reason: ${reason}`);
});