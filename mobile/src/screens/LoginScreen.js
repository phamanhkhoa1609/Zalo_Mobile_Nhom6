// LoginScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';
import Icon from 'react-native-vector-icons/MaterialIcons'; // Thêm thư viện icon

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email và mật khẩu.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/login`, { email, password });
      console.log('✅ Login API response data:', res.data);
      const token = res.data.token;
      const userId = res.data.userId || res.data.id || res.data._id;

      if (token && userId) {
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('userId', userId);
        console.log('✅ Đã lưu Token và User ID vào AsyncStorage');
        navigation.replace('ChatList');
      } else if (token) {
        Alert.alert('Lỗi', 'Không nhận được User ID từ server, nhưng đã có Token.');
        await AsyncStorage.setItem('token', token);
        navigation.replace('ChatList');
      } else {
        Alert.alert('Lỗi', 'Không nhận được Token từ server.');
      }
    } catch (err) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Tiêu đề lớn */}
      <Text style={styles.logo}>Zalo</Text>
      {/* Tiêu đề phụ */}
      <Text style={styles.subtitle}>Đăng nhập tài khoản để kết nối với ứng dụng Zalo  </Text>
      {/* Ô nhập email với icon */}
      <View style={styles.inputContainer}>
        <Icon name="email" size={20} color="#888" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Nhập email của bạn"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
      </View>
      {/* Ô nhập mật khẩu với icon */}
      <View style={styles.inputContainer}>
        <Icon name="lock" size={20} color="#888" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Nhập mật khẩu"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>
      {/* Nút đăng nhập */}
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Đăng nhập</Text>
        )}
      </TouchableOpacity>
      {/* Liên kết đăng ký */}
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Chưa có tài khoản? Đăng ký ngay</Text>
      </TouchableOpacity>
      {/* Liên kết quên mật khẩu */}
      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.forgot}>Quên mật khẩu?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f5f5f5', // Màu nền nhạt giống Zalo
  },
  logo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#0068ff', // Màu xanh đặc trưng của Zalo
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#0068ff', // Màu xanh của Zalo
    paddingVertical: 14,
    borderRadius: 25, // Bo góc nhiều hơn để giống nút trong hình
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 16,
    textAlign: 'center',
    color: '#0068ff',
    fontSize: 14,
  },
  forgot: {
    marginTop: 8,
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
  },
});