import {
  startSmsListener as startNativeListener,
  stopSmsListener as stopNativeListener,
  SmsData,
} from 'react-native-sms-module';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addToQueue } from '../queue/queueManager';

const LISTENER_KEY = 'SMS_LISTENER_ACTIVE_V1';

let isListening = false;

/* STORAGE HELPERS */

async function isListenerMarkedActive(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(LISTENER_KEY);
    return val === '1';
  } catch {
    return false;
  }
}

async function markListenerActive() {
  try {
    await AsyncStorage.setItem(LISTENER_KEY, '1');
  } catch {}
}

async function markListenerInactive() {
  try {
    await AsyncStorage.removeItem(LISTENER_KEY);
  } catch {}
}

/* START */

export async function startSmsListener(): Promise<void> {
  // Fast in-memory check
  if (isListening) {
    console.warn('[SMS] Listener already running (memory)');
    return;
  }

  // Cross-runtime check
  const alreadyActive = await isListenerMarkedActive();

  if (alreadyActive) {
    console.warn('[SMS] Listener already running (storage)');
    isListening = true;
    return;
  }

  console.log('[SMS] Starting listener...');

  try {
    startNativeListener(async (sms: SmsData) => {
      try {
        if (!sms?.id) {
          console.warn('[SMS] Invalid SMS, skipping');
          return;
        }

        console.log('[SMS] Received:', sms.id, 'from:', sms.sender);

        await addToQueue(sms);
      } catch (error) {
        console.error('[SMS] Handler error:', error);
      }
    });

    isListening = true;
    await markListenerActive();

    console.log('[SMS] Listener started');
  } catch (e) {
    console.error('[SMS] Start failed:', e);
    isListening = false;
  }
}

/* STOP */

export async function stopSmsListener(): Promise<void> {
  if (!isListening) return;

  console.log('[SMS] Stopping listener...');

  try {
    stopNativeListener();

    isListening = false;

    await markListenerInactive();

    console.log('[SMS] Listener stopped');
  } catch (error) {
    console.error('[SMS] Stop error:', error);

    isListening = false;
    await markListenerInactive();
  }
}

/* STATE */

export function isListenerActive(): boolean {
  return isListening;
}
