import type {ImageSourcePropType} from 'react-native';

/**
 * عکس هر شهید (کلید = id در martyrs.json). فایل‌ها در assets/martyrs/ هستند.
 *
 * این فایل عمداً هیچ importِ داخلی ندارد تا از مشکل ترتیب‌لود ماژول‌ها جلوگیری
 * شود؛ هم data.ts و هم martyrs.ts از همین‌جا عکس‌ها را می‌گیرند.
 */
export const MARTYR_PHOTOS: Record<string, ImageSourcePropType> = {
  'shahid-01': require('./assets/martyrs/shahid-01.webp'),
  'shahid-02': require('./assets/martyrs/shahid-02.webp'),
  'shahid-03': require('./assets/martyrs/shahid-03.webp'),
  'shahid-04': require('./assets/martyrs/shahid-04.webp'),
  'shahid-05': require('./assets/martyrs/shahid-05.webp'),
  'shahid-06': require('./assets/martyrs/shahid-06.webp'),
  'shahid-07': require('./assets/martyrs/shahid-07.webp'),
  'shahid-08': require('./assets/martyrs/shahid-08.webp'),
  'shahid-09': require('./assets/martyrs/shahid-09.webp'),
  'shahid-10': require('./assets/martyrs/shahid-10.webp'),
  'shahid-11': require('./assets/martyrs/shahid-11.webp'),
  'shahid-12': require('./assets/martyrs/shahid-12.webp'),
  'shahid-13': require('./assets/martyrs/shahid-13.webp'),
  'shahid-14': require('./assets/martyrs/shahid-14.webp'),
  'shahid-15': require('./assets/martyrs/shahid-15.webp'),
  'shahid-16': require('./assets/martyrs/shahid-16.webp'),
  'shahid-17': require('./assets/martyrs/shahid-17.webp'),
  'shahid-18': require('./assets/martyrs/shahid-18.webp'),
  'shahid-19': require('./assets/martyrs/shahid-19.webp'),
  'shahid-20': require('./assets/martyrs/shahid-20.webp'),
  'shahid-21': require('./assets/martyrs/shahid-21.webp'),
  'shahid-22': require('./assets/martyrs/shahid-22.webp'),
  'shahid-23': require('./assets/martyrs/shahid-23.webp'),
  'shahid-24': require('./assets/martyrs/shahid-24.webp'),
  'shahid-25': require('./assets/martyrs/shahid-25.webp'),
  'shahid-26': require('./assets/martyrs/shahid-26.webp'),
  'shahid-27': require('./assets/martyrs/shahid-27.webp'),
};
