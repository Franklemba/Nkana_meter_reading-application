// src/screens/HomeScreen.js
// Landing screen after login.
// Auto-fetches today's assigned reading schedule and caches the property list.
// Shows a progress summary and navigates into the route.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { useApp } from '../context/AppContext';
import { ensureApiInitialized, getMySchedules, getMeterReadingSchedule, getWaterPropertiesByNames, getPropertiesForSchedule } from '../services/api';
import { saveScheduleCache, loadScheduleCache } from '../services/storage';
import { SCREENS } from '../navigation/screens';
import {
  Card, SectionHeader, ProgressBar, StatusBadge,
  InfoBanner, PrimaryButton,
} from '../components';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';

export default function HomeScreen({ navigation }) {
  const { state, dispatch } = useApp();
  const { user, schedule, properties } = state;

  const [loading,    setLoading]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  // ── Derive progress stats ──────────────────────────────────────────────────
  const total   = properties.length;
  const done    = properties.filter(p => p.reading_status === 'Read').length;
  const unread  = properties.filter(p => p.reading_status === 'Unread').length;
  const pending = total - done - unread;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;

  // ── Load schedule ──────────────────────────────────────────────────────────
  const loadSchedule = useCallback(async (forceRefresh = false) => {
    setError('');
    if (!forceRefresh && schedule && properties.length > 0) return;

    setLoading(true);
    try {
      ensureApiInitialized();
      // Try live API first
      const schedules = await getMySchedules(state.user?.employeeId || state.user?.name);
      if (!schedules || schedules.length === 0) {
        throw new Error('No active reading schedule found for today.');
      }
      const activeSchedule = schedules[0];
      dispatch({ type: 'SET_SCHEDULE', payload: activeSchedule });

      // Walk-route (authoritative): schedule.properties child table with sequence order.
      let props = [];
      try {
        const schedDoc = await getMeterReadingSchedule(activeSchedule.name);
        const routeRows = (schedDoc?.properties || [])
          .filter(r => r?.water_property)
          .slice()
          .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

        const orderedNames = routeRows.map(r => r.water_property);
        const seqByName = Object.fromEntries(routeRows.map(r => [r.water_property, r.sequence || null]));

        const fetched = await getWaterPropertiesByNames(orderedNames);
        const byName = Object.fromEntries(fetched.map(p => [p.name, p]));

        props = orderedNames
          .map(name => byName[name])
          .filter(Boolean)
          .map(p => ({ ...p, walk_sequence: seqByName[p.name] ?? null }));
      } catch (innerErr) {
        // Fallback: older endpoints/fields
        console.error("Failed Walk-route fetch strategy:", innerErr);
        props = await getPropertiesForSchedule(activeSchedule.schedule_code || activeSchedule.name);
      }

      dispatch({ type: 'SET_PROPERTIES', payload: props });

      await saveScheduleCache(activeSchedule, props);

    } catch (err) {
      // Temporarily disabled cache fallback to expose the actual properties fetch error
      console.error("Fetch Error:", err);
      /*
      const cached = await loadScheduleCache();
      if (cached.schedule) {
        dispatch({ type: 'SET_SCHEDULE',    payload: cached.schedule });
        dispatch({ type: 'SET_PROPERTIES',  payload: cached.properties });
        setError('Showing cached schedule — working offline.');
      } else {
      */
        setError(err.message || 'Failed to load schedule. Check your connection.');
      // }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schedule, properties.length]);

  // Load on mount
  useEffect(() => { loadSchedule(); }, []);

  // Refresh stats when returning from capture
  useFocusEffect(useCallback(() => { /* stats derive from state, always current */ }, []));

  function handleRefresh() {
    setRefreshing(true);
    loadSchedule(true);
  }

  function handleLogout() {
    dispatch({ type: 'LOGOUT' });
  }

  // ── Greeting ───────────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.full_name?.split(' ')[0] || user?.name || 'Reader';

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your schedule…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
      }
    >
      {/* Greeting header */}
      <View style={styles.greetRow}>
        <View>
          <Text style={styles.greeting}>{greeting}, {firstName}</Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-ZM', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Error / offline banner */}
      {!!error && <InfoBanner message={error} type={error.includes('offline') ? 'warning' : 'error'} />}

      {/* No schedule state */}
      {!schedule && !loading && (
        <Card>
          <Text style={styles.noScheduleText}>
            No active reading schedule found for today.{'\n'}
            Pull down to refresh, or contact your supervisor.
          </Text>
          <PrimaryButton title="Retry" onPress={() => loadSchedule(true)} style={{ marginTop: Spacing.lg }} />
        </Card>
      )}

      {/* Schedule card */}
      {schedule && (
        <>
          <Card style={styles.scheduleCard}>
            <View style={styles.scheduleHeader}>
              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleLabel}>Reading schedule</Text>
                <Text style={styles.scheduleName}>{schedule.name}</Text>
                <Text style={styles.scheduleCode}>{schedule.schedule_code}</Text>
              </View>
              <StatusBadge status="active" label="Active" />
            </View>

            {/* Progress bar */}
            <View style={styles.progressWrap}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressPct}>{done} of {total} read</Text>
              </View>
              <ProgressBar current={done} total={total} />
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatPill label="Read"    value={done}    color={Colors.success} bg={Colors.successLight} />
              <StatPill label="Pending" value={pending} color={Colors.warning} bg={Colors.warningLight} />
              <StatPill label="Unread"  value={unread}  color={Colors.danger}  bg={Colors.dangerLight}  />
            </View>

            {/* Zone + date meta */}
            <View style={styles.metaRow}>
              <MetaChip icon="location-outline" label={`Zone ${schedule.zone}`} />
              <MetaChip icon="calendar-outline" label={schedule.reading_date} />
            </View>
          </Card>

          {/* Open route CTA */}
          <PrimaryButton
            title="Open today's route"
            onPress={() => navigation.navigate(SCREENS.PROPERTY_LIST)}
          />

          {/* Quick stats section */}
          <SectionHeader title="Today's overview" />
          <View style={styles.overviewGrid}>
            <OverviewCard label="Total properties" value={total}     color={Colors.primary} />
            <OverviewCard label="Completed"         value={done}      color={Colors.success} />
            <OverviewCard label="Remaining"         value={pending}   color={Colors.warning} />
            <OverviewCard label="Unread / skipped"  value={unread}    color={Colors.danger}  />
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatPill({ label, value, color, bg }) {
  return (
    <View style={[styles.statPill, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

function MetaChip({ icon, label }) {
  return (
    <View style={styles.metaChip}>
      <Ionicons name={icon} size={13} color={Colors.textSecondary} />
      <Text style={styles.metaChipText}>{label}</Text>
    </View>
  );
}

function OverviewCard({ label, value, color }) {
  return (
    <View style={styles.overviewCard}>
      <Text style={[styles.overviewValue, { color }]}>{value}</Text>
      <Text style={styles.overviewLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll:  { flex: 1, backgroundColor: Colors.bgTertiary },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },

  loadingWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.bgTertiary,
  },
  loadingText: {
    marginTop: Spacing.md, fontSize: Typography.sm, color: Colors.textSecondary,
  },

  greetRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   Spacing.lg,
  },
  greeting: { fontSize: Typography.lg, fontWeight: Typography.medium, color: Colors.textPrimary },
  dateText: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  logoutBtn: { padding: 4 },

  scheduleCard:   { marginBottom: Spacing.md },
  scheduleHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  scheduleInfo:   { flex: 1 },
  scheduleLabel:  { fontSize: Typography.xs, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  scheduleName:   { fontSize: Typography.lg, fontWeight: Typography.medium, color: Colors.textPrimary, marginTop: 2 },
  scheduleCode:   { fontSize: Typography.sm, color: Colors.textSecondary },

  progressWrap:     { marginBottom: Spacing.lg },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel:    { fontSize: Typography.xs, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  progressPct:      { fontSize: Typography.xs, color: Colors.textSecondary },

  statsRow:  { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statPill:  { flex: 1, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  statValue: { fontSize: Typography.xxl, fontWeight: Typography.medium },
  statLabel: { fontSize: Typography.xs, marginTop: 2 },

  metaRow: { flexDirection: 'row', gap: Spacing.sm },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.bgSecondary, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  metaChipText: { fontSize: Typography.xs, color: Colors.textSecondary },

  overviewGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
  },
  overviewCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: Colors.bgPrimary,
    borderRadius:    Radius.lg,
    borderWidth:     0.5,
    borderColor:     Colors.border,
    padding:         Spacing.md,
    alignItems:      'center',
  },
  overviewValue: { fontSize: Typography.xxl, fontWeight: Typography.medium },
  overviewLabel: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },

  noScheduleText: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 22, textAlign: 'center' },
});
