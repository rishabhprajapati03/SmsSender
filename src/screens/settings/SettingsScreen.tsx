import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';

import {
  clearQueue,
  clearSentMessages,
} from '../../services/queue/queueManager';
import { AppConfig, getSmsLogsUrl } from '../../config';
import { styles } from './settings.style';

export default function SettingsScreen() {
  async function handleOpenAppSettings() {
    try {
      await Linking.openSettings();
    } catch (e) {
      console.error('Failed to open settings:', e);
    }
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

      {/* system actions */}
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
