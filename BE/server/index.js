const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const router = require("./routes");
const cors = require("cors");
const { default: mongoose, now } = require("mongoose");
const { createMeeting } = require("./api");
const { getUsersByChatRoomId } = require("./controllers/userController");
const User = require("./models/user");

require("dotenv").config();
const port = process.env.PORT || 3000;
const mongodb_connect_string =
  process.env.MONGO_URL || "mongodb://127.0.0.1:27017/test";

// Sử dụng cors middleware ở đầu ứng dụng để gg không chặn request
app.use(cors());

// Chuyển đổi dữ liệu sang json và ngược lại
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(router);

// Khởi chạy app
mongoose
  .connect(mongodb_connect_string)
  .then(() => {
    const server = app.listen(3000, () =>
      console.log(
        "> Server is up and running on port : http://localhost:" + 3000
      )
    );
    const io = require("socket.io")(server, {
      pingTimeout: 60000,
      cors: {
        origin: "*",
      },
    });
    io.on("connection", (socket) => {
      socket.on("setup", async (userId) => {
        try {
          console.log(userId);
          userId = JSON.parse(userId);
          if (userId) {
            socket.userId = userId;
            socket.join(userId);
            const user = await User.findById(userId);
            if (user) {
              // Thực hiện các thao tác khác nếu cần
            } else {
              console.log("User not found");
            }
            socket.emit("setup", userId);
          } else {
            console.log("Invalid userId:", userId);
          }
        } catch (err) {
          console.log(err);
        }
      });
      socket.on("join chat", (room, userId) => {
        userId = JSON.parse(userId);
        socket.join(room);
        socket.emit("join chat", room);
      });

      socket.on("message", async (message, id) => {
        try {
          const parseUserId = JSON.parse(message.senderId);
          const sender = await User.findById(
            parseUserId,
            "displayName photoURL"
          );

          const now = new Date();
          const hours = now.getHours();
          const minutes = now.getMinutes();
          const time = `${hours}:${minutes}`;
          const newMessage = {
            id: id,
            senderId: parseUserId,
            senderName: sender?.displayName,
            avatarSender: sender?.photoURL,
            content: message.content,
            reply: message.reply,
            createAt: "Just now",
            time: time,
            type: message.type,
            media: message.media,
          };

          // console.log('message', newMessage);
          io.to(message.chatRoomId).emit("message", newMessage);
        } catch (error) {
          console.error("Error:", error);
        }
      });

      socket.on("delete message", (message) => {
        console.log("delete message", message);
        io.to(message.chatRoomId).emit("delete message", message);
      });

      socket.on("unsend message", (message) => {
        io.to(message.chatRoomId).emit("unsend message", {
          id: message.messageId,
        });
      });

      socket.on("react message", (message) => {
        console.log("react message", message);
        io.to(message.chatRoomId).emit("react message", message);
      });
      // socket.on('typing', (data) => {
      //   console.log('typing', data);
      //   io.to(data.chatRoomId).emit('typing', data);
      // });

      // socket.on('stop typing', (data) => {
      //   console.log('stop typing', data);
      //   io.to(data.chatRoomId).emit('stop typing', data);
      // });

      socket.on("disconnect", async () => {
        try {
          console.log("user disconnected", socket.userId);
          if (socket.userId) {
            // Tiếp tục xử lý khi socket.userId không phải là null
            const user = await User.findById(socket.userId);
            if (user) {
              user.isOnline = false;
              user.lastOnlineTime = Date.now();
              await user.save();
            } else {
              console.log("User not found");
            }
          } else {
            console.log("socket.userId is null");
          }
        } catch (err) {
          console.log(err);
        }
      });

      socket.on("call", (chatRoomId) => {
        createMeeting().then((meetingId) => {
          io.to(chatRoomId).emit("call", meetingId);
        });
      });
      // if(!socket.meetingId){
      //   createMeeting().then((meetingId) => {
      //     socket.meetingId = meetingId;
      //     console.log(meetingId)
      //     io.to(room).emit('call', meetingId);
      //   });
      // }

      socket.on("notify", async (data) => {
        console.log("Notification", data);
        io.to(data.userId).emit("notify", data);
        // const user = await getUsersByChatRoomId(data.chatRoomId);
        // console.log(user);
        // io.to(data.chatRoomId).emit('notify', data);
      });

      socket.on("accept meeting", async (data) => {
        console.log("Accept meeting", data);
        io.to(data.userId).emit("accept meeting", data);
      });

      socket.on("decline", async (data) => {
        console.log("Decline meeting", data);
        io.to(data.userId).emit("decline", data);
      });
    });
  })
  .catch((err) => console.log(err));

function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) {
    return seconds + " seconds ago";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return minutes + " minutes ago";
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours + " hours ago";
  }
  const days = Math.floor(hours / 24);
  return days + " days ago";
}
