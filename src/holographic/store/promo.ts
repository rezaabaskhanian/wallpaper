import {PROMO_REDEEM_URL} from './config';

export type RedeemResult = {
  success: boolean;
  message: string;
};

/** Sends a discount code to the backend to redeem it. Never throws — network
 * errors surface as a failed RedeemResult so the UI can show a friendly message. */
export async function redeemPromoCode(code: string): Promise<RedeemResult> {
  try {
    const res = await fetch(PROMO_REDEEM_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Accept: 'application/json'},
      body: JSON.stringify({code}),
    });
    const data = (await res.json()) as Partial<RedeemResult>;
    if (!res.ok) {
      return {success: false, message: data?.message ?? 'خطا در ارتباط با سرور'};
    }
    return {success: !!data.success, message: data.message ?? ''};
  } catch {
    return {success: false, message: 'اتصال به اینترنت برقرار نیست'};
  }
}
