import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView,
  Platform, Image, Alert, Modal, SafeAreaView, Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { BASE_URL } from '../config';
import io from 'socket.io-client';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

let socket;

export default function OnlineChatScreen({ route, navigation }) {
  const { idChatRoom, isGroup } = route.params || {};
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

  // State cho search tin nhắn
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [headerInfo, setHeaderInfo] = useState({ name: '', avatar: '', status: '' });

  // Thêm state
const [showUserModal, setShowUserModal] = useState(false);
const [userProfile, setUserProfile] = useState(null);
const [loadingProfile, setLoadingProfile] = useState(false);

// Thêm state cho vote modal
const [showVoteModal, setShowVoteModal] = useState(false);
const [voteQuestion, setVoteQuestion] = useState('');
const [voteOptions, setVoteOptions] = useState(['']);
const [voteEndTime, setVoteEndTime] = useState(null);
const [isMultipleChoice, setIsMultipleChoice] = useState(false);


// Hàm fetch thông tin user
const fetchUserProfile = async () => {
  if (isGroup) return; // Không hiển thị profile user cho nhóm
  setLoadingProfile(true); // Bật loading dù không gọi API, để giữ cấu trúc
  try {
    // Lấy thông tin user trực tiếp từ state headerInfo
    // API fetchHeaderInfo đã chạy khi màn hình load
    const userData = headerInfo;

    if (!userData || Object.keys(userData).length === 0) { // Kiểm tra nếu headerInfo hoàn toàn trống
       console.warn('⚠️ headerInfo is empty. Cannot display profile modal.');
       Alert.alert('Thông báo', 'Không thể tải thông tin người dùng.');
       return; // Không mở modal nếu không có data cơ bản nào
    }

    // Vẫn log cảnh báo nếu thiếu _id, nhưng không ngăn mở modal
    if (!userData._id) {
       console.warn('⚠️ headerInfo is missing _id. Some profile actions might not be available.', userData);
    }

    console.log('📦 Using user data from headerInfo for profile modal:', userData);

    // Sử dụng dữ liệu có sẵn từ headerInfo để set state userProfile
    // Các trường thiếu sẽ hiển thị giá trị mặc định (hoặc rỗng)
    setUserProfile({
      _id: userData._id || undefined, // Sử dụng _id nếu có, nếu không thì undefined
      name: userData.name || userData.displayName || 'Không tên',
      avatar: userData.avatar || userData.photoURL || '',
      // Các trường chi tiết hơn sẽ chỉ hiển thị nếu có sẵn trong userData từ headerInfo
      email: userData.email || '',
      phone: userData.phone || '',
      dob: userData.dob || '',
      countCommonGroup: userData.countCommonGroup || 0,
      // Thêm các trường khác nếu API /info-user trả về chúng
    });

    setShowUserModal(true);

  } catch (err) {
    // Lỗi xảy ra nếu có vấn đề khi truy cập headerInfo hoặc set state (ít khả năng)
    console.error('❌ Lỗi khi chuẩn bị thông tin user cho modal từ headerInfo:', err);
    Alert.alert('Lỗi', 'Không thể hiển thị thông tin người dùng.');
  } finally {
    setLoadingProfile(false); // Tắt loading
  }
};
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
    // Khai báo các biến listener ở ngoài hàm init
    let messageListener;
    let incomingCallListener;

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
        
        // Gán giá trị cho các biến listener
        messageListener = () => {
          reloadMessages();
        };
        incomingCallListener = ({ meetingId, caller, type }) => {
          Alert.alert(
            'Cuộc gọi đến',
            `${caller || 'Người dùng khác'} đang gọi bạn (${type === 'video' ? 'Video' : 'Voice'})`,
            [
              { text: 'Từ chối', style: 'cancel' },
              { text: 'Chấp nhận', onPress: () => navigation.navigate('MeetingScreen', { meetingId, type }) },
            ],
            { cancelable: false }
          );
        };

        socket.on('message', messageListener);
        socket.on('incomingCall', incomingCallListener);

      } catch (err) {
        console.warn('❌ Lỗi load tin nhắn:', err.message);
      }
    };

    init();
    
    // Cleanup function to remove listeners and disconnect socket
    return () => {
      if (socket) {
        socket.off('message', messageListener);
        socket.off('incomingCall', incomingCallListener);
        socket.disconnect();
      }
      sound?.unloadAsync?.();
    };
  }, [idChatRoom, navigation]); // Thêm navigation vào dependencies nếu nó được dùng trong callback

  // Lấy thông tin user/group cho header
  // Trong OnlineChatScreen.js
