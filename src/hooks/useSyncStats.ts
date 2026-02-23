import { useEffect, useState } from 'react';
import { getStats, invalidateStatsCache } from '../services/stats/statsService';
import { subscribeToQueue } from '../services/queue/queueManager';

export function useSyncStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    invalidateStatsCache();
    const s = await getStats();
    setStats(s);
    setLoading(false);
  }

  useEffect(() => {
    load();

    const unsub = subscribeToQueue(load);

    return unsub;
  }, []);

  return { stats, loading, refresh: load };
}
