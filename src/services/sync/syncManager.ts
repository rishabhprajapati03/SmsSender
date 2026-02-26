import AsyncStorage from '@react-native-async-storage/async-storage';
import { SmsSyncBridge } from '../native/SmsSyncBridge';

/* STORAGE KEYS */

const SYNC_META_KEY = 'sync_metadata';

/* TYPES */

interface SyncMetadata {
  lastSync: number | null;
  lastError: string | null;
  totalSynced: number;
}

/* METADATA */

async function loadSyncMetadata(): Promise<SyncMetadata> {
  try {
    const data = await AsyncStorage.getItem(SYNC_META_KEY);

    if (data) return JSON.parse(data);
  } catch (error) {
    console.error('[Sync] Failed to load metadata:', error);
  }

  return {
    lastSync: null,
    lastError: null,
    totalSynced: 0,
  };
}

async function saveSyncMetadata(metadata: SyncMetadata): Promise<void> {
  try {
    await AsyncStorage.setItem(SYNC_META_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error('[Sync] Failed to save metadata:', error);
  }
}

/* MAIN SYNC - Now just triggers native WorkManager */

export async function syncQueue(): Promise<void> {
  try {
    console.log('[Sync] Triggering native upload...');

    await SmsSyncBridge.triggerUpload();

    const metadata = await loadSyncMetadata();
    metadata.lastSync = Date.now();
    metadata.lastError = null;
    await saveSyncMetadata(metadata);

    console.log('[Sync] Upload triggered');
  } catch (error: any) {
    console.error('[Sync] Failed:', error);

    const metadata = await loadSyncMetadata();
    metadata.lastError = error?.message || 'Unknown error';
    await saveSyncMetadata(metadata);
  }
}

/* PUBLIC */

export async function getSyncMetadata(): Promise<SyncMetadata> {
  return await loadSyncMetadata();
}
