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
export type FontScript = 'fa' | 'ar' | 'en';

export type FontOption = {
  /** Stable id stored in settings. */
  id: string;
  /** Persian label shown in the settings picker. */
  label: string;
  /** Short text rendered in this font as a live preview. */
  sample: string;
  /** Persian/Arabic fonts style Persian text; English fonts style Latin. */
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
  {
    id: 'poppins',
    label: 'Poppins (انگلیسی)',
    sample: 'Good Morning',
    script: 'en',
    families: {
      light: 'Poppins-Light',
      regular: 'Poppins-Regular',
      medium: 'Poppins-Medium',
      bold: 'Poppins-Bold',
    },
  },
  {
    id: 'lato',
    label: 'Lato (انگلیسی)',
    sample: 'Good Morning',
    script: 'en',
    families: {regular: 'Lato-Regular', bold: 'Lato-Bold'},
  },
  {
    id: 'ptsans',
    label: 'PT Sans (انگلیسی)',
    sample: 'Good Morning',
    script: 'en',
    families: {regular: 'PT_Sans-Web-Regular', bold: 'PT_Sans-Web-Bold'},
  },
  {
    id: 'bebasneue',
    label: 'Bebas Neue (انگلیسی)',
    sample: 'GOOD MORNING',
    script: 'en',
    families: {regular: 'BebasNeue-Regular', bold: 'BebasNeue-Regular'},
  },
];

/** Default font for Persian/Arabic text. */
export const DEFAULT_FA_FONT_ID = 'vazirmatn';
/** Default font for Latin (English) text. */
export const DEFAULT_EN_FONT_ID = 'poppins';

/** Which of the two user-selected fonts a piece of text should use. */
export type TextScript = 'fa' | 'en';

/** Fonts listed under a picker group: Arabic typefaces sit with Persian. */
export function fontsForScript(script: TextScript): FontOption[] {
  return FONTS.filter(f => (script === 'en' ? f.script === 'en' : f.script !== 'en'));
}

/** Resolve a stored id for a group, falling back to that group's default. */
export function getScriptFont(script: TextScript, id: string): FontOption {
  return (
    fontsForScript(script).find(f => f.id === id) ??
    getFont(script === 'en' ? DEFAULT_EN_FONT_ID : DEFAULT_FA_FONT_ID)
  );
}

const PERSIAN_RE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN_RE = /[A-Za-z\u00C0-\u024F]/;

function charScript(ch: string): TextScript | null {
  if (PERSIAN_RE.test(ch)) return 'fa';
  if (LATIN_RE.test(ch)) return 'en';
  return null;
}

export type ScriptRun = {text: string; script: TextScript};

/**
 * Split text into runs of Persian and Latin script. Neutral characters
 * (spaces, punctuation, Latin digits, emoji) join the run they follow, or the
 * first run when they lead. Text with no letters at all counts as English
 * when it has Latin digits (e.g. "12:30") and as Persian otherwise.
 */
export function splitByScript(text: string): ScriptRun[] {
  const runs: ScriptRun[] = [];
  let leading = '';
  for (const ch of text) {
    const script = charScript(ch);
    const last = runs[runs.length - 1];
    if (script === null) {
      if (last) last.text += ch;
      else leading += ch;
    } else if (last && last.script === script) {
      last.text += ch;
    } else {
      runs.push({text: (last ? '' : leading) + ch, script});
    }
  }
  if (runs.length === 0) {
    return [{text, script: /[0-9]/.test(text) ? 'en' : 'fa'}];
  }
  return runs;
}

/** Look up a font by id, falling back to the default Persian font. */
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
