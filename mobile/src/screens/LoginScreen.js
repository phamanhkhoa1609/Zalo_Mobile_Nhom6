// 1. LoginScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

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
      <Text style={styles.title}>Đăng nhập</Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Mật khẩu" secureTextEntry value={password} onChangeText={setPassword} />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đăng nhập</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Chưa có tài khoản? Đăng ký</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.forgot}>Quên mật khẩu?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 12, borderRadius: 10 },
  button: { backgroundColor: '#0068ff', padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  link: { marginTop: 16, textAlign: 'center', color: '#0068ff' },
  forgot: { marginTop: 8, textAlign: 'center', color: '#888', fontSize: 14 }
});