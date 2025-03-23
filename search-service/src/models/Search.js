const mongoose = require('mongoose')

const SearchPostSchema = new mongoose.Schema({
    postId : {
        type: String,
        required:true,
        unique:true
    },
    userId:{
        type: String,
        required:true,
        index:true
    },
    content:{
        type: String,
        required:true,
    },
    createdAt:{
        type:Date,
        required:true,

    }
},{timestamps:true});

SearchPostSchema.index({content: 'text'})
SearchPostSchema.index({createdAt: -1})

const Search = mongoose.model('Search',SearchPostSchema)

module.exports = Search;
