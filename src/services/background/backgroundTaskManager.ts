import BackgroundFetch from 'react-native-background-fetch';
import { syncQueue } from '../sync/syncManager';

let isConfigured = false;

export async function initializeBackgroundTasks(): Promise<void> {
  if (isConfigured) return;

  try {
    console.log('[Background] Configuring...');

    await BackgroundFetch.configure(
      {
        minimumFetchInterval: 15,
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,
        requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
        requiresCharging: false,
        requiresBatteryNotLow: false,
        requiresDeviceIdle: false,
        forceAlarmManager: false,
      },
      async (taskId: string) => {
        console.log('[Background] Task triggered:', taskId);
        try {
          await syncQueue();
        } catch (error) {
          console.error('[Background] Sync failed:', error);
        } finally {
          BackgroundFetch.finish(taskId);
        }
      },
      (taskId: string) => {
        console.error('[Background] Task timeout:', taskId);
        BackgroundFetch.finish(taskId);
      },
    );

    await BackgroundFetch.start();
    isConfigured = true;

    console.log('[Background] Initialized');
  } catch (error) {
    console.error('[Background] Init failed:', error);
    throw error;
  }
}
