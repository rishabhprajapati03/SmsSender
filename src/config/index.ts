import Config from 'react-native-config';

const rawUrl =
  Config.SUPABASE_URL || 'https://bacqmtevintazwvfnaga.supabase.co';
const rawKey =
  Config.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhY3FtdGV2aW50YXp3dmZuYWdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzcwMjQsImV4cCI6MjA4NzE1MzAyNH0.t-dINFZTNSoFn0MXAoMyJMgC8GDrOiwWyjKBhnxp22U';

export const AppConfig = {
  supabase: {
    url: rawUrl,
    anonKey: rawKey,
  },
  api: {
    timeout: Number(Config.API_TIMEOUT) || 30000,
  },
  queue: {
    batchSize: Number(Config.QUEUE_BATCH_SIZE) || 20,
    maxSize: Number(Config.QUEUE_MAX_SIZE) || 10000,
  },
  sync: {
    intervalMs: Number(Config.SYNC_INTERVAL_MS) || 6000,
  },
};

export function getSmsLogsUrl(): string {
  return `${AppConfig.supabase.url}/rest/v1/sms_logs`;
}
