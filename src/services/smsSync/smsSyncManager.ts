import BackgroundService from 'react-native-background-actions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  startSmsListener,
  stopSmsListener,
  isListenerActive,
} from '../sms/smsListener';
import { syncQueue } from '../sync/syncManager';
import { AppConfig } from '../../config';

const DUTY_STATE_KEY = 'smsSync_state_v2';

interface SmsSyncState {
  enabled: boolean;
  startedAt: number | null;
}

let isRunning = false;

const foregroundOptions = {
  taskName: 'SMS Sync Service',
  taskTitle: 'Syncing SMS',
  taskDesc: 'Listening and syncing SMS messages',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' },
  color: '#2196F3',
  linkingURI: 'myapp://dashboard',
  parameters: {},
};

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

async function smsSyncTask(): Promise<void> {
  console.log('[SmsSync] Task started');

  if (!isListenerActive()) {
    startSmsListener();
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

  stopSmsListener();
  console.log('[SmsSync] Task stopped');
}

export async function startSmsSync(): Promise<void> {
  if (isRunning) return;

  try {
    console.log('[SmsSync] Starting...');
    isRunning = true;

    await saveSmsSyncState({ enabled: true, startedAt: Date.now() });
    await BackgroundService.start(smsSyncTask, foregroundOptions);

    console.log('[SmsSync] Started');
  } catch (error) {
    console.error('[SmsSync] Start failed:', error);
    isRunning = false;
    await saveSmsSyncState({ enabled: false, startedAt: null });
    throw error;
  }
}

export async function stopSmsSync(): Promise<void> {
  if (!isRunning) return;

  try {
    console.log('[SmsSync] Stopping...');
    isRunning = false;

    await BackgroundService.stop();
    stopSmsListener();
    await saveSmsSyncState({ enabled: false, startedAt: null });

    console.log('[SmsSync] Stopped');
  } catch (error) {
    console.error('[SmsSync] Stop failed:', error);
    isRunning = false;
    await saveSmsSyncState({ enabled: false, startedAt: null });
  }
}

export function isSmsSyncRunning(): boolean {
  return isRunning && BackgroundService.isRunning();
}

export async function getSmsSyncState(): Promise<SmsSyncState> {
  return await loadSmsSyncState();
}

export async function restoreSmsSyncIfNeeded(): Promise<boolean> {
  const state = await loadSmsSyncState();

  if (!state.enabled) {
    console.log('[SmsSync] Not enabled, skipping restore');
    return false;
  }

  if (BackgroundService.isRunning()) {
    console.log('[SmsSync] Already running');
    isRunning = true;
    return true;
  }

  console.log('[SmsSync] Restoring...');
  try {
    await startSmsSync();
    return true;
  } catch (error) {
    console.error('[SmsSync] Restore failed:', error);
    return false;
  }
}
