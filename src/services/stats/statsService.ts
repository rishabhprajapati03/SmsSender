import AsyncStorage from '@react-native-async-storage/async-storage';

import { getQueueStats } from '../queue/queueManager';

export interface SyncStats {
  inboxCount: number;
  totalQueued: number;
  pending: number;
  syncing: number;
  failed: number;
  sent: number;
  lastSync?: number;
  lastError?: string;
}

const SYNC_META_KEY = 'sync_metadata';
const INBOX_COUNT_KEY = 'inbox_count';

/* HELPERS */

async function getSyncMeta() {
  try {
    const data = await AsyncStorage.getItem(SYNC_META_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

async function getInboxCount(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(INBOX_COUNT_KEY);
    return val ? Number(val) : 0;
  } catch {
    return 0;
  }
}

/* PUBLIC */

export async function getStats(): Promise<SyncStats> {
  const [queueStats, inboxCount, meta] = await Promise.all([
    getQueueStats(),
    getInboxCount(),
    getSyncMeta(),
  ]);

  return {
    inboxCount,

    totalQueued: queueStats.total,

    pending: queueStats.pending,
    syncing: queueStats.syncing,
    failed: queueStats.failed,
    sent: queueStats.sent,

    lastSync: meta?.lastSync,
    lastError: meta?.lastError,
  };
}
