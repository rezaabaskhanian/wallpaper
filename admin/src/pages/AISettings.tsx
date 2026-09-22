import {useEffect, useState} from 'react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import SpotlightCard from '@/components/SpotlightCard';
import {ApiError} from '@/lib/api';
import {useAISettings, useSaveAISettings} from '@/hooks/useAISettings';
import {useAIProxyStatus, useConnectAIProxy} from '@/hooks/useAIProxy';

const SELECT_CLASS =
  'h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';

type KeyFormState = {
  claudeApiKey: string;
  geminiApiKey: string;
  deepSeekApiKey: string;
  enrichmentProvider: string;
  pricePerImageToman: string;
};

const EMPTY_FORM: KeyFormState = {
  claudeApiKey: '',
  geminiApiKey: '',
  deepSeekApiKey: '',
  enrichmentProvider: 'none',
  pricePerImageToman: '0',
};

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
    if (!proxyLink.trim().startsWith('vless://')) {
      toast.error('لینک باید با vless:// شروع شود');
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
                تنها سرویسی که واقعاً عکس تولید می‌کند (Imagen) — بدون این کلید فیچر غیرفعال است.
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
              <Label htmlFor="ai-price">قیمت هر عکس (تومان)</Label>
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

            <Button type="submit" disabled={saveSettings.isPending} className="glow-primary">
              ذخیره
            </Button>
          </form>
        )}
      </SpotlightCard>

      <SpotlightCard className="max-w-lg p-6">
        <h2 className="mb-1 text-lg font-semibold">پراکسی خروجی (VLESS)</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          چون سرور از ایران به این سرویس‌ها وصل می‌شود، لینک <code>vless://...</code> رو اینجا بچسبون و
          «اتصال» رو بزن — چند ثانیه طول می‌کشد تا سایدکار xray کانفیگ جدید را بارگذاری کند.
        </p>
        <div className="flex flex-col gap-3">
          <Input
            placeholder="vless://..."
            value={proxyLink}
            onChange={e => setProxyLink(e.target.value)}
            dir="ltr"
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
    </div>
  );
}
