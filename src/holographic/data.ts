/**
 * Derived data for the Holographic home screen: the leader hero and the
 * orbiting martyr avatars. Both come from the backend (see `store/`); while
 * loading or when the server has no entries yet, a placeholder set is used so
 * the screen never looks empty or broken.
 */

import {useMemo} from 'react';
import type {ImageSourcePropType} from 'react-native';
import {MAX_ORBS} from './config';
import {useSettings} from './SettingsContext';
import {useStore} from './store/StoreContext';

export type OrbitItem = {
  id: string;
  /** Display label (kept short so it fits under the avatar). */
  label: string;
  /** Placeholder gradient colors — swapped for a real portrait later. */
  colors: [string, string];
  /** Real portrait, fetched from the backend. */
  image?: number | {uri: string} | ImageSourcePropType;
  /** Links this icon to a martyr entry so a tap can open its modal. */
  martyrId?: string;
};

export type HeroConfig = {
  title: string;
  slogan: string;
  colors: [string, string];
  image?: number | {uri: string};
};

// Fallback full-screen photo, used while the hero image hasn't loaded/been set yet.
const FALLBACK_HERO_IMAGE = require('./assets/leader.png');
const HERO_COLORS: [string, string] = ['#1f6f6f', '#0a2a2a'];

/** Central hero: the leader portrait shown in the middle of the sphere. */
export function useHero(): HeroConfig {
  const {hero} = useStore();
  return useMemo(
    () => ({
      title: hero?.title ?? '',
      slogan: hero?.slogan ?? '',
      colors: HERO_COLORS,
      image: hero?.image ? {uri: hero.image} : FALLBACK_HERO_IMAGE,
    }),
    [hero],
  );
}

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

/** Enough unique placeholder tiles to fill every ring without repeats. */
function fallbackOrbitItems(): OrbitItem[] {
  return Array.from({length: 40}).map((_, i) => ({
    id: `m${i + 1}`,
    label: `شهید ${toFaDigits(i + 1)}`,
    colors: PALETTE[i % PALETTE.length],
  }));
}

/** Picks `count` random, non-repeating entries out of `items` (or all of them
 * if there aren't enough to fill `count`). */
function sampleItems<T>(items: T[], count: number): T[] {
  if (items.length <= count) {
    return items;
  }
  const pool = [...items];
  const picked: T[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

/**
 * Orbiting icons, built from the fetched martyrs list (each icon carries its
 * `martyrId` so a tap opens that martyr's modal). Falls back to placeholder
 * tiles while loading or when the backend has no entries yet.
 *
 * The result is capped at `min(settings.ballCount, MAX_ORBS)`: a category
 * with more martyrs than that gets a random subset (re-rolled whenever the
 * category or count changes, so a large category isn't always showing the
 * same faces), while a category with fewer martyrs than the cap just shows
 * all of them instead of repeating anyone to pad the orbit out. The settings
 * panel only lets `ballCount` go down from `MAX_ORBS`, never above it — see
 * its ballCount stepper — so the screen is never more crowded than
 * `MAX_ORBS` regardless of category size.
 */
export function useOrbitItems(): OrbitItem[] {
  const {martyrs} = useStore();
  const {settings} = useSettings();
  return useMemo(() => {
    let all: OrbitItem[];
    if (!martyrs.length) {
      all = fallbackOrbitItems();
    } else {
      // Empty selection (or a category with no entries yet) shows everyone,
      // so the orbit never goes blank just because a category is still empty.
      const filtered = settings.martyrCategoryId
        ? martyrs.filter(m => m.categoryId === settings.martyrCategoryId)
        : martyrs;
      const shown = filtered.length ? filtered : martyrs;
      all = shown.map((m, i) => ({
        id: m.id,
        label: m.name,
        colors: PALETTE[i % PALETTE.length],
        image: m.photo ? {uri: m.photo} : undefined,
        martyrId: m.id,
      }));
    }
    return sampleItems(all, Math.min(settings.ballCount, MAX_ORBS));
  }, [martyrs, settings.martyrCategoryId, settings.ballCount]);
}
