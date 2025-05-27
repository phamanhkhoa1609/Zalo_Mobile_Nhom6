import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Platform, Image, FlatList, ActivityIndicator, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../config';

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

        // Lời mời đã nhận
        const receivedRes = await axios.get(`${BASE_URL}/api/getAllFriendRequest`, {
          headers: { Authorization: token }
        });
        setReceivedRequests(receivedRes.data?.data || []);

        // Lời mời đã gửi (dùng đúng API đã có trong BE)
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

  const handleCancelRequest = async (requestId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập lại');
        return;
      }
      await axios.post(`${BASE_URL}/api/cancel-friend-request`, { requestId }, {
        headers: { Authorization: token }
      });
      setSentRequests(prev => prev.filter(req => req._id !== requestId));
      Alert.alert('Thành công', 'Đã hủy lời mời kết bạn.');
    } catch (err) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Có lỗi khi huỷ lời mời.');
    }
  };

  const handleAcceptRequest = async (senderId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập lại');
        return;
      }
      await axios.post(`${BASE_URL}/api/accept-friend`, { senderId }, {
        headers: { Authorization: token }
      });
      setReceivedRequests(prev => prev.filter(req => req._id !== senderId));
      Alert.alert('Thành công', 'Đã chấp nhận lời mời kết bạn!');
    } catch (err) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể chấp nhận lời mời.');
    }
  };

  const renderRequestItem = ({ item }) => {
    let user;
    if (activeTab === 'sent') {
      user = item.receiver || item.to || item;
    } else {
      user = item.sender || item.from || item;
    }

    return (
      <View style={styles.friendCard}>
        <Image
          source={{ uri: user.photoURL || user.avatar || 'https://i.pravatar.cc/100' }}
          style={styles.avatar}
        />
        <View style={styles.info}>
          <Text style={styles.name}>{user.displayName || user.name || user.username || 'Không tên'}</Text>
          {user.email && <Text style={styles.email}>Email: {user.email}</Text>}
          {user.phone && <Text style={styles.phone}>Số điện thoại: {user.phone}</Text>}
        </View>
        {activeTab === 'received' ? (
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptRequest(item._id)}
          >
            <Text style={styles.acceptButtonText}>Chấp nhận</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelRequest(item._id)}
          >
            <Text style={styles.cancelButtonText}>Huỷ</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const requestsToDisplay = activeTab === 'sent' ? sentRequests : receivedRequests;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lời mời kết bạn</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Đã nhận
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Đã gửi
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentArea}>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : requestsToDisplay.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.noRequestsText}>
              {activeTab === 'sent'
                ? 'Không có lời mời kết bạn đã gửi nào'
                : 'Không có lời mời kết bạn đã nhận nào'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={requestsToDisplay}
            keyExtractor={item => item._id?.toString() || Math.random().toString()}
            renderItem={renderRequestItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: { padding: 5 },
  headerIcon: { fontSize: 24 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#000',
  },
  contentArea: {
    flex: 1,
    padding: 16,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafbfc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: '#ccc',
  },
  info: {
    flex: 1,
  },
  name: { fontSize: 16, fontWeight: 'bold' },
  email: { fontSize: 14, color: '#555' },
  phone: { fontSize: 14, color: '#555' },
  acceptButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  noRequestsText: {
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    paddingBottom: 80,
  },
});
