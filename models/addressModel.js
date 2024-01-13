const mongoose = require("mongoose")
const { ObjectId } = require('mongodb')

const addressschema = new mongoose.Schema({
    user: {
        type: String,
        ref: "users",
        required: true,

    },

    address: [{
        firstname: {
            type: String,
            required: true
        },
        lastname: {
            type: String,
            required: true

        },
        country: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
        },
        pin: {
            type: Number,
            required: true
        },
        phone: {
            type: Number,
            required: true
        },
        email: {
            type: String,
            required: false
        }
        
    }]

})


module.exports = mongoose.model("address", addressschema)