import AsyncStorage from '@react-native-async-storage/async-storage';
import { Mutex } from 'async-mutex';
import { SmsData } from 'react-native-sms-module';
import { AppConfig } from '../../config';

const QUEUE_KEY = 'SMS_QUEUE_V2';
const queueLock = new Mutex();

// Prevent duplicate SMS from multiple listeners
const recentlyAdded = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 5000;

export type QueueStatus = 'pending' | 'syncing' | 'sent' | 'failed';

export interface QueuedSms extends SmsData {
  id: string;
  status: QueueStatus;
  retryCount: number;
  lastError?: string;
  createdAt: number;
  lastTriedAt?: number;
  syncedAt?: number;
  nextRetryAt?: number;
}

type QueueListener = () => void;
const listeners = new Set<QueueListener>();

export function subscribeToQueue(fn: QueueListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error('[Queue] Listener error:', e);
    }
  });
}

function calculateBackoff(retryCount: number): number {
  const baseDelay = 60000;
  const maxDelay = 6 * 60 * 60 * 1000;
  return Math.min(baseDelay * 2 ** retryCount, maxDelay);
}

function normalizeId(id: any): string | null {
  if (id === null || id === undefined) return null;
  return String(id);
}

function cleanupRecentlyAddedCache() {
  const now = Date.now();
  const cutoff = now - DUPLICATE_WINDOW_MS;

  if (recentlyAdded.size > 100) {
    for (const [key, time] of recentlyAdded.entries()) {
      if (time < cutoff) {
        recentlyAdded.delete(key);
      }
    }
  }
}

async function loadQueueUnsafe(): Promise<QueuedSms[]> {
  try {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    if (!data) return [];
    const queue = JSON.parse(data);
    return Array.isArray(queue) ? queue : [];
  } catch (e) {
    console.error('[Queue] Load failed:', e);
    return [];
  }
}

async function saveQueueUnsafe(queue: QueuedSms[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    notifyListeners();
  } catch (e) {
    console.error('[Queue] Save failed:', e);
    throw e;
  }
}

export async function addToQueue(sms: SmsData): Promise<void> {
  await queueLock.runExclusive(async () => {
    const queue = await loadQueueUnsafe();
    const id = normalizeId(sms.id);

    if (!id) {
      console.warn('[Queue] SMS has no ID, skipping');
      return;
    }

    // Check for recent duplicates (prevents multiple listener registrations)
    const now = Date.now();
    const lastAdded = recentlyAdded.get(id);

    if (lastAdded && now - lastAdded < DUPLICATE_WINDOW_MS) {
      console.warn('[Queue] Duplicate SMS within 5s, skipping:', id);
      return;
    }

    // Check queue duplicates
    if (queue.some(item => item.id === id)) {
      recentlyAdded.set(id, now);
      return;
    }

    // Check size limit
    if (queue.length >= AppConfig.queue.maxSize) {
      const sent = queue
        .filter(item => item.status === 'sent')
        .sort((a, b) => a.createdAt - b.createdAt);
      if (sent.length > 0) {
        const toRemove = sent.slice(0, Math.min(100, sent.length));
        const removeIds = new Set(toRemove.map(item => item.id));
        const filtered = queue.filter(item => !removeIds.has(item.id));
        await saveQueueUnsafe(filtered);
      }
    }

    const queuedSms: QueuedSms = {
      ...sms,
      id,
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now(),
    };

    queue.unshift(queuedSms);
    await saveQueueUnsafe(queue);

    recentlyAdded.set(id, now);
    cleanupRecentlyAddedCache();

    console.log('[Queue] Added:', id);
  });
}

export async function getPendingMessages(limit?: number): Promise<QueuedSms[]> {
  return await queueLock.runExclusive(async () => {
    const queue = await loadQueueUnsafe();
    const now = Date.now();
    const batchSize = limit || AppConfig.queue.batchSize;

    return queue
      .filter(item => {
        if (item.status !== 'pending' && item.status !== 'failed') return false;
        if (item.nextRetryAt && item.nextRetryAt > now) return false;
        return true;
      })
      .slice(0, batchSize);
  });
}

export async function markAsSyncing(ids: string[]): Promise<void> {
  await queueLock.runExclusive(async () => {
    const queue = await loadQueueUnsafe();
    const now = Date.now();
    const updated = queue.map(item =>
      ids.includes(item.id)
        ? { ...item, status: 'syncing' as QueueStatus, lastTriedAt: now }
        : item,
    );
    await saveQueueUnsafe(updated);
  });
}

export async function markAsSent(ids: string[]): Promise<void> {
  await queueLock.runExclusive(async () => {
    const queue = await loadQueueUnsafe();
    const now = Date.now();
    const updated = queue.map(item =>
      ids.includes(item.id)
        ? { ...item, status: 'sent' as QueueStatus, syncedAt: now }
        : item,
    );
    await saveQueueUnsafe(updated);
  });
}

export async function markAsFailed(id: string, error: string): Promise<void> {
  await queueLock.runExclusive(async () => {
    const queue = await loadQueueUnsafe();
    const now = Date.now();
    const updated = queue.map(item => {
      if (item.id !== id) return item;
      const retryCount = item.retryCount + 1;
      return {
        ...item,
        status: 'failed' as QueueStatus,
        retryCount,
        lastError: error,
        nextRetryAt: now + calculateBackoff(retryCount),
      };
    });
    await saveQueueUnsafe(updated);
  });
}

export async function clearSentMessages(): Promise<number> {
  return await queueLock.runExclusive(async () => {
    const queue = await loadQueueUnsafe();

    const filtered = queue.filter(item => item.status !== 'sent');

    const removed = queue.length - filtered.length;

    if (removed > 0) {
      await saveQueueUnsafe(filtered);
      console.warn('[Queue] Manually cleared sent messages:', removed);
    }

    return removed;
  });
}

export async function getQueue(): Promise<QueuedSms[]> {
  return await queueLock.runExclusive(async () => {
    return await loadQueueUnsafe();
  });
}

export async function getQueueStats(): Promise<{
  total: number;
  pending: number;
  syncing: number;
  sent: number;
  failed: number;
}> {
  const queue = await getQueue();
  return {
    total: queue.length,
    pending: queue.filter(i => i.status === 'pending').length,
    syncing: queue.filter(i => i.status === 'syncing').length,
    sent: queue.filter(i => i.status === 'sent').length,
    failed: queue.filter(i => i.status === 'failed').length,
  };
}

export async function clearQueue(): Promise<void> {
  await queueLock.runExclusive(async () => {
    await AsyncStorage.removeItem(QUEUE_KEY);
    notifyListeners();
  });
}
