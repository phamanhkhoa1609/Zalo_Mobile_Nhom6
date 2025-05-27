import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../config';
import Footer from './Footer';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <ActivityIndicator size="large" color="#0068FF" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>User Profile</Text>
        <TouchableOpacity>
          <Image source={{ uri: profile.avatar }} style={styles.avatar} />
        </TouchableOpacity>
        <Text style={styles.name}>{profile.name}</Text>
        <TouchableOpacity style={styles.updateBtn}>
          <Text style={styles.updateText}>Update</Text>
        </TouchableOpacity>
        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>Hồ sơ</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{profile.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dob</Text>
            <Text style={styles.infoValue}>{profile.dob}</Text>
          
          </View>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.changePassBtn}>
            <Text style={styles.changePassText}>Change Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Footer navigation={navigation} currentTab="Profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { alignItems: 'center', flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 10, marginBottom: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginVertical: 10 },
  name: { fontSize: 20, fontWeight: 'bold', marginVertical: 8 },
  updateBtn: { backgroundColor: '#e53935', borderRadius: 20, paddingHorizontal: 30, paddingVertical: 8, marginBottom: 16 },
  updateText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  infoBlock: { width: '100%', backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#eee' },
  infoTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 8, color: '#333', borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { color: '#888', fontWeight: 'bold', minWidth: 60 },
  infoValue: { color: '#222', flex: 1, textAlign: 'right' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 16 },
  changePassBtn: { backgroundColor: '#e53935', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, flex: 1, marginRight: 10 },
  changePassText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  logoutBtn: { borderWidth: 1, borderColor: '#888', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, flex: 1 },
  logoutText: { color: '#888', fontWeight: 'bold', textAlign: 'center' },
});