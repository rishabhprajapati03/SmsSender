import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';

import {
  getPermissionStatus,
  recheckPermissions,
} from '../services/permissions/permissionService';

import { stopDuty } from '../services/dutyService';
import { setDutyState } from '../services/dutyState';

export default function SettingsScreen() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    const s = await getPermissionStatus();

    setStatus(s);
    setLoading(false);
  }

  async function resetDuty() {
    await stopDuty();
    await setDutyState(false);

    console.log('Duty stopped'); /// alert here
  }

  if (loading || !status) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>System Settings</Text>

      <Text style={styles.item}>
        SMS: {status.sms ? '✅ Allowed' : '❌ Denied'}
      </Text>

      <Text style={styles.item}>
        Battery Optimization:{' '}
        {status.batteryOptimization ? '✅ Ok' : '❌ Restricted'}
      </Text>

      <Text style={styles.item}>
        Notifications: {status.notifications ? '✅ Allowed' : '❌ Denied'}
      </Text>

      <View style={styles.buttons}>
        <Button title="Recheck Permissions" onPress={recheckPermissions} />

        <Button title="Stop Duty Mode" color="red" onPress={resetDuty} />

        <Button title="Reload Status" onPress={load} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  item: {
    fontSize: 15,
    marginBottom: 10,
  },

  buttons: {
    marginTop: 20,
    gap: 12,
  },
});
