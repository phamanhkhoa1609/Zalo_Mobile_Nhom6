import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, TextInput, Platform,
  SafeAreaView, Modal, ScrollView, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../config';

export default function ChatListScreen({ navigation }) {
  const [chatList, setChatList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Quản lý modal user
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTab, setModalTab] = useState('profile');
  const [profile, setProfile] = useState({});
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sent, setSent] = useState([]);
  const [phone, setPhone] = useState('');

  // Modal tạo nhóm
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => {
          fetchModalData();
          setModalTab('profile');
          setModalVisible(true);
        }}>
          <Text style={{ fontSize: 20, marginRight: 16 }}>👤</Text>
        </TouchableOpacity>
      ),
      headerTitle: 'Tin nhắn',
      headerTitleAlign: 'left'
    });
  }, [navigation]);

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
      setChatList(res.data?.data || []);
    } catch (err) {
      console.log('❌ Lỗi lấy danh sách chat:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchModalData = async () => {
    const token = await AsyncStorage.getItem('token');
    const headers = { Authorization: token };
    try {
      const [p, f, r, s] = await Promise.all([
        axios.get(`${BASE_URL}/api/users/profile`, { headers }),
        axios.get(`${BASE_URL}/api/getAllFriend`, { headers }),
        axios.get(`${BASE_URL}/api/users/requests/received`, { headers }),
        axios.get(`${BASE_URL}/api/users/requests/sent`, { headers }),
      ]);
      setProfile(p.data?.data || {});
      setFriends(f.data?.data || []);
      setRequests(r.data?.data || []);
      setSent(s.data?.data || []);
    } catch (err) {
      console.log('❌ Modal data error:', err.message);
    }
  };

  const fetchFriends = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/getAllFriend`, {
        headers: { Authorization: token }
      });
      setFriends(res.data?.data || []);
    } catch (err) {
      console.log('❌ Lỗi lấy danh sách bạn:', err.message);
    }
  };

  const handleAddFriend = async () => {
    if (!phone.trim()) return;
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/search-user`, { searchTerm: phone }, {
        headers: { Authorization: token }
      });
      await axios.post(`${BASE_URL}/api/add-friend`, { userInfo: { _id: phone } }, {
        headers: { Authorization: token }
      });
      Alert.alert('✅', 'Đã gửi lời mời kết bạn');
      setPhone('');
    } catch (err) {
      Alert.alert('❌ Lỗi', err?.response?.data?.message || 'Không tìm thấy người dùng');
    }
  };

  const acceptFriend = async (email) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/users/accept`, { email }, {
        headers: { Authorization: token }
      });
      fetchModalData();
    } catch (err) {
      Alert.alert('❌', 'Không thể đồng ý');
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    navigation.replace('Login');
  };

  const toggleMember = (id) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter(m => m !== id));
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length < 1) {
      return Alert.alert('⚠️', 'Cần nhập tên nhóm và chọn ít nhất 1 thành viên');
    }

    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/creategroup`, {
        name: groupName,
        members: selectedMembers
      }, {
        headers: { Authorization: token }
      });

      setGroupModalVisible(false);
      setGroupName('');
      setSelectedMembers([]);
      fetchChatList();
      Alert.alert('✅ Thành công', 'Đã tạo nhóm!');
    } catch (err) {
      console.log(err);
      Alert.alert('❌ Lỗi', err?.response?.data?.message || 'Không tạo được nhóm');
    }
  };

  const renderItem = ({ item }) => {
    if (!item?.idChatRoom) return null;
    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => navigation.navigate('OnlineChat', { idChatRoom: item.idChatRoom })}
      >
        <View style={styles.row}>
          <Image source={{ uri: item.photoURL || 'https://i.pravatar.cc/100' }} style={styles.avatar} />
          <View style={styles.chatInfo}>
            <Text style={styles.name}>{item.name || 'Không tên'}</Text>
            <Text style={styles.lastMsg} numberOfLines={1}>
              {item.lastMessage?.text || 'Chưa có tin nhắn'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TextInput
        style={styles.searchBox}
        placeholder="🔍 Tìm kiếm..."
        value={search}
        onChangeText={setSearch}
      />

      <TouchableOpacity onPress={() => setGroupModalVisible(true)} style={{ alignSelf: 'flex-end', margin: 10 }}>
        <Text style={{ fontSize: 18 }}>➕ Tạo nhóm</Text>
      </TouchableOpacity>

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

      {/* Modal quản lý người dùng */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 40 }}>
          <View style={styles.modalTabs}>
            {['profile', 'friends', 'requests', 'sent', 'add'].map(tab => (
              <TouchableOpacity key={tab} onPress={() => setModalTab(tab)} style={styles.modalTabBtn}>
                <Text style={modalTab === tab ? styles.activeTab : styles.modalTab}>{tab.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={logout}><Text style={{ color: 'red', marginLeft: 8 }}>🚪 Đăng xuất</Text></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {modalTab === 'profile' && (
              <>
                <Text style={styles.sectionText}>👤 {profile.name}</Text>
                <Text>{profile.email}</Text>
                <Text>{profile.phone}</Text>
                <Text>{profile.dob}</Text>
              </>
            )}
            {modalTab === 'friends' && friends.map(f => (
              <Text key={f._id} style={styles.friendItem}>👥 {f.displayName}</Text>
            ))}
            {modalTab === 'requests' && requests.map(r => (
              <View key={r._id} style={styles.friendItem}>
                <Text>📨 {r.name}</Text>
                <TouchableOpacity onPress={() => acceptFriend(r.email)} style={styles.acceptBtn}>
                  <Text style={{ color: 'white' }}>Đồng ý</Text>
                </TouchableOpacity>
              </View>
            ))}
            {modalTab === 'sent' && sent.map(s => (
              <Text key={s._id} style={styles.friendItem}>📤 {s.name}</Text>
            ))}
            {modalTab === 'add' && (
              <>
                <TextInput
                  placeholder="Nhập số điện thoại"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  style={styles.input}
                />
                <TouchableOpacity onPress={handleAddFriend} style={styles.addBtn}>
                  <Text style={{ color: 'white' }}>Gửi lời mời</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal tạo nhóm */}
      <Modal visible={groupModalVisible} animationType="slide">
        <View style={{ flex: 1, paddingTop: 50, padding: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 16 }}>Tạo nhóm mới</Text>
          <TextInput
            style={styles.input}
            placeholder="Tên nhóm"
            value={groupName}
            onChangeText={setGroupName}
          />
          <ScrollView style={{ marginTop: 12 }}>
            {friends.map(friend => (
              <TouchableOpacity
                key={friend._id}
                onPress={() => toggleMember(friend._id)}
                style={[styles.friendItem, selectedMembers.includes(friend._id) && { backgroundColor: '#d0ebff' }]}
              >
                <Text>{friend.displayName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
            <TouchableOpacity onPress={handleCreateGroup} style={styles.createBtn}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Tạo nhóm</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setGroupModalVisible(false)} style={styles.cancelBtn}>
              <Text style={{ color: '#fff' }}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 48 : 0 },
  listContent: { paddingBottom: 20, paddingHorizontal: 8 },
  searchBox: {
    margin: 10, padding: 12, borderWidth: 1, borderColor: '#ccc',
    borderRadius: 25, backgroundColor: '#f5f5f5', fontSize: 16
  },
  chatItem: {
    paddingVertical: 14, paddingHorizontal: 10,
    borderBottomWidth: 1, borderColor: '#f0f0f0'
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 14 },
  chatInfo: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600' },
  lastMsg: { fontSize: 14, color: '#777', marginTop: 2 },
  modalTabs: {
    flexDirection: 'row', justifyContent: 'space-around',
    borderBottomWidth: 1, paddingVertical: 12, backgroundColor: '#f9f9f9'
  },
  modalTabBtn: { padding: 4 },
  modalTab: { fontSize: 14, color: '#555' },
  activeTab: { fontSize: 14, color: '#007AFF', fontWeight: 'bold' },
  sectionText: { fontSize: 18, marginBottom: 10, fontWeight: '600' },
  friendItem: {
    padding: 10, borderBottomWidth: 1, borderColor: '#eee'
  },
  acceptBtn: {
    marginTop: 6, backgroundColor: 'green', padding: 6, borderRadius: 6
  },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    padding: 12, marginBottom: 12, fontSize: 16
  },
  addBtn: {
    backgroundColor: '#007AFF', paddingVertical: 12, alignItems: 'center', borderRadius: 8
  },
  createBtn: {
    flex: 1, backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center', marginRight: 8
  },
  cancelBtn: {
    flex: 1, backgroundColor: '#ccc', padding: 12, borderRadius: 8, alignItems: 'center'
  }
});
