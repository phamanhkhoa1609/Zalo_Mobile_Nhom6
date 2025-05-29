import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import OTPScreen from './screens/OTPScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import ChatListScreen from './screens/ChatListScreen';
import OnlineChatScreen from './screens/OnlineChatScreen';
import ChatDetailScreen from './screens/ChatDetailScreen';
import Profile from './screens/Profile'
import FriendListScreen from './screens/FriendListScreen';
import FriendListRequest from './screens/FriendListRequest';
import NewsScreen from './screens/NewsScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="OTPScreen" component={OTPScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="ChatList" component={ChatListScreen} />
        <Stack.Screen name="OnlineChat" component={OnlineChatScreen} />
        <Stack.Screen name="Profile" component={Profile} />
        <Stack.Screen name="FriendListScreen" component={FriendListScreen}/>
        <Stack.Screen name="FriendListRequest" component={FriendListRequest}/>
        <Stack.Screen name="News" component={NewsScreen} />

        { <Stack.Screen name="ChatDetail" component={ChatDetailScreen} /> }
      </Stack.Navigator>
    </NavigationContainer>
  );
}
