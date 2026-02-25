import AsyncStorage from '@react-native-async-storage/async-storage';

import { sendSmsBatch } from '../api/apiClient';

import {
  getPendingMessages,
  markAsSyncing,
  markAsSent,
  markAsFailed,
  type QueuedSms,
} from '../queue/queueManager';

import { setSyncState } from './syncState';
import { notifySmsSynced } from '../notifications/notifier';

/* STORAGE KEYS */

const SYNC_META_KEY = 'sync_metadata';
const DEVICE_ID_KEY = 'device_id';

const SYNC_LOCK_KEY = 'GLOBAL_SYNC_LOCK';
const SYNC_LOCK_TTL = 2 * 60 * 1000; // 2 min

let isSyncing = false;

/* TYPES */

interface SyncMetadata {
  lastSync: number | null;
  lastError: string | null;
  totalSynced: number;
}

/* GLOBAL LOCK */

async function acquireSyncLock(): Promise<boolean> {
  const now = Date.now();

  try {
    const lock = await AsyncStorage.getItem(SYNC_LOCK_KEY);

    if (lock) {
      const lockTime = Number(lock);

      if (!isNaN(lockTime) && now - lockTime < SYNC_LOCK_TTL) {
        return false;
      }
    }

    await AsyncStorage.setItem(SYNC_LOCK_KEY, String(now));
    return true;
  } catch (e) {
    console.error('[Sync] Lock acquire failed:', e);
    return false;
  }
}

async function releaseSyncLock(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SYNC_LOCK_KEY);
  } catch (e) {
    console.error('[Sync] Lock release failed:', e);
  }
}

/* DEVICE ID */

async function getDeviceId(): Promise<string> {
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
  } catch (error) {
    console.error('[Sync] Device ID error:', error);
    return `device_fallback_${Date.now()}`;
  }
}

/* METADATA */

async function loadSyncMetadata(): Promise<SyncMetadata> {
  try {
    const data = await AsyncStorage.getItem(SYNC_META_KEY);

    if (data) return JSON.parse(data);
  } catch (error) {
    console.error('[Sync] Failed to load metadata:', error);
  }

  return {
    lastSync: null,
    lastError: null,
    totalSynced: 0,
  };
}

async function saveSyncMetadata(metadata: SyncMetadata): Promise<void> {
  try {
    await AsyncStorage.setItem(SYNC_META_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error('[Sync] Failed to save metadata:', error);
  }
}

/* BATCH PROCESS */

async function processBatch(
  batch: QueuedSms[],
  deviceId: string,
): Promise<number> {
  const ids = batch.map(msg => msg.id);

  await markAsSyncing(ids);

  try {
    const payload = batch.map(msg => {
      const smsUid = `${deviceId}_${msg.id}_${msg.timestamp}`;

      return {
        sms_uid: smsUid,
        sender: msg.sender || 'unknown',
        body: msg.body || '',
        timestamp: Number(msg.timestamp) || Date.now(),
        device_id: deviceId,
        status: 'received',
      };
    });

    const response = await sendSmsBatch(payload);

    if (!response.success) {
      throw new Error(response.error || 'API request failed');
    }

    await markAsSent(ids);

    return ids.length;
  } catch (error: any) {
    for (const msg of batch) {
      await markAsFailed(msg.id, error?.message || 'Unknown error');
    }

    throw error;
  }
}

/* MAIN SYNC */

export async function syncQueue(): Promise<void> {
  if (isSyncing) {
    console.log('[Sync] Already running (local)');
    return;
  }

  const lockAcquired = await acquireSyncLock();

  if (!lockAcquired) {
    console.log('[Sync] Global lock active');
    return;
  }

  isSyncing = true;
  setSyncState('syncing');

  const metadata = await loadSyncMetadata();
  metadata.lastSync = Date.now();

  let totalSyncedThisRun = 0;

  try {
    console.log('[Sync] Starting...');

    const deviceId = await getDeviceId();

    while (true) {
      const batch = await getPendingMessages();

      if (batch.length === 0) break;

      console.log('[Sync] Processing batch:', batch.length);

      const synced = await processBatch(batch, deviceId);

      totalSyncedThisRun += synced;
    }

    metadata.lastError = null;
    metadata.totalSynced += totalSyncedThisRun;

    await saveSyncMetadata(metadata);

    if (totalSyncedThisRun > 0) {
      notifySmsSynced(totalSyncedThisRun);
    }

    console.log('[Sync] Completed:', totalSyncedThisRun);

    setSyncState('idle');
  } catch (error: any) {
    console.error('[Sync] Failed:', error);

    metadata.lastError = error?.message || 'Unknown error';

    await saveSyncMetadata(metadata);

    setSyncState('error', metadata.lastError);
  } finally {
    isSyncing = false;

    await releaseSyncLock();

    console.log('[Sync] Lock released');
  }
}

/* PUBLIC */

export async function getSyncMetadata(): Promise<SyncMetadata> {
  return await loadSyncMetadata();
}
