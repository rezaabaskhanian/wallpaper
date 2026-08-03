import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {fetchCatalog} from './catalog';
import {fetchMartyrs} from './martyrs';
import {fetchQuotes} from './quotes';
import {fetchHero} from './hero';
import {
  getOwnedSkus,
  isBillingAvailable,
  PREMIUM_SKU,
  purchase as billingPurchase,
} from './billing';
import type {Catalog, HeroData, MartyrItem, QuoteItem, WallpaperItem} from './types';

type StoreValue = {
  catalog: Catalog | null;
  martyrs: MartyrItem[];
  quotes: QuoteItem[];
  hero: HeroData | null;
  loading: boolean;
  error: string | null;
  /** SKUs the user owns. */
  owned: string[];
  /** True once the premium unlock is owned. */
  premiumUnlocked: boolean;
  /** Whether native billing is wired up. */
  billingAvailable: boolean;
  /** Re-fetch the catalog. */
  reload: () => void;
  /** Re-query owned SKUs from Bazaar. */
  refreshEntitlements: () => Promise<void>;
  /** Launch the "unlock all" purchase; returns true on success. */
  buyUnlock: () => Promise<boolean>;
  /** Whether a given wallpaper is accessible to the user. */
  isUnlocked: (item: WallpaperItem) => boolean;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({children}: {children: React.ReactNode}) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [martyrs, setMartyrs] = useState<MartyrItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [hero, setHero] = useState<HeroData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [owned, setOwned] = useState<string[]>([]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchCatalog(), fetchMartyrs(), fetchQuotes(), fetchHero()])
      .then(([cat, ms, qs, h]) => {
        setCatalog(cat);
        setMartyrs(ms);
        setQuotes(qs);
        setHero(h);
      })
      .catch(e => setError(e?.message ?? 'خطا در دریافت اطلاعات'))
      .finally(() => setLoading(false));
  }, []);

  const refreshEntitlements = useCallback(async () => {
    setOwned(await getOwnedSkus());
  }, []);

  useEffect(() => {
    reload();
    refreshEntitlements();
  }, [reload, refreshEntitlements]);

  const premiumUnlocked = owned.includes(PREMIUM_SKU);

  const isUnlocked = useCallback(
    (item: WallpaperItem) => !item.premium || premiumUnlocked,
    [premiumUnlocked],
  );

  const buyUnlock = useCallback(async () => {
    const ok = await billingPurchase(PREMIUM_SKU);
    if (ok) {
      await refreshEntitlements();
    }
    return ok;
  }, [refreshEntitlements]);

  const value = useMemo<StoreValue>(
    () => ({
      catalog,
      martyrs,
      quotes,
      hero,
      loading,
      error,
      owned,
      premiumUnlocked,
      billingAvailable: isBillingAvailable(),
      reload,
      refreshEntitlements,
      buyUnlock,
      isUnlocked,
    }),
    [
      catalog,
      martyrs,
      quotes,
      hero,
      loading,
      error,
      owned,
      premiumUnlocked,
      reload,
      refreshEntitlements,
      buyUnlock,
      isUnlocked,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used inside <StoreProvider>');
  }
  return ctx;
}
