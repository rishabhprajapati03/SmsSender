import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { getQueue, QueuedSms } from '../utils/smsQueue';

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { subscribeQueue } from '../utils/smsQueue';

/* =========================
   Screen
========================= */

export default function MessagesScreen() {
  const [data, setData] = useState<QueuedSms[]>([]);
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation<any>();
  useEffect(() => {
    const unsub = subscribeQueue(load);

    return unsub;
  }, []);

  /* =========================
   Load
========================= */

  const load = async () => {
    try {
      setLoading(true);

      const q = await getQueue();

      // newest first
      q.sort((a, b) => b.createdAt - a.createdAt);

      setData(q);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
   Reload On Focus
========================= */

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

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

  if (!data.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No messages yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={i => i.id}
        refreshing={loading}
        onRefresh={load}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('MessagesTab', {
                screen: 'SmsDetail',
                params: {
                  sms: item,
                  id: item.id,
                },
              })
            }
            style={styles.item}
          >
            <Text style={styles.sender}>{item.sender || 'Unknown'}</Text>

            <Text numberOfLines={1} style={styles.body}>
              {item.body}
            </Text>

            <View style={styles.footer}>
              <Text style={styles.status}>{item.status.toUpperCase()}</Text>

              <Text style={styles.time}>
                {new Date(item.timestamp).toLocaleString()}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

/* =========================
   Styles
========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  empty: {
    fontSize: 16,
    color: '#666',
  },

  item: {
    borderBottomWidth: 1,
    borderColor: '#eee',
    padding: 12,
  },

  sender: {
    fontWeight: 'bold',
    marginBottom: 2,
  },

  body: {
    color: '#333',
  },

  footer: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  status: {
    fontSize: 11,
    fontWeight: '600',
    color: '#444',
  },

  time: {
    fontSize: 11,
    color: '#777',
  },
});
