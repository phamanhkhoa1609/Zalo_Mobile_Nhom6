const Mongoose = require('mongoose');
const { Schema, Types } = Mongoose;

const chatRoomSchema = new Schema({
    active: {
        type: Boolean,
        default: true
    },
    thumbnailURL: {
        type: String,
        default: ''
    },
    lastMessage: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    messages: [
        {
            type: Types.ObjectId,
            ref: 'Message'
        }
    ]
});

module.exports = Mongoose.model('ChatRoom', chatRoomSchema, 'chatRooms');