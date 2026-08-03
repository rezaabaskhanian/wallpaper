import type {ImageSourcePropType} from 'react-native';
import raw from './martyrs.json';
import {MARTYR_PHOTOS} from './martyrPhotos';

/**
 * A martyr entry. Text fields come from martyrs.json; the portrait is wired
 * through the PHOTOS map below (Metro needs a static require per image).
 */
export type Martyr = {
  id: string;
  name: string;
  /** نحوهٔ شهادت — main modal body. */
  martyrdom: string;
  born?: string;
  martyredOn?: string;
  place?: string;
  /** یک جمله از وصیت‌نامه (اختیاری). */
  will?: string;
  photo?: ImageSourcePropType;
};

// Metro may hand the JSON back as the array itself or wrapped as {default: []}.
const RAW_LIST: Omit<Martyr, 'photo'>[] = Array.isArray(raw)
  ? (raw as Omit<Martyr, 'photo'>[])
  : ((raw as {default?: Omit<Martyr, 'photo'>[]}).default ?? []);

export const MARTYRS: Martyr[] = RAW_LIST.map(m => ({
  ...m,
  photo: MARTYR_PHOTOS[m.id],
}));

export function getMartyrById(id: string): Martyr | undefined {
  return MARTYRS.find(m => m.id === id);
}
