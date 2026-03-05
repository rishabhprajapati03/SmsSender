import { SmsSyncBridge } from '../native/SmsSyncBridge';

/* Triggers native WorkManager to upload pending queue */

export async function syncQueue(): Promise<void> {
  try {
    console.log('[Sync] Triggering native upload...');
    await SmsSyncBridge.triggerUpload();
    console.log('[Sync] Upload triggered');
  } catch (error) {
    console.error('[Sync] Failed:', error);
  }
}
