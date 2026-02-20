import React, { useEffect, useState } from 'react';
import { View, Text, Button, Switch, StyleSheet } from 'react-native';

import { useSyncStats } from '../hooks/useSyncStats';
import { importInbox } from '../services/sms/smsService';

import { startDuty, stopDuty, isOnDuty } from '../services/dutyService';

import { getDutyState, setDutyState } from '../services/dutyState';
import { ensureAllPermissions } from '../services/permissions/permissionService';

export default function HomeScreen() {
  const { stats, loading, refresh } = useSyncStats();

  const [onDuty, setOnDuty] = useState(false);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    importInbox();

    const saved = await getDutyState();
    const running = await isOnDuty();

    if (saved && !running) {
      await startDuty();
    }

    setOnDuty(saved);
  }

  async function toggle(value: boolean) {
    if (value) {
      const allowed = await ensureAllPermissions();
      if (!allowed.sms) return;
    }

    setOnDuty(value);
    await setDutyState(value);

    if (value) {
      await startDuty();
    } else {
      await stopDuty();
    }
  }

  if (loading || !stats) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>System Status</Text>

      <View style={styles.row}>
        <Text>On Duty</Text>

        <Switch value={onDuty} onValueChange={toggle} />
      </View>

      <Text>Inbox: {stats.inboxCount}</Text>
      <Text>Pending: {stats.pending}</Text>
      <Text>Failed: {stats.failed}</Text>
      <Text>Sent: {stats.sent}</Text>

      <Button title="Refresh" onPress={refresh} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
});
