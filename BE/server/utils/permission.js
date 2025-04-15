const Roles = require("./rolesEnum")

const checkPermsOfUserInGroup = (userId, group) => {
    function isOwner() {
        return group.ownerId.equals(userId)

    }

    function isAdmin() {
        return group.members.some(member =>
            member.userId.equals(userId) && member.roles.includes(Roles.ADMIN)

        )
    }

    //Edit: thêm, sửa, xóa thành viên
    function canEditMember() {
        return this.isOwner() || this.isAdmin()
    }

    // sửa, xóa nhóm
    function canEditGroup() {
        return this.isOwner()
    }

    return {
        isOwner, isAdmin, canEditGroup, canEditMember
    }
}

module.exports = {checkPermsOfUserInGroup}