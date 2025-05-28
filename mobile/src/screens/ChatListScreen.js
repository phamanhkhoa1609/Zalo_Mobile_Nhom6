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
import io from 'socket.io-client';
let socket;
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
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendSearchValue, setFriendSearchValue] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [addFriendLoading, setAddFriendLoading] = useState(false);

 // ...existing code...
useEffect(() => {
  fetchChatList();
  fetchFriends();
  socket = io(BASE_URL, { transports: ['websocket'] });

  AsyncStorage.getItem('token').then(token => {
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      socket.emit('setup', JSON.stringify(payload.id));
    }
  });

  // Lắng nghe nhiều sự kiện
  socket.on('message', (data) => {
    console.log('📥 Nhận được message:', data);
    fetchChatList();
  });
  socket.on('new_message', (data) => {
    console.log('📥 Nhận được new_message:', data);
    fetchChatList();
  });

  socket.on('connect', () => console.log('✅ Socket connected!'));
  socket.on('disconnect', () => console.log('❌ Socket disconnected!'));

  return () => {
    socket?.disconnect();
  };
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
          source={item.photoURL ? { uri: item.photoURL } : require('../assets/icons8-account-48.png')}
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
    return (
  <TouchableOpacity
    style={[
      styles.chatItem,
      item.isGroup && styles.groupChat
    ]}
    onPress={() => navigation.navigate('OnlineChat', { 
      idChatRoom: item.idChatRoom,
      isGroup: item.isGroup,
      name: item.name,
      avatar: item.photoURL && item.photoURL.trim() !== '' ? item.photoURL : null,
      isDefaultAvatar: !(item.photoURL && item.photoURL.trim() !== '')
    })}
  >
    <View style={styles.row}>
      <View style={styles.avatarContainer}>
        <Image 
          source={item.photoURL ? { uri: item.photoURL } : require('../assets/icons8-account-48.png')}
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
        onPress={() => navigation.navigate('OnlineChat', { 
      idChatRoom: item.idChatRoom,
      isGroup: item.isGroup,
      name: item.name,
      avatar: item.photoURL && item.photoURL.trim() !== '' ? item.photoURL : null,
      isDefaultAvatar: !(item.photoURL && item.photoURL.trim() !== '')
    })}
      >
        <View style={styles.row}>
          <View style={styles.avatarContainer}>
            <Image 
              source={item.photoURL ? { uri: item.photoURL } : require('../assets/icons8-account-48.png')}
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

  const handleSearchFriend = async () => {
    if (!friendSearchValue.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập số điện thoại hoặc ID để tìm kiếm.');
      return;
    }
    setAddFriendLoading(true);
    setFoundUser(null);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập lại');
        setAddFriendLoading(false);
        return;
      }
      console.log('🔍 Searching for friend with value:', friendSearchValue);
      // Gửi đúng trường searchTerm
      const response = await axios.post(`${BASE_URL}/api/search-user`, 
        { searchTerm: friendSearchValue.trim() },
        {
          headers: { 
            'Authorization': token,
            'Content-Type': 'application/json',
          }
        }
      );

      console.log('✅ Search response:', response.data);

      if (response.data && response.data.data) {
        setFoundUser(response.data.data);
      } else {
        Alert.alert('Không tìm thấy', 'Không tìm thấy người dùng với thông tin đã nhập.');
        setFoundUser(null);
      }

    } catch (err) {
      console.log('❌ Search friend error:', err);
      Alert.alert('Lỗi', err?.response?.data?.message || 'Có lỗi xảy ra khi tìm kiếm.');
      setFoundUser(null);
    } finally {
      setAddFriendLoading(false);
    }
  };

  // ...existing code...
