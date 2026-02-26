import { SmsSyncBridge } from '../native/SmsSyncBridge';

export type QueueStatus = 'pending' | 'syncing' | 'sent' | 'failed';

export interface QueuedSms {
  id: string;
  sender: string;
  body: string;
  timestamp: number;
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

function normalizeId(id: any): string | null {
  if (id === null || id === undefined) return null;
  return String(id);
}

export async function addToQueue(sms: {
  id: string | number;
  sender: string;
  body: string;
  timestamp: number;
}): Promise<void> {
  try {
    const id = normalizeId(sms.id);

    if (!id) {
      console.warn('[Queue] SMS has no ID, skipping');
      return;
    }

    const sender = sms.sender || 'unknown';
    const body = sms.body || '';
    const timestamp = Number(sms.timestamp) || Date.now();

    await SmsSyncBridge.addToQueue(id, sender, body, timestamp);

    notifyListeners();

    console.log('[Queue] Added:', id);
  } catch (error) {
    console.error('[Queue] Add failed:', error);
    throw error;
  }
}

export async function getQueue(): Promise<QueuedSms[]> {
  try {
    const queue = await SmsSyncBridge.getQueue();
    return queue as QueuedSms[];
  } catch (error) {
    console.error('[Queue] Get queue failed:', error);
    return [];
  }
}

export async function getQueueStats(): Promise<{
  total: number;
  pending: number;
  syncing: number;
  sent: number;
  failed: number;
}> {
  try {
    return await SmsSyncBridge.getQueueStats();
  } catch (error) {
    console.error('[Queue] Get stats failed:', error);
    return {
      total: 0,
      pending: 0,
      syncing: 0,
      sent: 0,
      failed: 0,
    };
  }
}

export async function clearQueue(): Promise<void> {
  try {
    await SmsSyncBridge.clearQueue();
    notifyListeners();
  } catch (error) {
    console.error('[Queue] Clear failed:', error);
    throw error;
  }
}

export async function clearSentMessages(): Promise<number> {
  try {
    const removed = await SmsSyncBridge.clearSentMessages();
    notifyListeners();
    return removed;
  } catch (error) {
    console.error('[Queue] Clear sent failed:', error);
    throw error;
  }
}
