/**
 * Placeholder data for the Holographic home screen.
 *
 * NOTE: All imagery here is placeholder-only. Replace `image` with a
 * `require('...')` (or a remote uri) pointing to the real portraits when
 * assets are provided. Nothing here ships copyrighted material.
 */

import type {ImageSourcePropType} from 'react-native';
import rawMartyrs from './martyrs.json';
import {MARTYR_PHOTOS} from './martyrPhotos';

export type OrbitItem = {
  id: string;
  /** Display label (kept short so it fits under the avatar). */
  label: string;
  /** Placeholder gradient colors — swapped for a real portrait later. */
  colors: [string, string];
  /** Real portrait goes here once assets exist. */
  image?: number | { uri: string } | ImageSourcePropType;
  /** Links this icon to a martyr entry so a tap can open its modal. */
  martyrId?: string;
};

export type HeroConfig = {
  title: string;
  slogan: string;
  colors: [string, string];
  image?: number | { uri: string };
};

/** Central hero: the leader portrait shown in the middle of the sphere. */
export const HERO: HeroConfig = {
  title: '',
  slogan: '',
  colors: ['#1f6f6f', '#0a2a2a'],
  image: require('./assets/leader.png'),
};

/**
 * Orbiting "app icons" — each is a placeholder for a martyr portrait.
 *
 * Generated so there are enough unique tiles for several rings. Replace the
 * generated pool with real entries (and `image: require(...)`) when assets
 * arrive. To pin a real portrait, just edit/extend this array.
 */
const PALETTE: [string, string][] = [
  ['#3ad0c9', '#0e4f56'],
  ['#6ee7b7', '#0f5132'],
  ['#67e8f9', '#155e63'],
  ['#a7f3d0', '#065f46'],
  ['#5eead4', '#134e4a'],
  ['#7dd3fc', '#0c4a6e'],
  ['#99f6e4', '#115e59'],
  ['#38bdf8', '#075985'],
];

const toFaDigits = (n: number) =>
  String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

/**
 * Orbiting icons. Built from the martyrs DB when it has entries (each icon
 * carries its `martyrId` so a tap opens that martyr's modal); otherwise falls
 * back to enough unique placeholder tiles to fill every ring without repeats.
 */
type MartyrLite = {id: string; name: string};
// Metro may hand the JSON back as the array itself or wrapped as {default: []}.
const MARTYR_LIST: MartyrLite[] = Array.isArray(rawMartyrs)
  ? (rawMartyrs as MartyrLite[])
  : ((rawMartyrs as {default?: MartyrLite[]}).default ?? []);

export const ORBIT_ITEMS: OrbitItem[] = MARTYR_LIST.length
  ? MARTYR_LIST.map((m, i) => ({
      id: m.id,
      label: m.name,
      colors: PALETTE[i % PALETTE.length],
      image: MARTYR_PHOTOS[m.id],
      martyrId: m.id,
    }))
  : Array.from({length: 40}).map((_, i) => ({
      id: `m${i + 1}`,
      label: `شهید ${toFaDigits(i + 1)}`,
      colors: PALETTE[i % PALETTE.length],
    }));
