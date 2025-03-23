const Search = require('../models/Search');
const logger = require('../utils/logger');
const { invalidatePostCache } = require('../controllers/search-controller');
async function handlePostCreated(event, redisClient) {
    try {
        // Create a new search post
        const newSearchPost = new Search({
            postId: event.postId,
            userId: event.userId,
            content: event.content,
            createdAt: event.createdAt
        });

        // Save the new search post to the database
        await newSearchPost.save();
        logger.info(`Search post created: ${event.postId}, ${newSearchPost._id.toString()}`);

        // Invalidate cache after creating a new post
        await invalidatePostCache(redisClient, newSearchPost.postId); // Pass redisClient here
        logger.info(`Cache invalidated for post ID: ${event.postId}`);
    } catch (error) {
        logger.error('Error handling post creation event', error);
    }
}

async function handlePostDeleted(event, redisClient) {
    try {
        // Delete the corresponding search post
        const deletedPost = await Search.findOneAndDelete({ postId: event.postId });
        
        if (deletedPost) {
            logger.info(`Search post deleted: ${event.postId}`);

            // Invalidate cache after deleting a post
            await invalidatePostCache(redisClient, event.postId); // Pass redisClient here
            logger.info(`Cache invalidated for post ID: ${event.postId}`);
        } else {
            logger.warn(`Post not found for deletion: ${event.postId}`);
        }
    } catch (error) {
        logger.error('Error handling post deletion event', error);
    }
}

module.exports = { handlePostCreated, handlePostDeleted };