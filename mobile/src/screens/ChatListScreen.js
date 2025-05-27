import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, TextInput, Platform,
  SafeAreaView, Modal, ScrollView, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../config';
import GroupMemberManagement from './GroupMemberManagement';
import Footer from './Footer';

export default function ChatListScreen({ navigation }) {
  const [chatList, setChatList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedChatRoom, setSelectedChatRoom] = useState(null);

  useEffect(() => {
    fetchChatList();
    fetchFriends();
  }, []);

  const fetchChatList = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/info-chat-item`, {
        headers: { Authorization: token }
      });

      console.log('📦 Raw chat list:', res.data?.data);

      // Transform the data to include isGroup flag
      const transformedChatList = (res.data?.data || []).map(chat => ({
        ...chat,
        isGroup: chat.members?.length > 2 || chat.type === 'group' || chat.isGroup || chat.name?.includes('Nhóm')
      }));

      console.log('✨ Transformed chat list:', transformedChatList);
      setChatList(transformedChatList);
    } catch (err) {
      console.log('❌ Lỗi lấy danh sách chat:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      setLoadingFriends(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('❌ Không tìm thấy token');
        return;
      }

      console.log('🔍 Đang lấy danh sách bạn bè...');
      const response = await axios.get(`${BASE_URL}/api/getAllFriend`, {
        headers: { 
          'Authorization': token,
          'Accept': 'application/json'
        }
      });

      console.log('📦 Response data:', response.data);
      
      let friendsList = [];
      if (Array.isArray(response.data)) {
        friendsList = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        friendsList = response.data.data;
      } else if (response.data?.friends && Array.isArray(response.data.friends)) {
        friendsList = response.data.friends;
      }

      console.log('✅ Số lượng bạn bè:', friendsList.length);
      console.log('👤 Mẫu dữ liệu bạn bè:', friendsList[0]);

      setFriends(friendsList);
    } catch (err) {
      console.log('❌ Lỗi lấy danh sách bạn:', err);
      if (err.response) {
        console.log('❌ Response status:', err.response.status);
        console.log('❌ Response data:', err.response.data);
      }
      Alert.alert('Lỗi', 'Không thể lấy danh sách bạn bè');
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length < 2) {
      return Alert.alert('⚠️', 'Cần nhập tên nhóm và chọn ít nhất 2 thành viên');
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập lại');
        return;
      }

      // Tự động thêm "Nhóm" nếu tên chưa có
      const finalGroupName = groupName.trim().toLowerCase().startsWith('nhóm ') 
        ? groupName.trim()
        : `Nhóm ${groupName.trim()}`;

      console.log('🔍 Đang tạo nhóm:', finalGroupName);
      console.log('👥 Thành viên:', selectedMembers);

      const formData = new FormData();
      formData.append('name', finalGroupName);
      formData.append('members', JSON.stringify(selectedMembers));

      console.log('📦 FormData:', formData);

      const response = await axios.post(`${BASE_URL}/api/creategroup`, formData, {
        headers: { 
          'Authorization': token,
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json'
        }
      });

      console.log('✅ Response:', response.data);

      setGroupModalVisible(false);
      setGroupName('');
      setSelectedMembers([]);
      setMemberSearch('');
      fetchChatList();
      Alert.alert('✅ Thành công', 'Đã tạo nhóm!');
    } catch (err) {
      console.log('❌ Lỗi chi tiết:', err);
      Alert.alert('❌ Lỗi', err?.response?.data?.message || 'Không tạo được nhóm');
    }
  };

  const toggleMember = (id) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const renderFriendItem = ({ item }) => {
    console.log('🎯 Rendering friend item:', item);
    return (
      <TouchableOpacity
        onPress={() => toggleMember(item._id)}
        style={[styles.friendItem, selectedMembers.includes(item._id) && styles.selectedFriend]}
      >
        <View style={styles.friendInfo}>
          <Image
            source={{ uri: item.photoURL || item.avatar || 'https://i.pravatar.cc/100' }}
            style={styles.friendAvatar}
          />
          <View style={styles.friendTextInfo}>
            <Text style={styles.friendName}>
              {item.displayName || item.name || item.username || 'Không tên'}
            </Text>
            {(item.email || item.mail) && (
              <Text style={styles.friendEmail}>{item.email || item.mail}</Text>
            )}
          </View>
        </View>
        {selectedMembers.includes(item._id) && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => {
    if (!item?.idChatRoom) return null;

    console.log('🎯 Rendering chat item:', {
      name: item.name,
      isGroup: item.isGroup,
      members: item.members?.length,
      type: item.type
    });

    const handleManageGroup = () => {
      console.log('📦 Opening member management for group:', item.idChatRoom);
      setSelectedChatRoom(item.idChatRoom);
      setShowMemberModal(true);
    };

    return (
      <TouchableOpacity
        style={[
          styles.chatItem,
          item.isGroup && styles.groupChat
        ]}
        onPress={() => navigation.navigate('OnlineChat', { idChatRoom: item.idChatRoom })}
      >
        <View style={styles.row}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: item.photoURL || 'https://i.pravatar.cc/100' }} 
              style={styles.avatar}
            />
            {item.isGroup && (
              <View style={styles.groupIconBadge}>
                <Text style={styles.groupIconText}>👥</Text>
              </View>
            )}
          </View>
          <View style={styles.chatInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, item.isGroup && styles.groupName]}>
                {item.name || 'Không tên'}
              </Text>
            </View>
            <Text style={styles.lastMsg} numberOfLines={1}>
              {item.lastMessage?.text || 'Chưa có tin nhắn'}
            </Text>
          </View>
          {item.isGroup && (
            <TouchableOpacity
              onPress={handleManageGroup}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>⚙️</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const filteredFriends = friends.filter(friend => {
    const searchTerm = memberSearch.toLowerCase();
    return (
      friend.displayName?.toLowerCase().includes(searchTerm) ||
      friend.email?.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TextInput
          style={[styles.searchBox, { flex: 1 }]}
          placeholder="🔍 Tìm kiếm..."
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity onPress={() => setGroupModalVisible(true)} style={styles.createGroupBtn}>
          <Text style={{ fontSize: 20, color: '#fff' }}>➕</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0068ff" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={chatList.filter(item => item?.name?.toLowerCase().includes(search.toLowerCase()))}
          keyExtractor={(item, index) => item?.idChatRoom?.toString() || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal visible={groupModalVisible} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setGroupModalVisible(false);
              setGroupName('');
              setSelectedMembers([]);
              setMemberSearch('');
            }}>
              <Text style={styles.modalCloseBtn}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Tạo nhóm mới</Text>
            <View style={{ width: 30 }} />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Tên nhóm"
            value={groupName}
            onChangeText={setGroupName}
          />

          <View style={styles.selectedCount}>
            <Text style={styles.selectedCountText}>
              Đã chọn: {selectedMembers.length} thành viên
            </Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="🔍 Tìm kiếm bạn..."
            value={memberSearch}
            onChangeText={setMemberSearch}
          />

          {loadingFriends ? (
            <ActivityIndicator size="large" color="#0068ff" style={{ flex: 1 }} />
          ) : (
            <FlatList
              data={filteredFriends}
              renderItem={renderFriendItem}
              keyExtractor={item => item._id}
              style={styles.friendsList}
            />
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              onPress={handleCreateGroup} 
              style={[styles.createBtn, selectedMembers.length < 2 && styles.disabledBtn]}
              disabled={selectedMembers.length < 2}
            >
              <Text style={styles.btnText}>Tạo nhóm</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              setGroupModalVisible(false);
              setGroupName('');
              setSelectedMembers([]);
              setMemberSearch('');
            }} style={styles.cancelBtn}>
              <Text style={[styles.btnText, { color: '#666' }]}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Group Member Management Modal */}
      <GroupMemberManagement
        visible={showMemberModal}
        onClose={() => {
          setShowMemberModal(false);
          setSelectedChatRoom(null);
        }}
        chatRoomId={selectedChatRoom}
      />

      <Footer navigation={navigation} currentTab="ChatListScreen" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 48 : 0
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10
  },
  searchBox: {
    marginVertical: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    fontSize: 16
  },
  createGroupBtn: {
    marginLeft: 8,
    backgroundColor: '#007AFF',
    borderRadius: 25,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 48 : 20
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalCloseBtn: {
    fontSize: 24,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    margin: 16,
    fontSize: 16,
    backgroundColor: '#f5f5f5',
  },
  selectedCount: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  selectedCountText: {
    fontSize: 14,
    color: '#666',
  },
  friendsList: {
    flex: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginHorizontal: 16,
  },
  selectedFriend: {
    backgroundColor: '#e3f2fd',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendTextInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
  },
  friendEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  createBtn: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  disabledBtn: {
    backgroundColor: '#ccc',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
    paddingHorizontal: 8
  },
  chatItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  groupIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  groupIconText: {
    fontSize: 12,
    color: '#fff',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  groupName: {
    color: '#007AFF',
    fontWeight: '600',
  },
  lastMsg: {
    fontSize: 14,
    color: '#777',
    marginTop: 2
  },
  manageButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 8,
  },
  manageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  groupChat: {
    backgroundColor: '#EBF5FF',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  editButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  editButtonText: {
    fontSize: 18,
  },
});
