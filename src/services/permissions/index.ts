import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BATTERY_PROMPT_KEY = 'battery_prompt_shown';

export interface PermissionStatus {
  sms: boolean;
  notifications: boolean;
  batteryOptimization: boolean;
}

async function checkSmsPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    const read = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
    const receive = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
    return read && receive;
  } catch (e) {
    return false;
  }
}

async function checkNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Platform.Version < 33) return true;

  try {
    return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  } catch (e) {
    return false;
  }
}

export async function requestSmsPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    ]);
    return Object.values(result).every(r => r === PermissionsAndroid.RESULTS.GRANTED);
  } catch (e) {
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
  } catch (e) {
    return false;
  }
}

export async function promptBatteryOptimization(): Promise<void> {
  const shown = await AsyncStorage.getItem(BATTERY_PROMPT_KEY);
  if (shown === 'true') return;

  Alert.alert(
    'Battery Optimization',
    'For reliable background sync, please disable battery optimization for this app.',
    [
      {
        text: 'Not Now',
        onPress: async () => {
          await AsyncStorage.setItem(BATTERY_PROMPT_KEY, 'true');
        },
      },
      {
        text: 'Open Settings',
        onPress: async () => {
          await AsyncStorage.setItem(BATTERY_PROMPT_KEY, 'true');
          try {
            await Linking.openSettings();
          } catch (e) {
            console.error('Failed to open settings:', e);
          }
        },
      },
    ],
  );
}

export async function initializePermissions(): Promise<PermissionStatus> {
  console.log('[Permissions] Initializing...');

  const status: PermissionStatus = {
    sms: await checkSmsPermissions(),
    notifications: await checkNotificationPermission(),
    batteryOptimization: true,
  };

  if (!status.sms) {
    status.sms = await requestSmsPermissions();
  }

  if (!status.notifications) {
    status.notifications = await requestNotificationPermission();
  }

  await promptBatteryOptimization();

  return status;
}

export async function canStartDutyMode(): Promise<{
  allowed: boolean;
  reason?: string;
  status: PermissionStatus;
}> {
  const status: PermissionStatus = {
    sms: await checkSmsPermissions(),
    notifications: await checkNotificationPermission(),
    batteryOptimization: true,
  };

  if (!status.sms) {
    return { allowed: false, reason: 'SMS permissions required', status };
  }

  if (!status.notifications) {
    return { allowed: false, reason: 'Notification permission required', status };
  }

  return { allowed: true, status };
}

export async function getPermissionStatus(): Promise<PermissionStatus> {
  return {
    sms: await checkSmsPermissions(),
    notifications: await checkNotificationPermission(),
    batteryOptimization: true,
  };
}

export async function openAppSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (e) {
    console.error('Failed to open settings:', e);
  }
}
