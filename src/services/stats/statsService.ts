import AsyncStorage from '@react-native-async-storage/async-storage';

import { getQueueStats } from '../queue/queueManager';

export interface SyncStats {
  totalQueued: number;
  pending: number;
  syncing: number;
  failed: number;
  sent: number;
  lastSync?: number;
  lastError?: string;
}

const SYNC_META_KEY = 'sync_metadata';

/* HELPERS */

async function getSyncMeta() {
  try {
    const data = await AsyncStorage.getItem(SYNC_META_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/* PUBLIC */

export async function getStats(): Promise<SyncStats> {
  const [queueStats, meta] = await Promise.all([
    getQueueStats(),
    getSyncMeta(),
  ]);

  return {
    totalQueued: queueStats.total,

    pending: queueStats.pending,
    syncing: queueStats.syncing,
    failed: queueStats.failed,
    sent: queueStats.sent,

    lastSync: meta?.lastSync || null,
    lastError: meta?.lastError || null,
  };
}
