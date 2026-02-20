import { PermissionsAndroid, Platform, Linking, Alert } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

/* =========================
   Keys
========================= */

const PERMISSION_ASKED_KEY = 'permission_asked_v1';

/* =========================
   Types
========================= */

export type PermissionStatus = {
  sms: boolean;
  batteryOptimization: boolean;
  notifications: boolean;
};

/* =========================
   Public API
========================= */

/**
 * Main entry: call this on app start
 */
export async function ensureAllPermissions(): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') {
    return {
      sms: false,
      batteryOptimization: true,
      notifications: true,
    };
  }

  const [sms, battery, notifications] = await Promise.all([
    ensureSmsPermission(),
    ensureBatteryOptimizationDisabled(),
    ensureNotificationPermission(),
  ]);

  return {
    sms,
    batteryOptimization: battery,
    notifications,
  };
}

/* =========================
   SMS Permission
========================= */

export async function ensureSmsPermission(): Promise<boolean> {
  try {
    const read = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
    );

    const receive = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    );

    if (read && receive) return true;

    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    ]);

    return Object.values(result).every(
      r => r === PermissionsAndroid.RESULTS.GRANTED,
    );
  } catch (e) {
    console.log('SMS permission error:', e);
    return false;
  }
}

/* =========================
   Notification Permission (Android 13+)
========================= */

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.Version < 33) return true;

  try {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );

    if (granted) return true;

    const res = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );

    return res === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    console.log('Notification permission error:', e);
    return false;
  }
}

/* =========================
   Battery Optimization
========================= */

export async function ensureBatteryOptimizationDisabled(): Promise<boolean> {
  try {
    const asked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);

    // Ask only once automatically
    if (asked === 'true') {
      return true;
    }

    await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');

    return await requestBatteryOptimizationDialog();
  } catch (e) {
    console.log('Battery permission error:', e);
    return false;
  }
}

async function requestBatteryOptimizationDialog(): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(
      'Allow Background Sync',
      'To sync SMS reliably, please disable battery optimization for this app.',
      [
        {
          text: 'Later',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Open Settings',
          onPress: async () => {
            try {
              await openBatterySettings();
              resolve(true);
            } catch {
              resolve(false);
            }
          },
        },
      ],
      { cancelable: false },
    );
  });
}

async function openBatterySettings() {
  // Try exact screen first
  try {
    await Linking.openURL(
      'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS',
    );
    return;
  } catch {}

  // Fallback
  await Linking.openSettings();
}

/* =========================
   Manual Re-check
========================= */

/**
 * Use this from Settings screen
 */
export async function recheckPermissions() {
  return await ensureAllPermissions();
}

/* =========================
   Debug Helper
========================= */

export async function getPermissionStatus(): Promise<PermissionStatus> {
  const sms = await ensureSmsPermission();
  const battery = await ensureBatteryOptimizationDisabled();
  const notifications = await ensureNotificationPermission();

  return {
    sms,
    batteryOptimization: battery,
    notifications,
  };
}
