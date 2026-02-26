import { SmsSyncBridge } from '../native/SmsSyncBridge';

/* import Inbox */

export async function importInbox(limit = 500): Promise<number> {
  try {
    console.log('[SMS] Importing inbox, limit:', limit);

    const importedCount = await SmsSyncBridge.importExistingSms(limit);

    console.log('[SMS] Import complete. Imported:', importedCount);

    return importedCount;
  } catch (error) {
    console.error('[SMS] Import failed:', error);
    throw error;
  }
}

/*  toDo*/
export async function getInboxCount(): Promise<number> {
  return 0;
}
