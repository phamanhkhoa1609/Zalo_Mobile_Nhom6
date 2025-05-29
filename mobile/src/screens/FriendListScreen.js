import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../config';
import Footer from './Footer';
import { Ionicons } from '@expo/vector-icons';

export default function FriendListScreen({ navigation }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await axios.get(`${BASE_URL}/api/getAllFriend`, {
          headers: { Authorization: token }
        });
        // Lấy đúng mảng bạn bè từ response
        const data = Array.isArray(res.data) ? res.data : res.data.data || [];
        setFriends(data);
      } catch (err) {
        Alert.alert('Lỗi', 'Không lấy được danh sách bạn bè');
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();
  }, []);

  const handleUnfriend = (friendId) => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn huỷ kết bạn?',
      [
        {
          text: 'Có',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.post(`${BASE_URL}/api/unfriend`, { friendId }, {
                headers: { Authorization: token }
              });
              setFriends(prev => prev.filter(friend => friend._id !== friendId));
              Alert.alert('Thành công', 'Đã hủy kết bạn!');
            } catch (err) {
              Alert.alert('Lỗi', err?.response?.data?.message || 'Hủy kết bạn thất bại!');
            }
          }
        },
        { text: 'Không', style: 'cancel' }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.friendCard}>
      <Image
        source={
          item.avatar || item.photoURL
            ? { uri: item.avatar || item.photoURL }
            : require('../assets/icons8-account-48.png')
        }
        style={styles.avatar}
      />
      <View style={styles.info}>
        <Text style={styles.name}>
          {item.name || item.displayName || item.username || 'Không tên'}
        </Text>
        <Text style={styles.email}>Email: {item.email}</Text>
        <Text style={styles.phone}>
          Số điện thoại: {item.phone || item.phoneNumber || ''}
        </Text>
      </View><TouchableOpacity style={styles.unfriendBtn} onPress={() => handleUnfriend(item._id)}>

              <Text style={styles.unfriendText}>Huỷ kết bạn</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) return <ActivityIndicator size="large" color="#0068FF" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.title}>Danh sách bạn bè</Text>
      </View>
      <FlatList
        data={friends}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 80 }}
      />
      <Footer navigation={navigation} currentTab="FriendListScreen" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 12,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#222' },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafbfc',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eee',
    marginRight: 16,
  },
  info: { flex: 1 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  email: { fontSize: 14, color: '#555', marginTop: 2 },
  phone: { fontSize: 14, color: '#555', marginTop: 2 },
  unfriendBtn: {
    backgroundColor: '#e53935',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 10,
  },
  unfriendText: { color: '#fff', fontWeight: 'bold' },
});
