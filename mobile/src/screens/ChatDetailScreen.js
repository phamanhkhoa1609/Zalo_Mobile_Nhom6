import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator
} from 'react-native';
import axios from 'axios';

export default function ChatListScreen({ navigation }) {
  const [chatList, setChatList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchChatList = async () => {
    try {
      const res = await axios.get('http://192.168.1.125:3000/api/info-chat-item', {
        headers: {
          // Gắn Authorization nếu có dùng JWT
          // Authorization: `Bearer ${token}`
        }
      });

      setChatList(res.data || []);
    } catch (err) {
      console.log('Lỗi load chat list:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChatList();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => navigation.navigate('ChatDetail', { chatRoomId: item.chatRoomId })}
    >
      <Image source={{ uri: item.photoURL }} style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage?.content || '...'}</Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chatList}
        keyExtractor={(item) => item.chatRoomId}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  itemContainer: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderBottomWidth: 1, borderColor: '#eee'
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25, marginRight: 12, backgroundColor: '#ccc'
  },
  info: {
    flex: 1
  },
  name: {
    fontSize: 16, fontWeight: 'bold'
  },
  lastMessage: {
    fontSize: 14, color: '#555'
  },
  unreadBadge: {
    backgroundColor: '#f00', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2
  },
  unreadText: {
    color: '#fff', fontWeight: 'bold', fontSize: 12
  }
});
