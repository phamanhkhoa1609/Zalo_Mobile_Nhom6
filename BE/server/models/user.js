const Mongoose = require('mongoose');
const { Schema } = Mongoose;

const UserSchema = new Schema({
  username: String,
  password: String,
  email: String,
  phoneNumber: {
    type: String,
    default: "",
  },
  displayName: {
    type: String,
    default: "anonymous",
  },
  gender: String,
  dateOfBirth: {
    type: Date,
    default: Date.now,
  },
  photoURL: {
    type: String,
    default: "",
  },
  thumbnailURL: {
    type: String,
    default: "",
  },
  theme: {
    type: String,
    default: "light",
  },
  isOnline: {
    type: Boolean,
    default: true,
  },
  lastOnlineTime: {
    type: Date,
    default: Date.now,
  },
  enable: {
    type: Boolean,
    default: true,
  },
  verificationCode: {
    type: String,
    default: "",
  },
  createAt: {
    type: Date,
    default: Date.now,
  },
  updateAt: {
    type: Date,
    default: Date.now,
  },
  friends: {
    type: [Schema.Types.ObjectId],
    default: [],
  },
  friendsRequest: {
    type: [Schema.Types.ObjectId],
    default: [],
  },
  requestsSent: {
    type: [Schema.Types.ObjectId],
    default: [],
  },

  blockedUsers: {
    type: [Schema.Types.ObjectId],
    default: [],
  },
  directs: {
    type: [Schema.Types.ObjectId],
    default: [],
  },
  groupDetails: {
    type: [Schema.Types.ObjectId],
    default: [],
  },
});

// UserSchema.methods.getDirects = () => {
//   return this.directs;
// }

module.exports = Mongoose.model('User', UserSchema, 'users');
