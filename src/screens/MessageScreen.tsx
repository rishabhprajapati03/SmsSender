import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import {
  getQueue,
  subscribeToQueue,
  type QueuedSms,
} from '../services/queue/queueManager';

import { useFocusEffect, useNavigation } from '@react-navigation/native';

/*
   Screen */

export default function MessagesScreen() {
  const [data, setData] = useState<QueuedSms[]>([]);
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation<any>();

  useEffect(() => {
    const unsub = subscribeToQueue(load);

    return unsub;
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
                <Text style={styles.time}>
                  {new Date(item.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
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

/*
   Styles */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  listContent: {
    paddingVertical: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  item: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 16,
    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#495057',
  },
  itemBody: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sender: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 8,
  },
  bodyText: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  time: {
    fontSize: 12,
    color: '#ADB5BD',
  },
  retryBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  retryText: {
    fontSize: 10,
    color: '#EF6C00',
    fontWeight: '700',
  },
  // Empty State Styles
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#343A40',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
  },
});
