import {ORBIT_CATALOG_URL} from './config';
import type {OrbitCatalog} from './types';

/** Fetches the orbit catalog (categories + active items) from the backend. */
export async function fetchOrbitCatalog(): Promise<OrbitCatalog> {
  const res = await fetch(ORBIT_CATALOG_URL, {headers: {Accept: 'application/json'}});
  if (!res.ok) {
    throw new Error(`orbit-catalog HTTP ${res.status}`);
  }
  const data = (await res.json()) as OrbitCatalog;
  if (!data || !Array.isArray(data.items)) {
    throw new Error('orbit-catalog: unexpected shape');
  }
  return {
    categories: Array.isArray(data.categories) ? data.categories : [],
    items: data.items,
  };
}
