// src/services/storage.js
// Manages the offline-first sync queue using AsyncStorage.
// When the device has no internet, readings are saved here.
// When connectivity returns, the SyncQueue screen drains this queue to ERPNext.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { submitMeterReading } from './api';

const QUEUE_KEY      = '@wmr_sync_queue';
const SESSION_KEY    = '@wmr_session';
const SCHEDULE_KEY   = '@wmr_schedule';
const PROPERTIES_KEY = '@wmr_properties';

// ─── Session persistence ──────────────────────────────────────────────────────

export async function saveSession(sessionData) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
}

export async function loadSession() {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearSession() {
  await AsyncStorage.multiRemove([SESSION_KEY, SCHEDULE_KEY, PROPERTIES_KEY]);
}

// ─── Schedule + Properties cache ─────────────────────────────────────────────

export async function saveScheduleCache(schedule, properties) {
  await AsyncStorage.setItem(SCHEDULE_KEY,   JSON.stringify(schedule));
  await AsyncStorage.setItem(PROPERTIES_KEY, JSON.stringify(properties));
}

export async function loadScheduleCache() {
  const [schedRaw, propsRaw] = await AsyncStorage.multiGet([SCHEDULE_KEY, PROPERTIES_KEY]);
  return {
    schedule:   schedRaw[1]  ? JSON.parse(schedRaw[1])  : null,
    properties: propsRaw[1]  ? JSON.parse(propsRaw[1]) : [],
  };
}

// ─── Sync queue ───────────────────────────────────────────────────────────────

/**
 * Load the entire offline queue from AsyncStorage.
 */
export async function loadQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

/**
 * Persist the current queue back to AsyncStorage.
 */
async function saveQueue(queue) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Add a reading to the offline queue.
 * Status starts as 'pending'.
 */
export async function enqueue(readingPayload) {
  const queue = await loadQueue();
  const item  = {
    id:         `wmr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    payload:    readingPayload,
    status:     'pending',   // pending | syncing | synced | failed
    created_at: new Date().toISOString(),
    error:      null,
    retry_count: 0,
  };
  queue.push(item);
  await saveQueue(queue);
  return item;
}

/**
 * Update the status of a single queue item.
 */
export async function updateQueueItem(id, changes) {
  const queue   = await loadQueue();
  const updated = queue.map(item => item.id === id ? { ...item, ...changes } : item);
  await saveQueue(updated);
  return updated;
}

/**
 * Remove a successfully synced item from the queue.
 */
export async function removeFromQueue(id) {
  const queue   = await loadQueue();
  const updated = queue.filter(item => item.id !== id);
  await saveQueue(updated);
}

/**
 * Attempt to sync all pending/failed items in the queue.
 * Returns a summary: { synced, failed }.
 *
 * @param {function} onProgress - Called after each item with current queue state.
 */
export async function syncAll(onProgress) {
  const queue   = await loadQueue();
  const pending = queue.filter(i => i.status === 'pending' || i.status === 'failed');

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    // Mark as syncing
    await updateQueueItem(item.id, { status: 'syncing' });
    onProgress && onProgress(await loadQueue());

    try {
      await submitMeterReading(item.payload);
      await updateQueueItem(item.id, { status: 'synced', error: null });
      synced++;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Unknown error';
      await updateQueueItem(item.id, {
        status:      'failed',
        error:       msg,
        retry_count: (item.retry_count || 0) + 1,
      });
      failed++;
    }

    onProgress && onProgress(await loadQueue());
  }

  return { synced, failed };
}

/**
 * Clear all synced items from the queue (housekeeping).
 */
export async function clearSynced() {
  const queue   = await loadQueue();
  const updated = queue.filter(i => i.status !== 'synced');
  await saveQueue(updated);
  return updated;
}
