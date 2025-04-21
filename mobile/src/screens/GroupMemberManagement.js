import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../config';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

export default function GroupMemberManagement({ visible, onClose, chatRoomId }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);

  useEffect(() => {
    if (visible && chatRoomId) {
      getCurrentUser();
    }
  }, [visible, chatRoomId]);

  const getCurrentUser = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      setCurrentUserId(userId);
      fetchGroupInfo(userId);
    } catch (err) {
      console.log('❌ Lỗi lấy thông tin user:', err);
      Alert.alert('Lỗi', 'Không thể lấy thông tin người dùng');
    }
  };

  const fetchGroupInfo = async (userId) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return Alert.alert('Lỗi', 'Vui lòng đăng nhập lại');

      axiosInstance.defaults.headers.common['Authorization'] = token;

      const chatResponse = await axiosInstance.get('/api/info-chat-item');
      const chatItem = (chatResponse.data?.data || []).find(item => item.idChatRoom === chatRoomId);
      if (!chatItem) throw new Error('Không tìm thấy thông tin nhóm chat');

      const groupResponse = await axiosInstance.get(`/api/info-user/${chatRoomId}`);
      const groupData = groupResponse.data?.data || groupResponse.data;
      if (!groupData) throw new Error('Không tìm thấy thông tin nhóm');

      setGroupInfo(groupData);

      const isUserAdmin = (groupData.members || []).some(member =>
        member.userId === userId && (member.roles || []).includes('ADMIN')
      );
      const isUserOwner = groupData.ownerId === userId;
      setIsAdmin(isUserAdmin || isUserOwner);

      const memberPromises = (groupData.members || []).map(async member => {
        try {
          const userResponse = await axiosInstance.get(`/api/user/${member.userId}`);
          const userData = userResponse.data?.data || userResponse.data;
          return {
            _id: member.userId,
            displayName: userData?.displayName || 'Không tên',
            photoURL: userData?.photoURL || 'https://i.pravatar.cc/100',
            isAdmin: (member.roles || []).includes('ADMIN'),
            isOwner: member.userId === groupData.ownerId,
            addedBy: member.addByUserId,
            addedAt: member.addAt
          };
        } catch (err) {
          return {
            _id: member.userId,
            displayName: 'Không tên',
            photoURL: 'https://i.pravatar.cc/100',
            isAdmin: (member.roles || []).includes('ADMIN'),
            isOwner: member.userId === groupData.ownerId,
            addedBy: member.addByUserId,
            addedAt: member.addAt
          };
        }
      });

      const membersWithDetails = await Promise.all(memberPromises);
      setMembers(membersWithDetails);
    } catch (err) {
      console.log('❌ Lỗi lấy thông tin nhóm:', err);
      Alert.alert('Lỗi', 'Không thể lấy thông tin nhóm');
    } finally {
      setLoading(false);
    }
  };

  const handleKickMember = async (memberId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return Alert.alert('Lỗi', 'Vui lòng đăng nhập lại');

      await axiosInstance.post(`/api/groups/${chatRoomId}/kick-member`, { memberId });

      setMembers(prev => prev.filter(m => m._id !== memberId));
      Alert.alert('Thành công', 'Đã xóa thành viên khỏi nhóm');
    } catch (err) {
      console.log('❌ Lỗi khi kick thành viên:', err);
      Alert.alert('Lỗi', 'Không thể xóa thành viên khỏi nhóm');
    }
  };

  const handleSetAdmin = async (memberId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return Alert.alert('Lỗi', 'Vui lòng đăng nhập lại');

      await axiosInstance.post(`/api/groups/${chatRoomId}/set-admin`, { memberId });

      setMembers(prev => prev.map(member =>
        member._id === memberId ? { ...member, isAdmin: true } : member
      ));
      Alert.alert('Thành công', 'Đã đặt làm quản trị viên');
    } catch (err) {
      console.log('❌ Lỗi khi đặt admin:', err);
      Alert.alert('Lỗi', 'Không thể đặt làm quản trị viên');
    }
  };

  const handleRemoveAdmin = async (memberId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return Alert.alert('Lỗi', 'Vui lòng đăng nhập lại');

      await axiosInstance.post(`/api/groups/${chatRoomId}/remove-admin`, { memberId });

      setMembers(prev => prev.map(member =>
        member._id === memberId ? { ...member, isAdmin: false } : member
      ));
      Alert.alert('Thành công', 'Đã gỡ quyền quản trị viên');
    } catch (err) {
      console.log('❌ Lỗi khi gỡ quyền admin:', err);
      Alert.alert('Lỗi', 'Không thể gỡ quyền quản trị viên');
    }
  };

  const renderMemberItem = ({ item }) => (
    <View style={styles.memberItem}>
      <View style={styles.memberInfo}>
        <Image source={{ uri: item.photoURL }} style={styles.memberAvatar} />
        <View style={styles.memberTextInfo}>
          <Text style={styles.memberName}>{item.displayName}</Text>
          <Text style={[styles.memberRole, item.isOwner && styles.ownerRole]}>
            {item.isOwner ? 'Người tạo nhóm' : (item.isAdmin ? 'Quản trị viên' : 'Thành viên')}
          </Text>
          {item.addedBy && (
            <Text style={styles.addedInfo}>
              Thêm bởi: {item.addedBy || 'Không rõ'} | {new Date(item.addedAt).toLocaleString()}
            </Text>
          )}
        </View>
      </View>
      {isAdmin && !item.isOwner && item._id !== currentUserId && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.kickButton]}
            onPress={() => handleKickMember(item._id)}
          >
            <Text style={styles.actionButtonText}>KICK</Text>
          </TouchableOpacity>
          {item.isAdmin ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.kickButton]}
              onPress={() => handleRemoveAdmin(item._id)}
            >
              <Text style={styles.actionButtonText}>GỠ ADMIN</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.adminButton]}
              onPress={() => handleSetAdmin(item._id)}
            >
              <Text style={styles.actionButtonText}>ĐẶT ADMIN</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{groupInfo?.name || 'Thành viên nhóm'}</Text>
          <View style={{ width: 30 }} />
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#0068ff" style={styles.loading} />
        ) : (
          <FlatList
            data={members}
            renderItem={renderMemberItem}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 0 : 20
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  loading: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberTextInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  memberRole: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  ownerRole: {
    color: '#ff6b6b',
    fontWeight: '600'
  },
  addedInfo: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kickButton: {
    backgroundColor: '#dc3545',
  },
  adminButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
