// src/screens/SyncQueueScreen.js
// Displays all readings saved offline.
// "Sync all" drains the queue to ERPNext in sequence.
// Failed items show an error and can be retried individually.

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { useApp } from '../context/AppContext';
import { syncAll, loadQueue, clearSynced, updateQueueItem } from '../services/storage';
import { submitMeterReading } from '../services/api';
import { StatusBadge, InfoBanner, PrimaryButton, EmptyState, Card } from '../components';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';

export default function SyncQueueScreen() {
  const { state, dispatch } = useApp();
  const [syncing, setSyncing] = useState(false);

  // Refresh queue state from storage on focus
  useFocusEffect(useCallback(() => {
    loadQueue().then(queue => {
      dispatch({ type: 'SET_QUEUE', payload: queue });
    });
  }, []));

  const queue    = state.syncQueue;
  const pending  = queue.filter(i => i.status === 'pending' || i.status === 'failed');
  const synced   = queue.filter(i => i.status === 'synced');
  const inFlight = queue.filter(i => i.status === 'syncing');

  // ── Sync all ───────────────────────────────────────────────────────────────
  async function handleSyncAll() {
    if (pending.length === 0) {
      Alert.alert('Nothing to sync', 'All readings are already synced.');
      return;
    }
    setSyncing(true);
    dispatch({ type: 'SET_SYNCING', payload: true });

    const result = await syncAll((updatedQueue) => {
      dispatch({ type: 'SET_QUEUE', payload: updatedQueue });
    });

    setSyncing(false);
    dispatch({ type: 'SET_SYNCING', payload: false });

    Alert.alert(
      'Sync complete',
      `${result.synced} reading(s) synced successfully.\n${result.failed > 0 ? `${result.failed} failed — check errors below.` : ''}`,
    );
  }

  // ── Retry single item ──────────────────────────────────────────────────────
  async function retryItem(item) {
    await updateQueueItem(item.id, { status: 'syncing', error: null });
    dispatch({ type: 'UPDATE_QUEUE_ITEM', payload: { id: item.id, status: 'syncing', error: null } });

    try {
      await submitMeterReading(item.payload);
      await updateQueueItem(item.id, { status: 'synced' });
      dispatch({ type: 'UPDATE_QUEUE_ITEM', payload: { id: item.id, status: 'synced' } });
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Unknown error';
      await updateQueueItem(item.id, { status: 'failed', error: msg });
      dispatch({ type: 'UPDATE_QUEUE_ITEM', payload: { id: item.id, status: 'failed', error: msg } });
    }
  }

  // ── Clear synced ───────────────────────────────────────────────────────────
  async function handleClearSynced() {
    const updated = await clearSynced();
    dispatch({ type: 'SET_QUEUE', payload: updated });
  }

  // ── Render queue item ──────────────────────────────────────────────────────
  function renderItem({ item }) {
    const isFailed  = item.status === 'failed';
    const isSyncing = item.status === 'syncing';
    const isSynced  = item.status === 'synced';

    return (
      <View style={[styles.queueItem, isFailed && styles.queueItemFailed]}>
        <View style={styles.queueItemLeft}>
          <Text style={styles.queueAddress} numberOfLines={1}>
            {item.payload?.property_address || 'Unknown address'}
          </Text>
          <Text style={styles.queueMeta}>
            {item.payload?.water_customer} ·{' '}
            {new Date(item.created_at).toLocaleTimeString('en-ZM', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {item.payload?.consumption !== undefined && (
            <Text style={styles.queueConsumption}>
              {item.payload.consumption?.toLocaleString()} m³
            </Text>
          )}
          {isFailed && item.error && (
            <Text style={styles.errorMsg} numberOfLines={2}>{item.error}</Text>
          )}
        </View>
        <View style={styles.queueItemRight}>
          {isSyncing ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              <StatusBadge status={isSynced ? 'synced' : isFailed ? 'failed' : 'offline'} />
              {isFailed && (
                <TouchableOpacity style={styles.retryBtn} onPress={() => retryItem(item)}>
                  <Ionicons name="refresh-outline" size={14} color={Colors.primary} />
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Sync banner */}
      {syncing && (
        <InfoBanner message="Syncing readings to ERPNext…" type="info" />
      )}

      {/* Stats header */}
      <View style={styles.statsRow}>
        <StatCard label="Pending"  value={pending.length}  color={Colors.warning} />
        <StatCard label="Synced"   value={synced.length}   color={Colors.success} />
        <StatCard label="In queue" value={queue.length}    color={Colors.primary} />
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <PrimaryButton
          title={syncing ? 'Syncing…' : `Sync all (${pending.length})`}
          onPress={handleSyncAll}
          loading={syncing}
          disabled={syncing || pending.length === 0}
          style={styles.syncBtn}
        />
        {synced.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearSynced}>
            <Text style={styles.clearBtnText}>Clear synced</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Queue list */}
      <FlatList
        data={queue}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState message="No readings in the queue. All caught up!" />
        }
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function StatCard({ label, value, color }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgTertiary },

  statsRow: {
    flexDirection:   'row',
    gap:             Spacing.sm,
    padding:         Spacing.lg,
    paddingBottom:   Spacing.sm,
  },
  statCard: {
    flex:            1,
    backgroundColor: Colors.bgPrimary,
    borderRadius:    Radius.lg,
    borderWidth:     0.5,
    borderColor:     Colors.border,
    padding:         Spacing.md,
    alignItems:      'center',
  },
  statValue: { fontSize: Typography.xxl, fontWeight: Typography.medium },
  statLabel: { fontSize: Typography.xs,  color: Colors.textSecondary, marginTop: 2 },

  actionsRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom:  Spacing.md,
  },
  syncBtn:    { flex: 1 },
  clearBtn:   { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  clearBtnText: { fontSize: Typography.sm, color: Colors.textSecondary },

  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },

  queueItem: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    justifyContent:  'space-between',
    backgroundColor: Colors.bgPrimary,
    borderRadius:    Radius.lg,
    borderWidth:     0.5,
    borderColor:     Colors.border,
    padding:         Spacing.md,
  },
  queueItemFailed: {
    borderColor:     Colors.dangerBorder,
    backgroundColor: Colors.dangerLight,
  },
  queueItemLeft:    { flex: 1, marginRight: Spacing.md },
  queueAddress:     { fontSize: Typography.md, fontWeight: Typography.medium, color: Colors.textPrimary },
  queueMeta:        { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  queueConsumption: { fontSize: Typography.sm, color: Colors.textTertiary,  marginTop: 2 },
  errorMsg: {
    fontSize:   Typography.xs,
    color:      Colors.danger,
    marginTop:  Spacing.sm,
    lineHeight: 16,
  },
  queueItemRight: { alignItems: 'flex-end', gap: Spacing.sm },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 4, paddingVertical: 4,
  },
  retryBtnText: { fontSize: Typography.xs, color: Colors.primary },
});
