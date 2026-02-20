import { useEffect, useState } from 'react';
import { getStats, invalidateStatsCache } from '../services/stats/statsService';
import { subscribeQueue } from '../utils/smsQueue';

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

    const unsub = subscribeQueue(load);

    return unsub;
  }, []);

  return { stats, loading, refresh: load };
}
