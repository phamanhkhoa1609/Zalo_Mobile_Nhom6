import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../config';

export default function ResetPasswordScreen({ route, navigation }) {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!otp || !newPassword) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ OTP và mật khẩu mới.');
      return;
    }

    setLoading(true);
    try {
      // ✅ Bước 1: Xác thực OTP
      const verify = await axios.post(`${BASE_URL}/api/users/verify-reset-passwordOTP`, { email, otp });
      if (!verify.data.success) {
        Alert.alert('Sai OTP', verify.data.message || 'Không thể xác thực OTP');
        return;
      }

      // ✅ Bước 2: Gửi mật khẩu mới
      const update = await axios.post(`${BASE_URL}/api/users/update-password`, {
        email,
        newPassword
      });

      if (update.data.success) {
        Alert.alert('Thành công', 'Mật khẩu đã được đổi');
        navigation.navigate('Login');
      } else {
        Alert.alert('Lỗi', update.data.message || 'Không thể đổi mật khẩu');
      }
    } catch (err) {
      console.log('❌ Lỗi reset mật khẩu:', err.response?.data || err.message);
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đặt lại mật khẩu</Text>
      <Text style={styles.subtitle}>Email: {email}</Text>
      <TextInput
        placeholder="Nhập mã OTP"
        style={styles.input}
        keyboardType="numeric"
        value={otp}
        onChangeText={setOtp}
      />
      <TextInput
        placeholder="Mật khẩu mới"
        style={styles.input}
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Xác nhận</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  subtitle: { textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 10, marginBottom: 14 },
  button: { backgroundColor: '#0068ff', padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});
