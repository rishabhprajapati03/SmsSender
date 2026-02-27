import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { restoreSmsSyncIfNeeded } from '../smsSync/smsSyncManager';
import { SmsSyncBridge } from '../native/SmsSyncBridge';
import { AppConfig } from '../../config';
import { checkPermissionsGranted, requestRequiredPermissions } from '../permissions/runtimePermissions';

const APP_INIT_KEY = 'APP_INITIALIZED_V1';
const PERMISSIONS_REQUESTED_KEY = 'PERMISSIONS_REQUESTED_V1';

let isInitializing = false;

/* INIT */

export async function initializeApp(): Promise<void> {
  // In-memory guard (fast)
  if (isInitializing) {
    console.log('[App] Init already running (memory)');
    return;
  }

  isInitializing = true;

  try {
    // Persistent guard
    const alreadyInit = await AsyncStorage.getItem(APP_INIT_KEY);

    if (alreadyInit === '1') {
      console.log('[App] Already initialized (storage)');
      
      // Ensure foreground service is running if sync was enabled
      await SmsSyncBridge.ensureServiceRunning();

      // Validate permissions and auto-disable if revoked
      const result = await SmsSyncBridge.validatePermissionsAndAutoDisable();
      if (result.autoDisabled) {
        Alert.alert(
          'SMS Sync Disabled',
          'SMS Sync was automatically disabled because required permissions were revoked. Please grant permissions and enable sync again.',
          [{ text: 'OK' }]
        );
      }
      
      return;
    }

    console.log('[App] Initializing...');

    // Save API config to native SharedPreferences
    await SmsSyncBridge.saveApiConfig(
      AppConfig.supabase.url,
      AppConfig.supabase.anonKey,
    );

    // Request permissions on first launch (only if not already granted)
    const permissionsRequested = await AsyncStorage.getItem(PERMISSIONS_REQUESTED_KEY);
    if (!permissionsRequested) {
      console.log('[App] First launch - checking permissions');
      
      // Check if already granted (avoid unnecessary prompt)
      const alreadyGranted = await checkPermissionsGranted();
      
      if (alreadyGranted) {
        // Already granted - mark as done
        await AsyncStorage.setItem(PERMISSIONS_REQUESTED_KEY, '1');
        console.log('[App] Permissions already granted');
      } else {
        // Request permissions
        const result = await requestRequiredPermissions();
        
        // CRITICAL: Only set key if permissions were granted
        // If denied, do NOT set key to allow future attempts
        if (result.granted) {
          await AsyncStorage.setItem(PERMISSIONS_REQUESTED_KEY, '1');
          console.log('[App] Permissions granted on first request');
        } else {
          console.log('[App] Permissions denied - will request again on next launch');
        }
      }
    }

    // Ensure foreground service is running if sync was enabled
    await SmsSyncBridge.ensureServiceRunning();

    // Validate permissions and auto-disable if revoked
    const result = await SmsSyncBridge.validatePermissionsAndAutoDisable();
    if (result.autoDisabled) {
      Alert.alert(
        'SMS Sync Disabled',
        'SMS Sync was automatically disabled because required permissions were revoked. Please grant permissions and enable sync again.',
        [{ text: 'OK' }]
      );
    }

    // Non-blocking (safe async)
    restoreSmsSyncIfNeeded().catch(e =>
      console.error('[App] SmsSync restore failed:', e),
    );

    // Mark done
    await AsyncStorage.setItem(APP_INIT_KEY, '1');

    console.log('[App] Initialization complete');
  } catch (error) {
    console.error('[App] Initialization failed:', error);
  } finally {
    isInitializing = false;
  }
}
