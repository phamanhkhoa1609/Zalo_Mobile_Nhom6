const Group = require('../models/group');
const User = require('../models/user');
const GroupDetail = require('../models/groupDetail');
const ChatRoom = require('../models/chatRoom');
const ApiCode = require("../utils/apicode");
const Roles = require('../utils/rolesEnum');
const {checkPermsOfUserInGroup} = require('../utils/permission');
const bodyParser = require('body-parser');
const express = require('express');
const { Types } = require('mongoose');
const app = express();
app.use(bodyParser.json());

const apiCode = new ApiCode();

const getGroup = async (req, res) => {
    const id = req.params.id;

    try {
        const group = await Group.findById(id);
        if (!group) {
            return res.status(404).json(apiCode.error('Group not found'));
        }
        return res.status(200).json(apiCode.success(group, 'Get Group Success'));
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getGroups = async (req, res) => {
    const userId = req.user.id;
    const user = await User.findById(userId);
    const groupDetails = await GroupDetail.find({ _id: { $in: user.groupDetails } });
    const groups = await Group.find({ _id: { $in: groupDetails.map(groupDetail => groupDetail.groupId) } });
    if(groups.length === 0){
        return res.status(404).json(apiCode.error('Groups not found'));
    }
    else{
        res.status(200).json(apiCode.success(groups, 'Get Groups Success'));
    }
};

const getGroupByGroupDetailId = async (req, res) => {
    const groupDetailId = req.params.groupDetailId;
    const group = await GroupDetail.findById(groupDetailId);
    try{
        const groups = await Group.findById(group.groupId);
        res.status(200).json(apiCode.success(groups, 'Get Group Success'));
    }
    catch (error) {
        res.status(500).json(apiCode.error('Get Group Failed'));
    }
}


const getInfoGroupItem = async (req, res) => {
    try{
        const userId = req.user.id;
        const user = await User.findById(userId);
        const groupDetails = await GroupDetail.find({ _id: { $in: user.groupDetails } });
        const groups = await Group.find({ _id: { $in: groupDetails.map(groupDetail => groupDetail.groupId) } });
        const chatRooms = await ChatRoom.find({ _id: { $in: groups.map(group => group.chatRoomId) } });

        const infoGroupItems = groups.map(group => {
            const chatRoom = chatRooms.find(chatRoom => chatRoom._id.equals(group.chatRoomId));
            return {
                idChatRoom: chatRoom._id,
                groupName: group.name,
                photoURL: group.photoURL,
                lastMessage: chatRoom.lastMessage,
                unreadMessageCount: group.numberOfUnreadMessage
            };
        })
        res.status(200).json(apiCode.success(infoGroupItems, 'Get Info Group Item Success'));
    }catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const getGroupIdsByUserId = async (userId) => {
    const user = await User.findById(userId);
    const groupDetails = await GroupDetail.find({ _id: { $in: user.groupDetails } });
    const groups = await Group.find({ _id: { $in: groupDetails.map(groupDetail => groupDetail.groupId) } });
    return groups.map(group => group._id);
};

const AWS = require('aws-sdk');

// Cấu hình AWS SDK với các thông tin cần thiết
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

const uploadImageToS3 = async (imageData) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `group_avatars/${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`, // Key là đường dẫn và tên file trên S3
    Body: imageData.buffer,
    ContentType: imageData.mimetype // Kiểu dữ liệu của hình ảnh
  };

  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.Location); // Trả về URL của ảnh trên S3
      }
    });
  });
};

