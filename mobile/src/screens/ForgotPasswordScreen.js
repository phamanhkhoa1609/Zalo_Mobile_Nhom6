import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = () => {
    if (!email.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email đã đăng ký.');
      return;
    }

    setLoading(true);

    // Giả lập xử lý gửi OTP
    setTimeout(() => {
      console.log(`Email nhập: ${email}`);
      Alert.alert('✅ Đã gửi OTP (giả lập)', 'Vui lòng kiểm tra email để lấy mã xác nhận.', [
        {
          text: 'Nhập mã',
          onPress: () => navigation.navigate('ResetPassword', { email }),
        },
      ]);
      setLoading(false);
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔑 Quên mật khẩu</Text>

      <TextInput
        style={styles.input}
        placeholder="Nhập email đã đăng ký"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSendOTP}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Gửi mã xác nhận</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>← Quay lại đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#0068ff',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  link: { marginTop: 16, textAlign: 'center', color: '#0068ff' },
});
