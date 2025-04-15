const Direct = require('../models/direct');
const ApiCode = require("../utils/apicode");
const apiCode = new ApiCode();
const ChatRoom = require('../models/chatRoom');
const getChatRoom = async (req, res) => {
    const id = req.params.id;

    try {
        const chatRoom = await ChatRoom.findById(id);
        if (!chatRoom) {
            return res.status(404).json(apiCode.error('ChatRoom not found'));
        }

        res.status(200).json(apiCode.success(chatRoom, 'Get ChatRoom Success'));
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getChatRoomByDirectId = async (req, res) => {
    const directId = req.params.directId;
    const direct = await Direct.findById(directId);
    try{
        const chatRoom = await ChatRoom.findById(direct.chatRoomId);
        res.status(200).json(apiCode.success(chatRoom, 'Get ChatRoom Success'));
    }catch (error) {
        res.status(500).json(apiCode.error('Get ChatRoom Failed'));
    }
};

module.exports = {
    getChatRoom,
    getChatRoomByDirectId
};