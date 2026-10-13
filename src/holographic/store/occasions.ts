import {OCCASIONS_URL} from './config';
import type {Occasion} from './types';

/** Fetches upcoming occasions. Throws on network/parse errors. */
export async function fetchOccasions(): Promise<Occasion[]> {
  const res = await fetch(OCCASIONS_URL, {headers: {Accept: 'application/json'}});
  if (!res.ok) {
    throw new Error(`occasions HTTP ${res.status}`);
  }
  const data = (await res.json()) as {occasions?: Occasion[]};
  return Array.isArray(data?.occasions) ? data.occasions : [];
}
