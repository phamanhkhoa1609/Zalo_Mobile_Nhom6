const Mongoose = require('mongoose');
const { Schema, Types } = Mongoose;

const DirectSchema = new Schema({
    chatRoomId: {
        type: Types.ObjectId,
        ref: 'ChatRoom'
    },
    receiverId: {
        type: Types.ObjectId,
        ref: 'User'
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    isMuted: {
        type: Boolean,
        default: false
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    unreadMessageCount: {
        type: Number,
        default: 0
    }
  });

module.exports = Mongoose.model('Direct', DirectSchema, 'directs');
