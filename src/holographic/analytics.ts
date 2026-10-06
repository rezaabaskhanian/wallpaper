/**
 * App analytics, sent to our own backend (POST /events — see backend's
 * analyticsservice) and summarised on the admin panel's آمار page. Only two
 * events for now: the app being opened and a wallpaper actually being set.
 * Fire-and-forget: a lost event must never affect the app itself.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getVersion} from 'react-native-device-info';
import {CATALOG_URL} from './store/config';
import {getDeviceId} from './store/deviceId';

const API_BASE_URL = CATALOG_URL.replace(/\/catalog$/, '');

/** How the wallpaper was set and from where — see backend's appevent domain. */
export type WallpaperSetMethod = 'live' | 'home' | 'lock' | 'both';
export type WallpaperSetSource = 'onetap' | 'settings' | 'gallery' | 'mood';

async function send(body: Record<string, string>): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({deviceId, appVersion: getVersion(), ...body}),
    });
  } catch {
    // Offline or backend down — the event is simply lost.
  }
}

const LAST_OPEN_KEY = 'analytics:lastAppOpenAt';
/** This app can also be the launcher, so it "comes to the foreground" every
 * time the user goes home. Opens closer together than this count as one. */
const OPEN_SESSION_GAP_MS = 30 * 60 * 1000;

/** Resolves true when this counted as a new open (and was sent), false when
 * it fell inside the current session — callers use it as the app's one
 * definition of "the user opened the app". */
export async function trackAppOpen(): Promise<boolean> {
  try {
    const last = Number(await AsyncStorage.getItem(LAST_OPEN_KEY));
    if (Number.isFinite(last) && Date.now() - last < OPEN_SESSION_GAP_MS) {
      return false;
    }
    await AsyncStorage.setItem(LAST_OPEN_KEY, String(Date.now()));
  } catch {
    // Storage unavailable — still send; an extra open beats a missing one.
  }
  send({event: 'app_open'});
  return true;
}

export function trackWallpaperSet(
  method: WallpaperSetMethod,
  source: WallpaperSetSource,
): void {
  send({event: 'wallpaper_set', method, source});
}

/** Launcher funnel: suggestion shown → «امتحان می‌کنم» tapped → the app
 * actually became the phone's Home (checked on the next return). */
export type LauncherEvent =
  | 'launcher_intro_shown'
  | 'launcher_intro_accepted'
  | 'launcher_enabled';

export function trackLauncherEvent(event: LauncherEvent): void {
  send({event});
}
