import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  AppState,
  StyleSheet,
} from 'react-native';

import {
  startSmsSync,
  stopSmsSync,
  getSmsSyncState,
  isSmsSyncRunning,
} from '../services/smsSync/smsSyncManager';

import {
  canStartSmsSyncMode,
  openBatterySettings,
} from '../services/permissions';

import { getStats } from '../services/stats/statsService';
import { subscribeToQueue } from '../services/queue/queueManager';
import { subscribeToSyncState } from '../services/sync/syncState';
import { importInbox } from '../services/sms/smsImporter';
import { syncQueue } from '../services/sync/syncManager';

export default function DashboardScreen() {
  const [enabled, setEnabled] = useState(false);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  const loadingRef = useRef(false);

  /* LOAD */

  async function loadData() {
    if (loadingRef.current) return;

    loadingRef.current = true;

    try {
      const [state, appStats] = await Promise.all([
        getSmsSyncState(),
        getStats(),
      ]);

      setEnabled(state.enabled);
      setRunning(isSmsSyncRunning());
      setStats(appStats);
    } catch (e) {
      console.error('[Dashboard] Load failed:', e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  /* INIT */

  useEffect(() => {
    loadData();

    const unsubQueue = subscribeToQueue(loadData);
    const unsubSync = subscribeToSyncState(loadData);

    const appSub = AppState.addEventListener('change', s => {
      if (s === 'active') loadData();
    });

    return () => {
      unsubQueue();
      unsubSync();
      appSub.remove();
    };
  }, []);

  /* TOGGLE LIVE SYNC */

  async function handleToggle(value: boolean) {
    if (value) {
      const check = await canStartSmsSyncMode();

      if (!check.allowed) {
        Alert.alert('Setup Required', check.reason || '', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openBatterySettings },
        ]);
        return;
      }

      try {
        await startSmsSync();
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to start sync');
      }
    } else {
      try {
        await stopSmsSync();
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to stop sync');
      }
    }

    await loadData();
  }

  /* MANUAL IMPORT */

  async function handleImportInbox() {
    Alert.alert(
      'Import Old Messages',
      'This will import existing SMS into the queue. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'destructive',
          onPress: async () => {
            try {
              setImporting(true);
              const count = await importInbox(1000);
              Alert.alert('Done', `Imported ${count} messages`);
            } catch {
              Alert.alert('Error', 'Import failed');
            } finally {
              setImporting(false);
              loadData();
            }
          },
        },
      ],
    );
  }

  /* RETRY FAILED */

  async function handleRetryFailed() {
    try {
      await syncQueue();
      await loadData();

      Alert.alert('Success', 'Retry started');
    } catch {
      Alert.alert('Error', 'Retry failed');
    }
  }

  /* LOADING */

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  /* UI */

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* SERVICE STATUS */}
      <View style={[styles.card, enabled && styles.cardActive]}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>SmsSync Service</Text>
            <Text
              style={[
                styles.statusText,
                { color: running ? '#2E7D32' : '#D32F2F' },
              ]}
            >
              ● {running ? 'Running' : 'Stopped'}
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            trackColor={{ false: '#D1D1D1', true: '#81C784' }}
            thumbColor={enabled ? '#2E7D32' : '#F4F4F4'}
          />
        </View>
      </View>

      {/* QUEUE STATS GRID */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Queue Activity</Text>
        <View style={styles.statsGrid}>
          <Stat label="Pending" value={stats?.pending} />
          <Stat label="Syncing" value={stats?.syncing} />
          <Stat label="Sent" value={stats?.sent} color="#2E7D32" />
          <Stat label="Failed" value={stats?.failed} color="#D32F2F" />
        </View>
      </View>

      {/* SYNC INFO */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Sync Details</Text>
        <Info
          label="Last Sync"
          value={
            stats?.lastSync
              ? new Date(stats.lastSync).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Never'
          }
        />
        <Info label="Total Processed" value={stats?.sent || 0} />
        {stats?.lastError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{stats.lastError}</Text>
          </View>
        )}
      </View>

      {/* ACTIONS */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.importButton}
          onPress={handleImportInbox}
          disabled={importing}
        >
          <Text style={styles.importButtonText}>
            {importing ? 'Importing...' : 'Import Device Inbox'}
          </Text>
        </TouchableOpacity>

        {stats?.failed > 0 && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetryFailed}
          >
            <Text style={styles.retryButtonText}>
              Retry Failed ({stats.failed})
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

/* HELPERS */

function Stat({ label, value, color }: any) {
  return (
    <View style={styles.statItem}>
      <Text
        style={[styles.statValue, color ? { color } : { color: '#1A1A1A' }]}
      >
        {value || 0}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Info({ label, value }: any) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  divider: {
    height: 4,
    width: 40,
    backgroundColor: '#2196F3',
    marginTop: 8,
    borderRadius: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardActive: {
    borderColor: '#A5D6A7',
    backgroundColor: '#F1F8E9',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flex: { flex: 1 },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    color: '#6B7280',
    fontSize: 14,
  },
  infoValue: {
    fontWeight: '600',
    color: '#111827',
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
  },
  actionButton: {
    backgroundColor: '#',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: '#EEF2FF',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },

  retryButtonText: {
    color: '#4338CA',
    fontWeight: '600',
    fontSize: 14,
  },
  dangerButton: {
    backgroundColor: '#FFF1F1',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  dangerButtonText: {
    color: '#D32F2F',
    fontWeight: '600',
    fontSize: 14,
  },
  importButton: {
    backgroundColor: '#303030',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
