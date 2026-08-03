import {QUOTES_URL} from './config';
import type {QuoteItem} from './types';

/** Fetches the active quotes list from the backend. Throws on network/parse errors. */
export async function fetchQuotes(): Promise<QuoteItem[]> {
  const res = await fetch(QUOTES_URL, {headers: {Accept: 'application/json'}});
  if (!res.ok) {
    throw new Error(`quotes HTTP ${res.status}`);
  }
  const data = (await res.json()) as {quotes?: QuoteItem[]};
  if (!data || !Array.isArray(data.quotes)) {
    throw new Error('quotes: unexpected shape');
  }
  return data.quotes;
}
