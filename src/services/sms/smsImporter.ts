import { getSMSList } from 'react-native-sms-module';
import { addToQueue } from '../queue/queueManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INBOX_COUNT_KEY = 'inbox_count';
const LAST_IMPORTED_TS_KEY = 'last_imported_timestamp';

/* ===============================
   IMPORT
================================ */

export async function importInbox(limit = 500): Promise<number> {
  try {
    console.log('[SMS] Importing inbox, limit:', limit);

    const lastImportedTsRaw = await AsyncStorage.getItem(LAST_IMPORTED_TS_KEY);
    const lastImportedTs = lastImportedTsRaw ? Number(lastImportedTsRaw) : 0;

    const messages = await getSMSList(0, limit, {});
    console.log('[SMS] Found', messages.length, 'messages');

    let importedCount = 0;
    let maxTimestamp = lastImportedTs;

    for (const sms of messages) {
      try {
        const smsTimestamp = Number(sms.timestamp) || 0;

        // Skip already imported messages
        if (smsTimestamp <= lastImportedTs) {
          continue;
        }

        await addToQueue(sms);

        importedCount++;

        if (smsTimestamp > maxTimestamp) {
          maxTimestamp = smsTimestamp;
        }
      } catch (error) {
        console.error('[SMS] Failed to add:', sms.id, error);
      }
    }

    // Save latest timestamp checkpoint
    await AsyncStorage.setItem(LAST_IMPORTED_TS_KEY, String(maxTimestamp));

    await AsyncStorage.setItem(INBOX_COUNT_KEY, String(messages.length));

    console.log('[SMS] Import complete. New imported:', importedCount);

    return importedCount;
  } catch (error) {
    console.error('[SMS] Import failed:', error);
    throw error;
  }
}

/* ===============================
   COUNT
================================ */

export async function getInboxCount(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(INBOX_COUNT_KEY);
    return value ? Number(value) : 0;
  } catch {
    return 0;
  }
}
