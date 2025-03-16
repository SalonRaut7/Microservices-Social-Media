const mongoose = require('mongoose')

const refreshTokenSchema = new mongoose.Schema({
    token: {
        type:String,
        required: true,
        unique: true
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expiresAt: {
        type:Date,
        required: true
    },
},{
    timestamps: true
})


// This line is creating an index on the expiredAt field and telling MongoDB to automatically delete the document when the expiration time is reached.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });


const RefreshToken = mongoose.model('RefreshToken',refreshTokenSchema)
module.exports = RefreshToken;