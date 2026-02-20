import BackgroundService from 'react-native-background-actions';

import { startListener, stopListenerSafe } from './sms/smsService';
import { syncQueue } from './syncService';

import { ensureSmsPermission } from './permissions/permissionService';

let running = false;

const options = {
  taskName: 'SMS Sync',
  taskTitle: 'On Duty',
  taskDesc: 'Listening and syncing messages',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#2196f3',
  parameters: {},
};

async function dutyTask() {
  const allowed = await ensureSmsPermission();

  if (!allowed) {
    console.log('SMS permission denied');
    return;
  }

  await startListener();

  while (BackgroundService.isRunning()) {
    try {
      await syncQueue();
    } catch {}

    await sleep(30000);
  }

  stopListenerSafe();
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

export async function startDuty() {
  if (running) return;

  running = true;

  await BackgroundService.start(dutyTask, options);
}

export async function stopDuty() {
  if (!running) return;

  running = false;

  await BackgroundService.stop();
}

export async function isOnDuty() {
  return BackgroundService.isRunning();
}
