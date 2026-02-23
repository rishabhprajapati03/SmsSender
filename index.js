import { AppRegistry } from 'react-native';
import BackgroundFetch from 'react-native-background-fetch';
import App from './App';
import { name as appName } from './app.json';
import { syncQueue } from './src/services/sync/syncManager';

AppRegistry.registerComponent(appName, () => App);

// Headless task for background sync
BackgroundFetch.registerHeadlessTask(async (event) => {
  const taskId = event.taskId;
  console.log('[Headless] Task started:', taskId);

  try {
    await syncQueue();
    console.log('[Headless] Task completed');
  } catch (error) {
    console.error('[Headless] Task failed:', error);
  } finally {
    BackgroundFetch.finish(taskId);
  }
});
