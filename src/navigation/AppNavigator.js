// src/navigation/AppNavigator.js
// Navigation tree for the Water Meter Reading App.
//
// Structure:
//   RootNavigator
//   ├── AuthStack         (shown when user is NOT logged in)
//   │   └── Login
//   └── AppStack          (shown when user IS logged in)
//       ├── Home
//       ├── PropertyList
//       ├── ReadingCapture
//       ├── Confirmation
//       └── SyncQueue

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useApp } from '../context/AppContext';
import { Colors, Typography, Spacing } from '../constants/theme';

// ─── Screen imports ───────────────────────────────────────────────────────────
import LoginScreen        from '../screens/LoginScreen';
import HomeScreen         from '../screens/HomeScreen';
import PropertyListScreen from '../screens/PropertyListScreen';
import ReadingCaptureScreen from '../screens/ReadingCaptureScreen';
import ConfirmationScreen from '../screens/ConfirmationScreen';
import SyncQueueScreen    from '../screens/SyncQueueScreen';

const Stack = createNativeStackNavigator();

// ─── Shared header theme ──────────────────────────────────────────────────────
const screenOptions = {
  headerStyle: {
    backgroundColor: Colors.bgPrimary,
  },
  headerTitleStyle: {
    fontSize:   Typography.md,
    fontWeight: Typography.medium,
    color:      Colors.textPrimary,
  },
  headerTintColor:        Colors.primary,
  headerShadowVisible:    false,
  headerBackTitleVisible: false,
  contentStyle: {
    backgroundColor: Colors.bgTertiary,
  },
};

// ─── Sync queue icon shown in the top-right of Home ──────────────────────────
function SyncIcon({ navigation, pendingCount }) {
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('SyncQueue')}
      style={styles.syncIcon}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="sync-outline" size={22} color={Colors.primary} />
      {pendingCount > 0 && (
        <View style={styles.syncBadge}>
          <Text style={styles.syncBadgeText}>
            {pendingCount > 9 ? '9+' : pendingCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Auth stack (Login only) ──────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ ...screenOptions, headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

// ─── Main app stack ───────────────────────────────────────────────────────────
function AppStack() {
  const { state } = useApp();
  const pendingCount = state.syncQueue.filter(
    i => i.status === 'pending' || i.status === 'failed'
  ).length;

  return (
    <Stack.Navigator screenOptions={screenOptions}>

      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={({ navigation }) => ({
          title: 'My Schedule',
          headerRight: () => (
            <SyncIcon navigation={navigation} pendingCount={pendingCount} />
          ),
        })}
      />

      <Stack.Screen
        name="PropertyList"
        component={PropertyListScreen}
        options={{ title: 'Route' }}
      />

      <Stack.Screen
        name="ReadingCapture"
        component={ReadingCaptureScreen}
        options={({ route }) => ({
          title: route.params?.propertyAddress || 'Capture reading',
          headerBackTitle: 'Route',
        })}
      />

      <Stack.Screen
        name="Confirmation"
        component={ConfirmationScreen}
        options={{
          title: 'Reading saved',
          headerBackVisible: false,   // prevent going back after submit
          gestureEnabled:    false,
        }}
      />

      <Stack.Screen
        name="SyncQueue"
        component={SyncQueueScreen}
        options={{ title: 'Sync queue' }}
      />

    </Stack.Navigator>
  );
}

// ─── Root navigator — switches between Auth and App ───────────────────────────
export default function AppNavigator() {
  const { state } = useApp();
  const isLoggedIn = !!state.user;

  return (
    <NavigationContainer>
      {isLoggedIn ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

// ─── Screen name constants (import in screens to avoid typos) ─────────────────
export const SCREENS = {
  LOGIN:           'Login',
  HOME:            'Home',
  PROPERTY_LIST:   'PropertyList',
  READING_CAPTURE: 'ReadingCapture',
  CONFIRMATION:    'Confirmation',
  SYNC_QUEUE:      'SyncQueue',
};

const styles = StyleSheet.create({
  syncIcon: {
    position:     'relative',
    marginRight:  Spacing.sm,
    padding:      4,
  },
  syncBadge: {
    position:        'absolute',
    top:             -2,
    right:           -2,
    backgroundColor: Colors.danger,
    borderRadius:    99,
    minWidth:        16,
    height:          16,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 3,
  },
  syncBadgeText: {
    color:      Colors.white,
    fontSize:   9,
    fontWeight: Typography.bold,
  },
});
