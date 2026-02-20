import {
  getPending,
  markSyncing,
  markSent,
  markFailed,
  cleanupSent,
} from '../utils/smsQueue';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { QueuedSms } from '../utils/smsQueue';

import { setSyncing, setIdle, setError } from './sync/syncState';

const SUPABASE_URL = 'https://dfsdfsdvshkjsddf.supabase.co/rest/v1/sms_logs';

const SUPABASE_KEY = 'SUPABASE_KEY'; // 🔴 replace with real key

let isSyncing = false;

/* =========================
   Send Batch To Supabase
========================= */

async function sendBatch(msgs: QueuedSms[]) {
  const deviceId = (await AsyncStorage.getItem('device_id')) || 'device_01';

  const payload = msgs.map(m => ({
    id: m.id,
    sender: m.sender,
    body: m.body,
    timestamp: m.timestamp,
    device_id: deviceId,
    status: 'received',
  }));

  const res = await fetch(SUPABASE_URL, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  return true;
}

/* =========================
   Process Batch
========================= */

async function processBatch(batch: QueuedSms[]) {
  const ids = batch.map(m => m.id);

  await markSyncing(ids);

  try {
    await sendBatch(batch);

    await markSent(ids);

    await AsyncStorage.setItem(
      'sync_meta',
      JSON.stringify({
        lastSync: Date.now(),
        lastError: null,
      }),
    );
  } catch (err: any) {
    await AsyncStorage.setItem(
      'sync_meta',
      JSON.stringify({
        lastSync: Date.now(),
        lastError: String(err),
      }),
    );

    for (const msg of batch) {
      await markFailed(msg.id, String(err));
    }

    throw err;
  }
}

/* =========================
   Main Sync
========================= */

export async function syncQueue() {
  if (isSyncing) return;

  isSyncing = true;
  setSyncing();

  try {
    while (true) {
      const batch = await getPending(20);

      if (!batch.length) break;

      try {
        await processBatch(batch);
      } catch {
        break; // stop on API failure
      }
    }

    await cleanupSent(30);
  } catch (e: any) {
    setError(String(e));
  } finally {
    isSyncing = false;
    setIdle();
  }
}
