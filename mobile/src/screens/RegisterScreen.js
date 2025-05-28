// RegisterScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../config';
import Icon from 'react-native-vector-icons/MaterialIcons'; // Thêm thư viện icon

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (!email || !displayName || !password || !dateOfBirth) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ các trường.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/users/send-otp`, {
        email, password, displayName, dateOfBirth
      });
      if (res.data.success) {
        Alert.alert('Thành công', 'Mã xác nhận đã được gửi tới email.');
        setStep(2);
      } else {
        Alert.alert('Lỗi', res.data.message || 'Không gửi được mã.');
      }
    } catch (err) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không gửi được mã xác nhận.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!otp) {
      Alert.alert('Thiếu OTP', 'Vui lòng nhập mã xác nhận');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/users/register`, {
        email, password, displayName, dateOfBirth, otp
      });
      if (res.data.success) {
        Alert.alert('Đăng ký thành công', 'Bây giờ bạn có thể đăng nhập.');
        navigation.replace('Login');
      } else {
        Alert.alert('Lỗi', res.data.message || 'Đăng ký thất bại');
      }
    } catch (err) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng ký tài khoản</Text>
      <Text style={styles.subtitle}>
        Nhập email của bạn để nhận mã xác thực và bắt đầu tạo tài khoản Zalo
      </Text>
      {step === 1 && <>
        <View style={styles.inputContainer}>
          <Icon name="email" size={18} color="#888" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Nhập địa chỉ email của bạn"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputContainer}>
          <Icon name="person" size={18} color="#888" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Tên hiển thị"
            value={displayName}
            onChangeText={setDisplayName}
          />
        </View>
        <View style={styles.inputContainer}>
          <Icon name="lock" size={18} color="#888" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Mật khẩu"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>
        <View style={styles.inputContainer}>
          <Icon name="calendar-today" size={18} color="#888" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Ngày sinh (yyyy-mm-dd)"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
          />
        </View>
        <TouchableOpacity style={styles.button} onPress={sendOtp} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Gửi mã xác nhận</Text>}
        </TouchableOpacity>
      </>}
      {step === 2 && <>
        <View style={styles.inputContainer}>
          <Icon name="vpn-key" size={18} color="#888" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Nhập mã OTP"
            value={otp}
            onChangeText={setOtp}
          />
        </View>
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Xác nhận đăng ký</Text>}
        </TouchableOpacity>
      </>}
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Quay lại đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: '#0068ff' }, // Toàn bộ tiêu đề màu xanh
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  button: { backgroundColor: '#0068ff', padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  link: { marginTop: 16, textAlign: 'center', color: '#0068ff' }
});