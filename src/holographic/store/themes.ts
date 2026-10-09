import {THEMES_URL} from './config';
import type {AppTheme} from './types';

/** Fetches the active themes. Throws on network/parse errors. */
export async function fetchThemes(): Promise<AppTheme[]> {
  const res = await fetch(THEMES_URL, {headers: {Accept: 'application/json'}});
  if (!res.ok) {
    throw new Error(`themes HTTP ${res.status}`);
  }
  const data = (await res.json()) as {themes?: AppTheme[]};
  return Array.isArray(data?.themes) ? data.themes : [];
}
