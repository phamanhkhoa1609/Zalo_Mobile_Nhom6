import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator
} from 'react-native';

export default function ChatListScreen({ navigation }) {
  const [chatList, setChatList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Giả lập loading rồi set dữ liệu giả
    setTimeout(() => {
      setChatList([
        {
          chatRoomId: '1',
          name: 'Nguyễn Văn A',
          photoURL: 'https://i.pravatar.cc/150?img=1',
          lastMessage: { content: 'Chào bạn!' },
          unreadCount: 2
        },
        {
          chatRoomId: '2',
          name: 'Trần Thị B',
          photoURL: 'https://i.pravatar.cc/150?img=2',
          lastMessage: { content: 'Ok, hẹn gặp sau.' },
          unreadCount: 0
        },
        {
          chatRoomId: '3',
          name: 'Nhóm Lập Trình',
          photoURL: 'https://i.pravatar.cc/150?img=3',
          lastMessage: { content: 'Mọi người xem lại deadline nhé!' },
          unreadCount: 5
        }
      ]);
      setLoading(false);
    }, 1000); // giả lập 1s loading
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
