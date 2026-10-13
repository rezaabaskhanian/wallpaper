/**
 * On-device occasion reminders (native OccasionReminders.kt) and the Android
 * 13+ notification permission they need — asked for only after the user's
 * first successful wallpaper, never on first launch.
 */
import {NativeModules, PermissionsAndroid, Platform} from 'react-native';
import type {Occasion} from './store/types';

type OccasionRemindersNative = {
  schedule: (
    items: {id: string; title: string; body: string; categoryId: string; triggerAt: number}[],
  ) => Promise<number>;
};
const Native: OccasionRemindersNative | undefined = NativeModules.OccasionReminders;

/** Local hour the reminder shows on its day. */
const REMINDER_HOUR = 10;

/** Midnight (local) of a YYYY-MM-DD date, or null if malformed. */
export function occasionDay(date: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** Replaces all scheduled reminders with these occasions' (future ones only). */
export function scheduleOccasionReminders(occasions: Occasion[]): void {
  if (!Native) return;
  const items = occasions.flatMap(o => {
    const day = occasionDay(o.date);
    if (!day) return [];
    const at = new Date(day);
    at.setDate(at.getDate() - o.daysBefore);
    at.setHours(REMINDER_HOUR, 0, 0, 0);
    return [
      {
        id: o.id,
        title: o.notifyTitle,
        body: o.notifyBody,
        categoryId: o.categoryId,
        triggerAt: at.getTime(),
      },
    ];
  });
  Native.schedule(items).catch(() => {});
}

/** Asks once for notification permission (Android 13+); a no-op elsewhere
 * or when already decided. Safe to call repeatedly. */
export async function requestNotificationPermission(): Promise<void> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return;
  try {
    const perm = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (await PermissionsAndroid.check(perm)) return;
    await PermissionsAndroid.request(perm);
  } catch {
    // Not worth surfacing.
  }
}
