import {AI_CREDITS_REDEEM_URL, AI_GENERATE_URL} from './config';
import {getDeviceId} from './deviceId';

/**
 * Thrown when this device has used its free generation and has no purchased
 * credits left — the caller should offer buying the ai_credits pack (see
 * StoreContext's buyAICredits).
 */
export class NoCreditsError extends Error {
  sku: string;
  constructor(sku: string) {
    super('سهمیه‌ی رایگان و موجودی اعتبار این دستگاه به پایان رسیده است');
    this.sku = sku;
  }
}

/**
 * Asks the backend to generate a wallpaper image from a text description
 * (see backend's aigenerateservice). First call per device is free; after
 * that it's deducted from purchased credits, throwing NoCreditsError once
 * both are exhausted.
 */
export async function generateWallpaperFromText(prompt: string): Promise<{imageUrl: string}> {
  const deviceId = await getDeviceId();
  const res = await fetch(AI_GENERATE_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({deviceId, prompt}),
  });

  if (res.status === 402) {
    const body = await res.json().catch(() => ({}));
    throw new NoCreditsError(body?.sku ?? 'ai_credits');
  }
  if (!res.ok) {
    throw new Error(`ai-generate HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Tells the backend about a just-completed ai_credits purchase so it can
 * verify it with Cafe Bazaar's server API and add the credits to this
 * device's balance. Call bazaar.consumePurchase(purchaseToken) only after
 * this resolves successfully, so the SKU becomes purchasable again.
 */
export async function redeemAICredits(purchaseToken: string): Promise<{creditsGranted: number}> {
  const deviceId = await getDeviceId();
  const res = await fetch(AI_CREDITS_REDEEM_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({deviceId, purchaseToken}),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `ai-credits-redeem HTTP ${res.status}`);
  }
  return res.json();
}
