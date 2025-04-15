const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true,
    },
    email:{
        type: String,
        required: true,
    },
    password:{
        type: String,
        required: true,
    },
    contact:{
        type: Number,
        required: true,
    },
    dob:{
        type: Date,
        required: true,
    },
    gender:{
        type: String,
        required: true,
    }
});

const User = mongoose.model("user", userSchema);
module.exports = User;