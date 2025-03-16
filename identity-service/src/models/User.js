const mongoose = require('mongoose');
const argon2 = require('argon2');


const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,    // Removes extra spaces at the beginning/end
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase:true
    },
    password: {
        type: String,
        required: true,
    },
    createdAt:{
        type: Date,
        default: Date.now
    },
}, {
    timestamps:true,
}
);

//Hashing passwords before saving (middleware)
userSchema.pre('save',async function(next){
    if(this.isModified('password')){  // If password is changed or new
        try {
            this.password = await argon2.hash(this.password)
        } catch (error) {
            return next(error) // Pass error to next middleware
        }
    }
})

// custom password verification method 
userSchema.methods.comparePassword = async function(candidatePassword){
    try {
        return await argon2.verify(this.password, candidatePassword)
    } catch (error) {
        throw error
    }
}


// Creating a Text Index for Search

userSchema.index({username: 'text '});

const User = mongoose.model("User",userSchema);
module.exports = User;