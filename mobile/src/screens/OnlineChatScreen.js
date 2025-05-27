import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView,
  Platform, Image, Alert, Modal
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

  // State cho menu tin nhắn
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [showMsgMenu, setShowMsgMenu] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  // State cho chuyển tiếp
  const [forwardModal, setForwardModal] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [loadingForward, setLoadingForward] = useState(false);

  // Lấy danh sách tin nhắn và userId
  const reloadMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/messages/${idChatRoom}`, {
        headers: { Authorization: token }
      });
      // Map lại id cho chắc chắn
      const data = (res.data?.data || []).map(msg => ({
        ...msg,
        id: msg.id || msg._id
      }));
      setMessages(data);
    } catch (e) {
      console.log('Reload messages error:', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await axios.get(`${BASE_URL}/api/messages/${idChatRoom}`, {
          headers: { Authorization: token }
        });
        // Map lại id cho chắc chắn
        const data = (res.data?.data || []).map(msg => ({
          ...msg,
          id: msg.id || msg._id
        }));
        setMessages(data);
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserId(payload.id);

        socket = io(BASE_URL);
        socket.emit('setup', JSON.stringify(payload.id));
        socket.emit('join chat', idChatRoom, JSON.stringify(payload.id));

        socket.on('message', () => {
          reloadMessages();
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

  // Gửi tin nhắn
  const handleSend = async () => {
    if (!content.trim()) return;
    const token = await AsyncStorage.getItem('token');
    const payload = { chatRoomId: idChatRoom, content, type: 'text', reply: '' };
    try {
      await axios.post(`${BASE_URL}/api/send-message`, { data: payload }, {
        headers: { Authorization: token }
      });
      setContent('');
      reloadMessages();
    } catch (err) {
      Alert.alert('Lỗi', 'Không gửi được tin nhắn');
    }
  };

  // Gửi media
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
      await axios.post(`${BASE_URL}/api/send-media`, formData, {
        headers: {
          Authorization: token,
          'Content-Type': 'multipart/form-data'
        }
      });
      reloadMessages();
    } catch (err) {
      Alert.alert('Lỗi', 'Không gửi được media');
    }
  };

  // Ghi âm
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Lỗi', 'Bạn cần cấp quyền ghi âm');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể bắt đầu ghi âm');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        uploadMedia({ uri, type: 'audio/m4a', fileName: 'audio.m4a' });
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể dừng ghi âm');
    }
  };

  const playAudio = async (url) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      setSound(sound);
      await sound.playAsync();
    } catch (err) {
      Alert.alert('Lỗi', 'Không phát được âm thanh');
    }
  };

  const handleCall = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.post(`${BASE_URL}/api/create-call-room`, {}, {
        headers: { Authorization: token }
      });
      const url = res.data?.url;
      const meetingId = url.split('/').pop();

      if (meetingId) {
        navigation.navigate('CallScreen', { meetingId });
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không tạo được cuộc gọi');
    }
  };

  // ====== CÁC CHỨC NĂNG VỚI TIN NHẮN ======
  const handleRecall = async () => {
    setLoadingAction(true);
    try {
      if (!selectedMsg?.id) throw new Error('No message selected');
      const token = await AsyncStorage.getItem('token');
      await axios.patch(`${BASE_URL}/unsent-message/${selectedMsg.id}`, {}, {
        headers: { Authorization: token }
      });
      setShowMsgMenu(false);
      reloadMessages();
      Alert.alert('Thành công', 'Đã thu hồi tin nhắn!');
    } catch (err) {
      console.log('Recall error:', err?.response?.data || err.message);
      Alert.alert('Lỗi', 'Không thu hồi được tin nhắn');
    }
    setLoadingAction(false);
  };

  const handlePin = async () => {
    setLoadingAction(true);
    try {
      if (!selectedMsg?.id) throw new Error('No message selected');
      const token = await AsyncStorage.getItem('token');
      await axios.patch(`${BASE_URL}/pin-message/${selectedMsg.id}`, {}, {
        headers: { Authorization: token }
      });
      setShowMsgMenu(false);
      reloadMessages();
      Alert.alert('Thành công', 'Đã ghim tin nhắn!');
    } catch (err) {
      console.log('Pin error:', err?.response?.data || err.message);
      Alert.alert('Lỗi', 'Không ghim được tin nhắn');
    }
    setLoadingAction(false);
  };

  const handleUnpin = async () => {
    setLoadingAction(true);
    try {
      if (!selectedMsg?.id) throw new Error('No message selected');
      const token = await AsyncStorage.getItem('token');
      await axios.patch(`${BASE_URL}/unpin-message/${selectedMsg.id}`, {}, {
        headers: { Authorization: token }
      });
      setShowMsgMenu(false);
      reloadMessages();
      Alert.alert('Thành công', 'Đã bỏ ghim tin nhắn!');
    } catch (err) {
      console.log('Unpin error:', err?.response?.data || err.message);
      Alert.alert('Lỗi', 'Không bỏ ghim được tin nhắn');
    }
    setLoadingAction(false);
  };

  const handleDelete = async () => {
    setLoadingAction(true);
    try {
      if (!selectedMsg?.id) throw new Error('No message selected');
      const token = await AsyncStorage.getItem('token');
      await axios.delete(`${BASE_URL}/message/${selectedMsg.id}`, {
        headers: { Authorization: token }
      });
      setShowMsgMenu(false);
      reloadMessages();
      Alert.alert('Thành công', 'Đã xóa tin nhắn!');
    } catch (err) {
      console.log('Delete error:', err?.response?.data || err.message);
      Alert.alert('Lỗi', 'Không xóa được tin nhắn');
    }
    setLoadingAction(false);
  };

  const handleHide = async () => {
    setLoadingAction(true);
    try {
      if (!selectedMsg?.id) throw new Error('No message selected');
      const token = await AsyncStorage.getItem('token');
      await axios.patch(`${BASE_URL}/hide-message/${selectedMsg.id}`, {}, {
        headers: { Authorization: token }
      });
      setShowMsgMenu(false);
      reloadMessages();
      Alert.alert('Thành công', 'Đã ẩn tin nhắn!');
    } catch (err) {
      console.log('Hide error:', err?.response?.data || err.message);
      Alert.alert('Lỗi', 'Không ẩn được tin nhắn');
    }
    setLoadingAction(false);
  };

  // ====== CHUYỂN TIẾP TIN NHẮN ======
  const openForwardModal = async () => {
    setLoadingForward(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/chatrooms`, {
        headers: { Authorization: token }
      });
      setChatList(res.data?.data || []);
      setForwardModal(true);
    } catch (err) {
      console.log('Forward modal error:', err?.response?.data || err.message);
      Alert.alert('Lỗi', 'Không lấy được danh sách chat');
    }
    setLoadingForward(false);
  };

  const handleForwardTo = async (targetChatRoomId) => {
    setLoadingForward(true);
    try {
      if (!selectedMsg?.id) throw new Error('No message selected');
      const token = await AsyncStorage.getItem('token');
      await axios.patch(`${BASE_URL}/forward-message/${selectedMsg.id}`, { targetChatRoomId }, {
        headers: { Authorization: token }
      });
      setForwardModal(false);
      setShowMsgMenu(false);
      Alert.alert('Thành công', 'Đã chuyển tiếp tin nhắn!');
    } catch (err) {
      console.log('Forward error:', err?.response?.data || err.message);
      Alert.alert('Lỗi', 'Không chuyển tiếp được tin nhắn');
    }
    setLoadingForward(false);
  };

  const handleReaction = async (emoji) => {
    setLoadingAction(true);
    try {
      if (!selectedMsg?.id) throw new Error('No message selected');
      const token = await AsyncStorage.getItem('token');
      await axios.patch(`${BASE_URL}/react-message/${selectedMsg.id}`, { emoji }, {
        headers: { Authorization: token }
      });
      setShowMsgMenu(false);
      reloadMessages();
      Alert.alert('Thành công', 'Đã gửi cảm xúc!');
    } catch (err) {
      console.log('Reaction error:', err?.response?.data || err.message);
      Alert.alert('Lỗi', 'Không gửi cảm xúc được');
    }
    setLoadingAction(false);
  };

  // ====== RENDER ITEM VÀ MENU ======
  const handleLongPress = (msg) => {
    setSelectedMsg(msg);
    setShowMsgMenu(true);
  };

  const renderItem = ({ item }) => {
    const isSent = item.senderId === userId || item.isSent;
    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
        style={[styles.messageBlock, isSent ? styles.mine : styles.other]}
      >
        {/* Hiển thị tên người gửi nếu không phải mình */}
        {!isSent && <Text style={styles.senderName}>{item.senderName}</Text>}
        {/* Nội dung tin nhắn */}
        {(item.type === 'text' || item.type === '') && <Text style={styles.messageText}>{item.content}</Text>}
        {item.type === 'image' && <Image source={{ uri: item.media?.url }} style={styles.image} />}
        {item.type === 'audio' && (
          <TouchableOpacity onPress={() => playAudio(item.media?.url)}>
            <Text style={styles.messageText}>🎧 Nhấn để nghe</Text>
          </TouchableOpacity>
        )}
        {item.type === 'video' && (
          <Text style={styles.messageText}>🎥 [Video gửi]</Text>
        )}
        {/* Hiển thị trạng thái ghim */}
        {item.isPinned && <Text style={{ color: 'orange', fontWeight: 'bold' }}>Đã ghim</Text>}
        {/* Hiển thị reaction */}
        {item.reactions && item.reactions.length > 0 && (
          <Text>{item.reactions.map(r => r.emoji).join(' ')}</Text>
        )}
        <Text style={styles.time}>{item.time}</Text>
      </TouchableOpacity>
    );
  };

  // ====== MODAL MENU CHỨC NĂNG ======
  const renderMsgMenu = () => (
    <Modal
      visible={showMsgMenu}
      transparent
      animationType="fade"
      onRequestClose={() => setShowMsgMenu(false)}
    >
      <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowMsgMenu(false)}>
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18,
          padding: 18, elevation: 5
        }}>
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, marginBottom: 8 }} />
            <Text style={{ fontWeight: 'bold', fontSize: 18 }}>Chức năng tin nhắn</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 12 }}>
            {['❤️','😂','😮'].map(e => (
              <TouchableOpacity key={e} onPress={() => handleReaction(e)} disabled={loadingAction}>
                <Text style={{ fontSize: 28, marginHorizontal: 10 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.menuBtn} onPress={handleRecall} disabled={loadingAction}><Text style={styles.menuText}>Thu hồi</Text></TouchableOpacity>
          <TouchableOpacity style={styles.menuBtn} onPress={handlePin} disabled={loadingAction}><Text style={styles.menuText}>Ghim</Text></TouchableOpacity>
          <TouchableOpacity style={styles.menuBtn} onPress={handleUnpin} disabled={loadingAction}><Text style={styles.menuText}>Bỏ ghim</Text></TouchableOpacity>
          <TouchableOpacity style={styles.menuBtn} onPress={handleDelete} disabled={loadingAction}><Text style={styles.menuText}>Xóa</Text></TouchableOpacity>
          <TouchableOpacity style={styles.menuBtn} onPress={handleHide} disabled={loadingAction}><Text style={styles.menuText}>Ẩn</Text></TouchableOpacity>
          <TouchableOpacity style={styles.menuBtn} onPress={openForwardModal} disabled={loadingAction}><Text style={styles.menuText}>Chuyển tiếp</Text></TouchableOpacity>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setShowMsgMenu(false)}>
            <Text style={[styles.menuText, { color: 'red' }]}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ====== MODAL CHUYỂN TIẾP ======
  const renderForwardModal = () => (
    <Modal
      visible={forwardModal}
      transparent
      animationType="slide"
      onRequestClose={() => setForwardModal(false)}
    >
      <View style={{
        flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end'
      }}>
        <View style={{
          backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18,
          maxHeight: '60%', padding: 18
        }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>Chọn nơi chuyển tiếp</Text>
          {loadingForward ? (
            <Text style={{ textAlign: 'center', marginVertical: 20 }}>Đang tải...</Text>
          ) : chatList.length === 0 ? (
            <Text style={{ textAlign: 'center', marginVertical: 20, color: '#888' }}>Không có cuộc trò chuyện nào</Text>
          ) : (
            <FlatList
              data={chatList}
              keyExtractor={item => item.id?.toString() || item._id?.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderColor: '#eee'
                  }}
                  onPress={() => handleForwardTo(item.id || item._id)}
                  disabled={loadingForward}
                >
                  <Image source={{ uri: item.avatar || undefined }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12, backgroundColor: '#eee' }} />
                  <View>
                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.name || item.title}</Text>
                    {item.lastMessage && <Text style={{ color: '#888', fontSize: 13 }}>{item.lastMessage}</Text>}
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
          <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setForwardModal(false)}>
            <Text style={{ color: 'red', fontSize: 16 }}>Hủy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item, index) => item?.id?.toString() || item._id?.toString() || index.toString()}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      {renderMsgMenu()}
      {renderForwardModal()}
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
  },
  menuItem: {
    padding: 8,
    fontSize: 16
  },
  menuBtn: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderColor: '#eee'
  },
  menuText: {
    fontSize: 17,
    color: '#222'
  }
});