// Trong OnlineChatScreen.js
useEffect(() => {
  const fetchHeaderInfo = async () => {
    try {
      const { name, avatar, isDefaultAvatar } = route.params || {};
      
      // Nếu đã có name hoặc avatar từ route.params, sử dụng luôn
      if (name || avatar || isDefaultAvatar) {
        setHeaderInfo({
          name: name || 'Chat',
          avatar: isDefaultAvatar ? '_default_avatar_' : (avatar || ''),
          status: isGroup ? 'Group' : 'Active recently'
        });
        if (name && (avatar || isDefaultAvatar)) return;
      }

      // Nếu không có dữ liệu từ route.params, gọi API
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      if (isGroup) {
        const res = await axios.get(`${BASE_URL}/profile-group/${idChatRoom}`, {
          headers: { Authorization: token }
        });
        const group = res.data?.data;
        setHeaderInfo(prevInfo => ({
          ...prevInfo,
          name: group?.name || 'Nhóm không tên',
          avatar: group?.avatar || prevInfo.avatar || '',
          status: group?.status || 'Group'
        }));
      } else {
        const res = await axios.get(`${BASE_URL}/info-user/${idChatRoom}`, {
          headers: { Authorization: token }
        });
        const user = res.data?.data;
        setHeaderInfo(prevInfo => ({
          ...prevInfo,
          name: user?.displayName || user?.name || 'Người dùng',
          avatar: user?.photoURL || user?.avatar || prevInfo.avatar || '',
          status: user?.status || 'Active recently'
        }));
      }
    } catch (e) {
      console.error('Fetch header info error:', e.message);
      // Nếu API lỗi (404), sử dụng dữ liệu từ route.params hoặc giá trị mặc định
      setHeaderInfo({ 
        name: route.params?.name || 'Chat', 
        avatar: route.params?.avatar ? { uri: route.params.avatar } : require('../assets/icons8-account-48.png'), 
        status: isGroup ? 'Group' : 'Active recently' 
      });
    }
  };
  fetchHeaderInfo();
}, [idChatRoom, isGroup, route.params]);

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

  const handleCall = async (type = 'voice') => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.post(`${BASE_URL}/api/create-meeting`, {}, {
        headers: { Authorization: token }
      });
      const meetingId = res.data?.roomId;
      if (meetingId) {
        // Gửi notify qua socket cho người nhận (nếu muốn)
        // socket.emit('notify', { meetingId, userId: <id người nhận>, caller: userId, type });
        navigation.navigate('MeetingScreen', { meetingId, type });
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
      await axios.patch(`${BASE_URL}/api/unsent-message/${selectedMsg.id}`, {}, {
        headers: { Authorization: token }
      });
      setShowMsgMenu(false);
      reloadMessages();
      Alert.alert('Thành công', 'Đã thu hồi tin nhắn!');
    } catch (err) {
      Alert.alert('Lỗi', 'Không thu hồi được tin nhắn');
    }
    setLoadingAction(false);
  };

  const handlePin = async () => {
    setLoadingAction(true);
    try {
      if (!selectedMsg?.id) throw new Error('No message selected');
      const token = await AsyncStorage.getItem('token');
      await axios.patch(`${BASE_URL}/api/pin-message/${selectedMsg.id}`, {}, {
        headers: { Authorization: token }
      });
      setShowMsgMenu(false);
      reloadMessages();
      Alert.alert('Thành công', 'Đã ghim tin nhắn!');
    } catch (err) {
      Alert.alert('Lỗi', 'Không ghim được tin nhắn');
    }
    setLoadingAction(false);
  };

