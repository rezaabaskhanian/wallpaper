/**
 * The «پیام روز» widget's built-in list: one message a day, the same for the
 * whole day (picked by day number, not at random, so the in-app preview and
 * the home-screen widget agree). The user's own text, when set, replaces it.
 */
export const DAILY_MESSAGES = [
  'امروز هم می‌تونه یه روز خوب باشه.',
  'قدم‌های کوچیک هم آدم رو می‌رسونن.',
  'به خودت سخت نگیر، داری خوب پیش می‌ری.',
  'یه لبخند، شروع خوبیه.',
  'هر روز یه فرصت تازه‌ست.',
  'آروم باش، همه‌چی درست می‌شه.',
  'امروز یه کار کوچیک برای خودت بکن.',
  'تو از چیزی که فکر می‌کنی قوی‌تری.',
  'مهربونی همیشه برمی‌گرده.',
  'یه نفس عمیق بکش و ادامه بده.',
];

/** Today's built-in message. */
export function messageOfToday(now = new Date()): string {
  const dayNumber = Math.floor(
    (now.getTime() - now.getTimezoneOffset() * 60_000) / 86_400_000,
  );
  return DAILY_MESSAGES[dayNumber % DAILY_MESSAGES.length];
}
