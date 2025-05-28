import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Image, FlatList, ActivityIndicator, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../config';
import Footer from './Footer';

export default function FriendListRequest({ navigation }) {
  const [activeTab, setActiveTab] = useState('received');
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          Alert.alert('Lỗi', 'Vui lòng đăng nhập lại');
          setLoading(false);
          return;
        }

        const receivedRes = await axios.get(`${BASE_URL}/api/getAllFriendRequest`, {
          headers: { Authorization: token }
        });
        setReceivedRequests(receivedRes.data?.data || []);

        const sentRes = await axios.get(`${BASE_URL}/api/getAllCancelFriendRequest`, {
          headers: { Authorization: token }
        });
        setSentRequests(sentRes.data?.data || []);
      } catch (err) {
        Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể lấy danh sách lời mời kết bạn.');
        setReceivedRequests([]);
        setSentRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleCancelRequest = async (friendId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!friendId || typeof friendId !== 'string') {
        Alert.alert('Lỗi', 'ID người dùng không hợp lệ.');
        return;
      }
      console.log('Cancel request for friend ID:', friendId); // Debug friendId
      const response = await axios.post(`${BASE_URL}/api/cancel-friend-request`, { friendId }, {
        headers: { Authorization: token }
      });
      console.log('Response from cancel:', response.data); // Debug phản hồi
      setSentRequests(prev => prev.filter(req => req._id !== friendId)); // Lọc theo friendId
      Alert.alert('Thành công', 'Đã hủy lời mời kết bạn.');
    } catch (err) {
      console.error('Error details:', err.response?.data);
      Alert.alert('Lỗi', err?.response?.data?.message || 'Có lỗi khi hủy lời mời.');
    }
  };

 const handleAcceptRequest = async (friendId, email) => { // Thêm email làm tham số
  try {
    const token = await AsyncStorage.getItem('token');
    if (!friendId || typeof friendId !== 'string' || !email || typeof email !== 'string') {
      Alert.alert('Lỗi', 'ID hoặc email không hợp lệ.');
      return;
    }
    console.log('Accept request for friend ID:', friendId, 'and email:', email); // Debug cả hai
    const response = await axios.post(`${BASE_URL}/api/accept-friend`, { email }, { // Sử dụng email
      headers: { Authorization: token }
    });
    console.log('Response from accept:', response.data); // Debug phản hồi
    setReceivedRequests(prev => prev.filter(req => req._id !== friendId)); // Lọc theo _id
    Alert.alert('Thành công', 'Đã chấp nhận lời mời kết bạn!');
  } catch (err) {
    console.error('Error details:', err.response?.data);
    Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể chấp nhận lời mời.');
  }
};
const handleDeclineRequest = async (friendId, email) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!friendId || typeof friendId !== 'string' || !email || typeof email !== 'string') {
        Alert.alert('Lỗi', 'ID hoặc email không hợp lệ.');
        return;
      }
      console.log('Decline request for friend ID:', friendId, 'and email:', email); // Debug cả hai
      const response = await axios.post(`${BASE_URL}/api/decline-friend-request`, { email }, {
        headers: { Authorization: token }
      });
      console.log('Response from decline:', response.data); // Debug phản hồi
      setReceivedRequests(prev => prev.filter(req => req._id !== friendId)); // Lọc theo _id
      Alert.alert('Thành công', 'Đã từ chối lời mời kết bạn.');
    } catch (err) {
      console.error('Error details:', err.response?.data);
      Alert.alert('Lỗi', err?.response?.data?.message || 'Có lỗi khi từ chối lời mời.');
    }
  };

  const renderRequestItem = ({ item }) => {
  let user = activeTab === 'sent' ? item : (item.sender || item.from || item);
  console.log('Request item:', item); // Debug dữ liệu item

  

   return (
      <View style={styles.card}>
        <Image 
          source={user.photoURL || user.avatar 
            ? { uri: user.photoURL || user.avatar } 
            : require('../assets/icons8-account-48.png')
          }
          style={styles.avatar} 
        />
        <View style={styles.info}>
          <Text style={styles.name}>{user.displayName || user.name || user.username || 'Không tên'}</Text>
          {user.email && <Text style={styles.detail}>📧 {user.email}</Text>}
          {user.phone && <Text style={styles.detail}>📞 {user.phone}</Text>}
        </View>
        {activeTab === 'received' && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => handleAcceptRequest(user._id, user.email)}
            >
              <Text style={styles.btnText}>Chấp nhận</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.declineBtn, { marginTop: 8 }]}
              onPress={() => handleDeclineRequest(user._id, user.email)}
            >
              <Text style={styles.btnText}>Từ chối</Text>
            </TouchableOpacity>
          </View>
        )}
        {activeTab === 'sent' && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancelRequest(user._id)}
          >
            <Text style={styles.btnText}>Huỷ</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const requestsToDisplay = activeTab === 'sent' ? sentRequests : receivedRequests;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Lời mời kết bạn</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabs}>
        {['received', 'sent'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'received' ? 'Đã nhận' : 'Đã gửi'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#0068FF" />
        ) : requestsToDisplay.length === 0 ? (
          <Text style={styles.emptyText}>
            {activeTab === 'sent' ? 'Không có lời mời đã gửi.' : 'Không có lời mời đã nhận.'}
          </Text>
        ) : (
          <FlatList
            data={requestsToDisplay}
            keyExtractor={item => item._id?.toString() || Math.random().toString()}
            renderItem={renderRequestItem}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      <Footer navigation={navigation} currentTab="FriendListRequest" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9fc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  backBtn: { fontSize: 22, color: '#333' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  tabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  tab: {
    paddingVertical: 10, flex: 1, alignItems: 'center'
  },
  activeTab: {
    borderBottomWidth: 2, borderColor: '#0068FF'
  },
  tabText: { fontSize: 16, color: '#888' },
  activeTabText: { color: '#0068FF', fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 30, fontSize: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 12, borderRadius: 10, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3,
    elevation: 1, borderWidth: 1, borderColor: '#eee'
  },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: '#ccc' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  detail: { fontSize: 13, color: '#555' },
  buttonContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtn: { backgroundColor: '#28a745', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, width: 100, alignItems: 'center' },
  declineBtn: { backgroundColor: '#dc3545', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginTop: 8, width: 100, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#dc3545', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold' }
});