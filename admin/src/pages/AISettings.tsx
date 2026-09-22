import {useEffect, useState} from 'react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import SpotlightCard from '@/components/SpotlightCard';
import {ApiError} from '@/lib/api';
import {useAISettings, useSaveAISettings} from '@/hooks/useAISettings';
import {useAIProxyStatus, useConnectAIProxy} from '@/hooks/useAIProxy';
import {useAIGenerationLogs} from '@/hooks/useAIGenerationLogs';

const SELECT_CLASS =
  'h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';

// پیشوندهایی که پارسر پراکسی سمت بک‌اند می‌پذیرد — ببینید
// aiproxyservice.parseProxyLink. JSON خام (شروع با "{") هم پذیرفته می‌شود.
const SUPPORTED_PROXY_PREFIXES = ['vless://', 'vmess://', 'trojan://', 'ss://'];

function isValidProxyInput(value: string): boolean {
  const trimmed = value.trim();
  return SUPPORTED_PROXY_PREFIXES.some(p => trimmed.startsWith(p)) || trimmed.startsWith('{');
}

type KeyFormState = {
  claudeApiKey: string;
  geminiApiKey: string;
  deepSeekApiKey: string;
  enrichmentProvider: string;
  pricePerImageToman: string;
  geminiInputPriceUsdPerMTok: string;
  geminiOutputPriceUsdPerMTok: string;
  usdToTomanRate: string;
};

const EMPTY_FORM: KeyFormState = {
  claudeApiKey: '',
  geminiApiKey: '',
  deepSeekApiKey: '',
  enrichmentProvider: 'none',
  pricePerImageToman: '0',
  geminiInputPriceUsdPerMTok: '0.3',
  geminiOutputPriceUsdPerMTok: '30',
  usdToTomanRate: '0',
};

const numberFormat = new Intl.NumberFormat('fa-IR');
const usdFormat = new Intl.NumberFormat('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 6});

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fa-IR');
  } catch {
    return iso;
  }
}

