import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView,
  Platform, Image
} from 'react-native';

export default function OnlineChatScreen({ route }) {
  const { idChatRoom } = route.params;
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const flatListRef = useRef();

  useEffect(() => {
    // Giả lập tin nhắn ban đầu
    const mockMessages = [
      {
        id: 1,
        senderId: 'user123',
        senderName: 'Nguyễn Văn A',
        content: 'Chào bạn!',
        type: 'text',
        time: '10:00',
      },
      {
        id: 2,
        senderId: 'me',
        content: 'Chào bạn, bạn cần hỗ trợ gì?',
        type: 'text',
        time: '10:01',
      },
      {
        id: 3,
        senderId: 'user123',
        senderName: 'Nguyễn Văn A',
        type: 'image',
        media: { url: 'https://placekitten.com/200/200' },
        time: '10:02',
      }
    ];
    setMessages(mockMessages);
  }, [idChatRoom]);

  const handleSend = () => {
    if (!content.trim()) return;
    const newMessage = {
      id: Date.now(),
      senderId: 'me',
      content,
      type: 'text',
      time: new Date().toLocaleTimeString().slice(0, 5),
      isSent: true
    };
    setMessages(prev => [...prev, newMessage]);
    setContent('');
  };

  const renderItem = ({ item }) => {
    const isSent = item.senderId === 'me' || item.isSent;
    return (
      <View style={[styles.messageBlock, isSent ? styles.mine : styles.other]}>
        {!isSent && item.senderName && <Text style={styles.senderName}>{item.senderName}</Text>}
        {item.type === 'text' && <Text style={styles.messageText}>{item.content}</Text>}
        {item.type === 'image' && <Image source={{ uri: item.media?.url }} style={styles.image} />}
        <Text style={styles.time}>{item.time}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      <View style={styles.inputBar}>
        <TextInput
          placeholder="Nhập tin nhắn..."
          style={styles.input}
          value={content}
          onChangeText={setContent}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
          <Text style={styles.sendText}>Gửi</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  messageList: { padding: 16, paddingBottom: 80 },
  messageBlock: {
    borderRadius: 18,
    marginVertical: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: '75%',
  },
  mine: { backgroundColor: '#0078fe', alignSelf: 'flex-end' },
  other: { backgroundColor: '#eee', alignSelf: 'flex-start' },
  messageText: { color: '#000', fontSize: 16 },
  time: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'right' },
  senderName: { fontSize: 13, fontWeight: 'bold', marginBottom: 4, color: '#333' },
  image: { width: 180, height: 180, borderRadius: 10, marginBottom: 4, backgroundColor: '#ddd' },
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 0,
    width: '100%'
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginHorizontal: 6,
    backgroundColor: '#fff'
  },
  sendBtn: {
    backgroundColor: '#0068ff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25
  },
  sendText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  }
});
