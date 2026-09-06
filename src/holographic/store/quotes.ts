import {QUOTE_CATEGORIES_URL, QUOTES_URL} from './config';
import type {QuoteCategory, QuoteItem} from './types';

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

/** Fetches the quote categories (e.g. "احادیث", "بیانات رهبر") from the backend. */
export async function fetchQuoteCategories(): Promise<QuoteCategory[]> {
  const res = await fetch(QUOTE_CATEGORIES_URL, {headers: {Accept: 'application/json'}});
  if (!res.ok) {
    throw new Error(`quote-categories HTTP ${res.status}`);
  }
  const data = (await res.json()) as {categories?: QuoteCategory[]};
  if (!data || !Array.isArray(data.categories)) {
    throw new Error('quote-categories: unexpected shape');
  }
  return data.categories;
}
