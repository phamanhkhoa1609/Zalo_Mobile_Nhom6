import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView
} from 'react-native';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';

const API_KEY = '3881378a0d1847539d3956f1c643c335'; // World News API Key
// World News API URL for Vietnamese news
const API_URL = `https://api.worldnewsapi.com/search-news?language=vi&api-key=${API_KEY}`;

const NewsScreen = ({ navigation }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      const fetchNews = async () => {
        setLoading(true); // Set loading to true on focus
        setError(null); // Clear previous errors
        try {
          const response = await axios.get(API_URL);
          // Assuming the response structure has an 'news' key containing the articles array
          setArticles(response.data.news); // Adjust based on actual response structure if needed
          setLoading(false);

          // Log the first article item to understand its structure
          if (response.data.news && response.data.news.length > 0) {
            console.log('First article structure:', response.data.news[0]);
          }

        } catch (err) {
          console.error('Error fetching news:', err);
          // Log detailed error information
          if (err.response) {
            console.error('Error response data:', err.response.data);
            console.error('Error response status:', err.response.status);
            console.error('Error response headers:', err.response.headers);
          } else if (err.request) {
            console.error('Error request:', err.request);
          } else {
            console.error('Error message:', err.message);
          }
          setError('Failed to load news. Please check console for details.'); // Update user message
          setLoading(false);
          Alert.alert('Error', 'Failed to load news. Please check console for details.'); // Update user message
        }
      };

      fetchNews();

      // Optional: return a cleanup function if needed when the screen loses focus
      return () => {
        // For example, cancel ongoing requests if any
      };
    }, [])
  );

  const renderArticleItem = ({ item }) => (
    <TouchableOpacity
      style={styles.articleItem}
      onPress={() => {
        if (item.url) {
          Linking.openURL(item.url).catch(err => console.error('An error occurred', err));
        } else {
          Alert.alert('Error', 'Article URL not available.');
        }
      }}
    >
      <Text style={styles.articleTitle}>{item.title}</Text>
      {/* Access source name safely */}
      <Text style={styles.articleSource}>{item.source?.name || item.source || 'N/A'}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tin Tức</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>Loading news...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tin Tức</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tin Tức</Text>
      </View>
      <FlatList
        data={articles}
        renderItem={renderArticleItem}
        keyExtractor={(item, index) => item.url + index}
        ListEmptyComponent={
          <View style={styles.centered}><Text>No news found.</Text></View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: '#0068FF',
    padding: 15,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  articleItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  articleSource: {
    fontSize: 12,
    color: '#666',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
});

export default NewsScreen;