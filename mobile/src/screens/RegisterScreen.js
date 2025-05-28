// 2. RegisterScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../config';

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
      {step === 1 && <>
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Tên hiển thị" value={displayName} onChangeText={setDisplayName} />
        <TextInput style={styles.input} placeholder="Mật khẩu" secureTextEntry value={password} onChangeText={setPassword} />
        <TextInput style={styles.input} placeholder="Ngày sinh (yyyy-mm-dd)" value={dateOfBirth} onChangeText={setDateOfBirth} />
        <TouchableOpacity style={styles.button} onPress={sendOtp} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Gửi mã xác nhận</Text>}
        </TouchableOpacity>
      </>}
      {step === 2 && <>
        <TextInput style={styles.input} placeholder="Nhập mã OTP" value={otp} onChangeText={setOtp} />
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
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 10, marginBottom: 12 },
  button: { backgroundColor: '#0068ff', padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  link: { marginTop: 16, textAlign: 'center', color: '#0068ff' }
});