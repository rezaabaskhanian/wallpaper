/**
 * Selectable fonts for the wallpaper text (clock, date, weather, quote…).
 *
 * On Android a font family name maps to the ttf FILENAME (without extension)
 * inside android/app/src/main/assets/fonts/. So the `families` strings below
 * must match the linked ttf file names exactly.
 *
 * Each font can expose up to four weights; missing weights fall back sensibly
 * (see `familyForWeight`). Decorative/display fonts (Lalezar, Gandom) ship a
 * single weight and reuse it for every weight.
 */
export type FontScript = 'fa' | 'ar';

export type FontOption = {
  /** Stable id stored in settings. */
  id: string;
  /** Persian label shown in the settings picker. */
  label: string;
  /** Short text rendered in this font as a live preview. */
  sample: string;
  /** Whether it's a Persian or Arabic typeface (just for grouping/label). */
  script: FontScript;
  /** ttf family names per weight. `regular` is required. */
  families: {
    light?: string;
    regular: string;
    medium?: string;
    bold?: string;
  };
};

export const FONTS: FontOption[] = [
  {
    id: 'vazirmatn',
    label: 'وزیرمتن',
    sample: 'نستعلیقِ نور',
    script: 'fa',
    families: {
      light: 'Vazirmatn-Light',
      regular: 'Vazirmatn-Regular',
      medium: 'Vazirmatn-Medium',
      bold: 'Vazirmatn-Bold',
    },
  },
  {
    id: 'sahel',
    label: 'ساحل',
    sample: 'نستعلیقِ نور',
    script: 'fa',
    families: {regular: 'Sahel', bold: 'Sahel-Bold'},
  },
  {
    id: 'samim',
    label: 'صمیم',
    sample: 'نستعلیقِ نور',
    script: 'fa',
    families: {regular: 'Samim', bold: 'Samim-Bold'},
  },
  {
    id: 'shabnam',
    label: 'شبنم',
    sample: 'نستعلیقِ نور',
    script: 'fa',
    families: {regular: 'Shabnam', bold: 'Shabnam-Bold'},
  },
  {
    id: 'iransans',
    label: 'ایران‌سنس',
    sample: 'نستعلیقِ نور',
    script: 'fa',
    families: {regular: 'Iranian-Sans', bold: 'Iranian-Sans'},
  },
  {
    id: 'gandom',
    label: 'گندم',
    sample: 'نستعلیقِ نور',
    script: 'fa',
    families: {regular: 'Gandom', bold: 'Gandom'},
  },
  {
    id: 'lalezar',
    label: 'لاله‌زار',
    sample: 'نستعلیقِ نور',
    script: 'fa',
    families: {regular: 'Lalezar-Regular', bold: 'Lalezar-Regular'},
  },
  {
    id: 'amiri',
    label: 'امیری (عربی)',
    sample: 'بسم الله الرحمن',
    script: 'ar',
    families: {regular: 'Amiri-Regular', bold: 'Amiri-Bold'},
  },
  {
    id: 'arefruqaa',
    label: 'عارف رقعه (عربی)',
    sample: 'بسم الله الرحمن',
    script: 'ar',
    families: {regular: 'ArefRuqaa-Regular', bold: 'ArefRuqaa-Bold'},
  },
];

export const DEFAULT_FONT_ID = 'vazirmatn';

/** Look up a font by id, falling back to the default. */
export function getFont(id: string): FontOption {
  return FONTS.find(f => f.id === id) ?? FONTS[0];
}

/** Pick the ttf family for a given fontWeight, with graceful fallbacks. */
export function familyForWeight(
  font: FontOption,
  weight?: string | number,
): string {
  const w = String(weight ?? 'normal');
  const f = font.families;
  switch (w) {
    case 'bold':
    case '700':
    case '800':
    case '900':
      return f.bold ?? f.medium ?? f.regular;
    case '500':
    case '600':
      return f.medium ?? f.bold ?? f.regular;
    case '100':
    case '200':
    case '300':
      return f.light ?? f.regular;
    default:
      return f.regular;
  }
}