const handleUnpinPinned = async () => {
  if (!pinnedMessage?.id) return;
  setLoadingAction(true);
  try {
    const token = await AsyncStorage.getItem('token');
    console.log('Unpin token:', token);
    console.log('Unpin payload:', pinnedMessage.id);
    const res = await axios.patch(`${BASE_URL}/unpin-message/${pinnedMessage.id}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Unpin response:', res.data);
    reloadMessages();
    Alert.alert('Thành công', 'Đã gỡ ghim tin nhắn!');
  } catch (err) {
    console.log('Unpin error:', err?.response?.data || err.message);
    Alert.alert('Lỗi', 'Không gỡ ghim được tin nhắn');
  }
  setLoadingAction(false);
};

  const handleDelete = async () => {
    setLoadingAction(true);
    try {
      if (!selectedMsg?.id) throw new Error('No message selected');
      const token = await AsyncStorage.getItem('token');
      await axios.delete(`${BASE_URL}/api/message/${selectedMsg.id}`, {
        headers: { Authorization: token }
      });
      setShowMsgMenu(false);
      reloadMessages();
      Alert.alert('Thành công', 'Đã xóa tin nhắn!');
    } catch (err) {
      Alert.alert('Lỗi', 'Không xóa được tin nhắn');
    }
    setLoadingAction(false);
  };

  const handleHide = async () => {
    setLoadingAction(true);
    try {
      if (!selectedMsg?.id) throw new Error('No message selected');
      const token = await AsyncStorage.getItem('token');
      await axios.patch(`${BASE_URL}/api/hide-message/${selectedMsg.id}`, {}, {
        headers: { Authorization: token }
      });
      setShowMsgMenu(false);
      reloadMessages();
      Alert.alert('Thành công', 'Đã ẩn tin nhắn!');
    } catch (err) {
      Alert.alert('Lỗi', 'Không ẩn được tin nhắn');
    }
    setLoadingAction(false);
  };

  const handleReaction = async (emoji) => {
    setLoadingAction(true);
    try {
      if (!selectedMsg?.id) throw new Error('No message selected');
      const token = await AsyncStorage.getItem('token');
      console.log('React payload:', selectedMsg.id, emoji);
      const res = await axios.patch(`${BASE_URL}/react-message/${selectedMsg.id}`, { emoji }, {
        headers: { Authorization: token }
      });
      console.log('React response:', res.data);
      setMessages(prevMsgs => prevMsgs.map(msg =>
        msg.id === selectedMsg.id ? { ...msg, reactions: res.data?.data?.reactions || [] } : msg
      ));
      setShowMsgMenu(false);
      Alert.alert('Thành công', 'Đã gửi cảm xúc!');
    } catch (err) {
      console.log('React error:', err?.response?.data || err.message);
      Alert.alert('Lỗi', 'Không gửi cảm xúc được');
    }
    setLoadingAction(false);
  };

  // ====== CHUYỂN TIẾP TIN NHẮN ======
  const openForwardModal = async () => {
    setLoadingForward(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/chatrooms`, {
        headers: { Authorization: token }
      });
      setChatList(res.data?.data || []);
      setForwardModal(true);
    } catch (err) {
      Alert.alert('Lỗi', 'Không lấy được danh sách chat');
    }
    setLoadingForward(false);
  };

  const handleForwardTo = async (targetChatRoomId) => {
    setLoadingForward(true);
    try {
      if (!selectedMsg?.id) throw new Error('No message selected');
      const token = await AsyncStorage.getItem('token');
      console.log('Forward payload:', selectedMsg.id, targetChatRoomId);
      const res = await axios.patch(`${BASE_URL}/forward-message/${selectedMsg.id}`, { chatRoomId: targetChatRoomId }, {
        headers: { Authorization: token }
      });
      console.log('Forward response:', res.data);
      setForwardModal(false);
      setShowMsgMenu(false);
      Alert.alert('Thành công', 'Đã chuyển tiếp tin nhắn!');
    } catch (err) {
      console.log('Forward error:', err?.response?.data || err.message);
      Alert.alert('Lỗi', 'Không chuyển tiếp được tin nhắn');
    }
    setLoadingForward(false);
  };

  // ====== RENDER ITEM VÀ MENU ======
  const handleLongPress = (msg) => {
    setSelectedMsg(msg);
    setShowMsgMenu(true);
  };

  // ====== HIỂN THỊ TIN NHẮN GHIM Ở ĐẦU ======
  const pinnedMessage = messages.find(msg => msg.isPinned || msg.pin);
  // Sửa lại phần lọc tin nhắn thường - không loại bỏ tin nhắn đã ghim
  const normalMessages = messages;

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
        {/* Nếu tin nhắn bị ẩn */}
        {item.hided ? (
          <Text style={{ fontStyle: 'italic', color: '#888' }}>Tin nhắn đã bị ẩn</Text>
        ) : (
          <>
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
          </>
        )}
        {/* Hiển thị trạng thái ghim */}
        {item.isPinned && <Text style={{ color: 'orange', fontWeight: 'bold', fontSize: 12 }}>📌 Đã ghim</Text>}
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
          <TouchableOpacity style={styles.menuBtn} onPress={handlePin} disabled={loadingAction}><Text style={styles.menuText}>Ghim</Text></TouchableOpacity>
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

  // HEADER responsive, SafeAreaView
 useEffect(() => {
  navigation.setOptions({
    headerShown: true,
    header: () => (
      <SafeAreaView style={{ backgroundColor: '#fff' }}>
        <View style={styles.webHeaderContainer}>
          <View style={styles.webHeaderLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color="#222" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => !isGroup && fetchUserProfile()}>
              <Image
                source={
                  headerInfo.avatar === '_default_avatar_'
                    ? require('../assets/icons8-account-48.png')
                    : (headerInfo.avatar ? { uri: headerInfo.avatar } : require('../assets/icons8-account-48.png'))
                }
                style={styles.webHeaderAvatar}
                defaultSource={require('../assets/icons8-account-48.png')}
              />
            </TouchableOpacity>
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.webHeaderName} numberOfLines={1}>{headerInfo.name || 'Chat'}</Text>
              <Text style={styles.webHeaderStatus} numberOfLines={1}>{headerInfo.status || 'Active recently'}</Text>
            </View>
          </View>
          <View style={styles.webHeaderRight}>
            <TouchableOpacity style={styles.webHeaderIconBtn} onPress={() => setShowSearchModal(true)}>
              <Ionicons name="search" size={22} color="#222" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.webHeaderIconBtn}>
              <MaterialIcons name="add-box" size={22} color="#222" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  });
}, [navigation, headerInfo]);

