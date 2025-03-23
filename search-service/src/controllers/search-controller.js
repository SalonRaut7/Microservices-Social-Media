const Search = require("../models/Search");
const logger = require("../utils/logger");

const searchPostController = async (req, res) => {
    logger.info("Search endpoint hit!");
    try {
        const { query } = req.query;
        const redisClient = req.redisClient; // ✅ Get Redis client from request object

        const cacheKey = `search:${query}`;

        // 🔍 Check Redis cache first
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
            logger.info(`Cache hit for query: ${query}`);
            return res.json(JSON.parse(cachedResult)); // Return cached search results
        }

        // 🔍 If cache miss, query MongoDB
        const result = await Search.find(
            { $text: { $search: query } },
            { score: { $meta: "textScore" } }
        )
            .sort({ score: { $meta: "textScore" } })
            .limit(10);

        // 🟢 Store search results in Redis (cache for 1 hour)
        await redisClient.setex(cacheKey, 3600, JSON.stringify(result));
        logger.info(`Cached search results for query: ${query}`);

        return res.json(result);
    } catch (error) {
        logger.error(`Error while searching post: ${error}`);
        res.status(500).json({
            success: false,
            message: "Error while searching post"
        });
    }
};

// Function to invalidate post cache
async function invalidatePostCache(redisClient, input) {
    if (input) {
        // If input (post ID) is provided, delete its specific cache key
        const cachedKey = `post:${input}`;
        await redisClient.del(cachedKey);
    }   

    // Get all keys from Redis that match the pattern 'posts:*'
    const keys = await redisClient.keys("posts:*");
    if (keys.length > 0) {
        await redisClient.del(keys);
    }
}

module.exports = { searchPostController, invalidatePostCache };
