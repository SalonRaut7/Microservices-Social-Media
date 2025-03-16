const jwt = require('jsonwebtoken')
const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');

/**
 * Function to generate access and refresh tokens for a user
 * @param {Object} user - The user object containing at least `_id` and `username`
 * @returns {Object} - An object containing `accessToken` and `refreshToken`
 */

const generateTokens = async (user) => {
    const accessToken = jwt.sign({
        userId: user._id,
        username: user.username
    },process.env.JWT_SECRET, {expiresIn:'10m'})

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // refresh token expires in 7 days

    await RefreshToken.create({
        token:refreshToken,
        user: user._id,  // Reference to the user who owns this token
        expiresAt
    });

    return {accessToken,refreshToken}

}

module.exports = generateTokens;