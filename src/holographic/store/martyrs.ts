import {MARTYRS_URL} from './config';
import type {MartyrItem} from './types';

/** Fetches the active martyrs list from the backend. Throws on network/parse errors. */
export async function fetchMartyrs(): Promise<MartyrItem[]> {
  const res = await fetch(MARTYRS_URL, {headers: {Accept: 'application/json'}});
  if (!res.ok) {
    throw new Error(`martyrs HTTP ${res.status}`);
  }
  const data = (await res.json()) as {martyrs?: MartyrItem[]};
  if (!data || !Array.isArray(data.martyrs)) {
    throw new Error('martyrs: unexpected shape');
  }
  return data.martyrs;
}
