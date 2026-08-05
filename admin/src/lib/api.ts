const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8090/api/v1';
const ADMIN_KEY_STORAGE_KEY = 'admin_key';
// Separate from the key itself: the key may legitimately be an empty string
// when the backend has no ADMIN_API_KEY configured (open dev mode), so we
// need an explicit flag for "a successful login happened" vs "never logged in".
const ADMIN_AUTHED_STORAGE_KEY = 'admin_authed';

export function getAdminKey(): string {
  return localStorage.getItem(ADMIN_KEY_STORAGE_KEY) ?? '';
}

export function isAuthed(): boolean {
  return localStorage.getItem(ADMIN_AUTHED_STORAGE_KEY) === '1';
}

export function setAdminKey(key: string): void {
  localStorage.setItem(ADMIN_KEY_STORAGE_KEY, key);
  localStorage.setItem(ADMIN_AUTHED_STORAGE_KEY, '1');
}

export function clearAdminKey(): void {
  localStorage.removeItem(ADMIN_KEY_STORAGE_KEY);
  localStorage.removeItem(ADMIN_AUTHED_STORAGE_KEY);
}

// خروجی POST /admin/upload: بک‌اند از هر آپلود دو نسخه‌ی WebP می‌سازد
// (thumb برای گرید، full برای کیفیت اصلی) و ابعاد/حجم نسخه‌ی full را هم برمی‌گرداند.
export type UploadResult = {
  thumb: string;
  full: string;
  width: number;
  height: number;
  bytes: number;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('X-Admin-Key', getAdminKey());
  if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {...options, headers});

  if (res.status === 401) {
    clearAdminKey();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'دسترسی ادمین نامعتبر است');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.message ?? `درخواست ناموفق (${res.status})`);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {method: 'POST', body: JSON.stringify(body)}),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, {method: 'PUT', body: JSON.stringify(body)}),
  delete: <T>(path: string) => request<T>(path, {method: 'DELETE'}),
  upload: (file: File): Promise<UploadResult> => {
    const form = new FormData();
    form.append('file', file);
    return request<UploadResult>('/admin/upload', {method: 'POST', body: form});
  },
};