const createGroup = async (req, res) => {
  try {

    const ownerId = req.user.id;
    const photo=req.file;
    const  name = req.body.name;
    const members = JSON.parse(req.body.members)
    if(!name )
      return res.status(400).json({ error: "Chưa nhập tên nhóm" })

    if (!members || members.length < 2)
      return res.status(400).json({ error: "Nhóm phải có ít nhất 3 thành viên trở lên" });

    // Thực hiện upload ảnh lên S3 nếu có
    let photoURL = '';
    if (photo) {
      photoURL = await uploadImageToS3(photo);
    }

    const existingGroups = await Group.find({ members: { $size: members.length } });

    const duplicateGroup = existingGroups.find(existingGroup => {
      const sortedExistingMembers = existingGroup.members.map(member => member.userId && member.userId.toString()).sort();
      const sortedNewMembers = members.map(member => member.userId && member.userId.toString()).sort();
      return JSON.stringify(sortedExistingMembers) === JSON.stringify(sortedNewMembers);
    });

    if (duplicateGroup) {
      return res.status(400).json({ error: "Nhóm đã tồn tại" });
    }

    const updatedMembers = members.map(memberId => ({
      userId: memberId,
      addByUserId: ownerId,
      roles: memberId === ownerId ? [Roles.OWNER] : [Roles.MEMBER],
      addAt: Date.now(),
    }));

    updatedMembers.push({
      userId: ownerId,
      addByUserId: ownerId,
      roles: [Roles.OWNER],
      addAt: Date.now(),
    });

    const chatRoom = new ChatRoom({});
    await chatRoom.save();

    const newGroup = new Group({
      name,
      ownerId,
      members: updatedMembers,
      chatRoomId: chatRoom._id,
      photoURL // Thêm URL của ảnh vào đối tượng newGroup
    });
    // console.log(newGroup);

    await newGroup.save();
    const newGroupDetail = new GroupDetail({
      groupId: newGroup._id,
      isPinned:false,
      isMuted:false,
      isDeleted:false,
      isArchived:false,
      unreadMessageCount:0
    })
    await newGroupDetail.save()
    members.push(ownerId)
    // Duyệt qua mỗi thành viên trong mảng members bằng vòng lặp for
    for (let i = 0; i < members.length; i++) {
      const memberId = members[i];
      try {
          // Tìm kiếm thông tin người dùng bằng ID
          const user = await User.findById(memberId);

          // Kiểm tra xem user có tồn tại không
          if (user) {
              // Nếu user tồn tại, thêm groupId vào field groupId của user
              user.groupDetails.push(newGroupDetail);

              // Lưu lại thông tin người dùng sau khi cập nhật
              await user.save();
          } else {
              // Xử lý trường hợp user không tồn tại
              console.error(`User with ID ${memberId} not found`);
          }
      } catch (error) {
          // Xử lý lỗi nếu có
          console.error(`Error updating user with ID ${memberId}:`, error);
      }
    }

    // console.log(newGroup);
    res.status(201).json({ message: "Nhóm đã được tạo thành công", group: newGroup });
  } catch (error) {
    console.error("Lỗi khi tạo nhóm:", error);
    res.status(500).json({ error: "Đã xảy ra lỗi khi tạo nhóm" });
  }
};

// const addMember = async (req, res) => {
//     try {
//         // Lấy ID của người đăng nhập từ JWT
//         const ownerId = req.user.id;
//         // Lấy ID của nhóm từ URL
//         const groupId = req.params.groupId;

//         // Lấy danh sách các thành viên mới từ body của yêu cầu
//         const { newMembers } = req.body;

//         // Kiểm tra tính hợp lệ của dữ liệu đầu vào
//         if (!groupId || !newMembers || newMembers.length === 0) {
//             return res.status(400).json({ error: 'Vui lòng cung cấp ID nhóm và ít nhất một thành viên mới' });
//         }

//         // Tìm nhóm dựa trên groupId
//         const group = await Group.findById(groupId);
//         console.log(checkPermsOfUserInGroup(ownerId, group).isOwner());
//         console.log(checkPermsOfUserInGroup(ownerId, group).isAdmin());
//         console.log(checkPermsOfUserInGroup(ownerId, group).canEditMember());

//         // Kiểm tra tính hợp lệ của nhóm
//         if (!group) {
//             return res.status(404).json({ error: 'Không tìm thấy nhóm' });
//         }
//         // Kiểm tra quyền thêm thành viên vào nhóm
//         if (checkPermsOfUserInGroup(ownerId, group).isOwner()
//             || checkPermsOfUserInGroup(ownerId, group).isAdmin()) {
//             return res.status(403).json({ error: 'Bạn không có quyền thêm thành viên vào nhóm này' });
//         }
//         // Lọc các thành viên mới để loại bỏ những thành viên đã tồn tại trong nhóm
//         const filteredNewMembers = newMembers.filter(newMember => {
//             return !group.members.some(existingMember => existingMember.userId.toString() === newMember.userId);
//         });
//         // Thêm các thành viên mới vào nhóm
//         filteredNewMembers.forEach(member => {
//             group.members.push({
//                 userId: member.userId,
//                 addByUserId: ownerId,
//                 // MẶc định ban đàu roles là member
//                 roles: member.roles || [Roles.MEMBER],
//                 addAt: Date.now()
//             });
//         });
//         // Kiểm tra xem có thành viên nào được thêm vào không
//         if (filteredNewMembers.length === 0) {
//             return res.status(400).json({ error: 'Tất cả các thành viên mới đã tồn tại trong nhóm' });
//         }
//         // Lưu lại thông tin nhóm đã cập nhật
//         // await group.save();
//         // Trả về phản hồi thành công
//         res.status(200).json({ success: true, message: 'Thành viên đã được thêm vào nhóm' });
//     } catch (error) {
//         // Xử lý lỗi nếu có
//         console.error('Lỗi khi thêm thành viên vào nhóm:', error);
//         res.status(500).json({ error: 'Đã xảy ra lỗi khi thêm thành viên vào nhóm' });
//     }
// };

