const Post = require('../models/Post');
const logger = require('../utils/logger');
const { publishEvent } = require('../utils/rabbitmq');
const { validateCreatePost } = require('../utils/validation');


async function invalidatePostCache(req,input){
    if (input) {
        // If input (post ID) is provided, delete its specific cache key
        const cachedKey = `post:${input}`;
        await req.redisClient.del(cachedKey);
    }   
     // Get all keys from Redis that match the pattern 'posts:*'
    const keys = await req.redisClient.keys("posts:*")
    if(keys.length > 0){
        await req.redisClient.del(keys)

    }
}

const createPost = async (req,res) =>{
    logger.info("Create post endpoint hit ")
    try {
        const { error } = validateCreatePost(req.body);
        if(error){
            logger.warn('validation error ',error.details[0].message);
            return res.status(400).json({
                success : false,
                message: error.details[0].message
            })
        }
        const {content, mediaIds} = req.body;
        const newlyCreatedPost = new Post({
            user:req.user.userId,
            content,
            mediaIds: mediaIds || []
        })
        await newlyCreatedPost.save();
        await publishEvent('post.created',{
            postId: newlyCreatedPost._id.toString(),
            userId: newlyCreatedPost.user.toString(),
            content: newlyCreatedPost.content,
            createdAt: newlyCreatedPost.createdAt,
        })
        // Invalidate cache when a new post is created as the previous cache will be outdated.
        await invalidatePostCache(req,newlyCreatedPost._id.toString())

        logger.info(`Post created successfully ${newlyCreatedPost}`)
        res.status(201).json({
            success:true,
            message:'Post created successfully',
        });


    } catch (error) {
        logger.error(`Error creating post: ${error}`)
        res.status(500).json({
            success:false,
            message:'Error Creating Post',
        })
    }
};

const getAllPosts = async (req, res) => {
    try {
        // 1️⃣ Extract 'page' and 'limit' from query parameters
        // If not provided, default to page = 1 and limit = 10
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // 2️⃣ Calculate the starting index for pagination
        // This determines how many documents to skip
        const startIndex = (page - 1) * limit;

        // 3️⃣ Generate a unique cache key for the requested page and limit
        // Example: 'posts:1:10' for page 1 with 10 posts per page
        const cacheKey = `posts:${page}:${limit}`;

        // 4️⃣ Check if the requested page data is already cached in Redis
        const cachedPosts = await req.redisClient.get(cacheKey);

        if (cachedPosts) {
            // ✅ If cached data exists, return it immediately (faster response)
            return res.json(JSON.parse(cachedPosts));
        }

        // 5️⃣ Fetch posts from MongoDB (sorted by newest first)
        // Apply pagination using 'skip()' and 'limit()'
        const posts = await Post.find({})
            .sort({ createdAt: -1 }) // Sort posts from newest to oldest
            .skip(startIndex) // Skip previous pages' posts
            .limit(limit); // Limit the number of posts per page

        // 6️⃣ Get total number of posts in the database (for pagination metadata)
        const totalNoOfPosts = await Post.countDocuments();

        // 7️⃣ Prepare the response object containing posts & pagination info
        const result = {
            posts,
            currentPage: page,
            totalPages: Math.ceil(totalNoOfPosts / limit),
            totalPosts: totalNoOfPosts
        };

        // 8️⃣ Store the fetched data in Redis cache for faster future access
        // The data expires in 300 seconds (5 minutes)
        await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

        // 9️⃣ Send the response to the client
        res.json(result);

    } catch (error) {
        // 🔴 Handle errors gracefully and log them for debugging
        logger.error(`Error fetching posts: ${error}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching posts',
        });
    }
};


const getPost = async (req,res) =>{
    try {
        const postId = req.params.id;
        const cachekey = `posts:${postId}`;
        const cachedPost = await req.redisClient.get(cachekey);
        if(cachedPost){
            return res.json(JSON.parse(cachedPost));
        }

        const singlePostDetailsbyId = await Post.findById(postId)
        if(!singlePostDetailsbyId){
            return res.status(404).json({
                success: false,
                message: 'post not found'
            })
        }
        await req.redisClient.setex(cachekey,3600, JSON.stringify(singlePostDetailsbyId))
        return res.json(singlePostDetailsbyId)
    } catch (error) {
        logger.error(`Error fetching post: ${error}`)
        res.status(500).json({
            success:false,
            message:'Error fetching post by ID',
        })
    }
}

const deletePost = async (req,res) =>{
    try {
        const post = await Post.findOneAndDelete({
            _id:req.params.id,
            user:req.user.userId
        })
        if(!post){
            return res.status(404).json({
                success: false,
                message: 'post not found'
            })
        }

        //publish post delete event
        await publishEvent('post.deleted',{
            postId: post._id.toString(),
            userId:req.user.userId,
            mediaIds:post.mediaIds
        })
        
        await invalidatePostCache(req,req.params.id)
        res.json({
            success:true,
            message:'Post deleted successfully',
        });
        
    } catch (error) {
        logger.error(`Error deleting post: ${error}`)
        res.status(500).json({
            success:false,
            message:'Error deleting post',
        })
    }
}


module.exports = { createPost, getAllPosts, getPost, deletePost}