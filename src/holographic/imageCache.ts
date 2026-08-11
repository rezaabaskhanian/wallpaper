/**
 * Persistent offline cache for remote portrait photos (orbit avatars).
 *
 * Downloads each remote URL once, stores it as a base64 data URI in
 * AsyncStorage (already a dependency — no new native module needed), and
 * serves the cached copy on every later render/app launch, including while
 * offline. `useCachedImage` also reports whether a given url is ready yet, so
 * callers can avoid rendering a photo slot before it actually has a photo.
 */
import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'orbimg:';

/** In-memory mirror of AsyncStorage so repeated renders don't re-hit it. */
const memoryCache = new Map<string, string>();
/** De-dupes concurrent requests for the same url (many orbs can share one martyr photo). */
const inFlight = new Map<string, Promise<string>>();

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

async function downloadAndCache(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Image fetch failed: ${response.status}`);
  }
  const blob = await response.blob();
  const dataUri = await blobToDataUri(blob);
  memoryCache.set(url, dataUri);
  // Best-effort persistence; a write failure shouldn't stop the image from
  // being usable for the rest of this session.
  AsyncStorage.setItem(CACHE_PREFIX + url, dataUri).catch(() => {});
  return dataUri;
}

/**
 * Resolves `url` to a cached data URI, downloading + persisting it the first
 * time it's needed. Safe to call repeatedly — concurrent/duplicate calls for
 * the same url share one in-flight download.
 */
export async function resolveCachedImage(url: string): Promise<string> {
  const mem = memoryCache.get(url);
  if (mem) {
    return mem;
  }
  const stored = await AsyncStorage.getItem(CACHE_PREFIX + url);
  if (stored) {
    memoryCache.set(url, stored);
    return stored;
  }
  let promise = inFlight.get(url);
  if (!promise) {
    promise = downloadAndCache(url).finally(() => inFlight.delete(url));
    inFlight.set(url, promise);
  }
  return promise;
}

/**
 * Resolves a remote photo url to its cached local data URI.
 * `ready` is false (and `uri` undefined) until the image has actually been
 * downloaded/loaded from cache — callers use this to avoid showing an empty
 * or broken slot before a real photo is available. Passing `undefined` (no
 * photo for this item) reports `ready: true` immediately since there is
 * nothing to wait for.
 */
export function useCachedImage(url?: string): {uri?: string; ready: boolean} {
  const [uri, setUri] = useState<string | undefined>(() =>
    url ? memoryCache.get(url) : undefined,
  );

  useEffect(() => {
    if (!url) {
      setUri(undefined);
      return;
    }
    const cached = memoryCache.get(url);
    if (cached) {
      setUri(cached);
      return;
    }
    setUri(undefined);
    let cancelled = false;
    resolveCachedImage(url)
      .then(resolved => {
        if (!cancelled) {
          setUri(resolved);
        }
      })
      .catch(() => {
        // Offline with nothing cached yet, or a bad url — leave `ready`
        // false so the caller keeps the slot hidden instead of showing a
        // broken image. It'll be retried next time this url is requested
        // (e.g. next app open, or the item reappearing after a re-sample).
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return {uri, ready: url ? !!uri : true};
}

/**
 * True once every url in `urls` has been resolved (downloaded/loaded from
 * cache) — false again as soon as the url list changes (e.g. a fresh set of
 * martyr photos to fetch). A failed url (offline with nothing cached, bad
 * url) still counts as "resolved" here so the caller isn't stuck waiting
 * forever; per-item gating (`useCachedImage`) is what actually hides items
 * that never got a real photo.
 */
export function useImagesReady(urls: string[]): boolean {
  const key = urls.join('|');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (urls.length === 0) {
      setReady(true);
      return;
    }
    if (urls.every(u => memoryCache.has(u))) {
      setReady(true);
      return;
    }
    setReady(false);
    let cancelled = false;
    Promise.all(urls.map(u => resolveCachedImage(u).catch(() => undefined))).then(
      () => {
        if (!cancelled) {
          setReady(true);
        }
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return ready;
}
