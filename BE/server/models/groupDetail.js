const Mongoose = require('mongoose');
const { Schema, Types } = Mongoose;

const GroupDetailSchema = new Schema({
    groupId: {
        type: Types.ObjectId,
        ref: 'Group'
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    isMuted: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    unreadMessageCount: {
        type: Number,
        default: 0
    }
  });

module.exports = Mongoose.model('GroupDetail', GroupDetailSchema, 'groupDetails');