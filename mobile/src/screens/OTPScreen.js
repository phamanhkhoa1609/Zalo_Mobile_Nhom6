import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../config';

export default function OTPScreen({ route, navigation }) {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!otp) {
      Alert.alert('Thiếu mã', 'Vui lòng nhập mã xác nhận.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/users/verify-reset-passwordOTP`, { email, otp });
      if (res.data.success) {
        navigation.replace('ResetPassword', { email, otp });
      } else {
        Alert.alert('Lỗi', res.data.message || 'Xác thực không thành công');
      }
    } catch (err) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không xác minh được mã OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Xác minh mã OTP</Text>
      <Text style={styles.subtitle}>Email: {email}</Text>
      <TextInput
        style={styles.input}
        placeholder="Nhập mã xác nhận"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
      />
      <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Xác minh</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Quay lại</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  subtitle: { textAlign: 'center', marginBottom: 20, color: '#555' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 12, borderRadius: 10, fontSize: 16, textAlign: 'center', letterSpacing: 8 },
  button: { backgroundColor: '#0068ff', padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  link: { marginTop: 16, textAlign: 'center', color: '#0068ff' }
});