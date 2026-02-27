import { PermissionsAndroid, Platform } from 'react-native';

export interface PermissionResult {
  granted: boolean;
  permanentlyDenied: boolean;
}

export async function requestRequiredPermissions(): Promise<PermissionResult> {
  if (Platform.OS !== 'android') {
    return { granted: false, permanentlyDenied: false };
  }

  try {
    const permissions = [
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    ];

    // Add POST_NOTIFICATIONS for Android 13+
    if (Platform.Version >= 33) {
      permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    const results = await PermissionsAndroid.requestMultiple(permissions);

    // Check if all permissions granted
    const allGranted = Object.values(results).every(
      result => result === PermissionsAndroid.RESULTS.GRANTED
    );

    if (allGranted) {
      return { granted: true, permanentlyDenied: false };
    }

    // Check if any permission is permanently denied (never ask again)
    const anyPermanentlyDenied = Object.values(results).some(
      result => result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
    );

    return {
      granted: false,
      permanentlyDenied: anyPermanentlyDenied,
    };
  } catch (error) {
    console.error('[Permissions] Request failed:', error);
    return { granted: false, permanentlyDenied: false };
  }
}

export async function checkPermissionsGranted(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const readSms = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_SMS
    );

    const receiveSms = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS
    );

    let postNotifications = true;
    if (Platform.Version >= 33) {
      postNotifications = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
    }

    return readSms && receiveSms && postNotifications;
  } catch (error) {
    console.error('[Permissions] Check failed:', error);
    return false;
  }
}
