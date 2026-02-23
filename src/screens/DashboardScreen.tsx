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
  startDuty,
  stopDuty,
  getDutyState,
} from '../services/duty/dutyManager';

import {
  canStartDutyMode,
  type PermissionStatus,
} from '../services/permissions';

import { getStats } from '../services/stats/statsService';
import { subscribeToQueue } from '../services/queue/queueManager';
import { subscribeToSyncState } from '../services/sync/syncState';

export default function DashboardScreen() {
  const [dutyEnabled, setDutyEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus | null>(null);

  const loadingRef = useRef(false);

  /* 
     LOAD
   */

  async function loadData() {
    if (loadingRef.current) return;

    loadingRef.current = true;

    try {
      const [dutyState, appStats] = await Promise.all([
        getDutyState(),
        getStats(),
      ]);

      setDutyEnabled(dutyState.enabled);
      setStats(appStats);
    } catch (error) {
      console.error('[Dashboard] Load failed:', error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  /* 
     INIT
   */

  useEffect(() => {
    loadData();

    // Queue updates
    const unsubQueue = subscribeToQueue(loadData);

    // Sync updates
    const unsubSync = subscribeToSyncState(loadData);

    // App foreground refresh
    const subApp = AppState.addEventListener('change', state => {
      if (state === 'active') {
        loadData();
      }
    });

    return () => {
      unsubQueue();
      unsubSync();
      subApp.remove();
    };
  }, []);

  /* 
     DUTY TOGGLE
   */

  async function handleDutyToggle(value: boolean) {
    if (value) {
      const check = await canStartDutyMode();

      if (!check.allowed) {
        Alert.alert(
          'Permission Required',
          check.reason || 'Required permissions are missing',
          [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings' }],
        );
        return;
      }

      setPermissionStatus(check.status);

      try {
        await startDuty();
        await loadData();

        console.log('[Dashboard] Duty started');
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'Failed to start duty');
      }
    } else {
      try {
        await stopDuty();
        await loadData();

        console.log('[Dashboard] Duty stopped');
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'Failed to stop duty');
      }
    }
  }

  /* 
     LOADING
   */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  /* 
     UI
   */

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dashboard</Text>

      {/* Duty Mode */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>Duty Mode</Text>
            <Text style={styles.cardSubtitle}>
              {dutyEnabled ? 'Active - Listening for SMS' : 'Inactive'}
            </Text>
          </View>

          <Switch
            value={dutyEnabled}
            onValueChange={handleDutyToggle}
            trackColor={{ false: '#ccc', true: '#4CAF50' }}
            thumbColor={dutyEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Queue */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Queue Status</Text>

        <View style={styles.statsGrid}>
          <Stat label="Pending" value={stats?.pending} />
          <Stat label="Syncing" value={stats?.syncing} />
          <Stat label="Sent" value={stats?.sent} color="#4CAF50" />
          <Stat label="Failed" value={stats?.failed} color="#F44336" />
        </View>
      </View>

      {/* Sync */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sync Status</Text>

        <Info
          label="Last Sync"
          value={
            stats?.lastSync
              ? new Date(stats.lastSync).toLocaleString()
              : 'Never'
          }
        />

        <Info label="Total Synced" value={stats?.totalQueued} />

        {stats?.lastError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Error: {stats.lastError}</Text>
          </View>
        )}
      </View>

      {/* Inbox */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Inbox</Text>

        <Info label="Messages" value={stats?.inboxCount} />
      </View>
      <Text>Hello</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/*   COMPONENTS
 */

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
      <Text style={[styles.statValue, color && { color }]}>{value || 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

/* 
   STYLES
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flex: { flex: 1 },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  statItem: { alignItems: 'center' },

  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },

  statLabel: {
    fontSize: 12,
    color: '#666',
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  infoLabel: {
    color: '#666',
  },

  infoValue: {
    fontWeight: '500',
  },

  errorText: {
    color: '#F44336',
  },

  errorBox: {
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 4,
  },

  refreshButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
  },

  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
