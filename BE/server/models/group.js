const Mongoose = require('mongoose');
const { Schema, Types } = Mongoose;

const GroupSchema = new Schema({
  name: {
    type: String,
    default: 'New Group'
  },
  ownerId: {
    type: Types.ObjectId,
    default: null
  },
  photoURL: {
    type: String,
    default: ''
  },
  chatRoomId: {
    type: Types.ObjectId,
    ref: 'ChatRoom'
  },
  members: [
    {
      userId: {
        type: Types.ObjectId,
        ref: 'User'
      },
      addByUserId: {
        type: Types.ObjectId,
        ref: 'User'
      },
      roles: {
        type: Array,
        default: []
      },
      addAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
});

module.exports = Mongoose.model('Group', GroupSchema, 'groups');