// Modal cho thông tin cá nhân
const renderUserModal = () => (
  <Modal
    visible={showUserModal}
    transparent
    animationType="fade"
    onRequestClose={() => setShowUserModal(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>User Profile</Text>
        <Image
          source={userProfile?.photoURL || userProfile?.avatar ? { uri: userProfile?.photoURL || userProfile?.avatar } : require('../assets/icons8-account-48.png')}
          style={styles.avatar}
        />
        <Text style={styles.name}>{userProfile?.displayName || userProfile?.name || 'Không tên'}</Text>
        <Text style={styles.betaText}>Beta</Text>
        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{userProfile?.email || 'Không có'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{userProfile?.phone || 'Không có'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dob</Text>
            <Text style={styles.infoValue}>{userProfile?.dob || 'Không có'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Manual group: (0)</Text>
            <Text style={styles.infoValue}>{userProfile?.groups?.length || 0}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.unfriendBtn} onPress={() => {
          Alert.alert('Xác nhận', 'Bạn có chắc muốn hủy kết bạn?', [
            { text: 'Không', style: 'cancel' },
            { text: 'Có', onPress: () => handleUnfriend() }
          ]);
        }}>
          <Text style={styles.unfriendText}>Hủy kết bạn</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowUserModal(false)}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);
  const handleSearchMessages = async () => {
    setSearchLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/messages/${idChatRoom}/search?_q=${encodeURIComponent(searchKeyword)}`, {
        headers: { Authorization: token }
      });
      setSearchResults(res.data?.data || []);
    } catch (e) {
      setSearchResults([]);
    }
    setSearchLoading(false);
  };

  // Hàm gửi vị trí
  const sendLocation = async () => {
    try {
      console.log('Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('Location permission status:', status);
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần cấp quyền truy cập vị trí');
        return;
      }

      console.log('Fetching current location...');
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      console.log('Location obtained:', { latitude, longitude });
      
      console.log('Fetching address from coordinates...');
      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      const addressString = address ? 
        `${address.street}, ${address.city}, ${address.region}, ${address.country}` : 
        'Không xác định được địa chỉ';
      console.log('Address string:', addressString);

      const token = await AsyncStorage.getItem('token');
      
      // === Thay đổi ở đây: Gửi địa chỉ như tin nhắn text thông thường ===
      const payload = { chatRoomId: idChatRoom, content: addressString, type: 'text', reply: '' }; // Chuẩn bị payload như tin nhắn text
      console.log('Sending location address as text message API call...', payload);

      await axios.post(`${BASE_URL}/api/send-message`, { data: payload }, { // Gọi endpoint send-message
        headers: { Authorization: token }
      });

      console.log('Location address sent successfully as text. Reloading messages...');
      reloadMessages();
    } catch (err) {
      console.error('Send location error:', err);
      Alert.alert('Lỗi', 'Không gửi được vị trí'); // Vẫn giữ alert lỗi chung
    }
  };

  // Hàm tạo vote
  const createVote = async () => {
    try {
      if (!voteQuestion.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập câu hỏi');
        return;
      }

      const validOptions = voteOptions.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        Alert.alert('Lỗi', 'Cần ít nhất 2 lựa chọn');
        return;
      }

      const token = await AsyncStorage.getItem('token');
      console.log('Sending create vote API call...', { chatRoomId: idChatRoom, question: voteQuestion, options: validOptions, endTime: voteEndTime, isMultipleChoice });
      await axios.post(`${BASE_URL}/api/create-vote`, {
        data: {
          chatRoomId: idChatRoom,
          question: voteQuestion,
          options: validOptions,
          endTime: voteEndTime,
          isMultipleChoice
        }
      }, {
        headers: { Authorization: token }
      });

      console.log('Vote created successfully. Closing modal and reloading messages...');
      setShowVoteModal(false);
      setVoteQuestion('');
      setVoteOptions(['']);
      setVoteEndTime(null);
      setIsMultipleChoice(false);
      reloadMessages();
    } catch (err) {
      console.error('Create vote error:', err);
      Alert.alert('Lỗi', 'Không tạo được vote');
    }
  };

  // Hàm bỏ phiếu
  const castVote = async (messageId, optionIndex) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/cast-vote`, {
        messageId,
        optionIndex
      }, {
        headers: { Authorization: token }
      });
      reloadMessages();
    } catch (err) {
      console.error('Cast vote error:', err);
      Alert.alert('Lỗi', 'Không bỏ phiếu được');
    }
  };

  const addVoteOptionInput = () => {
    setVoteOptions(prevOptions => [...prevOptions, '']);
  };

  const removeVoteOptionInput = (index) => {
    const newOptions = [...voteOptions];
    newOptions.splice(index, 1);
    setVoteOptions(newOptions);
  };

  const handleVoteOptionChange = (text, index) => {
    const newOptions = [...voteOptions];
    newOptions[index] = text;
    setVoteOptions(newOptions);
  };

  const renderVoteModal = () => (
    <Modal
      visible={showVoteModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowVoteModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Tạo cuộc bình chọn</Text>
          <TextInput
            placeholder="Nhập câu hỏi..."
            style={styles.inputField}
            value={voteQuestion}
            onChangeText={setVoteQuestion}
          />
          <Text style={styles.sectionTitle}>Các lựa chọn:</Text>
          <FlatList
            data={voteOptions}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => (
              <View style={styles.optionInputContainer}>
                <TextInput
                  placeholder={`Lựa chọn ${index + 1}`}
                  style={styles.optionInput}
                  value={item}
                  onChangeText={(text) => handleVoteOptionChange(text, index)}
                />
                {voteOptions.length > 1 && (
                  <TouchableOpacity onPress={() => removeVoteOptionInput(index)}>
                    <MaterialIcons name="remove-circle-outline" size={24} color="red" />
                  </TouchableOpacity>
                )}
              </View>
            )}
            keyboardShouldPersistTaps="handled"
          />
          <TouchableOpacity onPress={addVoteOptionInput} style={styles.addOptionBtn}>
            <Text style={styles.addOptionText}>+ Thêm lựa chọn</Text>
          </TouchableOpacity>

          {/* Tùy chọn thời gian kết thúc và đa lựa chọn có thể thêm sau */}
          {/* <Text style={styles.sectionTitle}>Cài đặt:</Text> */}
          {/* <View style={styles.settingRow}> */}
            {/* <Text>Cho phép nhiều lựa chọn</Text> */}
             {/* Toggle Switch ở đây */}
          {/* \n          </View> */}
          {/* <View style={styles.settingRow}> */}
            {/* <Text>Thời gian kết thúc</Text> */}
             {/* DatePicker hoặc TextInput ở đây */}
          {/* \n          </View> */}

          <TouchableOpacity onPress={createVote} style={styles.createVoteBtn}>
            <Text style={styles.createVoteText}>Tạo bình chọn</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowVoteModal(false)} style={styles.cancelVoteBtn}>
            <Text style={styles.cancelVoteText}>Hủy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Hiển thị tin nhắn ghim ở đầu nếu có */}
      {renderUserModal()}
      {renderVoteModal()}
      {pinnedMessage && (
        <View style={{ backgroundColor: '#fffbe6', borderRadius: 12, margin: 8, padding: 12, borderWidth: 1, borderColor: '#ffe58f' }}>
          <Text style={{ fontWeight: 'bold', color: '#d48806', marginBottom: 4 }}>Tin nhắn đã ghim</Text>
          <Text style={{ color: '#222', fontSize: 16 }}>{pinnedMessage.hided ? 'Tin nhắn đã bị ẩn' : pinnedMessage.content}</Text>
          <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>{pinnedMessage.time}</Text>
          <TouchableOpacity onPress={handleUnpinPinned} style={{ marginTop: 8, alignSelf: 'flex-end', backgroundColor: '#ffe58f', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: '#d48806', fontWeight: 'bold' }}>Gỡ ghim</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        ref={flatListRef}
        data={normalMessages}
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
        <TouchableOpacity onPress={sendLocation} style={styles.mediaBtn}><Text style={styles.mediaText}>📍</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setShowVoteModal(true)} style={styles.mediaBtn}><Text style={styles.mediaText}>📊</Text></TouchableOpacity>
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
      {showSearchModal && (
        <Modal visible={showSearchModal} transparent animationType="slide" onRequestClose={() => setShowSearchModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>Tìm tin nhắn</Text>
              <TextInput
                placeholder="Nhập từ khóa..."
                value={searchKeyword}
                onChangeText={setSearchKeyword}
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 }}
              />
              <TouchableOpacity onPress={handleSearchMessages} style={{ backgroundColor: '#0078fe', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Tìm kiếm</Text>
              </TouchableOpacity>
              {searchLoading ? <Text>Đang tìm...</Text> : (
                <FlatList
                  data={searchResults}
                  keyExtractor={item => item.id?.toString() || item._id?.toString()}
                  renderItem={({ item }) => (
                    <View style={{ paddingVertical: 8 }}>
                      <Text style={{ fontWeight: 'bold' }}>{item.content}</Text>
                      <Text style={{ color: '#888', fontSize: 12 }}>{item.time}</Text>
                    </View>
                  )}
                  ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center' }}>Không có kết quả</Text>}
                  style={{ maxHeight: 200 }}
                />
              )}
              <TouchableOpacity onPress={() => setShowSearchModal(false)} style={{ marginTop: 10, alignItems: 'center' }}>
                <Text style={{ color: 'red' }}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
  },
  webHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: 56
  },
  webHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0
  },
  webHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12
  },
  webHeaderName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#222',
    flexShrink: 1
  },
  webHeaderStatus: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
    flexShrink: 1
  },
  webHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webHeaderIconBtn: {
    marginLeft: 16
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center'
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginVertical: 10,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  betaText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  infoBlock: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  infoTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    color: '#888',
    fontWeight: 'bold',
    minWidth: 60,
  },
  infoValue: {
    color: '#222',
    flex: 1,
    textAlign: 'right',
  },
  unfriendBtn: {
    backgroundColor: '#e53935',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginBottom: 10,
  },
  unfriendText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeBtn: {
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  closeText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
    marginTop: 12,
    width: '100%',
  },
  optionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  addOptionBtn: {
    backgroundColor: '#eef',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  addOptionText: {
    color: '#0068ff',
    fontWeight: 'bold',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  createVoteBtn: {
    backgroundColor: '#0068ff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  createVoteText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelVoteBtn: {
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  cancelVoteText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
  },
  voteContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 10,
    marginTop: 5,
  },
  voteQuestion: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  voteOption: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  votedOption: {
    borderColor: '#0068ff',
  },
  voteOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voteOptionText: {
    flex: 1,
    marginRight: 10,
  },
  voteCount: {
    fontWeight: 'bold',
    color: '#0068ff',
  },
  voteBar: {
    height: 5,
    backgroundColor: '#0068ff',
    borderRadius: 2.5,
    marginTop: 4,
  },
  voteEndTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    textAlign: 'right',
  },
  locationContainer: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    padding: 10,
    marginTop: 5,
  },
  locationText: {
    color: '#388e3c',
    fontWeight: 'bold',
  },
});