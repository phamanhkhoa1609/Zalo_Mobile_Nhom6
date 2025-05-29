import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

export default function MeetingScreen({ route }) {
  const { meetingId, type } = route.params || {};
  // <<<----- RẤT QUAN TRỌNG: THAY THẾ DÒNG DƯỚI ĐÂY BẰNG URL TRANG WEB MEETING CỦA BẠN ----->>>
  // Bạn cần deploy thư mục FE-Web hoặc chạy nó local và dùng địa chỉ đó.
  // Ví dụ: Nếu trang meeting của bạn là https://myzaloweb.com/meeting
  // const YOUR_MEETING_WEB_BASE_URL = 'https://myzaloweb.com/meeting';
  // Hoặc nếu chạy local: const YOUR_MEETING_WEB_BASE_URL = 'http://localhost:3000/meeting';

  // Sử dụng IP cục bộ và port của FE-Web server chạy trên máy tính của bạn
  // Dựa trên thông tin trước đó, FE-Web chạy ở 192.168.2.41:3001 và route meeting là /meeting
  const YOUR_MEETING_WEB_BASE_URL = 'http://192.168.2.41:3001/meeting'; // <-- ĐÃ CẬP NHẬT

  const meetingWebUrl = `${YOUR_MEETING_WEB_BASE_URL}?meetingId=${meetingId}&type=${type}`;

  if (!meetingId || !YOUR_MEETING_WEB_BASE_URL || !meetingWebUrl) {
    return (
      <View style={styles.container}>
        <Text>Thiếu meetingId hoặc URL trang web meeting.</Text>
        <Text>Vui lòng kiểm tra MeetingScreen.js và thay thế URL.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ uri: meetingWebUrl }}
        startInLoadingState
        // renderLoading={() => <ActivityIndicator style={StyleSheet.absoluteFill} size="large" color="#0000ff" />}
        // Thêm các props khác nếu cần, ví dụ: onMessage để giao tiếp với webview
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});