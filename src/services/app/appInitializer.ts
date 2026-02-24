import AsyncStorage from '@react-native-async-storage/async-storage';

import { initializePermissions } from '../permissions';
import { initializeBackgroundTasks } from '../background/backgroundTaskManager';
import { restoreSmsSyncIfNeeded } from '../smsSync/smsSyncManager';

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
      return;
    }

    console.log('[App] Initializing...');

    // Blocking (must succeed)
    await initializePermissions();
    await initializeBackgroundTasks();

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
