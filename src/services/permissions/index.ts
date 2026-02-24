import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';

export interface PermissionStatus {
  sms: boolean;
  notifications: boolean;
}

/* CHECKS */

async function checkSmsPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    const read = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
    );

    const receive = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    );

    return read && receive;
  } catch {
    return false;
  }
}

async function checkNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Platform.Version < 33) return true;

  try {
    return await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
  } catch {
    return false;
  }
}

/* REQUEST */

export async function requestSmsPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    ]);

    return Object.values(result).every(
      r => r === PermissionsAndroid.RESULTS.GRANTED,
    );
  } catch {
    return false;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Platform.Version < 33) return true;

  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );

    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

/* BATTERY SETTINGS */

export function openBatterySettings() {
  Alert.alert(
    'Battery Optimization',
    'Disable battery optimization for reliable background sync.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: async () => {
          try {
            await Linking.openURL(
              'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS',
            );
          } catch {
            Linking.openSettings();
          }
        },
      },
    ],
  );
}

/* INIT */

export async function initializePermissions(): Promise<PermissionStatus> {
  console.log('[Permissions] Initializing...');

  let sms = await checkSmsPermissions();
  let notifications = await checkNotificationPermission();

  if (!sms) {
    sms = await requestSmsPermissions();
  }

  if (!notifications) {
    notifications = await requestNotificationPermission();
  }

  return { sms, notifications };
}

/* CAN START */

export async function canStartSmsSyncMode(): Promise<{
  allowed: boolean;
  reason?: string;
  status: PermissionStatus;
}> {
  const status: PermissionStatus = {
    sms: await checkSmsPermissions(),
    notifications: await checkNotificationPermission(),
  };

  if (!status.sms) {
    return {
      allowed: false,
      reason: 'SMS permission required',
      status,
    };
  }

  if (!status.notifications) {
    return {
      allowed: false,
      reason: 'Notification permission required',
      status,
    };
  }

  // DO NOT block on battery optimization
  return {
    allowed: true,
    status,
  };
}

/* SETTINGS */

export async function openAppSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (e) {
    console.error('Failed to open settings:', e);
  }
}
