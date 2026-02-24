import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  AppState,
} from 'react-native';

import {
  startSmsSync,
  stopSmsSync,
  getSmsSyncState,
} from '../services/smsSync/smsSyncManager';

import {
  canStartSmsSyncMode,
  openBatterySettings,
} from '../services/permissions';

import { getStats } from '../services/stats/statsService';
import { subscribeToQueue } from '../services/queue/queueManager';
import { subscribeToSyncState } from '../services/sync/syncState';

export default function DashboardScreen() {
  const [smsSyncEnabled, setSmsSyncEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const loadingRef = useRef(false);

  /* LOAD */

  async function loadData() {
    if (loadingRef.current) return;

    loadingRef.current = true;

    try {
      const [smsSyncState, appStats] = await Promise.all([
        getSmsSyncState(),
        getStats(),
      ]);

      setSmsSyncEnabled(smsSyncState.enabled);
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
      if (s === 'active') {
        loadData();
      }
    });

    return () => {
      unsubQueue();
      unsubSync();
      appSub.remove();
    };
  }, []);

  /*     TOGGLE */

  async function handleToggle(value: boolean) {
    if (value) {
      const check = await canStartSmsSyncMode();

      if (!check.allowed) {
        Alert.alert('Setup Required', check.reason || 'Setup incomplete', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: openBatterySettings,
          },
        ]);
        return;
      }

      try {
        await startSmsSync();
        await loadData();
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to start sync');
      }
    } else {
      try {
        await stopSmsSync();
        await loadData();
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to stop sync');
      }
    }
  }

  /*    LOADING */

  if (loading) {
    return (
      <View>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  /*  UI */

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Sync Toggle Card */}
      <View style={[styles.card, smsSyncEnabled && styles.cardActive]}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>SmsSync Service</Text>
            <Text
              style={[
                styles.statusText,
                { color: smsSyncEnabled ? '#2E7D32' : '#757575' },
              ]}
            >
              ● {smsSyncEnabled ? 'Running' : 'Paused'}
            </Text>
          </View>

          <Switch
            value={smsSyncEnabled}
            onValueChange={handleToggle}
            trackColor={{ false: '#D1D1D1', true: '#81C784' }}
            thumbColor={smsSyncEnabled ? '#2E7D32' : '#F4F4F4'}
          />
        </View>
      </View>

      {/* Queue Statistics */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Queue Activity</Text>
        <View style={styles.statsGrid}>
          <Stat label="Pending" value={stats?.pending} />
          <Stat label="Syncing" value={stats?.syncing} />
          <Stat label="Sent" value={stats?.sent} color="#2E7D32" />
          <Stat label="Failed" value={stats?.failed} color="#D32F2F" />
        </View>
      </View>

      {/* Sync Details */}
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
        <Info label="Total Processed" value={stats?.totalQueued || 0} />

        {stats?.lastError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{stats.lastError}</Text>
          </View>
        )}
      </View>

      {/* Inbox Summary */}
      <View style={styles.card}>
        <View style={styles.inboxRow}>
          <Text style={styles.cardTitle}>Device Inbox</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{stats?.inboxCount || 0} MSGS</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={loadData}
        activeOpacity={0.8}
      >
        <Text style={styles.refreshButtonText}>Refresh Data</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* COMPONENTS */
function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
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

function Info({ label, value }: { label: string; value: any }) {
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
    padding: 12,
  },
  header: {
    marginBottom: 24,
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
    shadowColor: '#070505',
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
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
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
  inboxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  badge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
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
  refreshButton: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
