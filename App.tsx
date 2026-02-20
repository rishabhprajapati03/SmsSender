import React, { useEffect } from 'react';

import BackgroundFetch from 'react-native-background-fetch';

import TabNavigator from './src/navigation/TabNavigator';

import { syncQueue } from './src/services/syncService';
import { ensureAllPermissions } from './src/services/permissions/permissionService';
import { getDutyState } from './src/services/dutyState';
import { startDuty } from './src/services/dutyService';

export default function App() {
  useEffect(() => {
    init();

    async function init() {
      await ensureAllPermissions();

      const wasOnDuty = await getDutyState();

      if (wasOnDuty) {
        await startDuty();
      }

      await initBackground();
    }
  }, []);

  async function initBackground() {
    try {
      const status = await BackgroundFetch.configure(
        {
          stopOnTerminate: false,
          startOnBoot: true,

          enableHeadless: true,

          requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,

          requiresCharging: false,
          requiresBatteryNotLow: false,
          requiresDeviceIdle: false,

          forceAlarmManager: false, // WorkManager
        },

        async taskId => {
          console.log('[BG]', taskId);

          try {
            await syncQueue();
          } finally {
            BackgroundFetch.finish(taskId);
          }
        },

        error => {
          console.log('BG CONFIG ERROR:', error);
        },
      );

      console.log('BG STATUS:', status);

      await BackgroundFetch.start();
    } catch (e) {
      console.log('BG INIT FAILED:', e);
    }
  }

  return <TabNavigator />;
}
