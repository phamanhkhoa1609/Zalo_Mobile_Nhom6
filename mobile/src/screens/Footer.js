import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';


export default function Footer({ navigation, currentTab }) {
  return (
    <View style={styles.footer}>
      <TouchableOpacity onPress={() => navigation.navigate('ChatList')}>
        <Image
          source={require('../assets/icons8-message-40.png')}
          style={[styles.icon, styles.active]}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('FriendListScreen')}>
        <Image
          source={require('../assets/icons8-contact-48.png')}
          style={[styles.icon, styles.active]}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('FriendListRequest')}>
        <Image
          source={require('../assets/icons8-add-friend-48.png')}
          style={[styles.icon, styles.active]}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('News')}>
        <Image
          source={require('../assets/icons8-news-48.png')}
          style={[styles.icon, styles.active]}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
        <Image
          source={require('../assets/icons8-account-48.png')}
          style={[styles.icon, styles.active]}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  icon: {
    width: 32,
    height: 32,
    tintColor: '#888',
  },
  active: {
    tintColor: '#0068FF',
  },
});
