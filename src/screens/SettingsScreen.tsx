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
import { clearQueue, clearSentMessages } from '../services/queue/queueManager';
import { AppConfig, getSmsLogsUrl } from '../config';

export default function SettingsScreen() {
  async function handleOpenAppSettings() {
    await openAppSettings();
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
  async function handleClearSent() {
    Alert.alert(
      'Clear Sent Messages',
      'Remove all successfully synced messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: async () => {
            try {
              const removed = await clearSentMessages();

              Alert.alert('Done', `${removed} messages removed`);
            } catch {
              Alert.alert('Error', 'Operation failed');
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* API Configuration Card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>API Configuration</Text>

        <SettingRow
          label="Base URL"
          value={AppConfig.supabase.url || 'Not configured'}
        />
        <SettingRow label="Endpoint" value={getSmsLogsUrl()} />
        <SettingRow
          label="Access Key"
          value={
            AppConfig.supabase.anonKey ? '••••••••••••••••' : 'Not configured'
          }
          isLast
        />
      </View>

      {/* System Actions Card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>System Actions</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleOpenAppSettings}
        >
          <Text style={styles.actionButtonText}>Open Device Permissions</Text>
          <Text style={styles.actionButtonSubtext}>
            Manage SMS and Notification access
          </Text>
        </TouchableOpacity>

        <View style={styles.separator} />

        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleClearQueue}
        >
          <Text style={styles.dangerButtonText}>Clear Message Queue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerButton} onPress={handleClearSent}>
          <Text style={styles.dangerButtonText}>Clear Synced Messages</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SettingRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !isLast && styles.infoBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">
        {value}
      </Text>
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
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  infoRow: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  infoBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  actionButtonSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
  dangerButton: {
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  dangerButtonText: {
    color: '#B91C1C',
    fontSize: 15,
    fontWeight: '700',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 10,
  },
});