const handleSendFriendRequest = async () => {
  if (!foundUser || !foundUser._id) {
    Alert.alert('Lỗi', 'Không có thông tin người dùng để gửi lời mời.');
    return;
  }
  setAddFriendLoading(true);
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập lại');
      setAddFriendLoading(false);
      return;
    }
    // Không cho gửi lời mời cho chính mình
    const myId = await AsyncStorage.getItem('userId');
    if (myId && foundUser._id === myId) {
      Alert.alert('Lỗi', 'Bạn không thể gửi lời mời kết bạn cho chính mình.');
      setAddFriendLoading(false);
      return;
    }
    // Gửi đúng format mà BE yêu cầu
    const response = await axios.post(`${BASE_URL}/api/add-friend`, 
      { userInfo: { _id: foundUser._id } },
      {
        headers: { 
          'Authorization': token,
          'Content-Type': 'application/json',
        }
      }
    );

    if (response.data && (response.data.message === 'Friend request sent' || response.data.success)) {
      Alert.alert('Thành công', 'Đã gửi lời mời kết bạn!');
      setShowAddFriendModal(false);
      setFriendSearchValue('');
      setFoundUser(null);
    } else if (response.data && response.data.message) {
      Alert.alert('Thông báo', response.data.message);
      if (response.data.message.toLowerCase().includes('đã gửi') || response.data.message.toLowerCase().includes('already')) {
        setFoundUser(null);
      }
    } else {
      Alert.alert('Lỗi', 'Không gửi được lời mời kết bạn.');
    }

  } catch (err) {
    console.log('❌ Send friend request error:', err);
    Alert.alert('Lỗi', err?.response?.data?.message || 'Có lỗi xảy ra khi gửi lời mời kết bạn.');
    setFoundUser(null);
  } finally {
    setAddFriendLoading(false);
  }
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
        <TouchableOpacity onPress={() => setShowOptionsMenu(true)} style={styles.createGroupBtn}>
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

      {/* Options Menu Modal */}
      <Modal visible={showOptionsMenu} animationType="slide" transparent={true}>
        <TouchableOpacity 
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={styles.optionsMenu}>
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowAddFriendModal(true);
              }}
            >
              <Text style={styles.optionText}>Thêm bạn</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => {
                setShowOptionsMenu(false);
                setGroupModalVisible(true);
              }}
            >
              <Text style={styles.optionText}>Tạo nhóm</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create Group Modal */}
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

      {/* Add Friend Modal (Placeholder) */}
      <Modal visible={showAddFriendModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
               setShowAddFriendModal(false);
               setFriendSearchValue('');
               setFoundUser(null);
            }}>
              <Text style={styles.modalCloseBtn}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Thêm bạn mới</Text>
            <View style={{ width: 30 }} />
          </View>

          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, { flex: 1, margin: 0 }]}
              placeholder="Nhập số điện thoại"
              keyboardType="phone-pad"
              value={friendSearchValue}
              onChangeText={setFriendSearchValue}
              onSubmitEditing={handleSearchFriend}
              returnKeyType="search"
            />
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={handleSearchFriend}
              disabled={addFriendLoading}
            >
              {addFriendLoading ? (
                 <ActivityIndicator size="small" color="#fff" />
              ) : (
                 <Text style={styles.searchButtonText}>Tìm</Text>
              )}
            </TouchableOpacity>
          </View>

          {foundUser && (
            <View style={styles.foundUserContainer}>
              <Image 
                source={{ uri: foundUser.photoURL || foundUser.avatar || 'https://i.pravatar.cc/100' }}
                style={styles.foundUserAvatar}
              />
              <View style={styles.foundUserInfo}>
                <Text style={styles.foundUserName}>
                  {foundUser.displayName || foundUser.name || foundUser.username || 'Không tên'}
                </Text>
                {(foundUser.email || foundUser.mail) && (
                  <Text style={styles.foundUserDetail}>{foundUser.email || foundUser.mail}</Text>
                )}
                 {(foundUser.phone || foundUser.phoneNumber) && (
                  <Text style={styles.foundUserDetail}>{foundUser.phone || foundUser.phoneNumber}</Text>
                )}
              </View>
            </View>
          )}

          {foundUser && (
            <TouchableOpacity 
              style={styles.sendFriendRequestButton}
              onPress={handleSendFriendRequest}
               disabled={addFriendLoading}
            >
               {addFriendLoading ? (
                 <ActivityIndicator size="small" color="#fff" />
               ) : (
                 <Text style={styles.btnText}>Gửi lời mời kết bạn</Text>
               )}
            </TouchableOpacity>
          )}

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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  optionsMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 90 : 60,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 5,
    width: 150,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  optionButton: {
    padding: 10,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    marginLeft: 8,
    height: 48,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  foundUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  foundUserAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  foundUserInfo: {
    flex: 1,
  },
  foundUserName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  foundUserDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  sendFriendRequestButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 16,
  },
});