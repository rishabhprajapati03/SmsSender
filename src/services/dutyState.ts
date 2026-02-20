import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'duty_mode';

export async function setDutyState(on: boolean) {
  await AsyncStorage.setItem(KEY, on ? '1' : '0');
}

export async function getDutyState(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY);
  return v === '1';
}
