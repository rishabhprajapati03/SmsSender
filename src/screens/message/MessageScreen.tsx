import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import {
  getQueue,
  type QueuedSms,
} from '../../services/queue/queueManager';

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { styles } from './message.style';

/*
   Screen */

export default function MessagesScreen() {
  const [data, setData] = useState<QueuedSms[]>([]);
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation<any>();

  useEffect(() => {
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  /*
   Load */

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

  /*
   Reload On Focus */

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  /*
   Render */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#007AFF" />
      </View>
    );
  }

  if (!data.length) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyCircle}>
          <Text style={styles.emptyIcon}>✉️</Text>
        </View>
        <Text style={styles.emptyTitle}>No messages yet</Text>
        <Text style={styles.emptySubtitle}>
          Your synced messages will appear here.
        </Text>
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
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('MessagesTab', {
                screen: 'SmsDetail',
                params: { sms: item, id: item.id },
              })
            }
            style={styles.item}
          >
            {/* Avatar Circle */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.sender || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.itemBody}>
              <View style={styles.itemHeader}>
                <Text style={styles.sender} numberOfLines={1}>
                  {item.sender || 'Unknown'}
                </Text>
              </View>

              <Text numberOfLines={2} style={styles.bodyText}>
                {item.body}
              </Text>

              <View style={styles.footer}>
                <View style={[styles.statusPill, getStatusBg(item.status)]}>
                  <Text
                    style={[styles.statusText, getStatusTextStyle(item.status)]}
                  >
                    {item.status.toUpperCase()}
                  </Text>
                </View>

                {item.retryCount > 0 && (
                  <View style={styles.retryBadge}>
                    <Text style={styles.retryText}>
                      Retry {item.retryCount}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
function getStatusTextStyle(status: string) {
  switch (status) {
    case 'sent':
      return { color: '#2E7D32' };
    case 'failed':
      return { color: '#D32F2F' };
    case 'syncing':
      return { color: '#007AFF' };
    default:
      return { color: '#666' };
  }
}

function getStatusBg(status: string) {
  switch (status) {
    case 'sent':
      return { backgroundColor: '#E8F5E9' };
    case 'failed':
      return { backgroundColor: '#FFEBEE' };
    case 'syncing':
      return { backgroundColor: '#E3F2FD' };
    default:
      return { backgroundColor: '#F5F5F5' };
  }
}
