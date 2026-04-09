// src/screens/LoginScreen.js
// The first screen every meter reader sees.
// Accepts the ERPNext server URL, username, and password.
// On success: stores the session, initialises the API client, and
// navigates to Home where their schedule auto-loads.

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useApp } from '../context/AppContext';
import { login } from '../services/api';
import { initApi } from '../services/api';
import { saveSession } from '../services/storage';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';

export default function LoginScreen() {
  const { dispatch } = useApp();

  const [baseUrl, setBaseUrl] = useState('https://erp.example.com');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!baseUrl.trim() || !username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Authenticate against Frappe
      const result = await login({ baseUrl: baseUrl.trim(), username: username.trim(), password });

      // 2. Build session object
      const session = {
        user: {
          name: username.trim(),
          full_name: result.full_name || username.trim(),
          user_image: result.home_page || null,
        },
        token: null,   // Using session cookie; swap for api_key:api_secret if needed
        baseUrl: baseUrl.trim(),
      };

      // 3. Persist session + initialise API client
      await saveSession(session);
      initApi({ baseUrl: baseUrl.trim(), token: null });

      // 4. Update global state → navigation switches to AppStack automatically
      dispatch({ type: 'SET_USER', payload: session });

    } catch (err) {
      const msg = err?.response?.data?.message
        || err?.response?.data?.exc_type
        || err.message
        || 'Login failed. Check your server URL and credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >

        {/* Logo / wordmark */}
        <View style={styles.logoWrap}>
          <View style={styles.logoBox}>
            <Ionicons name="water" size={32} color={Colors.white} />
          </View>
          <Text style={styles.appName}>Nkana Water Meter App</Text>
          <Text style={styles.appSub}>Nkana Water & Sewerage Company</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>

          <Text style={styles.formTitle}>Sign in</Text>

          {/* Server URL */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Server URL</Text>
            <TextInput
              style={styles.input}
              value={baseUrl}
              onChangeText={setBaseUrl}
              autoCapitalize="none"
              keyboardType="url"
              returnKeyType="next"
              placeholder="https://41.63.62.101:8001"
              placeholderTextColor={Colors.textDisabled}
            />
          </View>

          {/* Username */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              placeholder="your.name@example.com"
              placeholderTextColor={Colors.textDisabled}
            />
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passWrap}>
              <TextInput
                style={[styles.input, styles.passInput]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                placeholder="••••••••"
                placeholderTextColor={Colors.textDisabled}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPass(v => !v)}
              >
                <Ionicons
                  name={showPass ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Error message */}
          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.loginBtnText}>Sign in</Text>
            }
          </TouchableOpacity>

        </View>

        <Text style={styles.footer}>
          Powered by ERPNext · Frappe Framework
        </Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bgTertiary },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoBox: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: Typography.xl,
    fontWeight: Typography.medium,
    color: Colors.textPrimary,
  },
  appSub: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.bgPrimary,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  formTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  fieldWrap: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.md,
    color: Colors.textPrimary,
  },
  passWrap: {
    position: 'relative',
  },
  passInput: {
    paddingRight: 44,
  },
  eyeBtn: {
    position: 'absolute',
    right: Spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  errorBanner: {
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.sm,
    borderWidth: 0.5,
    borderColor: Colors.dangerBorder,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    color: Colors.danger,
    fontSize: Typography.sm,
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  loginBtnDisabled: { opacity: 0.55 },
  loginBtnText: {
    color: Colors.white,
    fontSize: Typography.md,
    fontWeight: Typography.medium,
  },
  footer: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontSize: Typography.xs,
    color: Colors.textTertiary,
  },
});
