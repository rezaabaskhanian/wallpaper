import {HERO_URL} from './config';
import type {HeroData} from './types';

/** Fetches the hero/leader config from the backend. Throws on network/parse errors. */
export async function fetchHero(): Promise<HeroData> {
  const res = await fetch(HERO_URL, {headers: {Accept: 'application/json'}});
  if (!res.ok) {
    throw new Error(`hero HTTP ${res.status}`);
  }
  const data = (await res.json()) as {hero?: HeroData};
  if (!data || !data.hero) {
    throw new Error('hero: unexpected shape');
  }
  return data.hero;
}
