// App.js
// Root of the Water Meter Reading app.
// Wraps the entire tree with:
//   1. AppProvider  — global state (auth, schedule, sync queue)
//   2. SafeAreaProvider — safe area insets on notched phones
//   3. AppNavigator  — React Navigation (Auth stack ↔ App stack)

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AppProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </SafeAreaProvider>
    </AppProvider>
  );
}
