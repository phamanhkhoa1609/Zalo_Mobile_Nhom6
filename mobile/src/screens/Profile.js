import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput ,Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../config';
import Footer from './Footer';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editProfile, setEditProfile] = useState({});
  const [showChangePass, setShowChangePass] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loadingChangePass, setLoadingChangePass] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await axios.get(`${BASE_URL}/api/profile`, {
          headers: { Authorization: token }
        });
        setProfile(res.data.data);
      } catch (err) {
        Alert.alert('Lỗi', 'Không lấy được thông tin user');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleEdit = () => {
    setEditProfile(profile);
    setEditMode(true);
  };

  const handleSave = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/profile`, editProfile, {
        headers: { Authorization: token }
      });
      setProfile(editProfile);
      setEditMode(false);
      Alert.alert('Thành công', 'Cập nhật thông tin thành công!');
    } catch (err) {
      Alert.alert('Lỗi', 'Cập nhật thất bại!');
    }
  };

  const handleCancel = () => {
    setEditMode(false);
  };

  const handleChangePassword = async () => {
    if (!currentPass || !newPass || !confirmPass) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    if (newPass !== confirmPass) {
      Alert.alert('Lỗi', 'Mật khẩu mới không khớp!');
      return;
    }
    setLoadingChangePass(true);
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/user/change-password`, {
        currentPassword: currentPass,
        newPassword: newPass
      }, {
        headers: { Authorization: token }
      });
      setShowChangePass(false);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      Alert.alert('Thành công', 'Đổi mật khẩu thành công!');
    } catch (err) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Đổi mật khẩu thất bại!');
    } finally {
      setLoadingChangePass(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }]
    });
  };

