import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text, View, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';

import { CLERK_PUBLISHABLE_KEY } from './config';
import MapScreen    from './screens/MapScreen';
import PlacesScreen from './screens/PlacesScreen';
import AddScreen    from './screens/AddScreen';
import AuthScreen   from './screens/AuthScreen';

// Clerk token cache using SecureStore
const tokenCache = {
  getToken:    (key) => SecureStore.getItemAsync(key),
  saveToken:   (key, value) => SecureStore.setItemAsync(key, value),
  clearToken:  (key) => SecureStore.deleteItemAsync(key),
};

const Tab = createBottomTabNavigator();

function TabIcon({ emoji, focused }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>{emoji}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: '#000', borderTopColor: '#1a1a1a', height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: '#fe2c55',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: '#000' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          headerTitle: '🎵 TikTok Map',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Places"
        component={PlacesScreen}
        options={{
          headerTitle: '📍 Saved Places',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📍" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Add"
        component={AddScreen}
        options={{
          headerTitle: '➕ Save a Place',
          tabBarIcon: ({ focused }) => <TabIcon emoji="➕" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AppGate() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#fe2c55" size="large" />
      </View>
    );
  }

  return isSignedIn ? <MainTabs /> : <AuthScreen />;
}

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppGate />
      </NavigationContainer>
    </ClerkProvider>
  );
}