function GenerationLogsSection() {
  const LIMIT = 20;
  const [offset, setOffset] = useState(0);
  const {data, isLoading, isFetching} = useAIGenerationLogs(LIMIT, offset);

  const totalCount = data?.totalCount ?? 0;
  const hasNext = offset + LIMIT < totalCount;
  const hasPrev = offset > 0;

  return (
    <SpotlightCard className="p-6">
      <h2 className="mb-1 text-lg font-semibold">تاریخچه‌ی هزینه‌ی تولید عکس</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        هزینه‌ی واقعی هر تولید از روی توکن مصرف‌شده‌ی مدل Gemini و نرخ‌های بالا محاسبه می‌شود — این
        همان هزینه‌ای است که به گوگل پرداخت می‌شود، نه قیمت فروش به کاربر.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">تعداد کل تولیدها</p>
          <p className="font-mono text-lg font-semibold">{numberFormat.format(data?.totalCount ?? 0)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">مجموع توکن</p>
          <p className="font-mono text-lg font-semibold">{numberFormat.format(data?.totalTokens ?? 0)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">مجموع هزینه (دلار)</p>
          <p className="font-mono text-lg font-semibold" dir="ltr">
            ${usdFormat.format(data?.totalCostUsd ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">مجموع هزینه (تومان)</p>
          <p className="font-mono text-lg font-semibold">{numberFormat.format(data?.totalCostToman ?? 0)}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>زمان</TableHead>
              <TableHead>دستگاه</TableHead>
              <TableHead>توضیح</TableHead>
              <TableHead>توکن (ورودی/خروجی)</TableHead>
              <TableHead>هزینه</TableHead>
              <TableHead>عکس</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>در حال بارگذاری…</TableCell>
              </TableRow>
            ) : !data?.logs.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  هنوز هیچ تولیدی ثبت نشده است.
                </TableCell>
              </TableRow>
            ) : (
              data.logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs">{formatDateTime(log.createdAt)}</TableCell>
                  <TableCell className="max-w-28 truncate font-mono text-xs" title={log.deviceId}>
                    {log.deviceId}
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-xs" title={log.prompt}>
                    {log.prompt}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {numberFormat.format(log.promptTokens)} / {numberFormat.format(log.outputTokens)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    ${usdFormat.format(log.costUsd)} — {numberFormat.format(log.costToman)} ت
                  </TableCell>
                  <TableCell>
                    <a
                      href={log.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline underline-offset-2">
                      مشاهده
                    </a>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {totalCount > 0 &&
            `${numberFormat.format(offset + 1)}–${numberFormat.format(Math.min(offset + LIMIT, totalCount))} از ${numberFormat.format(totalCount)}`}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPrev || isFetching}
            onClick={() => setOffset(o => Math.max(0, o - LIMIT))}>
            قبلی
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext || isFetching}
            onClick={() => setOffset(o => o + LIMIT)}>
            بعدی
          </Button>
        </div>
      </div>
    </SpotlightCard>
  );
}

export default function AISettings() {
  const {data: settings, isLoading} = useAISettings();
  const saveSettings = useSaveAISettings();
  const [form, setForm] = useState<KeyFormState>(EMPTY_FORM);

  useEffect(() => {
    if (!settings) return;
    setForm(f => ({
      ...f,
      enrichmentProvider: settings.enrichmentProvider,
      pricePerImageToman: String(settings.pricePerImageToman),
      geminiInputPriceUsdPerMTok: String(settings.geminiInputPriceUsdPerMTok),
      geminiOutputPriceUsdPerMTok: String(settings.geminiOutputPriceUsdPerMTok),
      usdToTomanRate: String(settings.usdToTomanRate),
    }));
  }, [settings]);

  const onSubmitKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveSettings.mutateAsync({
        claudeApiKey: form.claudeApiKey || undefined,
        geminiApiKey: form.geminiApiKey || undefined,
        deepSeekApiKey: form.deepSeekApiKey || undefined,
        enrichmentProvider: form.enrichmentProvider,
        pricePerImageToman: Number(form.pricePerImageToman) || 0,
        geminiInputPriceUsdPerMTok: Number(form.geminiInputPriceUsdPerMTok) || 0,
        geminiOutputPriceUsdPerMTok: Number(form.geminiOutputPriceUsdPerMTok) || 0,
        usdToTomanRate: Number(form.usdToTomanRate) || 0,
      });
      toast.success('ذخیره شد');
      setForm(f => ({...f, claudeApiKey: '', geminiApiKey: '', deepSeekApiKey: ''}));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'ذخیره ناموفق بود');
    }
  };

  const {data: proxyStatus, isFetching: proxyLoading, refetch: refetchProxyStatus} = useAIProxyStatus();
  const connectProxy = useConnectAIProxy();
  const [proxyLink, setProxyLink] = useState('');

  useEffect(() => {
    if (proxyStatus?.link) setProxyLink(proxyStatus.link);
  }, [proxyStatus?.link]);

  const onConnectProxy = async () => {
    if (!isValidProxyInput(proxyLink)) {
      toast.error('لینک باید با vless://, vmess://, trojan://, ss:// شروع شود یا یک JSON کامل outbound باشد');
      return;
    }
    try {
      const s = await connectProxy.mutateAsync(proxyLink.trim());
      toast[s.connected ? 'success' : 'error'](
        s.connected ? '✅ به پراکسی وصل شد' : `اتصال برقرار نشد: ${s.message}`,
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'اتصال ناموفق بود');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">تنظیمات AI</h1>
        <p className="text-sm text-muted-foreground">
          کلیدهای سرویس‌های هوش‌مصنوعی برای فیچر «ساخت والپیپر با توضیح متنی»
        </p>
      </div>

      <SpotlightCard className="max-w-lg p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
        ) : (
          <form onSubmit={onSubmitKeys} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ai-gemini">
                کلید Gemini <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ai-gemini"
                type="password"
                placeholder={settings?.geminiKeySet ? settings.geminiKeyMasked : 'کلید ست نشده'}
                value={form.geminiApiKey}
                onChange={e => setForm({...form, geminiApiKey: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">
                تنها سرویسی که واقعاً عکس تولید می‌کند (gemini-2.5-flash-image) — بدون این کلید فیچر
                غیرفعال است.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ai-claude">کلید Claude (اختیاری)</Label>
              <Input
                id="ai-claude"
                type="password"
                placeholder={settings?.claudeKeySet ? settings.claudeKeyMasked : 'کلید ست نشده'}
                value={form.claudeApiKey}
                onChange={e => setForm({...form, claudeApiKey: e.target.value})}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ai-deepseek">کلید DeepSeek (اختیاری)</Label>
              <Input
                id="ai-deepseek"
                type="password"
                placeholder={settings?.deepSeekKeySet ? settings.deepSeekKeyMasked : 'کلید ست نشده'}
                value={form.deepSeekApiKey}
                onChange={e => setForm({...form, deepSeekApiKey: e.target.value})}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ai-enrichment">غنی‌سازی prompt پیش از تولید عکس</Label>
              <select
                id="ai-enrichment"
                className={SELECT_CLASS}
                value={form.enrichmentProvider}
                onChange={e => setForm({...form, enrichmentProvider: e.target.value})}>
                <option value="none">بدون غنی‌سازی (همان متن کاربر)</option>
                <option value="claude">Claude</option>
                <option value="deepseek">DeepSeek</option>
              </select>
              <p className="text-xs text-muted-foreground">
                کلود و دیپ‌سیک عکس تولید نمی‌کنند، فقط توضیح کاربر را قبل از ارسال به Gemini بهتر/ترجمه می‌کنند.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ai-price">قیمت فروش هر عکس به کاربر (تومان)</Label>
              <Input
                id="ai-price"
                type="number"
                min={0}
                value={form.pricePerImageToman}
                onChange={e => setForm({...form, pricePerImageToman: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">
                فعلاً فقط ذخیره می‌شود (اعمال واقعی‌اش بعد از وصل‌شدن اشتراک بازار انجام می‌شود).
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="mb-3 text-sm font-medium">هزینه‌ی واقعی Gemini (برای محاسبه‌ی جدول پایین)</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ai-gemini-in" className="text-xs">
                    ورودی ($ / ۱M توکن)
                  </Label>
                  <Input
                    id="ai-gemini-in"
                    type="number"
                    min={0}
                    step="0.0001"
                    dir="ltr"
                    value={form.geminiInputPriceUsdPerMTok}
                    onChange={e => setForm({...form, geminiInputPriceUsdPerMTok: e.target.value})}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ai-gemini-out" className="text-xs">
                    خروجی ($ / ۱M توکن)
                  </Label>
                  <Input
                    id="ai-gemini-out"
                    type="number"
                    min={0}
                    step="0.0001"
                    dir="ltr"
                    value={form.geminiOutputPriceUsdPerMTok}
                    onChange={e => setForm({...form, geminiOutputPriceUsdPerMTok: e.target.value})}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ai-usd-toman" className="text-xs">
                    نرخ دلار (تومان)
                  </Label>
                  <Input
                    id="ai-usd-toman"
                    type="number"
                    min={0}
                    dir="ltr"
                    value={form.usdToTomanRate}
                    onChange={e => setForm({...form, usdToTomanRate: e.target.value})}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                نرخ‌های پیش‌فرض قیمت رسمی گوگل برای gemini-2.5-flash-image است — چون نرخ دلار نوسان
                دارد، «نرخ دلار» را باید خودتان به‌روز نگه دارید تا ستون تومان جدول پایین درست باشد.
              </p>
            </div>

            <Button type="submit" disabled={saveSettings.isPending} className="glow-primary">
              ذخیره
            </Button>
          </form>
        )}
      </SpotlightCard>

      <SpotlightCard className="max-w-lg p-6">
        <h2 className="mb-1 text-lg font-semibold">پراکسی خروجی (اکانت فیلترشکن)</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          چون سرور از ایران به این سرویس‌ها وصل می‌شود، اکانت فیلترشکن (
          <code>vless://</code>, <code>vmess://</code>, <code>trojan://</code>, <code>ss://</code>، یا یک
          JSON کامل outbound برای کانفیگ‌های خاص) رو اینجا بچسبون و «اتصال» رو بزن — چند ثانیه طول
          می‌کشد تا سایدکار xray کانفیگ جدید را بارگذاری کند.
        </p>
        <div className="flex flex-col gap-3">
          <Textarea
            placeholder="vless://... یا vmess://... یا trojan://... یا ss://... یا { ... JSON outbound }"
            value={proxyLink}
            onChange={e => setProxyLink(e.target.value)}
            dir="ltr"
            rows={3}
            className="font-mono text-xs"
          />
          <div className="flex gap-2">
            <Button onClick={onConnectProxy} disabled={connectProxy.isPending} className="glow-primary">
              {connectProxy.isPending ? 'در حال اتصال...' : 'اتصال'}
            </Button>
            <Button variant="outline" onClick={() => refetchProxyStatus()} disabled={proxyLoading}>
              {proxyLoading ? '...' : 'تست وضعیت'}
            </Button>
          </div>
          {proxyStatus && (
            <p className={`text-sm ${proxyStatus.connected ? 'text-emerald-500' : 'text-destructive'}`}>
              {proxyStatus.connected
                ? `✅ وصل — IP: ${proxyStatus.ip} (${proxyStatus.country}${proxyStatus.org ? `, ${proxyStatus.org}` : ''}) — حالا می‌تونی والپیپر با AI بسازی`
                : `❌ وصل نیست — ${proxyStatus.message}`}
            </p>
          )}
        </div>
      </SpotlightCard>

      <GenerationLogsSection />
    </div>
  );
}
