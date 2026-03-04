import { SmsSyncBridge } from '../native/SmsSyncBridge';
import { Alert, Linking } from 'react-native';
import { requestRequiredPermissions } from '../permissions/runtimePermissions';

let cachedEnabled = false;

/* START */

export async function startSmsSync(): Promise<void> {
  try {
    console.log('SmsSync Starting...');

    // Request runtime permissions first
    const permissionResult = await requestRequiredPermissions();

    if (!permissionResult.granted) {
      if (permissionResult.permanentlyDenied) {
        Alert.alert(
          'Permissions Required',
          'Permissions are permanently denied. Please enable them in Settings to use SMS Sync.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ],
        );
      } else {
        Alert.alert(
          'Permissions Required',
          'Permissions are required to enable SMS Sync. Please grant all requested permissions.',
          [{ text: 'OK' }],
        );
      }

      throw new Error('Required permissions not granted');
    }

    // Native enableSync() enforces permissions and starts service
    await SmsSyncBridge.enableSync();

    cachedEnabled = true;

    console.log('SmsSync Started');
  } catch (error) {
    console.error('SmsSync Start failed:', error);
    cachedEnabled = false;
    throw error;
  }
}

/* STOP */

export async function stopSmsSync(): Promise<void> {
  try {
    console.log('SmsSync Stopping...');

    await SmsSyncBridge.disableSync();

    cachedEnabled = false;

    console.log('SmsSync Stopped');
  } catch (error) {
    console.error('SmsSync Stop failed:', error);
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
    console.error('SmsSync Get state failed:', error);
    return { enabled: false, startedAt: null };
  }
}

/* RESTORE */

export async function restoreSmsSyncIfNeeded(): Promise<boolean> {
  try {
    const enabled = await SmsSyncBridge.isSyncEnabled();
    cachedEnabled = enabled;

    if (enabled) {
      console.log('SmsSync Already enabled, no restore needed');
    }

    return enabled;
  } catch (error) {
    console.error('SmsSync Restore check failed:', error);
    return false;
  }
}

/* SYNC START TIMESTAMP - Not needed anymore but kept for compatibility */

export async function getSyncStartTimestamp(): Promise<number> {
  return 0;
}
