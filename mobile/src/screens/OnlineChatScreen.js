import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView,
  Platform, Image, Alert, Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { BASE_URL } from '../config';
import io from 'socket.io-client';

let socket;

export default function OnlineChatScreen({ route, navigation }) {
  const { idChatRoom } = route.params;
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [userId, setUserId] = useState(null);
  const flatListRef = useRef();
  const [recording, setRecording] = useState(null);
  const [sound, setSound] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await axios.get(`${BASE_URL}/api/messages/${idChatRoom}`, {
          headers: { Authorization: token }
        });
        const data = res.data?.data || [];
        setMessages(data);

        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserId(payload.id);

        socket = io(BASE_URL);
        socket.emit('setup', JSON.stringify(payload.id));
        socket.emit('join chat', idChatRoom, JSON.stringify(payload.id));

        socket.on('message', (newMsg) => {
          setMessages((prev) => [...prev, newMsg]);
        });
      } catch (err) {
        console.warn('❌ Lỗi load tin nhắn:', err.message);
      }
    };

    init();
    return () => {
      socket?.disconnect();
      sound?.unloadAsync?.();
    };
  }, [idChatRoom]);

  const handleSend = async () => {
    if (!content.trim()) return;
    const token = await AsyncStorage.getItem('token');
    const payload = { chatRoomId: idChatRoom, content, type: 'text', reply: '' };
    try {
      await axios.post(`${BASE_URL}/api/send-message`, { data: payload }, {
        headers: { Authorization: token }
      });
      socket.emit('message', {
        ...payload,
        senderId: JSON.stringify(userId)
      }, Date.now());
      setContent('');
    } catch (err) {
      console.warn('❌ Lỗi gửi tin nhắn:', err.message);
    }
  };

  const pickMedia = async (type) => {
    let permission;
    if (type === 'image') {
      permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    } else {
      permission = await ImagePicker.requestCameraPermissionsAsync();
    }
    if (permission.status !== 'granted') {
      alert('Cần cấp quyền');
      return;
    }

    const result = type === 'image'
      ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All })
      : await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All });

    if (!result.canceled && result.assets?.length > 0) {
      uploadMedia(result.assets[0]);
    }
  };

  const uploadMedia = async (picked) => {
    const token = await AsyncStorage.getItem('token');
    const formData = new FormData();
    formData.append('media', {
      uri: picked.uri,
      name: picked.fileName || 'file',
      type: picked.type || 'image/jpeg'
    });
    formData.append('chatRoomId', idChatRoom);

    try {
      const res = await axios.post(`${BASE_URL}/api/send-media`, formData, {
        headers: {
          Authorization: token,
          'Content-Type': 'multipart/form-data'
        }
      });
      const uploaded = res.data?.data || [];
      setMessages(prev => [...prev, ...uploaded]);
    } catch (err) {
      console.warn('❌ Lỗi gửi media:', err.message);
    }
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const { recording } = await Audio.Recording.createAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      setRecording(recording);
    } catch (err) {
      console.warn('❌ Lỗi ghi âm:', err);
    }
  };

  const stopRecording = async () => {
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (uri) {
      uploadMedia({ uri, type: 'audio/m4a', fileName: 'audio.m4a' });
    }
  };

  const playAudio = async (url) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      setSound(sound);
      await sound.playAsync();
    } catch (err) {
      console.warn('❌ Lỗi phát âm thanh:', err);
    }
  };

  const handleCall = async (type = 'video') => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.post(`${BASE_URL}/api/create-call-room`, {}, {
        headers: { Authorization: token }
      });
      const url = res.data?.url;
      if (url) {
        Linking.openURL(url);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không tạo được cuộc gọi: ' + err.message);
    }
  };

  const renderItem = ({ item }) => {
    const isSent = item.senderId === userId || item.isSent;
    return (
      <View style={[styles.messageBlock, isSent ? styles.mine : styles.other]}>
        {!isSent && <Text style={styles.senderName}>{item.senderName}</Text>}

        {item.type === 'text' && <Text style={styles.messageText}>{item.content}</Text>}
        {item.type === 'image' && <Image source={{ uri: item.media?.url }} style={styles.image} />}
        {item.type === 'audio' && (
          <TouchableOpacity onPress={() => playAudio(item.media?.url)}>
            <Text style={styles.messageText}>🎧 Nhấn để nghe</Text>
          </TouchableOpacity>
        )}
        {item.type === 'video' && (
          <Text style={styles.messageText}>🎥 [Video gửi]</Text>
        )}

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
        <TouchableOpacity onPress={() => pickMedia('image')} style={styles.mediaBtn}><Text style={styles.mediaText}>🖼</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => pickMedia('camera')} style={styles.mediaBtn}><Text style={styles.mediaText}>📷</Text></TouchableOpacity>
        <TouchableOpacity
          onPress={recording ? stopRecording : startRecording}
          style={styles.mediaBtn}
        >
          <Text style={styles.mediaText}>{recording ? '⏹' : '🎙'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleCall('voice')} style={styles.mediaBtn}><Text style={styles.mediaText}>📞</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => handleCall('video')} style={styles.mediaBtn}><Text style={styles.mediaText}>📹</Text></TouchableOpacity>
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
  },
  mediaBtn: {
    padding: 6,
    backgroundColor: '#eee',
    borderRadius: 20,
    marginRight: 6
  },
  mediaText: {
    fontSize: 20
  }
});
