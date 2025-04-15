const Direct = require('../models/direct');
const ApiCode = require("../utils/apicode");
const apiCode = new ApiCode();
const User = require('../models/user');
const ChatRoom = require('../models/chatRoom');
const Message = require('../models/message');
const Group = require('../models/group');
const GroupDetail = require('../models/groupDetail');

const getDirect = async (req, res) => {
    const id = req.params.id;

    try {
        const direct = await Direct.findById(id);
        if (!direct) {
            return res.status(404).json(apiCode.error('Direct not found'));
        }

        res.status(200).json(apiCode.success(direct, 'Get Direct Success'));
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const getDirects = async (req, res) => {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if(user.directs.length === 0){
        return res.status(404).json(apiCode.error('Directs not found'));
    }else{
        const directs = await Direct.find({ _id: { $in: user.directs } });
        res.status(200).json(apiCode.success(directs, 'Get Directs Success'));
    };
  }

const getInfoChatItem = async (req, res) => {
    try{
        const userId = req.user.id;
        const user = await User.findById(userId);
        const directs = await Direct.find({ _id: { $in: user.directs } });
        const groupDetails = await GroupDetail.find({ _id: { $in: user.groupDetails } });
        const groups = await Group.find({ _id: { $in: groupDetails.map(groupDetail => groupDetail.groupId) } });
        let infoChatItems = [];

        // Lấy danh sách các groupIds từ groupDetails
        const groupIds = groupDetails.map(groupDetail => groupDetail.groupId);

        // Tạo một đối tượng để lưu trữ số lượng tin nhắn chưa đọc cho mỗi groupId
        const unreadMessageCounts = {};

        // Tính toán số lượng tin nhắn chưa đọc cho mỗi group
        groupDetails.forEach(groupDetail => {
            unreadMessageCounts[groupDetail.groupId] =
              groupDetail.unreadMessageCount;
        });

        const [directsResult, groupsResult] = await Promise.allSettled([
             Promise.all(directs.map(async (direct) => {
                const chatRoom = await ChatRoom.findById(direct.chatRoomId);
                const receiver = await User.findById(direct.receiverId);
                const lastMessage = await getLastMessage(chatRoom);
                // const infoChatItem =
                return {
                    idChatRoom: chatRoom._id,
                    name: receiver.displayName,
                    photoURL: receiver.photoURL,
                    lastMessage: lastMessage,
                    unreadMessageCount: direct.unreadMessageCount,
                    isOnline: user.isOnline
                };
                // infoChatItems.push(infoChatItem);
            })),

            // Lấy thông tin từng nhóm và thêm vào infoChatItems
             Promise.all(groups.map(async (group) => {
                const chatRoom = await ChatRoom.findById(group.chatRoomId);
                const lastMessage = await getLastMessage(chatRoom);
                const unreadMessageCount = unreadMessageCounts[group._id.toString()] || 0; // Lấy số lượng tin nhắn chưa đọc từ đối tượng unreadMessageCounts
                // const infoChatItem =
                return {
                    idChatRoom: group.chatRoomId,
                    name: group.name,
                    photoURL: group.photoURL, // Đảm bảo rằng Group model có trường photoURL
                    lastMessage: lastMessage,
                    unreadMessageCount: unreadMessageCount,
                    isOnline: user.isOnline
                };
                // infoChatItems.push(infoChatItem);
            }))
        ])
        // Kiểm tra xem các promise có lỗi không
        if (directsResult.status === 'rejected' || groupsResult.status === 'rejected')
            console.log(directsResult.reason);
        for (let i = 0; i < directs.length; i++) {
            const direct = directs[i];
            const chatRoom = await ChatRoom.findById(direct.chatRoomId);
            const receiver = await User.findById(direct.receiverId);
            const lastMessageId = chatRoom.lastMessage? chatRoom.lastMessage : null;
            let lastMessage;
            if (!lastMessageId) {
                lastMessage = {
                    text: 'new chat',
                    createAt: Math.floor((Date.now() - chatRoom.createdAt)/ 1000)
                }
            }else{
                const message = await Message.findById(lastMessageId);
                if(message === null) {lastMessage = ""; }
                else{
                    lastMessage = {
                    text: message.content === '' ? 'Đã gửi một media' : message.content,
                    createAt: Math.floor((Date.now() - message.createAt)/ 1000)
                }

                function formatTime(seconds) {
                    seconds=60;
                    if (seconds < 60) {
                        return seconds + ' seconds ago';
                    }
                    const minutes = Math.floor(seconds / 60);
                    if (minutes < 60) {
                        return minutes + ' minutes ago';
                    }
                    const hours = Math.floor(minutes / 60);
                    if (hours < 24) {
                        return hours + ' hours ago';
                    }
                    const days = Math.floor(hours / 24);
                    return days + ' days ago';
                }
            }
            }
            // let unreadMessageCount = 0;
            // for (let j = 0; j < chatRoom.messages.length; j++) {
            //     if (!chatRoom.messages[j].isRead && chatRoom.messages[j].sender != userId) {
            //         unreadMessageCount++;
            //     }
            // }
            const infoChatItem = {
                idChatRoom: chatRoom._id,
                name: receiver.displayName,
                photoURL: receiver.photoURL,
                lastMessage: lastMessage,
                unreadMessageCount: direct.unreadMessageCount,
                isOnline: user.isOnline
            };
            infoChatItems.push(infoChatItem);
        }

        // Lấy kết quả từ các promise đã giải quyết
        infoChatItems = [...directsResult.value, ...groupsResult.value];

        infoChatItems.sort((a, b) => {
            if (a.lastMessage.createAt > b.lastMessage.createAt) {
                return 1;
            }
            if (a.lastMessage.createAt < b.lastMessage.createAt) {
                return -1;
            }
            return 0;
        
        });
        //format lại thời gian
        infoChatItems.forEach((item, index) => {
            item.lastMessage.createAt = "" ;
        });
        res.status(200).json(apiCode.success(infoChatItems, 'Get Infos Chat Item Success'));
    }catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Hàm hỗ trợ để lấy thông tin của tin nhắn cuối cùng từ một chat room
async function getLastMessage(chatRoom) {
    const lastMessageId = chatRoom.lastMessage ? chatRoom.lastMessage : null;
    if (!lastMessageId) {
        return {
            text: 'new chat',
            createAt:  Math.floor((Date.now() - chatRoom.createdAt)/ 1000)// Hoặc bạn có thể trả về một giá trị thời gian mặc định khác
        };
    } else {
        const message = await Message.findById(lastMessageId);
        if(message === null){
            return null;
        }
        else{
            const formattedTime = Math.floor((Date.now() - message.createAt)/ 1000);
            const text = message.content === '' ? 'Đã gửi một media' : message.content;
            return { text:text, createAt: formattedTime };

        }
    }
}

function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) {
        return seconds + ' seconds ago';
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return minutes + ' minutes ago';
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return hours + ' hours ago';
    }
    const days = Math.floor(hours / 24);
    return days + ' days ago';
}

module.exports = {
    getDirect,
    getDirects,
    getInfoChatItem
}