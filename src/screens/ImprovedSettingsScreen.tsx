import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

import { openAppSettings } from '../services/permissions';
import { stopDuty } from '../services/duty/dutyManager';
import { clearQueue } from '../services/queue/queueManager';
import { AppConfig, getSmsLogsUrl } from '../config';

export default function ImprovedSettingsScreen() {
  async function handleOpenAppSettings() {
    await openAppSettings();
  }

  async function handleStopDuty() {
    Alert.alert('Stop Duty Mode', 'Are you sure you want to stop duty mode?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: async () => {
          try {
            await stopDuty();
            Alert.alert('Success', 'Duty mode stopped');
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  }

  async function handleClearQueue() {
    Alert.alert(
      'Clear Queue',
      'This will delete all queued messages. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearQueue();
              Alert.alert('Success', 'Queue cleared');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      {/* API Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Configuration</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Base URL:</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {AppConfig.supabase.url || 'Not configured'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Endpoint:</Text>
          <Text style={styles.infoValue} numberOfLines={2}>
            {getSmsLogsUrl()}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Key:</Text>
          <Text style={styles.infoValue}>
            {AppConfig.supabase.anonKey ? '••••••••' : 'Not configured'}
          </Text>
        </View>
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <TouchableOpacity style={styles.buttonDanger} onPress={handleStopDuty}>
          <Text style={styles.buttonDangerText}>Stop Duty Mode</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonDanger}
          onPress={handleClearQueue}
        >
          <Text style={styles.buttonDangerText}>Clear Queue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={handleOpenAppSettings}
        >
          <Text style={styles.buttonSecondaryText}>Open App Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  permissionLabel: {
    fontSize: 16,
    color: '#333',
  },
  permissionStatus: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '500',
  },
  granted: {
    color: '#4CAF50',
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 4,
    marginTop: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  buttonSecondaryText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDanger: {
    backgroundColor: '#F44336',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDangerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logsBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
    maxHeight: 200,
  },
  logEntry: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
