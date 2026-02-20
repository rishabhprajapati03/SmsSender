import {
  getSMSList,
  startSmsListener,
  stopSmsListener,
  SmsData,
} from 'react-native-sms-module';

import { PermissionsAndroid, Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { addToQueue } from '../../utils/smsQueue';
import { syncQueue } from '../syncService';

import BackgroundFetch from 'react-native-background-fetch';

const LAST_SYNC_KEY = 'last_sms_sync';

let listenerStarted = false;

let jobScheduled = false;

/* =========================
   Permission
========================= */

async function ensureSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  const readGranted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_SMS,
  );

  const receiveGranted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
  );

  if (readGranted && receiveGranted) return true;

  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
  ]);

  return Object.values(result).every(
    r => r === PermissionsAndroid.RESULTS.GRANTED,
  );
}

/* =========================
   Schedule Background Job (Debounced)
========================= */

async function scheduleSyncJob() {
  if (jobScheduled) return;

  jobScheduled = true;

  try {
    await BackgroundFetch.scheduleTask({
      taskId: 'sms-sync',
      delay: 1000,
      forceAlarmManager: false,
      periodic: false,
    });
  } catch (e) {
    console.log('Schedule error:', e);
  }

  setTimeout(() => {
    jobScheduled = false;
  }, 60000); // allow new job after 60s
}

/* =========================
   Import Inbox
========================= */

export async function importInbox(limit = 500) {
  const hasPermission = await ensureSmsPermission();
  if (!hasPermission) {
    console.log('SMS permission denied');
    return 0;
  }

  const inbox = await getSMSList(0, limit, {});

  await Promise.all(inbox.map(msg => addToQueue(msg)));

  await AsyncStorage.setItem('inbox_count', String(inbox.length));

  await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now()));

  await syncQueue();
  await scheduleSyncJob();

  return inbox.length;
}

/* =========================
   Listener
========================= */

export async function startListener(onNew?: (m: SmsData) => void) {
  if (listenerStarted) return;

  const hasPermission = await ensureSmsPermission();

  if (!hasPermission) {
    console.log('SMS permission missing');
    return;
  }

  listenerStarted = true;

  console.log('SMS LISTENER STARTED');

  startSmsListener(async msg => {
    try {
      console.log('SMS RECEIVED:', msg.id);

      await addToQueue(msg);

      await syncQueue();
      await scheduleSyncJob();

      if (onNew) onNew(msg);
    } catch (e) {
      console.log('Listener error:', e);
    }
  });
}

export function stopListenerSafe() {
  listenerStarted = false;
  stopSmsListener();
}
