// import BackgroundService from 'react-native-background-actions';
// import { syncQueue } from './syncService';

// const options = {
//   taskName: 'SmsSyncService',
//   taskTitle: 'SMS Sync Running',
//   taskDesc: 'Syncing messages in background',
//   taskIcon: {
//     name: 'ic_launcher',
//     type: 'mipmap',
//   },
//   parameters: {},
// };

// async function backgroundTask() {
//   while (BackgroundService.isRunning()) {
//     await syncQueue();
//     await sleep(30000); // every 30 sec
//   }
// }

// function sleep(time: number) {
//   return new Promise(resolve => setTimeout(resolve, time));
// }

// export async function startBackgroundService() {
//   await BackgroundService.start(backgroundTask, options);
// }

// export async function stopBackgroundService() {
//   await BackgroundService.stop();
// }
// //
