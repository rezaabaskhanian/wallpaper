import {CATALOG_URL} from './config';
import type {Catalog} from './types';

/** Fetches the wallpaper catalog from the backend. Throws on network/parse errors. */
export async function fetchCatalog(): Promise<Catalog> {
  const res = await fetch(CATALOG_URL, {headers: {Accept: 'application/json'}});
  if (!res.ok) {
    throw new Error(`catalog HTTP ${res.status}`);
  }
  const data = (await res.json()) as Catalog;
  if (!data || !Array.isArray(data.wallpapers)) {
    throw new Error('catalog: unexpected shape');
  }
  return {
    version: data.version ?? 0,
    categories: Array.isArray(data.categories) ? data.categories : [],
    wallpapers: data.wallpapers,
  };
}
