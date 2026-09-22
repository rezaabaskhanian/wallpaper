import {getUniqueId} from 'react-native-device-info';

/**
 * A stable per-device identifier used server-side to track the free AI
 * wallpaper-generation quota (one free image per device) — deliberately not
 * AsyncStorage, since that resets on reinstall.
 */
export async function getDeviceId(): Promise<string> {
  return getUniqueId();
}
