const GroupDetail = require('../models/groupDetail');
const Group = require('../models/group');
const User = require('../models/user');

const ApiCode = require("../utils/apicode");
const apiCode = new ApiCode();

const getGroupDetail = async (req, res) => {
    const id = req.params.id;

    try {
        const groupDetail = await Group
            .findById(id)
            .populate('groupDetails')
            .exec();
        if (!groupDetail) {
            return res.status(404).json(apiCode.error('GroupDetail not found'));
        }
        return res.status(200).json(apiCode.success(groupDetail, 'Get GroupDetail Success'));
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getGroupDetails = async (req, res) => {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if(user.groupDetails.length === 0){
        return res.status(404).json(apiCode.error('GroupDetails not found'));
    }
    else{
        const groupDetails = await GroupDetail.find({ _id: { $in: user.groupDetails } });
        res.status(200).json(apiCode.success(groupDetails, 'Get GroupDetails Success'));
    }
};

module.exports = {
    getGroupDetail,
    getGroupDetails
};