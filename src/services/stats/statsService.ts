import AsyncStorage from '@react-native-async-storage/async-storage';

import { getQueue, QueuedSms } from '../../utils/smsQueue';

/* =========================
   Types
========================= */

export interface SyncStats {
  inboxCount: number;

  totalQueued: number;

  pending: number;
  syncing: number;
  failed: number;
  sent: number;

  lastSync?: number;
  lastError?: string;

  storageBytes: number;
}

/* =========================
   Cache
========================= */

let cachedStats: SyncStats | null = null;
let lastComputed = 0;

const CACHE_TTL = 10_000; // 10s

/* =========================
   Helpers
========================= */

async function getStorageSize(): Promise<number> {
  try {
    const keys = ['SMS_QUEUE', 'inbox_count', 'sync_meta'];

    let size = 0;

    for (const key of keys) {
      const val = await AsyncStorage.getItem(key);
      if (val) size += val.length;
    }

    return size;
  } catch {
    return 0;
  }
}

function countStatuses(queue: QueuedSms[]) {
  const result = {
    pending: 0,
    syncing: 0,
    failed: 0,
    sent: 0,
  };

  for (const m of queue) {
    if (m.status in result) {
      result[m.status]++;
    }
  }

  return result;
}

async function getSyncMeta() {
  try {
    const data = await AsyncStorage.getItem('sync_meta');

    if (!data) return {};

    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function getInboxCount(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem('inbox_count');

    if (!val) return 0;

    return Number(val) || 0;
  } catch {
    return 0;
  }
}

/* =========================
   Main Builder
========================= */

async function buildStats(): Promise<SyncStats> {
  const [queue, inboxCount, storage, meta] = await Promise.all([
    getQueue(),
    getInboxCount(),
    getStorageSize(),
    getSyncMeta(),
  ]);

  const counts = countStatuses(queue);

  return {
    inboxCount,

    totalQueued: queue.length,

    pending: counts.pending,
    syncing: counts.syncing,
    failed: counts.failed,
    sent: counts.sent,

    lastSync: meta.lastSync,
    lastError: meta.lastError,

    storageBytes: storage,
  };
}

/* =========================
   Public API
========================= */

export async function getStats(): Promise<SyncStats> {
  const now = Date.now();

  if (cachedStats && now - lastComputed < CACHE_TTL) {
    return cachedStats;
  }

  const stats = await buildStats();

  cachedStats = stats;
  lastComputed = now;

  return stats;
}

export function invalidateStatsCache() {
  cachedStats = null;
}
