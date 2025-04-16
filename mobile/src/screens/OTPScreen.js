import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator
} from 'react-native';

export default function OTPScreen({ route, navigation }) {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = () => {
    if (!otp) {
      Alert.alert('Thiếu mã', 'Vui lòng nhập mã xác nhận.');
      return;
    }

    setLoading(true);

    
    setTimeout(() => {
      console.log(`OTP nhập: ${otp} - Email: ${email}`);
      Alert.alert('Giả lập xác minh', 'Bạn đã nhập mã: ' + otp);
      setLoading(false);
      navigation.navigate('Login'); // Chuyển màn hình để mô phỏng quá trình hoàn tất
    }, 1500);
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
  input: {
    borderWidth: 1, borderColor: '#ccc', padding: 12,
    borderRadius: 10, marginBottom: 14
  },
  button: {
    backgroundColor: '#0068ff', padding: 14, borderRadius: 10, alignItems: 'center'
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  link: { marginTop: 20, textAlign: 'center', color: '#0068ff' }
});
