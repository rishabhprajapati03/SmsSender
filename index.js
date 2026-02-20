import { AppRegistry } from 'react-native';

import App from './App';
import { name as appName } from './app.json';

import BackgroundFetch from 'react-native-background-fetch';

import { syncQueue } from './src/services/syncService';

AppRegistry.registerComponent(appName, () => App);

// Headless task (app killed)
BackgroundFetch.registerHeadlessTask(async event => {
  console.log('[HEADLESS]', event.taskId);

  try {
    await syncQueue();
  } catch (e) {
    console.log('HEADLESS ERROR:', e);
  } finally {
    BackgroundFetch.finish(event.taskId);
  }
});
