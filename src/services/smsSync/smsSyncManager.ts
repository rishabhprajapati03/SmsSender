import { SmsSyncBridge } from '../native/SmsSyncBridge';
import { Alert } from 'react-native';

/* STATE */

let cachedEnabled = false;

/* START */

export async function startSmsSync(): Promise<void> {
  try {
    console.log('[SmsSync] Starting...');

    // Check permissions before enabling
    const permissions = await SmsSyncBridge.checkRequiredPermissions();

    if (!permissions.readSms || !permissions.receiveSms || !permissions.postNotifications) {
      const missing = [];
      if (!permissions.readSms) missing.push('Read SMS');
      if (!permissions.receiveSms) missing.push('Receive SMS');
      if (!permissions.postNotifications) missing.push('Notifications');

      Alert.alert(
        'Permissions Required',
        `Please grant the following permissions to enable SMS sync:\n\n${missing.join(', ')}\n\nGo to Settings > Apps > SMS Sender > Permissions`,
        [{ text: 'OK' }]
      );

      throw new Error('Required permissions not granted');
    }

    await SmsSyncBridge.enableSync();

    cachedEnabled = true;

    console.log('[SmsSync] Started');
  } catch (error) {
    console.error('[SmsSync] Start failed:', error);
    cachedEnabled = false;
    throw error;
  }
}

/* STOP */

export async function stopSmsSync(): Promise<void> {
  try {
    console.log('[SmsSync] Stopping...');

    await SmsSyncBridge.disableSync();

    cachedEnabled = false;

    console.log('[SmsSync] Stopped');
  } catch (error) {
    console.error('[SmsSync] Stop failed:', error);
    cachedEnabled = false;
  }
}

/* STATUS */

export function isSmsSyncRunning(): boolean {
  return cachedEnabled;
}

export async function getSmsSyncState(): Promise<{
  enabled: boolean;
  startedAt: number | null;
}> {
  try {
    const enabled = await SmsSyncBridge.isSyncEnabled();
    cachedEnabled = enabled;

    return {
      enabled,
      startedAt: enabled ? Date.now() : null,
    };
  } catch (error) {
    console.error('[SmsSync] Get state failed:', error);
    return { enabled: false, startedAt: null };
  }
}

/* RESTORE */

export async function restoreSmsSyncIfNeeded(): Promise<boolean> {
  try {
    const enabled = await SmsSyncBridge.isSyncEnabled();
    cachedEnabled = enabled;

    if (enabled) {
      console.log('[SmsSync] Already enabled, no restore needed');
    }

    return enabled;
  } catch (error) {
    console.error('[SmsSync] Restore check failed:', error);
    return false;
  }
}

/* SYNC START TIMESTAMP - Not needed anymore but kept for compatibility */

export async function getSyncStartTimestamp(): Promise<number> {
  return 0;
}
