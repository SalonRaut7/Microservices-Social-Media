const logger = require('../utils/logger')
const User = require('../models/User')
const { validateRegistration } = require('../utils/validation')
const generateTokens = require('../utils/generateToken')

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


module.exports = {registerUser};
