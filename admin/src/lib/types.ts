export type Category = {
  id: string;
  title: string;
  sort: number;
  parentId?: string | null;
};

export type Wallpaper = {
  id: string;
  title: string;
  category: string;
  premium: boolean;
  thumb: string;
  full: string;
  width: number;
  height: number;
  bytes: number;
  isActive: boolean;
  /** How many times this wallpaper has actually been applied on a device —
   * see the backend's TrackDownload. Use it to spot unused wallpapers to
   * prune. */
  downloadCount: number;
};

export type Martyr = {
  id: string;
  name: string;
  martyrdom: string;
  born: string;
  martyredOn: string;
  place: string;
  will: string;
  photo: string;
  sortOrder: number;
  isActive: boolean;
  categoryId: string;
};

export type MartyrCategory = {
  id: string;
  title: string;
  sortOrder: number;
};

export type OrbitCategory = {
  id: string;
  title: string;
  sort: number;
  centerImage?: string;
  centerTitle?: string;
  centerSlogan?: string;
};

export type OrbitItem = {
  id: string;
  categoryId: string;
  label: string;
  image: string;
  description?: string;
  sort: number;
  isActive: boolean;
};

export type QuoteCategory = {
  id: string;
  title: string;
  sort: number;
};

export type Quote = {
  id: string;
  categoryId: string;
  line1: string;
  line2: string;
  source: string;
  sortOrder: number;
  isActive: boolean;
};

export type Hero = {
  title: string;
  slogan: string;
  image: string;
};

export type PromoCode = {
  id: string;
  code: string;
  isActive: boolean;
  usedCount: number;
};

export type AISettings = {
  claudeKeySet: boolean;
  claudeKeyMasked: string;
  geminiKeySet: boolean;
  geminiKeyMasked: string;
  deepSeekKeySet: boolean;
  deepSeekKeyMasked: string;
  /** "none" | "claude" | "deepseek" — فقط Gemini عکس می‌سازد؛ این‌ها فقط prompt را غنی می‌کنند. */
  enrichmentProvider: string;
  pricePerImageToman: number;
  /** نرخ هر ۱ میلیون توکن ورودی/خروجی gemini-2.5-flash-image (دلار) — برای محاسبه‌ی هزینه‌ی واقعی هر تولید. */
  geminiInputPriceUsdPerMTok: number;
  geminiOutputPriceUsdPerMTok: number;
  usdToTomanRate: number;
};

export type UpdateAISettingsInput = {
  claudeApiKey?: string;
  geminiApiKey?: string;
  deepSeekApiKey?: string;
  enrichmentProvider: string;
  pricePerImageToman: number;
  geminiInputPriceUsdPerMTok: number;
  geminiOutputPriceUsdPerMTok: number;
  usdToTomanRate: number;
};

export type AIProxyStatus = {
  connected: boolean;
  ip?: string;
  country?: string;
  org?: string;
  message: string;
  link?: string;
};

export type AIGenerationLog = {
  id: number;
  deviceId: string;
  prompt: string;
  imageUrl: string;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  costToman: number;
  createdAt: string;
};

export type AIGenerationLogsResponse = {
  logs: AIGenerationLog[];
  totalCount: number;
  totalCostUsd: number;
  totalCostToman: number;
  totalTokens: number;
};

// GET /admin/analytics — see backend's analyticsservice/dto.
export type AnalyticsDaily = {
  date: string;
  opens: number;
  activeDevices: number;
  newDevices: number;
  wallpaperSets: number;
  wallpaperSetters: number;
};

// ماندگاری یک گروه از کاربران جدید؛ درصد = Retained / Eligible.
export type AnalyticsCohort = {
  label: string;
  newDevices: number;
  setWallpaperDay0: number;
  d1Eligible: number;
  d1Retained: number;
  d7Eligible: number;
  d7Retained: number;
};

export type AnalyticsSource = {
  source: string;
  method: string;
  sets: number;
  devices: number;
};

export type AnalyticsSummary = {
  days: number;
  daily: AnalyticsDaily[];
  versions: AnalyticsCohort[];
  setters: AnalyticsCohort;
  nonSetters: AnalyticsCohort;
  sources: AnalyticsSource[];
  // دستگاه‌های یکتا در هر مرحله‌ی قیف لانچر.
  launcher: {shown: number; accepted: number; enabled: number};
};
