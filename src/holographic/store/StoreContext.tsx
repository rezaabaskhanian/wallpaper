import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {fetchCatalog} from './catalog';
import {fetchMartyrs} from './martyrs';
import {fetchMartyrCategories} from './martyrCategories';
import {fetchQuotes} from './quotes';
import {fetchHero} from './hero';
import {redeemPromoCode} from './promo';
import {
  getOwnedSkus,
  isBillingAvailable,
  PREMIUM_SKU,
  purchase as billingPurchase,
} from './billing';
import type {
  Catalog,
  HeroData,
  MartyrCategory,
  MartyrItem,
  QuoteItem,
  WallpaperItem,
} from './types';

/** Persists across app restarts once a valid discount code unlocks premium. */
const PROMO_UNLOCKED_STORAGE_KEY = 'promo_unlocked';

type StoreValue = {
  catalog: Catalog | null;
  martyrs: MartyrItem[];
  martyrCategories: MartyrCategory[];
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
  /** Redeems a discount code with the backend; unlocks premium locally on success. */
  redeemCode: (code: string) => Promise<{success: boolean; message: string}>;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({children}: {children: React.ReactNode}) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [martyrs, setMartyrs] = useState<MartyrItem[]>([]);
  const [martyrCategories, setMartyrCategories] = useState<MartyrCategory[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [hero, setHero] = useState<HeroData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [owned, setOwned] = useState<string[]>([]);
  const [codeUnlocked, setCodeUnlocked] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchCatalog(),
      fetchMartyrs(),
      fetchMartyrCategories(),
      fetchQuotes(),
      fetchHero(),
    ])
      .then(([cat, ms, cats, qs, h]) => {
        setCatalog(cat);
        setMartyrs(ms);
        setMartyrCategories(cats);
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
    AsyncStorage.getItem(PROMO_UNLOCKED_STORAGE_KEY)
      .then(v => setCodeUnlocked(v === '1'))
      .catch(() => {});
  }, [reload, refreshEntitlements]);

  const premiumUnlocked = owned.includes(PREMIUM_SKU) || codeUnlocked;

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

  const redeemCode = useCallback(async (code: string) => {
    const result = await redeemPromoCode(code);
    if (result.success) {
      setCodeUnlocked(true);
      AsyncStorage.setItem(PROMO_UNLOCKED_STORAGE_KEY, '1').catch(() => {});
    }
    return result;
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      catalog,
      martyrs,
      martyrCategories,
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
      redeemCode,
    }),
    [
      catalog,
      martyrs,
      martyrCategories,
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
      redeemCode,
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
