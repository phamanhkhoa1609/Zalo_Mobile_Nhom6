const jwt = require("jsonwebtoken");
const express = require("express");
const bodyParser = require("body-parser");
const ApiCode = require("../utils/apicode");
const mongoose = require("mongoose");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const validator = require("validator");
const Direct = require("../models/direct");
const ChatRoom = require("../models/chatRoom");
const Group = require("../models/group");
const nodemailer = require("nodemailer");

const { getGroupIdsByUserId } = require("./groupController");
const Joi = require("joi");
const Message = require("../models/message");

const app = express();
app.use(bodyParser.json());

const apiCode = new ApiCode();

const multer = require("multer");
require("dotenv").config();
const AWS = require("aws-sdk");
const { S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION } =
  process.env;
const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});
// cap nhap anh đưa lên s3 anh đai diên

//user management
const createToken = (user) => {
  const jwtkey = process.env.JWT_SECRET_KEY;
  return jwt.sign({ id: user.id, username: user.username }, jwtkey, {
    expiresIn: "3d",
  });
};
const registerUser = async (req, res) => {
  try {
    // Retrieve the email from session
    const { password, email, displayName, dateOfBirth } = req.body;
    // Kiểm tra xem các trường thông tin có được cung cấp không
    if (!password || !displayName || !dateOfBirth)
      return res
        .status(400)
        .json({ success: false, message: "Không được để trống các field" });
    // Kiểm tra định dạng của email
    if (!validator.isEmail(email))
      return res
        .status(400)
        .json({ success: false, message: "Email không hợp lệ!" });
    // Kiểm tra mật khẩu có đủ mạnh không
    if (!validator.isStrongPassword(password))
      return res
        .status(400)
        .json({ success: false, message: "Mật khẩu chưa phù hợp" });
    // Kiểm tra ngày sinh nhật có đủ 15 tuổi không
    const birthDate = new Date(dateOfBirth);
    const currentDate = new Date();
    const age = currentDate.getFullYear() - birthDate.getFullYear();
    if (
      age < 15 ||
      (age === 15 &&
        (currentDate.getMonth() < birthDate.getMonth() ||
          (currentDate.getMonth() === birthDate.getMonth() &&
            currentDate.getDate() < birthDate.getDate())))
    ) {
      return res.status(400).json({
        success: false,
        message: "Bạn phải ít nhất 15 tuổi để đăng ký",
      });
    }
    // Tạo một user mới và lưu vào cơ sở dữ liệu
    user = new User({
      password,
      email,
      displayName,
      dateOfBirth,
      photoURL:
        "https://res.cloudinary.com/dfvuavous/image/upload/v1744729521/mh7yvzr5xtsta96uyh1q.jpg",
    });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    await user.save();
    // Tạo token và gửi lại cho client
    const token = createToken(user);
    res.status(200).json({
      _id: user._id,
      password,
      email,
      displayName,
      dateOfBirth,
      photoURL: user.photoURL,
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);
  try {
    // Kiểm tra xem email có hợp lệ không
    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json("Email không hợp lệ");
    }
    // Tìm kiếm người dùng theo email
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json("Không tìm thấy người dùng");

    // So sánh mật khẩu đã hash với mật khẩu nhập vào
    console.log(password, user.password);
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log(password, user.password, isValidPassword);
    if (!isValidPassword) return res.status(400).json("Mật khẩu không hợp lệ");

    // Nếu mọi thứ hợp lệ, tạo token và gửi lại cho client
    const token = createToken(user);
    // const test = res.cookie('jwt', tokens, { httpOnly: true }); // save token in a httpOnly cookie
    // console.log(test);
    return res.status(200).json({ _id: user._id, email, token });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};
const changePassword = async (req, res) => {
  // Kiểm tra xem token JWT đã được gửi kèm theo yêu cầu không

  // Giải mã token JWT để lấy thông tin người dùng
  const userId = req.user.id;
  console.log("====================================");
  console.log(userId);
  console.log("====================================");
  // Lấy thông tin người dùng từ cơ sở dữ liệu
  const user = await User.findById(userId);
  if (!user) {
    return res
      .status(400)
      .json({ success: false, message: "Người dùng không tồn tại" });
  }

  // Lấy mật khẩu hiện tại từ yêu cầu
  const { currentPassword, newPassword } = req.body;
  console.log("====================================");
  console.log("====================================");
  // So sánh mật khẩu hiện tại đã hash với mật khẩu hiện tại nhập vào
  const isValidPassword = await bcrypt.compare(currentPassword, user.password);
  if (!isValidPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Mật khẩu hiện tại không chính xác" });
  }

  // Kiểm tra xem mật khẩu mới có trùng với mật khẩu cũ không
  const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
  if (isSameAsCurrent) {
    return res
      .status(400)
      .json({ success: false, message: "Mật khẩu mới phải khác mật khẩu cũ" });
  }
  if (!validator.isStrongPassword(newPassword))
    return res
      .status(400)
      .json({ success: false, message: "Mật khẩu phải mạnh..." });
  // Hash mật khẩu mới
  const salt = await bcrypt.genSalt(10);
  const hashedNewPassword = await bcrypt.hash(newPassword, salt);

  // Cập nhật mật khẩu mới vào cơ sở dữ liệu
  user.password = hashedNewPassword;
  await user.save();

  return res
    .status(200)
    .json({ success: true, message: "Mật khẩu đã được thay đổi thành công" });
};
const resetPassword = async (req, res) => {
  const id = req.params["id"];
  const token = req.params["token"];
  const { password } = req.body;
  const salt = await bcrypt.genSalt(10);

  jwt.verify(token, "jwt_secret_key", (err, decoded) => {
    if (err) {
      return res.json({ Status: "Error with token" });
    } else {
      bcrypt
        .hash(password, salt)
        .then((hash) => {
          User.findByIdAndUpdate({ _id: id }, { password: hash })
            .then((u) => res.send({ Status: "Success" }))
            .catch((err) => res.send({ Status: err }));
        })
        .catch((err) => res.send({ Status: err }));
    }
  });
};
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  // Kiểm tra xem email có được cung cấp không
  if (!email) {
    return res.status(400).send({ Status: "Email rỗng" });
  }

  // Kiểm tra cú pháp email
  const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).send({ Status: "Sai định dạng email" });
  }

  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(404).json({ Status: "Người dùng không tồn tại" });
    }

    const token = jwt.sign({ id: user._id }, "jwt_secret_key", {
      expiresIn: "1d",
    });

    // Cấu hình Nodemailer
    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // URL cho trang đặt lại mật khẩu - thay thế bằng URL của frontend thực tế
    // Sử dụng process.env.FRONTEND_URL hoặc URL cố định cho môi trường development
    const resetUrl = `http://localhost:3001/reset-password/${user._id}/${token}`;

    // Tạo email với nội dung phù hợp
    var mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: "Đặt lại mật khẩu Zalo",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #0068ff;">Đặt lại mật khẩu Zalo</h2>
          <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản Zalo của mình.</p>
          <p>Vui lòng nhấp vào liên kết dưới đây để đặt lại mật khẩu:</p>
          <p><a href="${resetUrl}" style="background-color: #0068ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Đặt lại mật khẩu</a></p>
          <p>Hoặc sao chép liên kết này vào trình duyệt của bạn:</p>
          <p>${resetUrl}</p>
          <p>Liên kết này sẽ hết hạn sau 24 giờ.</p>
          <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        </div>
      `,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log("Email error:", error);
        return res.status(500).json({
          Status: "Error",
          message:
            "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.",
        });
      } else {
        console.log("Email sent:", info.response);
        return res.status(200).json({
          Status: "Success",
          message:
            "Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư của bạn.",
        });
      }
    });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      Status: "Error",
      message: "Đã xảy ra lỗi. Vui lòng thử lại sau.",
    });
  }
};

const getUser = async (req, res) => {
  const id = req.params.id;
  try {
    const objectId = new mongoose.Types.ObjectId(id);
    const user = await User.findById(objectId);
    user.friends()[({}, {})];
    if (!user) {
      // return res.status(404).json({ message: 'User not found' });
    }
    console.log(user);
    return res.json(user);
  } catch (err) {
    console.error(err);
    // return res.status(500).json({ message: 'Server error' });
  }
};

//Profile management
const getProfile = async (req, res) => {
  const user = await User.findById(req.user.id);
  const data = {
    name: user.displayName,
    email: user.email,
    gender: user.gender,
    dob: user.dateOfBirth
      .toISOString()
      .split("T")[0]
      .split("-")
      .reverse()
      .join("-"),
    phone: user.phoneNumber,
    avatar: user.photoURL,
  };
  return res.json(apiCode.success(data, "Get Profile Success"));
};
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
const filterObj = (obj, ...allowedFields) => {
  const filtered = {};
  Object.keys(obj).forEach((key) => {
    if (allowedFields.includes(key)) {
      filtered[key] = obj[key];
    }
  });
  return filtered;
};

// Define a schema for user data validation
const userSchema = Joi.object({
  displayName: Joi.string().required(),
  dateOfBirth: Joi.date().iso().required(),
  phoneNumber: Joi.string()
    .pattern(/^(08|09|05|03|07)[0-9]{8}$/)
    .required(), // Validate for 10-digit phone number
});

const updateUser = catchAsync(async (req, res, next) => {
  const { displayName, dateOfBirth, phoneNumber } = {
    displayName: req.body.name,
    dateOfBirth: req.body.dob.split("-").reverse().join("-"),
    phoneNumber: req.body.phone,
  };
  console.log({ displayName, dateOfBirth, phoneNumber });
  try {
    const { error, value } = userSchema.validate({
      displayName,
      dateOfBirth,
      phoneNumber,
    });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    // Check if the provided values differ from the old values
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      displayName == user.displayName &&
      dateOfBirth == user.dateOfBirth.toISOString() &&
      phoneNumber == user.phoneNumber
    ) {
      return res.status(400).json({ message: "No changes detected" });
    }

    // Check if the phone number and date of birth already exist in the database for other users
    const existingPhoneUser = await User.findOne({ phoneNumber });
    if (existingPhoneUser && existingPhoneUser._id.toString() !== req.user.id) {
      console.log("Phone number already exists");
      return res.status(400).json({ message: "Phone number already exists" });
    }

    // If the phone number and date of birth are not being updated, proceed with updating the user
    const filteredBody = filterObj(
      value,
      "displayName",
      "dateOfBirth",
      "phoneNumber"
    );

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      }
    );

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Server error" });
  }
});
const storage = multer.memoryStorage({
  destination(req, file, callback) {
    callback(null, "");
  },
});
const path = require("path");
const upload = multer({
  storage,
  limits: { fileSize: 2000000 },
  fileFilter(req, file, cb) {
    checkFileType(file, cb);
  },
}).single("avatar");
function checkFileType(file, cb) {
  const fileTypes = /jpeg|jpg|png|gif/;

  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = fileTypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  }
  return cb("Error: Pls upload images /jpeg|jpg|png|gif/ only!");
}
const updateAvatar = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.log("Error uploading image:", err);
      return res.status(500).json({ message: "Failed to upload image" });
    }
    const id = req.user.id;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const filePath = `${Date.now().toString()}-${file.originalname}`;
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: filePath,
      Body: file.buffer,
      ACL: "public-read",
      ContentType: file.mimetype,
    };

    s3.upload(params, async (err, data) => {
      if (err) {
        console.log("Error uploading image:", err);
        return res.status(500).json({ message: "Failed to upload image" });
      }
      console.log("Image uploaded successfully:", data.Location);
      const user = await User.findByIdAndUpdate(
        id,
        { photoURL: data.Location },
        { new: true }
      );
      console.log(user);
      res.status(200).json({ data: user });
    });
  });
};

//friend management
const searchUser = async (req, res) => {
  const phone = req.body.searchTerm;
  try {
    const user = await User.findOne({
      phoneNumber: phone,
      _id: { $ne: req.user.id },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const data = {
      _id: user._id,
      name: user.displayName,
      email: user.email,
      gender: user.gender,
      dob: user.dateOfBirth
        .toISOString()
        .split("T")[0]
        .split("-")
        .reverse()
        .join("-"),
      phone: user.phoneNumber,
      avatar: user.photoURL,
      isFriend: user.friends.includes(req.user.id),
      sent: user.friendsRequest.includes(req.user.id),
    };
    console.log(data);
    return res.status(200).json(apiCode.success(data, "Search User Success"));
  } catch (error) {
    console.error("Error searching user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const searchMessage = async (req, res) => {
  const searchTerm = req.body.searchTerm;
  try {
    // Check if req.user exists and contains the necessary details

    // Retrieve directs from the user object
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
    const directs = currentUser.directs;
    console.log("Directs:", directs);
    // Initialize an array to store chat items
    let chatItems = [];

    // Iterate over directs
    for (const directId of directs) {
      // Find the corresponding direct
      const direct = await Direct.findById(directId);

      // If direct exists
      if (direct) {
        // Find the corresponding chat room for the direct
        const chatRoom = await ChatRoom.findById(direct.chatRoomId);

        // If chat room exists
        if (chatRoom) {
          // Iterate over messages in the chat room
          for (const messageId of chatRoom.messages) {
            // Find the message
            const message = await Message.findById(messageId);

            // If message contains the searchTerm
            if (message && message.content.includes(searchTerm)) {
              // Find the sender's details
              const sender = await User.findById(message.senderID);

              // If sender exists
              if (sender) {
                // Add chat item to the list
                chatItems.push({
                  displayName: sender.displayName,
                  photoURL: sender.photoURL,
                  context: message.content,
                });
              }
            }
          }
        }
      }
    }

    // Return the chat items containing the searchTerm
    return res.status(200).json({ chatItems });
  } catch (error) {
    console.error("Error searching messages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const searchUserName = async (req, res) => {
  const searchTerm = req.body.searchTerm;
  try {
    // Find the currently logged-in user
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the friends of the currently logged-in user whose displayName matches the searchTerm
    const users = await User.find({
      _id: { $in: currentUser.friends }, // Search within the list of friends
      displayName: { $regex: searchTerm, $options: "i" },
    });

    // Iterate through each user to find their last message
    const usersWithLastMessage = await Promise.all(
      users.map(async (user) => {
        // Find the last message sent by this user
        const lastMessage = await Message.findOne({ senderID: user._id })
          .sort({ createdAt: -1 }) // Sort messages by createdAt in descending order to get the last message
          .limit(1);

        return {
          _id: user._id,
          displayName: user.displayName,
          photoURL: user.photoURL,
          lastMessage: lastMessage ? lastMessage.content : null, // If there's a last message, get its content, otherwise, set to null
        };
      })
    );

    // Return the users with their last messages
    return res.status(200).json({ users: usersWithLastMessage });
  } catch (error) {
    console.error("Error searching users by name:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const addFriend = async (req, res) => {
  const friendId = req.body.userInfo._id;
  try {
    const user = await User.findById(req.user.id);
    const friend = await User.findById(friendId);
    console.log(friend);
    if (!friend) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.friends.includes(friendId)) {
      return res.status(400).json({ message: "User is already your friend" });
    }
    if (friend.friendsRequest.includes(user._id)) {
      return res.status(400).json({ message: "Friend request already sent" });
    }
    friend.friendsRequest.push(user._id);
    user.requestsSent.push(friendId);
    await friend.save();
    await user.save();
    res.status(200).json(apiCode.success({}, "Add Friend Success"));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const acceptFriend = async (req, res) => {
  const { email } = req.body;

  try {
    // Tìm người dùng đăng nhập
    const user = await User.findById(req.user.id);
    // Tìm người bạn theo email
    const friend = await User.findOne({ email });

    // Kiểm tra nếu không tìm thấy người bạn
    if (!friend) {
      return res.status(404).json({ message: "User not found" });
    }

    // ID của người bạn
    const friendId = friend._id;

    // Kiểm tra xem người bạn đã gửi lời mời kết bạn cho người dùng đăng nhập chưa
    if (!user.friendsRequest.includes(friendId)) {
      return res.status(400).json({ message: "No friend request found" });
    }

    // Kiểm tra nếu hai người đã là bạn bè
    if (
      user.friends.includes(friendId) &&
      friend.friends.includes(req.user.id)
    ) {
      return res.status(400).json({ message: "Already friends" });
    }

    // Tìm phòng chat chung giữa hai người dùng
    let existingDirect = false;
    let direct2 = null;
    for (let i = 0; i < user.directs.length; i++) {
      const direct = await Direct.findById(user.directs[i]);
      if (direct?.receiverId.toString() === friendId.toString()) {
        existingDirect = true;
        direct2 = direct;
        break;
      }
      console.log("direct", direct);
    }
    console.log("existingDirect", existingDirect);
    // Nếu phòng chat đã tồn tại
    if (existingDirect) {
      // Cập nhật thời gian tạo mới nhất
      direct2.createdAt = new Date();
      await direct2.save();
    } else {
      // Nếu phòng chat chưa tồn tại, tạo một phòng chat mới
      const chatRoom = new ChatRoom({
        // Cung cấp dữ liệu phù hợp cho việc tạo phòng chat
      });

      // Tạo hai bản ghi direct mới
      const newDirect = new Direct({
        chatRoomId: chatRoom._id,
        receiverId: friendId,
      });
      const newDirect2 = new Direct({
        chatRoomId: chatRoom._id,
        receiverId: user._id,
      });

      // Thêm bản ghi direct vào người dùng
      user.directs.push(newDirect);
      friend.directs.push(newDirect2);

      console.log("newDirect", newDirect);
      console.log("newDirect2", newDirect2);

      // Lưu vào cơ sở dữ liệu
      await Promise.all([chatRoom.save(), newDirect.save(), newDirect2.save()]);
    }

    // Cập nhật danh sách bạn bè
    user.friends.push(friendId);
    friend.friends.push(req.user.id);

    // Xóa lời mời kết bạn và cập nhật danh sách bạn bè
    user.friendsRequest = user.friendsRequest.filter(
      (id) => id.toString() !== friendId.toString()
    );
    friend.requestsSent = friend.requestsSent.filter(
      (id) => id.toString() !== req.user.id.toString()
    );
    friend.friendsRequest = friend.friendsRequest.filter(
      (id) => id.toString() !== req.user.id.toString()
    );

    // Lưu các thay đổi vào cả hai người dùng
    await Promise.all([user.save(), friend.save()]);

    res.status(200).json({ message: "Accept Friend Success" });
  } catch (error) {
    res.status(500).json({ message: error.toString() });
  }
};

//từ chối lời mời kết bạn
const declineFriendRequest = async (req, res) => {
  const email = req.body.email;
  try {
    const user = await User.findById(req.user.id);
    const friend = await User.findOne({ email });
    if (!friend) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.friendsRequest.includes(friend._id)) {
      return res.status(400).json({ message: "No friend request found" });
    }
    user.friendsRequest = user.friendsRequest.filter(
      (id) => id.toString() !== friend._id.toString()
    );
    friend.friendsRequest = friend.friendsRequest.filter(
      (id) => id.toString() !== user._id.toString()
    );
    friend.requestsSent = friend.requestsSent.filter(
      (id) => id.toString() !== user._id.toString()
    );
    await user.save();
    await friend.save();
    res.status(200).json(apiCode.success({}, "Decline Friend Request Success"));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//hủy lời mời kết bạn
const unfriend = async (req, res) => {
  const friendId = req.body.friendId;
  try {
    const user = await User.findById(req.user.id);
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.friends.includes(friendId)) {
      return res.status(400).json({ message: "User is not your friend" });
    }
    user.friends = user.friends.filter(
      (id) => id.toString() !== friendId.toString()
    );
    friend.friends = friend.friends.filter(
      (id) => id.toString() !== user._id.toString()
    );
    await user.save();
    await friend.save();
    res.status(200).json(apiCode.success({}, "Unfriend Success"));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//thu hồi lời mời đã gửi
const cancelFriendRequest = async (req, res) => {
  const friendId = req.body.friendId;
  try {
    const user = await User.findById(req.user.id);
    const friend = await User.findById(friendId);
    console.log(user);
    console.log(friend);
    if (!friend) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.requestsSent.includes(friendId)) {
      return res.status(400).json({ message: "No friend request found" });
    }
    user.requestsSent = user.requestsSent.filter(
      (id) => id.toString() !== friendId.toString()
    );
    friend.friendsRequest = friend.friendsRequest.filter(
      (id) => id.toString() !== user._id.toString()
    );
    await user.save();
    await friend.save();
    res.status(200).json(apiCode.success({}, "Cancel Friend Request Success"));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getAllCancelFriendRequest = async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không  tồn tại." });
    }
    const requestSent = await Promise.all(
      user.requestsSent.map(async (friendId) => {
        const friend = await User.findById(friendId);
        return {
          _id: friend._id,
          name: friend.displayName,
          email: friend.email,
          phone: friend.phoneNumber,
          avatar: friend.photoURL,
        };
      })
    );
    console.log(requestSent);
    return res
      .status(200)
      .json(
        apiCode.success(requestSent, "Get All Cancel Friend Request Success")
      );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};
const getAllFriendRequest = async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại." });
    }
    const friendRequests = await Promise.all(
      user.friendsRequest.map(async (friendId) => {
        const friend = await User.findById(friendId);
        return {
          _id: friend._id,
          name: friend.displayName,
          email: friend.email,
          phone: friend.phoneNumber,
          avatar: friend.photoURL,
          gender: friend.gender,
        };
      })
    );
    console.log(friendRequests);
    return res
      .status(200)
      .json(
        apiCode.success(
          friendRequests,
          "Lấy danh sách lời mời kết bạn thành công."
        )
      );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Đã xảy ra lỗi khi lấy danh sách yêu cầu kết bạn." });
  }
};
//check xem phải là bạn bè không
const checkFriend = async (req, res) => {
  const friendId = req.body.friendId;
  try {
    const user = await User.findById(req.user.id);
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.friends.includes(friendId)) {
      return res.status(200).json({ message: "User is your friend" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllFriend = async (req, res) => {
  // Kiểm tra xem req.user tồn tại và có thuộc tính _id không
  const userId = req.user.id;
  console.log(userId);

  try {
    // Lấy thông tin người dùng từ nguồn dữ liệu
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại." });
    }
    const friends = await User.find({ _id: { $in: user.friends } });
    const friends2 = friends.filter(
      (friend) => friend._id.toString() !== userId
    );
    return res.status(200).json(friends2);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Đã xảy ra lỗi khi lấy danh sách yêu cầu kết bạn." });
  }
};

const getUserByChatRoomId = async (req, res) => {
  const chatRoomId = req.params.chatRoomId;
  try {
    const owner = await User.findById(req.user.id);
    const group = await Group.findOne({ chatRoomId: chatRoomId });
    if (group) return res.json(apiCode.success(group, "Get Group Success"));
    owner.directs.forEach(async (directId) => {
      const direct = await Direct.findById(directId);
      if (direct?.chatRoomId.toString() === chatRoomId) {
        const user = await User.findById(direct.receiverId);
        return res.json(apiCode.success(user, "Get User Success"));
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUsersByChatRoomId = async (chatRoomId) => {
  try {
    const direct = await Direct.findOne({
      chatRoomId: chatRoomId,
    });
    console.log(direct);
  } catch (err) {
    console.error(err);
  }
};
async function getUserProfile(req, res) {
  try {
    const id = req.params.id;
    const user = await User.findById(id);
    // .populate('groups
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const groupIds = await getGroupIdsByUserId(user._id);
    const groupIds2 = await getGroupIdsByUserId(req.user.id);
    a = groupIds2.map((value) => {
      return value.toString();
    });
    console.log(a);
    const countCommonGroup = groupIds.filter((value) =>
      a.includes(value.toString())
    ).length;
    const userProfile = {
      _id: user._id,
      name: user.displayName,
      email: user.email,
      gender: user.gender,
      avatar: user.photoURL,
      thumbnailURL: user.thumbnailURL,
      dob: user.dateOfBirth
        .toISOString()
        .split("T")[0]
        .split("-")
        .reverse()
        .join("-"),
      phone: user.phoneNumber,
      countCommonGroup: countCommonGroup, // Include group IDs
    };

    res
      .status(200)
      .json(apiCode.success(userProfile, "Get User Profile Success"));
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
}
const getUserNotInGroup = async (req, res) => {
  const groupId = req.params.groupId;
  const userId = req.user.id;
  const user = await User.findById(userId);
  const users = await User.find({ _id: { $in: user.friends } });

  Group.findById(groupId)
    .then((group) => {
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      const memberIds = group.members.map((member) => member.userId.toString());
      console.log(memberIds);
      const usersNotInGroup = users.filter(
        (user) => !memberIds.includes(user._id.toString())
      );
      usersNotInGroup.forEach((user) => {
        console.log(user._id);
      });
      return res.status(200).json(usersNotInGroup);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    });
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  getProfile,
  updateUser,
  updateAvatar,
  searchUser,
  addFriend,
  acceptFriend,
  getAllFriendRequest,
  getUserByChatRoomId,
  getUserProfile,
  getUser,
  getUsersByChatRoomId,
  getAllFriend,
  getUserNotInGroup,
  changePassword,
  searchMessage,
  searchUserName,
  getAllCancelFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  unfriend,
  checkFriend,
};