// const deleteMember = async(req,res)=>{
//     try {
//         const ownerId = req.user.id;
//         const groupId = req.params.groupId;
//         const { members } = req.body;
//         if (!groupId || !members || members.length === 0) {
//             return res.status(400).json({ error: 'Vui lòng cung cấp ID nhóm và ít nhất một thành viên mới' });
//         }
//         const group = await Group.findById(groupId);
//         if (!group) {
//             return res.status(404).json({ error: 'Không tìm thấy nhóm' });
//         }
//         if (group.ownerId.toString() !== ownerId) {
//             return res.status(403).json({ error: 'Bạn không có quyền thêm thành viên vào nhóm này' });
//         }
//         const filteredMembers = members.filter(member => {
//             return group.members.some(existingMember => existingMember.userId.toString() === member.userId);
//         });
//         filteredMembers.forEach(member => {
//             group.members = group.members.filter(existingMember => existingMember.userId.toString() !== member.userId);
//         });
//         if (filteredMembers.length === 0) {
//             return res.status(400).json({ error: 'Tất cả các thành viên mới đã tồn tại trong nhóm' });
//         }
//         await group.save();
//         res.status(200).json({ success: true, message: 'Thành viên đã được xóa khỏi nhóm' });
//     } catch (error) {
//         console.error('Lỗi khi xóa thành viên khỏi nhóm:', error);
//         res.status(500).json({ error: 'Đã xảy ra lỗi khi xóa thành viên khỏi nhóm' });
//     }

// }
const addMember = async (req, res) => {
  try {
    const userId = req.body.userId;
    const user = await User.findById(userId);
    const chatRoomId = req.params.chatRoomId;
    const group = await Group.findOne({ chatRoomId: chatRoomId });
    if (!group) {
      return res.status(404).json({ error: "Không tìm thấy nhóm" });
    }
    // console.log(group.members);
    const memberIndex = group.members.findIndex(
      (member) => member.userId.toString() === userId
    );
    // console.log(memberIndex);
    if (memberIndex !== -1) {
      return res
        .status(400)
        .json({ error: "Thành viên đã tồn tại trong nhóm" });
    }
    const newMember = {
      userId,
      addByUserId: req.user.id,
      roles: [Roles.MEMBER],
      addAt: Date.now(),
    };
    const newGroupDetails = new GroupDetail({
      groupId: group._id,
    });
    user.groupDetails.push(newGroupDetails._id);
    group.members.push(newMember);
    // console.log(group);
    // console.log(newGroupDetails);
    await newGroupDetails.save();
    await group.save();
    await user.save();
    res.status(200).json({ success: true, message: "Thành viên đã được thêm vào nhóm" });
  }catch (error) {
    console.error('Lỗi khi thêm thành viên vào nhóm:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi thêm thành viên vào nhóm' });
  }};
