import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { restoreSmsSyncIfNeeded } from '../smsSync/smsSyncManager';
import { SmsSyncBridge } from '../native/SmsSyncBridge';
import { AppConfig } from '../../config';

const APP_INIT_KEY = 'APP_INITIALIZED_V1';

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
