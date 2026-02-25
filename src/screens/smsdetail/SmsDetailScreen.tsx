import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';

import { useRoute } from '@react-navigation/native';

import { getQueue, type QueuedSms } from '../../services/queue/queueManager';
import { styles } from './smsDetail.style';

/*   Types */

type RouteParams = {
  sms?: QueuedSms;
  id?: string;
};

/* Screen */

export default function SmsDetailScreen() {
  const route = useRoute();
  const { sms: initialSms, id } = (route.params || {}) as RouteParams;

  const [sms, setSms] = useState<QueuedSms | null>(initialSms ?? null);

  const [loading, setLoading] = useState(!initialSms);

  /* Load by ID (Deep Link) */

  useEffect(() => {
    if (!sms && id) {
      loadFromQueue(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadFromQueue(id: string) {
    try {
      setLoading(true);

      const queue = await getQueue();

      const found = queue.find(m => m.id === id);

      if (found) {
        setSms(found);
      }
    } finally {
      setLoading(false);
    }
  }

  /*
   Render */

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#007AFF" />
      </View>
    );
  if (!sms)
    return (
      <View style={styles.center}>
        <Text>Message not found</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.dateDivider}>
          {new Date(sms.timestamp).toLocaleDateString([], {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })}
        </Text>

        {/* The SMS Bubble */}
        <View style={styles.bubbleContainer}>
          <View style={styles.bubble}>
            <Text style={styles.bodyText}>{sms.body}</Text>
          </View>

          {/* Subtle Metadata Row */}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {new Date(sms.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Text style={styles.metaDot}> • </Text>
            <Text
              style={[styles.metaText, { color: getStatusColor(sms.status) }]}
            >
              {sms.status === 'sent' ? 'Delivered' : sms.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Secondary Info (Minimal) */}
        <View style={styles.footerInfo}>
          <Text style={styles.idText}>ID: {sms.id.split('-')[0]}...</Text>
          {sms.retryCount > 0 && (
            <Text style={styles.idText}>Retries: {sms.retryCount}</Text>
          )}
        </View>

        {/* Error - only shows if it exists */}
        {sms.lastError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠ {sms.lastError}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
const getStatusColor = (status: string) => {
  if (status === 'sent') return '#34C759'; // iOS Green
  if (status === 'failed') return '#FF3B30'; // iOS Red
  return '#8E8E93';
};