const deleteMember = async (req, res) => {
  try{
    const group = await Group.findOne({chatRoomId: req.params.chatRoomId});
    const userId = req.body.userId;
    const user = await User.findById(userId);
    if (!group) {
      return res.status(404).json({ error: "Không tìm thấy nhóm" });
    }
    const memberIndex = group.members.findIndex(
      (member) => member.userId.toString() === userId
    );
    if (memberIndex === -1) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy thành viên trong nhóm" });
    }
    group.members.splice(memberIndex, 1);
   const groupDetail = await GroupDetail.findOne(
      {groupId: group._id, _id: {$in: user.groupDetails}}
    );
    const groupDetailId = groupDetail._id;
    user.groupDetails = user.groupDetails.filter(
      (groupDetail) => groupDetail.toString() !== groupDetailId.toString()
   );
    await user.save();
    await group.save();
    res.status(200).json({ success: true, message: "Thành viên đã được xóa khỏi nhóm" });
  }catch (error) {
    console.error('Lỗi khi xóa thành viên khỏi nhóm:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi xóa thành viên khỏi nhóm' });
  }
}
const outGroup = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    const chatRoomId = req.params.chatRoomId;
    const group = await Group.findOne({ chatRoomId: chatRoomId });

    if (!group) {
      return res.status(404).json({ error: "Không tìm thấy nhóm" });
    }

    // Kiểm tra số lượng thành viên của nhóm
    if (group.members.length < 3) {
      return res
        .status(400)
        .json({ error: "Nhóm phải có trên hoặc bằng 3 thành viên" });
    }

    // Xử lý nếu người dùng là chủ nhóm
    const members = group.members;

    // Tìm vị trí của thành viên cần rời khỏi nhóm
    const memberIndex = members.findIndex(
      (member) => member.userId.toString() === userId
    );
    // Nếu không tìm thấy thành viên trong nhóm
    if (memberIndex === -1) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy thành viên trong nhóm" });
    }

    // Xóa thành viên ra khỏi nhóm
    members.splice(memberIndex, 1);

    // Nếu người rời khỏi nhóm là chủ nhóm, chọn thành viên mới làm chủ nhóm dựa trên thời gian thêm vào và quyền admin
    if (group.ownerId.toString() === userId) {
      // Lọc danh sách các thành viên có quyền admin
      const adminMembers = members.filter((member) =>
        member.roles.includes(Roles.ADMIN)
      );

      if (adminMembers.length > 0) {
        // Sắp xếp danh sách các thành viên có quyền admin theo thời gian thêm vào (tăng dần)
        adminMembers.sort((a, b) => a.addAt - b.addAt);

        // Chọn thành viên có quyền admin và thời gian thêm vào lớn nhất (trễ nhất) làm chủ nhóm mới
        const newAdminOwner = adminMembers[0];
        group.ownerId = newAdminOwner.userId;
        //cập nhật lại roles cho owner mới và xóa quyền admin cũ
        newAdminOwner.roles = [Roles.OWNER];
      } else {
        // Nếu không có thành viên nào có quyền admin, chọn thành viên cuối cùng trong danh sách làm chủ nhóm mới
        const memberInGroup = members.filter((member) =>
          member.roles.includes(Roles.MEMBER)
        );
        memberInGroup.sort((a, b) => a.addAt - b.addAt);
         const newOwner = members[0];
        group.ownerId = newOwner.userId;
        //cập nhật lại roles cho owner mới và xóa quyền admin cũ
        newOwner.roles = [Roles.OWNER];
      }
    }

    // Cập nhật lại danh sách thành viên của nhóm
    group.members.splice(memberIndex, 1);
    const groupDetail = await GroupDetail.findOne({
      groupId: group._id,
      _id: { $in: user.groupDetails },
    });
    const groupDetailId = groupDetail._id;
    user.groupDetails = user.groupDetails.filter(
      (groupDetail) => groupDetail.toString() !== groupDetailId.toString()
    );
    await group.save();
    await user.save();

    // Trả về thông báo thành công
    return res
      .status(200)
      .json({ success: true, message: "Bạn đã rời khỏi nhóm" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Đã xảy ra lỗi trong quá trình xử lý yêu cầu" });
  }
};

const grantPermissionMember = async (req, res)=> {
  try {
    const reqUser = req.user.id;
    const userGrantId = req.body.userId;
    const groupId = req.body.groupId;
    const role = req.body.role;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Không tìm thấy nhóm" });
    }

    if(!group.ownerId.equals(reqUser))
      return res.status(403).json({ error: "Không phải trưởng nhóm" })

    //Tìm thành viên trong nhóm
    const memberInGroup = group.members.find(
      (member) => member.userId.toString() === userGrantId
    );
    if (!memberInGroup) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy thành viên trong nhóm" });
    }
    // Gán quyền cho thành viên đó
    if(role==='admin') {
      const index = memberInGroup.roles.indexOf('admin');
      // Thêm quyền 'admin' nếu nó không tồn tại trong mảng roles của thành viên
      if (index === -1) {
        memberInGroup.roles.unshift(Roles.ADMIN)
        memberInGroup.addAt= new Date()
      }
    }
    else if(role==='member') {
      // Xóa quyền 'admin' nếu nó tồn tại trong mảng roles của thành viên
      const index = memberInGroup.roles.indexOf('admin');
      if (index !== -1) {
        memberInGroup.roles.splice(index, 1)
        memberInGroup.addAt= new Date()

      }
    }
    await group.save()
    const result = group.members.find(
      (member) => member._id.toString() === userGrantId
    );
    return res.status(200).json({result})
  } catch (error) {
      console.error('Lỗi khi gán quyền cho thành viên:', error);
      res.status(500).json({ error: 'Đã xảy ra lỗi khi gán quyền cho thành viên' });
  }
}

