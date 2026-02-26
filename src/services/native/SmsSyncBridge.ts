import { NativeModules } from 'react-native';

interface SmsSyncModuleInterface {
  enableSync(): Promise<boolean>;
  disableSync(): Promise<boolean>;
  isSyncEnabled(): Promise<boolean>;
  ensureServiceRunning(): Promise<boolean>;
  validatePermissionsAndAutoDisable(): Promise<{ autoDisabled: boolean }>;
  checkRequiredPermissions(): Promise<{
    readSms: boolean;
    receiveSms: boolean;
    postNotifications: boolean;
  }>;
  getQueue(): Promise<any[]>;
  getQueueStats(): Promise<{
    total: number;
    pending: number;
    syncing: number;
    sent: number;
    failed: number;
  }>;
  addToQueue(
    id: string,
    sender: string,
    body: string,
    timestamp: number,
  ): Promise<boolean>;
  triggerUpload(): Promise<boolean>;
  clearQueue(): Promise<boolean>;
  clearSentMessages(): Promise<number>;
  saveApiConfig(url: string, key: string): Promise<boolean>;
  importExistingSms(limit: number): Promise<number>;
}

const { SmsSyncModule } = NativeModules;

if (!SmsSyncModule) {
  throw new Error('SmsSyncModule native module not found');
}

export const SmsSyncBridge: SmsSyncModuleInterface = SmsSyncModule;
