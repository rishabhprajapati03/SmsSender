import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  AppState,
} from 'react-native';
import TabNavigator from './src/navigation/TabNavigator';
import { initializeApp } from './src/services/app/appInitializer';
import { restoreSmsSyncIfNeeded } from './src/services/smsSync/smsSyncManager';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initialize();

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        restoreSmsSyncIfNeeded();
      }
    });

    return () => sub.remove();
  }, []);

  async function initialize() {
    try {
      await initializeApp();
      await restoreSmsSyncIfNeeded();
    } catch (error) {
      console.error('[App] Init error:', error);
    } finally {
      setIsInitializing(false);
    }
  }

  if (isInitializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.text}>Initializing...</Text>
      </View>
    );
  }

  return <TabNavigator />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
