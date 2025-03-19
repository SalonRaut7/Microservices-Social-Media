const logger = require('../utils/logger')
const User = require('../models/User')
const { validateRegistration, validateLogin } = require('../utils/validation')
const generateTokens = require('../utils/generateToken')
const RefreshToken = require('../models/RefreshToken')

//User Registration
const registerUser = async (req, res) => {
    logger.info('Registration endpoint hit...')
    try {
       //validate the schema
       const { error } = validateRegistration(req.body);
       if(error){
            logger.warn('validation error ',error.details[0].message);
            return res.status(400).json({
                success : false,
                message: error.details[0].message
            })
        }
        const {email, password, username}= req.body
        let user = await User.findOne({ $or : [{email}, {username}]});
        if(user){
            logger.warn('User already exists');
            return res.status(400).json({
                success : false,
                message: 'User already exists'
            });
        }
        user = new User({username,email,password});
        await user.save()
        logger.warn('User saved succesfully',user._id);

        const {accessToken, refreshToken} = await generateTokens(user)
        res.status(201).json({
            success : true,
            message: 'User registered successfully!',
            accessToken,
            refreshToken
        })
    } catch (error) {
        logger.error('Registration Error occurred', error);
        return res.status(500).json({
            success : false,
            message: 'Internal server error'
        })
    }
}

// User Login:

const loginUser = async(req,res) => {
    logger.info('Login endpoint hit...')
    try {
        const {error} = validateLogin(req.body)
        if(error){
            logger.warn('validation error ',error.details[0].message);
            return res.status(400).json({
                success : false,
                message: error.details[0].message
            })
        }
        const {email, password}= req.body
        const user = await User.findOne({email});
        if(!user){
            logger.warn("Invalid User")
            res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            })
        }

        const isValidPassword = await user.comparePassword(password);
        if(!isValidPassword){
            logger.warn("Invalid password")
            res.status(400).json({
                success: false,
                message: 'Invalid password'
            })
        }

        const {accessToken, refreshToken} = await generateTokens(user)
        res.json({
            accessToken,
            refreshToken,
            userId: user._id
        })

    } catch (error) {
        logger.error('Login Error occurred', error);
        return res.status(500).json({
            success : false,
            message: 'Internal server error'
        })
    }
}

// refresh token generating endpoint (as our refresh token expires in 7 days), we can create refreshtoken again with this endpoint

const refreshTokenUser = async(req,res) => {
    logger.info('Refresh Token endpoint hit...')
    try {
        const {refreshToken} = req.body
        if(!refreshToken){
            logger.warn("Refresh Token missing")
            return res.status(400).json({
                success:false,
                message:'Refresh Token missing'
            })
        }

        const storedToken = await RefreshToken.findOne({token:refreshToken})
        if(!storedToken || storedToken.expiresAt < new Date()){
            logger.warn("Invalid or expired refresh token")
            return res.status(401).json({
                success:false,
                message:"Invalid or expired refresh token"
            })
        }

        const user= await User.findById(storedToken.user)
        if(!user){
            logger.warn("user not found")
            return res.status(401).json({
                success:false,
                message:"user not found"
            })
        }
        const {accessToken: newAccessToken, refreshToken:newRefreshToken} = await generateTokens(user)
        //delete the old token
        await RefreshToken.deleteOne({_id: storedToken._id})
        res.json({
            accessToken:newAccessToken,
            refreshToken:newRefreshToken,
        })
    } catch (error) {
        logger.error('Refresh Token Error occurred', error);
        return res.status(500).json({
            success : false,
            message: 'Internal server error'
        })
    }
}

//logout

const logoutUser = async (req,res)=>{
    logger.info('logout endpoint hit...')
    try {
        const {refreshToken} = req.body
        if(!refreshToken){
            logger.warn("Refresh Token missing")
            return res.status(400).json({
                success:false,
                message:'Refresh Token missing'
            })
        }

        await RefreshToken.deleteOne({token:refreshToken})
        logger.info('Refresh Token deleted for logout')
        return res.json({
            success : true,
            message: 'Logged Out successfully'
        })
        
    } catch (error) {
        logger.error('Error while logging out', error);
        return res.status(500).json({
            success : false,
            message: 'Internal server error'
        })
    }
}

module.exports = {registerUser, loginUser,refreshTokenUser, logoutUser};
