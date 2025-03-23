const Media = require("../models/Media");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger")

const handlePostDeleted = async (event) => {
    console.log(event, "eventevent")
    const {postId,mediaIds} = event;
    try {
        const mediaToDelete = await Media.find({_id :{$in: mediaIds}})
        for (const media of mediaToDelete){
            await deleteMediaFromCloudinary(media.publicId)
            await Media.findByIdAndDelete(media._id)
            logger.info(`Deleted media ${media._id} associated with this deleted post ${postId}`)
        }
        logger.info(`Processed deletion of media for postid ${postId}`)
    } catch (error) {
        logger.error(error, "Error occurred while media deletion")
        
    }
}

module.exports = { handlePostDeleted }