// src/components/index.js
// Shared UI primitives. Import from here in all screens.

import React from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Platform,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';

// ─── StatusBadge ──────────────────────────────────────────────────────────────
// status: 'pending' | 'done' | 'unread' | 'synced' | 'offline' | 'failed' | 'next'
export function StatusBadge({ status, label }) {
  const map = {
    pending: Colors.statusPending,
    done:    Colors.statusDone,
    unread:  Colors.statusUnread,
    synced:  Colors.statusSynced,
    offline: Colors.statusOffline,
    failed:  Colors.statusFailed,
    next:    Colors.statusNext,
    active:  { bg: Colors.primaryLight, text: Colors.primaryDark },
  };
  const colors = map[status] || map.pending;
  const display = label || status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>{display}</Text>
    </View>
  );
}

// ─── PrimaryButton ────────────────────────────────────────────────────────────
export function PrimaryButton({ title, onPress, loading, disabled, style }) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, (disabled || loading) && styles.btnDisabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading
        ? <ActivityIndicator color={Colors.white} size="small" />
        : <Text style={styles.primaryBtnText}>{title}</Text>
      }
    </TouchableOpacity>
  );
}

// ─── SecondaryButton ──────────────────────────────────────────────────────────
export function SecondaryButton({ title, onPress, style }) {
  return (
    <TouchableOpacity style={[styles.secondaryBtn, style]} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.secondaryBtnText}>{title}</Text>
    </TouchableOpacity>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
export function SectionHeader({ title }) {
  return (
    <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style }) {
  return (
    <View style={[styles.card, style]}>{children}</View>
  );
}

// ─── ReadonlyField ────────────────────────────────────────────────────────────
export function ReadonlyField({ label, value, highlight }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldValue, highlight && styles.fieldValueHighlight]}>
        <Text style={[styles.fieldValueText, highlight && styles.fieldValueTextHighlight]}>
          {value || '—'}
        </Text>
      </View>
    </View>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ style }) {
  return <View style={[styles.divider, style]} />;
}

// ─── InfoBanner ───────────────────────────────────────────────────────────────
export function InfoBanner({ message, type = 'info' }) {
  const colorMap = {
    info:    { bg: Colors.infoLight,    border: Colors.infoBorder,    text: Colors.primaryDark },
    warning: { bg: Colors.warningLight, border: Colors.warningBorder, text: Colors.warning },
    error:   { bg: Colors.dangerLight,  border: Colors.dangerBorder,  text: Colors.danger },
    success: { bg: Colors.successLight, border: Colors.successBorder, text: Colors.success },
  };
  const c = colorMap[type] || colorMap.info;
  return (
    <View style={[styles.banner, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.bannerText, { color: c.text }]}>{message}</Text>
    </View>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 40 }) {
  const initials = name
    ? name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '??';
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
export function ProgressBar({ current, total, style }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <View style={[styles.progressBg, style]}>
      <View style={[styles.progressFill, { width: `${pct}%` }]} />
    </View>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ message }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      Radius.full,
  },
  badgeText: {
    fontSize:   Typography.xs,
    fontWeight: Typography.medium,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius:    Radius.lg,
    paddingVertical: 14,
    alignItems:      'center',
    justifyContent:  'center',
  },
  primaryBtnText: {
    color:      Colors.white,
    fontSize:   Typography.md,
    fontWeight: Typography.medium,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  secondaryBtn: {
    backgroundColor: Colors.bgSecondary,
    borderRadius:    Radius.lg,
    paddingVertical: 14,
    alignItems:      'center',
    borderWidth:     0.5,
    borderColor:     Colors.border,
  },
  secondaryBtnText: {
    color:      Colors.textPrimary,
    fontSize:   Typography.md,
    fontWeight: Typography.medium,
  },
  sectionHeader: {
    fontSize:      Typography.xs,
    fontWeight:    Typography.medium,
    color:         Colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom:  Spacing.sm,
    marginTop:     Spacing.md,
  },
  card: {
    backgroundColor: Colors.bgPrimary,
    borderRadius:    Radius.lg,
    borderWidth:     0.5,
    borderColor:     Colors.border,
    padding:         Spacing.lg,
    marginBottom:    Spacing.md,
    ...Shadow.card,
  },
  fieldRow: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize:      Typography.xs,
    color:         Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom:  4,
  },
  fieldValue: {
    backgroundColor: Colors.bgSecondary,
    borderRadius:    Radius.sm,
    borderWidth:     0.5,
    borderColor:     Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm,
  },
  fieldValueHighlight: {
    backgroundColor: Colors.primaryLight,
    borderColor:     Colors.infoBorder,
  },
  fieldValueText: {
    fontSize: Typography.sm,
    color:    Colors.textPrimary,
  },
  fieldValueTextHighlight: {
    color:      Colors.primaryDark,
    fontWeight: Typography.medium,
  },
  divider: {
    height:          0.5,
    backgroundColor: Colors.border,
    marginVertical:  Spacing.md,
  },
  banner: {
    borderRadius:      Radius.sm,
    borderWidth:       0.5,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm,
    marginBottom:      Spacing.md,
  },
  bannerText: {
    fontSize: Typography.sm,
  },
  avatar: {
    backgroundColor: Colors.primaryLight,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarText: {
    color:      Colors.primaryDark,
    fontWeight: Typography.medium,
  },
  progressBg: {
    backgroundColor: Colors.bgSecondary,
    borderRadius:    Radius.full,
    height:          8,
    overflow:        'hidden',
  },
  progressFill: {
    backgroundColor: Colors.primary,
    height:          8,
    borderRadius:    Radius.full,
  },
  emptyState: {
    alignItems:  'center',
    paddingTop:  Spacing.xxxl,
  },
  emptyText: {
    color:    Colors.textTertiary,
    fontSize: Typography.sm,
  },
});
