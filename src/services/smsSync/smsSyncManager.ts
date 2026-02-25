import BackgroundService from 'react-native-background-actions';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  startSmsListener,
  stopSmsListener,
  isListenerActive,
} from '../sms/smsListener';

import { syncQueue } from '../sync/syncManager';
import { AppConfig } from '../../config';

/* STORAGE KEYS */

const SYNC_START_TS_KEY = 'SMS_SYNC_START_TS';
const DUTY_STATE_KEY = 'smsSync_state_v2';

/* TYPES */

interface SmsSyncState {
  enabled: boolean;
  startedAt: number | null;
}

/* STATE */

let isRunning = false;

/* FOREGROUND OPTIONS */

const foregroundOptions = {
  taskName: 'SMS Sync Service',
  taskTitle: 'Syncing SMS',
  taskDesc: 'Listening and syncing SMS messages',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' },
  color: '#2196F3',
  linkingURI: 'myapp://dashboard',
  parameters: {},
};

/* STATE STORAGE */

async function loadSmsSyncState(): Promise<SmsSyncState> {
  try {
    const data = await AsyncStorage.getItem(DUTY_STATE_KEY);

    if (data) return JSON.parse(data);
  } catch (error) {
    console.error('[SmsSync] Load state failed:', error);
  }

  return { enabled: false, startedAt: null };
}

async function saveSmsSyncState(state: SmsSyncState): Promise<void> {
  try {
    await AsyncStorage.setItem(DUTY_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('[SmsSync] Save state failed:', error);
  }
}

/* SYNC START TIMESTAMP */

export async function getSyncStartTimestamp(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(SYNC_START_TS_KEY);
    return val ? Number(val) : 0;
  } catch {
    return 0;
  }
}

async function setSyncStartTimestamp(ts: number): Promise<void> {
  try {
    await AsyncStorage.setItem(SYNC_START_TS_KEY, String(ts));
  } catch {}
}

/* MAIN TASK */

async function smsSyncTask(): Promise<void> {
  console.log('[SmsSync] Task started');

  if (!isListenerActive()) {
    await startSmsListener();
  }

  while (BackgroundService.isRunning()) {
    try {
      await syncQueue();
    } catch (error) {
      console.error('[SmsSync] Sync error:', error);
    }

    await new Promise(resolve =>
      setTimeout(resolve, AppConfig.sync.intervalMs),
    );
  }

  await stopSmsListener();

  console.log('[SmsSync] Task stopped');
}

/* START */

export async function startSmsSync(): Promise<void> {
  if (isRunning) return;

  try {
    console.log('[SmsSync] Starting...');
    isRunning = true;

    const now = Date.now();

    // Save boundary timestamp
    await setSyncStartTimestamp(now);

    // Save state
    await saveSmsSyncState({
      enabled: true,
      startedAt: now,
    });

    await BackgroundService.start(smsSyncTask, foregroundOptions);

    console.log('[SmsSync] Started');
  } catch (error) {
    console.error('[SmsSync] Start failed:', error);

    isRunning = false;

    await setSyncStartTimestamp(0);
    await saveSmsSyncState({ enabled: false, startedAt: null });

    throw error;
  }
}

/* STOP */

export async function stopSmsSync(): Promise<void> {
  if (!isRunning) return;

  try {
    console.log('[SmsSync] Stopping...');
    isRunning = false;

    await BackgroundService.stop();
    await stopSmsListener();

    // Clear boundary
    await setSyncStartTimestamp(0);

    await saveSmsSyncState({ enabled: false, startedAt: null });

    console.log('[SmsSync] Stopped');
  } catch (error) {
    console.error('[SmsSync] Stop failed:', error);

    isRunning = false;

    await setSyncStartTimestamp(0);
    await saveSmsSyncState({ enabled: false, startedAt: null });
  }
}

/* STATUS */

export function isSmsSyncRunning(): boolean {
  return isRunning && BackgroundService.isRunning();
}

export async function getSmsSyncState(): Promise<SmsSyncState> {
  return await loadSmsSyncState();
}

/* RESTORE */

export async function restoreSmsSyncIfNeeded(): Promise<boolean> {
  const state = await loadSmsSyncState();

  if (!state.enabled) {
    return false;
  }

  try {
    if (!BackgroundService.isRunning()) {
      await startSmsSync();
    }

    return true;
  } catch (error) {
    console.error('[SmsSync] Restore failed:', error);
    return false;
  }
}
