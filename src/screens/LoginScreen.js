// src/screens/LoginScreen.js
// The first screen every meter reader sees.
// Accepts the Employee ID only.
// ERPNext base URL + token are loaded automatically from local config / SecureStore.
// On success: validates the Employee and navigates to Home where their schedule auto-loads.
// navigates to Home where their schedule auto-loads.

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useApp } from '../context/AppContext';
import { initApi, getEmployee } from '../services/api';
import { saveSession, loadApiToken } from '../services/storage';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';

export default function LoginScreen() {
  const { dispatch } = useApp();

  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!employeeId.trim()) {
      setError('Please enter your Employee ID.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const baseUrl = (process.env.EXPO_PUBLIC_ERP_BASE_URL || '').trim();
      const tokenFromEnv = (process.env.EXPO_PUBLIC_ERP_TOKEN || '').trim(); // "<api_key>:<api_secret>"
      const tokenFromSecureStore = (await loadApiToken())?.trim?.() || '';
      const token = tokenFromEnv || tokenFromSecureStore;

      if (!baseUrl) {
        throw new Error('Missing ERP base URL. Set EXPO_PUBLIC_ERP_BASE_URL in your .env file.');
      }
      if (!token) {
        throw new Error('Missing ERP API token. Set EXPO_PUBLIC_ERP_TOKEN in your .env file.');
      }

      // 1) Init API and validate Employee
      initApi({ baseUrl, token });
      const employee = await getEmployee(employeeId.trim());
      if (!employee?.name) throw new Error('Employee not found.');
      if (employee?.status && employee.status !== 'Active') {
        throw new Error(`Employee is not Active (status: ${employee.status}).`);
      }

      // 2. Build session object
      const session = {
        user: {
          name: employee.name,
          full_name: employee.employee_name || employee.name,
          user_image: null,
        },
        employeeId: employee.name,
        token: null, // token stored in SecureStore, not AsyncStorage
        baseUrl,
      };

      // 3. Persist session
      await saveSession(session);

      // 4. Update global state → navigation switches to AppStack automatically
      dispatch({ type: 'SET_USER', payload: session });

    } catch (err) {
      const msg = err?.response?.data?.message
        || err?.response?.data?.exc_type
        || err.message
        || 'Login failed. Check your Employee ID and token configuration.';
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

          {/* Employee ID */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Employee ID</Text>
            <TextInput
              style={styles.input}
              value={employeeId}
              onChangeText={setEmployeeId}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              placeholder="NW1110"
              placeholderTextColor={Colors.textDisabled}
            />
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