const deleteGroup = async (req, res) => {
  try {
    // Lấy ID của người đăng nhập từ JWT
    const userId = req.user.id;
    // Lấy ID của nhóm từ yêu cầu
    const groupId = req.params.groupId;

    // Tìm nhóm trong cơ sở dữ liệu
    const group = await Group.findById(groupId);

    // Kiểm tra xem nhóm có tồn tại không
    if (!group) {
      return res.status(404).json({ error: "Không tìm thấy nhóm" });
    }

    // Kiểm tra xem người dùng có quyền "owner" trong nhóm không
    // console.log(group);
    const isOwner = group.ownerId.toString() === userId;

    // Nếu người dùng không phải là "owner", trả về lỗi
    if (!isOwner) {
      return res.status(403).json({ error: "Bạn không có quyền xóa nhóm này" });
    }

    // Lưu chatRoomId vào một biến
    const chatRoomId = group.chatRoomId;

    // Tìm ChatRoom tương ứng trong cơ sở dữ liệu
    const chatRoom = await ChatRoom.findById(chatRoomId);

    // Duyệt qua mỗi message trong ChatRoom
    for (let i = 0; i < chatRoom.messages.length; i++) {
      const messageId = chatRoom.messages[i];

      // Xóa Message tương ứng từ cơ sở dữ liệu
      await Message.deleteOne({ _id: messageId });
    }

    // Xóa ChatRoom tương ứng từ cơ sở dữ liệu
    await ChatRoom.deleteOne({ _id: chatRoomId });

    // Tìm GroupDetail tương ứng với groupId
    const groupDetail = await GroupDetail.findOne({ groupId: groupId });

    // Kiểm tra xem GroupDetail có tồn tại không
    if (!groupDetail) {
      return res.status(404).json({ error: "Không tìm thấy GroupDetail" });
    }

    // Lấy idGroupDetails từ GroupDetail
    const idGroupDetails = groupDetail._id;

    // Duyệt qua mỗi thành viên trong nhóm
    for (let i = 0; i < group.members.length; i++) {
      const memberId = group.members[i].userId;
      try {
        // Tìm kiếm thông tin người dùng bằng ID
        const user = await User.findById(memberId);

        // Kiểm tra xem user có tồn tại không
        if (user) {
          // Nếu user tồn tại, xóa idGroupDetails khỏi field groupDetails của user
          user.groupDetails = user.groupDetails.filter(
            (groupDetail) =>
              groupDetail.toString() !== idGroupDetails.toString()
          );

          // Lưu lại thông tin người dùng sau khi cập nhật
          await user.save();
        } else {
          // Xử lý trường hợp user không tồn tại
          console.error(`User with ID ${memberId} not found`);
        }
      } catch (error) {
        // Xử lý lỗi nếu có
        console.error(`Error updating user with ID ${memberId}:`, error);
      }
    }

    // Xóa chi tiết nhóm tương ứng với nhóm đã xóa
    await GroupDetail.deleteMany({ groupId: groupId });

    // Xóa nhóm khỏi cơ sở dữ liệu
    await Group.deleteOne({ _id: groupId });

    // Trả về thông báo thành công
    res
      .status(200)
      .json({ success: true, message: "Nhóm đã được xóa thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa nhóm:", error);
    res.status(500).json({ error: "Đã xảy ra lỗi khi xóa nhóm" });
  }
};


const getProfileGroup = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json(apiCode.error("Không tìm thấy nhóm"));
    }
    const members = group.members.map((member) => member.userId);
    // console.log("asd", members);
    const users = await User.find({ _id: { $in: members } });
    const dataMember = {
      members: users.map((user) => ({
        id: user._id,
        displayName: user.displayName,
        photoURL: user.photoURL,
        roles: group.members.find(
         (member) => member?.userId?.toString() === user._id.toString()
        ).roles[0],
      })),
    };
    // console.log("member",dataMember);
    const data = {
      name: group.name,
      photoURL: group.photoURL,
      members: dataMember.members,
    };
    // console.log(data)
    res.status(200).json(apiCode.success(data, "Lấy thông tin nhóm thành công"));
  } catch (error) {
    console.error("Lỗi khi lấy thông tin nhóm:", error);
    res.status(500).json(apiCode.error("Đã xảy ra lỗi khi lấy thông tin nhóm"));
}};

module.exports = {
  getGroup,
  getGroups,
  getGroupByGroupDetailId,
  getInfoGroupItem,
  getGroupIdsByUserId,
  addMember,
  createGroup,
  deleteMember,
  outGroup,
  deleteGroup,
  uploadImageToS3,
  grantPermissionMember,
  getProfileGroup,
};