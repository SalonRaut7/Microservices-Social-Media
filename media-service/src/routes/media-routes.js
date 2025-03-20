const express = require('express')
const multer = require('multer')

const {uploadMedia} = require('../controllers/media-controller')
const {authenticateRequest} = require('../middleware/authMiddleware')
const logger = require('../utils/logger')


const router = express.Router();

//conifguring multer for file upload

const upload = multer({
    storage: multer.memoryStorage,
    limits:{
        fileSize: 5*1024*1024 //5MB
    }

}).single('file')


router.post('/upload',authenticateRequest,(req,res,next)=>{
    upload(req,res, function(err){
        if(err instanceof multer.MulterError){
            logger.error('Multer error occurred while uploading', err)
            return res.status(400).json({
                message:'Multer error occurred while uploading',
                error: err.message,
                stack: err.stack
            })
        } else if(err){
            logger.error('Unknown error occurred while uploading', err)
            return res.status(500).json({
                message:'Unknown error occurred while uploading',
                error: err.message,
                stack: err.stack
            })
        }
        if(!req.file){
            return res.status(400).json({
                message:'No file found!',
            })
        }
        next()
    })
},uploadMedia)


module.exports = router;