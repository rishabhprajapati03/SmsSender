import BackgroundService from 'react-native-background-actions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  startSmsListener,
  stopSmsListener,
  isListenerActive,
} from '../sms/smsListener';
import { syncQueue } from '../sync/syncManager';
import { AppConfig } from '../../config';

const DUTY_STATE_KEY = 'duty_state_v2';

interface DutyState {
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

async function loadDutyState(): Promise<DutyState> {
  try {
    const data = await AsyncStorage.getItem(DUTY_STATE_KEY);
    if (data) return JSON.parse(data);
  } catch (error) {
    console.error('[Duty] Load state failed:', error);
  }
  return { enabled: false, startedAt: null };
}

async function saveDutyState(state: DutyState): Promise<void> {
  try {
    await AsyncStorage.setItem(DUTY_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('[Duty] Save state failed:', error);
  }
}

async function dutyTask(): Promise<void> {
  console.log('[Duty] Task started');

  if (!isListenerActive()) {
    startSmsListener();
  }

  while (BackgroundService.isRunning()) {
    try {
      await syncQueue();
    } catch (error) {
      console.error('[Duty] Sync error:', error);
    }
    await new Promise(resolve =>
      setTimeout(resolve, AppConfig.sync.intervalMs),
    );
  }

  stopSmsListener();
  console.log('[Duty] Task stopped');
}

export async function startDuty(): Promise<void> {
  if (isRunning) return;

  try {
    console.log('[Duty] Starting...');
    isRunning = true;

    await saveDutyState({ enabled: true, startedAt: Date.now() });
    await BackgroundService.start(dutyTask, foregroundOptions);

    console.log('[Duty] Started');
  } catch (error) {
    console.error('[Duty] Start failed:', error);
    isRunning = false;
    await saveDutyState({ enabled: false, startedAt: null });
    throw error;
  }
}

export async function stopDuty(): Promise<void> {
  if (!isRunning) return;

  try {
    console.log('[Duty] Stopping...');
    isRunning = false;

    await BackgroundService.stop();
    stopSmsListener();
    await saveDutyState({ enabled: false, startedAt: null });

    console.log('[Duty] Stopped');
  } catch (error) {
    console.error('[Duty] Stop failed:', error);
    isRunning = false;
    await saveDutyState({ enabled: false, startedAt: null });
  }
}

export function isDutyRunning(): boolean {
  return isRunning && BackgroundService.isRunning();
}

export async function getDutyState(): Promise<DutyState> {
  return await loadDutyState();
}

export async function restoreDutyIfNeeded(): Promise<boolean> {
  const state = await loadDutyState();

  if (!state.enabled) {
    console.log('[Duty] Not enabled, skipping restore');
    return false;
  }

  if (BackgroundService.isRunning()) {
    console.log('[Duty] Already running');
    isRunning = true;
    return true;
  }

  console.log('[Duty] Restoring...');
  try {
    await startDuty();
    return true;
  } catch (error) {
    console.error('[Duty] Restore failed:', error);
    return false;
  }
}
