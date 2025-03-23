require('dotenv').config();
const express = require('express'); 
const cors = require('cors'); // Enables CORS (Cross-Origin Resource Sharing)
const Redis = require('ioredis'); // Redis client for caching and rate limiting
const helmet = require('helmet'); // Security middleware to set HTTP headers
const { rateLimit } = require('express-rate-limit'); // Rate limiting middleware
const { RedisStore } = require('rate-limit-redis'); // Redis-based store for rate limiting
const logger = require('./utils/logger'); // Custom logger for logging requests and errors
const proxy = require('express-http-proxy'); // Proxy middleware to forward requests to microservices
const errorHandler = require('./middleware/errorHandler'); // Custom error handling middleware
const { validateToken } = require('./middleware/authMiddleware');

const app = express(); 
const PORT = process.env.PORT || 3000; 


const redisClient = new Redis(process.env.REDIS_URL);

// Apply security middleware
app.use(helmet()); // Sets security-related HTTP headers
app.use(cors()); // Enables CORS for handling requests from different domains
app.use(express.json()); // Parses incoming JSON request bodies

// ===============================
// 🚀 RATE LIMITING USING REDIS
// ===============================
// Limits the number of requests per IP to 100 every 15 minutes
const ratelimitOptions = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Max 100 requests per 15 minutes per IP
    standardHeaders: true, // Includes rate limit headers in responses
    legacyHeaders: false, // Disables old `X-RateLimit-*` headers
    handler: (req, res) => {
        logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`); // Log exceeded requests
        res.status(429).json({ success: false, message: "Too many requests" }); // Send response
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args) // Uses Redis to store rate limits
    }),
});

// Apply rate limiting to all routes
app.use(ratelimitOptions);

// ===============================
// 📜 LOGGING MIDDLEWARE
// ===============================
// Logs incoming requests for debugging and tracking purposes
app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`); 
    logger.info(`Request body: ${JSON.stringify(req.body)}`); 
    next(); 
});

// ===============================
// 🔀 API GATEWAY PROXY SETUP
// ===============================
// The API Gateway receives requests and forwards them to the appropriate microservices.
// Example: Client sends request to `localhost:3000/v1/auth/register`, 
// but the actual authentication service is running on `localhost:3001/api/auth/register`.
// This proxy redirects the request automatically.

const proxyOptions = {
    proxyReqPathResolver: (req) => {
        // Modify the incoming request path before forwarding
        return req.originalUrl.replace(/^\/v1/, "/api");  // It replaces /v1 with /api in the URL.
    },
    proxyErrorHandler: (err, res, next) => {
        // Handle errors occurring during proxying
        logger.error(`Proxy error: ${err.message}`); 
        res.status(500).json({
            message: "Internal Server Error",
            error: err.message
        });
    }
};

// ===============================
// 🔁 SETTING UP PROXY FOR IDENTITY SERVICE
// ===============================
// The Identity Service is responsible for authentication (register, login, etc.).
// The API Gateway forwards authentication-related requests to this service.

app.use('/v1/auth', proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers["Content-Type"] = "application/json";
        return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
        logger.info(`Response received from Identity-Service: ${proxyRes.statusCode}`);
        return proxyResData;
    }
}));

// ===============================
// 🔁 SETTING UP PROXY FOR POST SERVICE
// ===============================

app.use('/v1/posts',validateToken,proxy(process.env.POST_SERVICE_URL,{
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers["Content-Type"] = "application/json";
        proxyReqOpts.headers["x-user-id"] = srcReq.user.userId
        return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
        logger.info(`Response received from Post-Service: ${proxyRes.statusCode}`);
        return proxyResData;
    }

}))

// ===============================
// 🔁 SETTING UP PROXY FOR MEDIA SERVICE
// ===============================

app.use('/v1/media',validateToken, proxy(process.env.MEDIA_SERVICE_URL,{
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers["x-user-id"] = srcReq.user.userId
        if(!srcReq.headers['content-type'].startsWith('multipart/form-data')){
            proxyReqOpts.headers["Content-Type"] = "application/json";
        }
        return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
        logger.info(`Response received from Media-Service: ${proxyRes.statusCode}`);
        return proxyResData;
    },
    parseReqBody:false
}))

// ===============================
// 🔁 SETTING UP PROXY FOR SEARCH SERVICE
// ===============================

app.use('/v1/search',validateToken, proxy(process.env.SEARCH_SERVICE_URL,{
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers["Content-Type"] = "application/json";
        proxyReqOpts.headers["x-user-id"] = srcReq.user.userId
        return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
        logger.info(`Response received from Search-Service: ${proxyRes.statusCode}`);
        return proxyResData;
    },
    parseReqBody:false
}))

// ===============================
// ❌ ERROR HANDLING
// ===============================
// Uses custom error handler middleware to catch errors
app.use(errorHandler);

// ===============================
// 🚀 START THE SERVER
// ===============================
// The API Gateway starts listening on the specified port
app.listen(PORT, () => {
    logger.info(`API Gateway is running on port ${PORT}`);
    logger.info(`Identity-Service is running on ${process.env.IDENTITY_SERVICE_URL}`);
    logger.info(`Post-Service is running on ${process.env.POST_SERVICE_URL}`);
    logger.info(`Media-Service is running on ${process.env.MEDIA_SERVICE_URL}`);
    logger.info(`Search-Service is running on ${process.env.SEARCH_SERVICE_URL}`);
    logger.info(`Redis is running on ${process.env.REDIS_URL}`);
});


// upto now :  How everything works: 
// 🟢 1	Client sends request to http://localhost:3000/v1/auth/register.
// 🔄 2	proxyReqPathResolver modifies the request path → /v1/auth/register becomes /api/auth/register.
// 🚀 3	The API Gateway forwards the request to http://localhost:3001/api/auth/register.
// 🔀 4	proxyReqOptDecorator ensures that the request has Content-Type: application/json.
// ✅ 5	The Identity Service processes the request and responds.
// 📜 6	userResDecorator logs the response status and forwards it back to the client.

