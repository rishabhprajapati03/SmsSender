import AsyncStorage from '@react-native-async-storage/async-storage';
import { SmsData } from 'react-native-sms-module';
import { Mutex } from 'async-mutex';

const KEY = 'SMS_QUEUE';

const queueLock = new Mutex();

/* =========================
   Events
========================= */

type QueueListener = () => void;

const listeners = new Set<QueueListener>();

export function subscribeQueue(fn: QueueListener) {
  listeners.add(fn);

  return () => listeners.delete(fn);
}

function notifyQueue() {
  listeners.forEach(fn => fn());
}

/* =========================
   Types
========================= */

export type QueueStatus = 'pending' | 'syncing' | 'sent' | 'failed';

export type QueuedSms = SmsData & {
  id: string;

  status: QueueStatus;

  retryCount: number;
  lastError?: string;

  createdAt: number;
  lastTriedAt?: number;
  syncedAt?: number;

  nextRetryAt?: number;
};

/* =========================
   Helpers
========================= */

function normalizeId(id: any): string | null {
  if (id === null || id === undefined) return null;
  return String(id);
}

function backoff(retry: number) {
  return Math.min(60000 * 2 ** retry, 6 * 60 * 60 * 1000);
}

/* =========================
   Unsafe Storage
========================= */

async function getQueueUnsafe(): Promise<QueuedSms[]> {
  const data = await AsyncStorage.getItem(KEY);

  if (!data) return [];

  try {
    return JSON.parse(data);
  } catch {
    await AsyncStorage.removeItem(KEY);
    return [];
  }
}

async function saveQueueUnsafe(list: QueuedSms[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));

  notifyQueue(); // 🔔 notify UI
}

/* =========================
   Public API
========================= */

export async function getQueue() {
  return queueLock.runExclusive(() => getQueueUnsafe());
}

/* Add */

export async function addToQueue(msg: SmsData) {
  await queueLock.runExclusive(async () => {
    const list = await getQueueUnsafe();

    const id = normalizeId(msg.id);

    if (!id) return;

    if (list.some(m => m.id === id)) return;

    const item: QueuedSms = {
      ...msg,

      id,

      status: 'pending',

      retryCount: 0,

      createdAt: Date.now(),
    };

    list.unshift(item);

    await saveQueueUnsafe(list);
  });
}

/* Get Pending */

export async function getPending(limit = 50) {
  return queueLock.runExclusive(async () => {
    const now = Date.now();

    const list = await getQueueUnsafe();

    return list
      .filter(
        m =>
          (m.status === 'pending' || m.status === 'failed') &&
          (!m.nextRetryAt || m.nextRetryAt <= now),
      )
      .slice(0, limit);
  });
}

/* Mark Syncing */

export async function markSyncing(ids: string[]) {
  await queueLock.runExclusive(async () => {
    const list = await getQueueUnsafe();

    const updated = list.map(m =>
      ids.includes(m.id)
        ? {
            ...m,
            status: 'syncing',
            lastTriedAt: Date.now(),
          }
        : m,
    );

    await saveQueueUnsafe(updated);
  });
}

/* Mark Sent */

export async function markSent(ids: string[]) {
  await queueLock.runExclusive(async () => {
    const list = await getQueueUnsafe();

    const updated = list.map(m =>
      ids.includes(m.id)
        ? {
            ...m,
            status: 'sent',
            syncedAt: Date.now(),
          }
        : m,
    );

    await saveQueueUnsafe(updated);
  });
}

/* Mark Failed */

export async function markFailed(idRaw: string, error: string) {
  const id = normalizeId(idRaw);

  await queueLock.runExclusive(async () => {
    const list = await getQueueUnsafe();

    const updated = list.map(m => {
      if (m.id !== id) return m;

      const retry = m.retryCount + 1;

      return {
        ...m,

        status: 'failed',

        retryCount: retry,

        lastError: error,

        nextRetryAt: Date.now() + backoff(retry),
      };
    });

    await saveQueueUnsafe(updated);
  });
}

/* Cleanup */

export async function cleanupSent(days = 30) {
  const cutoff = Date.now() - days * 86400000;

  await queueLock.runExclusive(async () => {
    const list = await getQueueUnsafe();

    const filtered = list.filter(
      m => m.status !== 'sent' || !m.syncedAt || m.syncedAt > cutoff,
    );

    await saveQueueUnsafe(filtered);
  });
}

/* Clear */

export async function clearQueue() {
  await queueLock.runExclusive(async () => {
    await AsyncStorage.removeItem(KEY);
    notifyQueue();
  });
}
