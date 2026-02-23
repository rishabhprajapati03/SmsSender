import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

import { useRoute } from '@react-navigation/native';

import { getQueue, type QueuedSms } from '../services/queue/queueManager';

/* =========================
   Types
========================= */

type RouteParams = {
  sms?: QueuedSms;
  id?: string;
};

/* =========================
   Screen
========================= */

export default function SmsDetailScreen() {
  const route = useRoute();
  const { sms: initialSms, id } = (route.params || {}) as RouteParams;

  const [sms, setSms] = useState<QueuedSms | null>(initialSms ?? null);

  const [loading, setLoading] = useState(!initialSms);

  /* =========================
   Load by ID (Deep Link)
========================= */

  useEffect(() => {
    if (!sms && id) {
      loadFromQueue(id);
    }
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

  /* =========================
   Render
========================= */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!sms) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Message not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sender}>From: {sms.sender || 'Unknown'}</Text>

      <Text style={styles.body}>{sms.body}</Text>

      <Text style={styles.time}>
        {new Date(sms.timestamp).toLocaleString()}
      </Text>

      <Text style={styles.status}>Status: {sms.status}</Text>

      {sms.retryCount > 0 && (
        <Text style={styles.retry}>Retry Count: {sms.retryCount}</Text>
      )}

      {sms.lastError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Error:</Text>
          <Text style={styles.error}>{sms.lastError}</Text>
        </View>
      )}

      {sms.syncedAt && (
        <Text style={styles.info}>
          Synced: {new Date(sms.syncedAt).toLocaleString()}
        </Text>
      )}
    </View>
  );
}

/* =========================
   Styles
========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sender: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
  },

  body: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 24,
  },

  time: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },

  status: {
    fontSize: 12,
    color: '#333',
    marginBottom: 8,
  },

  retry: {
    fontSize: 12,
    color: '#FF9800',
    marginBottom: 8,
  },

  info: {
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 8,
  },

  errorBox: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 4,
    marginTop: 8,
  },

  errorTitle: {
    fontWeight: 'bold',
    color: '#C62828',
    marginBottom: 4,
  },

  error: {
    color: '#C62828',
  },
});
