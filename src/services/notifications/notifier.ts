import notifee, {
  AndroidImportance,
  AndroidVisibility,
} from '@notifee/react-native';

const CHANNEL_ID = 'sms-sync';

/* INIT */

export async function initNotifications() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'SMS Sync',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    vibration: true,
    sound: 'default',
  });
}

/* SUCCESS NOTIFY */

export async function notifySmsSynced(count: number) {
  await notifee.displayNotification({
    title: 'SMS Synced',
    body: `${count} message(s) synced successfully`,

    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      pressAction: {
        id: 'default',
      },
    },
  });
}

/* OPTIONAL: PER SMS */

export async function notifyNewSms(sender: string, body: string) {
  await notifee.displayNotification({
    title: sender || 'New SMS',
    body: body || '',

    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      pressAction: {
        id: 'default',
      },
    },
  });
}
