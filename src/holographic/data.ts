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
  /** Shown in a popup when the avatar is tapped, if set (see the admin
   * panel's orbit item form). */
  description?: string;
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

/** The orbit category currently selected (settings.orbitCategoryId), falling
 * back to the first category the backend returns (normally "شهدا") so the
 * screen has a sensible default before the user ever opens the switcher. */
export function useActiveOrbitCategory() {
  const {orbitCategories} = useStore();
  const {settings} = useSettings();
  return useMemo(() => {
    if (!orbitCategories.length) {
      return null;
    }
    return (
      orbitCategories.find(c => c.id === settings.orbitCategoryId) ??
      orbitCategories[0]
    );
  }, [orbitCategories, settings.orbitCategoryId]);
}

/** The quote category currently selected (settings.quoteCategoryId), falling
 * back to the first category the backend returns (normally "بیانات رهبر") so
 * the widget has a sensible default before the user ever opens the switcher. */
export function useActiveQuoteCategoryId(): string {
  const {quoteCategories} = useStore();
  const {settings} = useSettings();
  return useMemo(() => {
    if (!quoteCategories.length) {
      return settings.quoteCategoryId;
    }
    return quoteCategories.some(c => c.id === settings.quoteCategoryId)
      ? settings.quoteCategoryId
      : quoteCategories[0].id;
  }, [quoteCategories, settings.quoteCategoryId]);
}

/** Central hero: the leader portrait, or the active orbit category's own
 * center image/title/slogan when it defines one (e.g. a "طبیعت" theme with
 * a sun/earth photo instead of the leader). */
export function useHero(): HeroConfig {
  const {hero} = useStore();
  const activeCategory = useActiveOrbitCategory();
  return useMemo(() => {
    if (activeCategory?.centerImage) {
      return {
        title: activeCategory.centerTitle ?? '',
        slogan: activeCategory.centerSlogan ?? '',
        colors: HERO_COLORS,
        image: {uri: activeCategory.centerImage},
      };
    }
    return {
      title: hero?.title ?? '',
      slogan: hero?.slogan ?? '',
      colors: HERO_COLORS,
      image: hero?.image ? {uri: hero.image} : FALLBACK_HERO_IMAGE,
    };
  }, [hero, activeCategory]);
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
 * Orbiting icons for the active orbit category/theme (see
 * `useActiveOrbitCategory`, switched from the home screen's own tab row —
 * not the settings panel). Each item carries its own `description` straight
 * from the admin panel (see the orbit item form), shown in a popup on tap —
 * no more matching against the martyrs list to decide what's tappable.
 * Falls back to placeholder tiles while loading or when the backend has no
 * entries yet.
 *
 * The result is capped at `min(settings.ballCount, MAX_ORBS)`: a category
 * with more items than that gets a random subset (re-rolled whenever the
 * category or count changes, so a large category isn't always showing the
 * same faces), while a category with fewer items than the cap just shows
 * all of them instead of repeating anyone to pad the orbit out. The settings
 * panel only lets `ballCount` go down from `MAX_ORBS`, never above it — see
 * its ballCount stepper — so the screen is never more crowded than
 * `MAX_ORBS` regardless of category size.
 */
export function useOrbitItems(): OrbitItem[] {
  const {orbitItems} = useStore();
  const {settings} = useSettings();
  const activeCategory = useActiveOrbitCategory();
  return useMemo(() => {
    const inCategory = activeCategory
      ? orbitItems.filter(it => it.categoryId === activeCategory.id)
      : orbitItems;

    const all: OrbitItem[] = inCategory.length
      ? inCategory.map((it, i) => ({
          id: it.id,
          label: it.label,
          colors: PALETTE[i % PALETTE.length],
          image: it.image ? {uri: it.image} : undefined,
          description: it.description || undefined,
        }))
      : fallbackOrbitItems();

    return sampleItems(all, Math.min(settings.ballCount, MAX_ORBS));
  }, [orbitItems, activeCategory, settings.ballCount]);
}
