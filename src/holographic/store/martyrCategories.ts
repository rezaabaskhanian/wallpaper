import {MARTYR_CATEGORIES_URL} from './config';
import type {MartyrCategory} from './types';

/** Fetches the martyr categories list from the backend. Throws on network/parse errors. */
export async function fetchMartyrCategories(): Promise<MartyrCategory[]> {
  const res = await fetch(MARTYR_CATEGORIES_URL, {headers: {Accept: 'application/json'}});
  if (!res.ok) {
    throw new Error(`martyr-categories HTTP ${res.status}`);
  }
  const data = (await res.json()) as {categories?: MartyrCategory[]};
  if (!data || !Array.isArray(data.categories)) {
    throw new Error('martyr-categories: unexpected shape');
  }
  return data.categories;
}