const handlePickAvatar = async () => {
  if (!editMode) return;

  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    setUploadingAvatar(true);
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('Không tìm thấy token xác thực');
    }

    const picked = result.assets[0];
    
    // Create FormData with proper structure
    const formData = new FormData();
    formData.append('avatar', {
      uri: Platform.OS === 'ios' ? picked.uri.replace('file://', '') : picked.uri,
      type: 'image/jpeg',
      name: 'avatar.jpg'
    });

    // Upload image
    const response = await fetch(`${BASE_URL}/api/profile/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'multipart/form-data',
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    // Fetch updated profile
    const profileResponse = await axios.get(`${BASE_URL}/api/profile`, {
      headers: { Authorization: token }
    });

    if (profileResponse.data.data) {
      setProfile(profileResponse.data.data);
      setEditProfile(profileResponse.data.data);
      Alert.alert('Thành công', 'Cập nhật ảnh đại diện thành công!');
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    Alert.alert('Lỗi', 'Không thể tải lên ảnh. Vui lòng thử lại!');
    // Revert to original avatar
    setEditProfile({ ...editProfile, avatar: profile.avatar });
  } finally {
    setUploadingAvatar(false);
  }
};


// Helper function to determine MIME type (không thay đổi)
const getMimeType = (extension) => {
  switch (extension.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg'; // Fallback
  }
};
  

  if (loading) return <ActivityIndicator size="large" color="#0068FF" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin tài khoản</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Thông tin tài khoản</Text>
        <TouchableOpacity onPress={handlePickAvatar} disabled={!editMode}>
          <Image source={{ uri: editMode ? editProfile.avatar : profile.avatar }} style={styles.avatar} />
          {uploadingAvatar && <ActivityIndicator style={{ position: 'absolute', top: 40, left: 40 }} />}
        </TouchableOpacity>
        {editMode ? (
          <TextInput
            style={styles.inputName}
            value={editProfile.name}
            onChangeText={text => setEditProfile({ ...editProfile, name: text })}
          />
        ) : (
          <Text style={styles.name}>{profile.name}</Text>
        )}
        {editMode ? (
          <View style={styles.editBtnRow}>
            <TouchableOpacity style={styles.doneBtn} onPress={handleSave}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.updateBtn} onPress={handleEdit}>
            <Text style={styles.updateText}>Chỉnh sửa</Text>
          </TouchableOpacity>
        )}
        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>Thông tin cá nhân</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số điện thoại</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={editProfile.phone}
                onChangeText={text => setEditProfile({ ...editProfile, phone: text })}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.infoValue}>{profile.phone}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ngày sinh</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={editProfile.dob}
                onChangeText={text => setEditProfile({ ...editProfile, dob: text })}
                placeholder="dd/mm/yyyy"
              />
            ) : (
              <Text style={styles.infoValue}>{profile.dob}</Text>
            )}
          </View>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.changePassBtn} onPress={() => setShowChangePass(true)}>
            <Text style={styles.changePassText}>Đổi mật khẩu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </View>
      {showChangePass && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Đổi mật khẩu</Text>

            <Text style={styles.modalLabel}>Mật khẩu hiện tại:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nhập mật khẩu hiện tại"
              secureTextEntry
              value={currentPass}
              onChangeText={setCurrentPass}
            />

            <Text style={styles.modalLabel}>Mật khẩu mới :</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nhập mật khẩu mới"
              secureTextEntry
              value={newPass}
              onChangeText={setNewPass}
            />

            <Text style={styles.modalLabel}>Xác nhận mật khẩu mới:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Xác nhận mật khẩu mới"
              secureTextEntry
              value={confirmPass}
              onChangeText={setConfirmPass}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} disabled={loadingChangePass}>
                <Text style={styles.saveText}>{loadingChangePass ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowChangePass(false)}>
                <Text style={styles.closeText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      <Footer navigation={navigation} currentTab="Profile" />
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  content: { alignItems: 'center', flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 10, marginBottom: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginVertical: 10 },
  name: { fontSize: 20, fontWeight: 'bold', marginVertical: 8 },
  updateBtn: { backgroundColor: '#0068FF', borderRadius: 20, paddingHorizontal: 30, paddingVertical: 8, marginBottom: 16 },
  updateText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  infoBlock: { width: '100%', backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#eee' },
  infoTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 8, color: '#333', borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { color: '#888', fontWeight: 'bold', minWidth: 60 },
  infoValue: { color: '#222', flex: 1, textAlign: 'right' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 16 },
  changePassBtn: { backgroundColor: '#0068FF', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, flex: 1, marginRight: 10 },
  changePassText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  logoutBtn: { borderWidth: 1, borderColor: '#888', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, flex: 1 },
  logoutText: { color: '#888', fontWeight: 'bold', textAlign: 'center' },
  inputName: {
    borderWidth: 1,
    borderColor: '#0068FF',
    borderRadius: 8,
    padding: 10,
    color: '#222',
    backgroundColor: '#f5faff',
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
    textAlign: 'center'
  },
  editBtnRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  doneBtn: {
    backgroundColor: '#0068FF',
    borderRadius: 20,
    paddingHorizontal: 30,
    paddingVertical: 8,
    marginRight: 10,
  },
  doneText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 20,
    paddingHorizontal: 30,
    paddingVertical: 8,
  },
  cancelText: { color: '#888', fontWeight: 'bold', fontSize: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#0068FF',
    borderRadius: 8,
    padding: 10,
    color: '#222',
    backgroundColor: '#f5faff',
    flex: 1,
    marginLeft: 8,
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center'
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  saveBtn: {
    backgroundColor: '#e53935',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  closeBtn: {
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginLeft: 10,
  },
  closeText: { color: '#333', fontWeight: 'bold', fontSize: 16 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#0068FF',
    borderRadius: 8,
    padding: 10,
    color: '#222',
    backgroundColor: '#f5faff',
    marginTop: 10,
    marginBottom: 0,
    fontSize: 16,
  },
  modalLabel: {
    fontSize: 15,
    color: '#222',
    marginTop: 10,
    marginBottom: 4,
    fontWeight: '500'
  },
});