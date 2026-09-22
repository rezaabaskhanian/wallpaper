import {DAILY_QUOTE_URL} from './config';
import type {QuoteItem} from './types';

/**
 * Fetches today's AI-generated quote (see backend's dailyquote service).
 * The backend generates and caches it on the first request of the day, so
 * this is cheap on every subsequent call. Throws if the feature is disabled
 * server-side (no DeepSeek API key configured) or on network/parse errors —
 * callers should fall back to the regular quotes list.
 */
export async function fetchDailyQuote(): Promise<QuoteItem> {
  const res = await fetch(DAILY_QUOTE_URL, {headers: {Accept: 'application/json'}});
  if (!res.ok) {
    throw new Error(`daily-quote HTTP ${res.status}`);
  }
  const data = (await res.json()) as {quote?: QuoteItem};
  if (!data || !data.quote || !data.quote.line2) {
    throw new Error('daily-quote: unexpected shape');
  }
  return data.quote;
}
