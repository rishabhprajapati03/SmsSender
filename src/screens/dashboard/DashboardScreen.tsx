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
} from 'react-native';

import {
  startSmsSync,
  stopSmsSync,
  getSmsSyncState,
  isSmsSyncRunning,
} from '../../services/smsSync/smsSyncManager';

import {
  canStartSmsSyncMode,
  openBatterySettings,
} from '../../services/permissions';

import { getStats } from '../../services/stats/statsService';
import { subscribeToQueue } from '../../services/queue/queueManager';
import { subscribeToSyncState } from '../../services/sync/syncState';
import { importInbox } from '../../services/sms/smsImporter';
import { syncQueue } from '../../services/sync/syncManager';
import { styles } from './dashboard.style';

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
