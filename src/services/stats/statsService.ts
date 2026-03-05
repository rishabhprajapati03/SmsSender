import { getQueueStats } from '../queue/queueManager';

export interface SyncStats {
  pending: number;
  syncing: number;
  failed: number;
  sent: number;
}

export async function getStats(): Promise<SyncStats> {
  const queueStats = await getQueueStats();

  return {
    pending: queueStats.pending,
    syncing: queueStats.syncing,
    failed: queueStats.failed,
    sent: queueStats.sent,
  };
}
