import {NativeModules} from 'react-native';
import {PREMIUM_SKU} from './config';

/**
 * Thin JS wrapper over the native Cafe Bazaar (Poolakey) billing bridge.
 *
 * It degrades gracefully: if the native module isn't present yet (e.g. before
 * the Poolakey integration is built/rebuilt), `getOwnedSkus` returns [] and
 * `purchase` throws a typed error — so the gallery still works for free items.
 */
type BazaarBillingNative = {
  /** SKUs the user already owns (e.g. ["premium_unlock"]). */
  getPurchasedProducts: () => Promise<string[]>;
  /** Launches the Bazaar purchase flow; resolves true when the SKU is owned. */
  purchase: (sku: string) => Promise<boolean>;
};

const BazaarBilling: BazaarBillingNative | undefined =
  NativeModules.BazaarBilling;

export {PREMIUM_SKU};

/** Whether the native billing bridge is available (built + Bazaar reachable). */
export function isBillingAvailable(): boolean {
  return !!BazaarBilling?.purchase;
}

/** Returns the SKUs the user currently owns; [] if billing is unavailable. */
export async function getOwnedSkus(): Promise<string[]> {
  if (!BazaarBilling?.getPurchasedProducts) {
    return [];
  }
  try {
    return await BazaarBilling.getPurchasedProducts();
  } catch {
    return [];
  }
}

/** Starts the purchase flow for a SKU. Throws 'BILLING_UNAVAILABLE' if not built. */
export async function purchase(sku: string): Promise<boolean> {
  if (!BazaarBilling?.purchase) {
    throw new Error('BILLING_UNAVAILABLE');
  }
  return BazaarBilling.purchase(sku);
}
