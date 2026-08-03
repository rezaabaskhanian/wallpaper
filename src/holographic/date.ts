/**
 * Tiny, dependency-free date helpers: Persian (Jalali) conversion + Persian
 * digit/label formatting. Kept self-contained so no extra libs are needed.
 */

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Convert western digits in a string/number to Persian digits. */
export function toFa(input: string | number): string {
  return String(input).replace(/[0-9]/g, d => FA_DIGITS[Number(d)]);
}

const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

// Saturday-first Persian week (JS getDay: 0=Sun .. 6=Sat).
const FA_WEEKDAYS = [
  'یکشنبه', // 0 Sun
  'دوشنبه', // 1 Mon
  'سه‌شنبه', // 2 Tue
  'چهارشنبه', // 3 Wed
  'پنجشنبه', // 4 Thu
  'جمعه', // 5 Fri
  'شنبه', // 6 Sat
];

/** Gregorian → Jalali. Returns {jy, jm, jd} (1-based month/day). */
export function toJalali(
  gy: number,
  gm: number,
  gd: number,
): {jy: number; jm: number; jd: number} {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm =
    days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return {jy, jm, jd};
}

/** e.g. "جمعه، ۲ خرداد ۱۴۰۴" */
export function formatJalali(date: Date): string {
  const {jy, jm, jd} = toJalali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
  const weekday = FA_WEEKDAYS[date.getDay()];
  return `${weekday}، ${toFa(jd)} ${JALALI_MONTHS[jm - 1]} ${toFa(jy)}`;
}

/** e.g. "Fri, 23 May 2025" */
export function formatGregorian(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
