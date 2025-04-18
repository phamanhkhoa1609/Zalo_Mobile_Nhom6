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

export default function ResetPasswordScreen({ route, navigation }) {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = () => {
    if (!otp || !newPassword) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ OTP và mật khẩu mới.');
      return;
    }

    setLoading(true);

    // Giả lập xác thực và đổi mật khẩu
    setTimeout(() => {
      console.log(`Email: ${email}, OTP: ${otp}, Mật khẩu mới: ${newPassword}`);
      Alert.alert('✅ Đổi mật khẩu thành công (giả lập)', 'Bạn có thể đăng nhập bằng mật khẩu mới.');
      setLoading(false);
      navigation.navigate('Login');
    }, 1500);
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
      <TouchableOpacity
        style={styles.button}
        onPress={handleResetPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Xác nhận</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  subtitle: { textAlign: 'center', marginBottom: 20 },
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
});
