import {useRef, useState} from 'react';
import {toast} from 'sonner';
import {Loader2, Upload} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {api, ApiError, type UploadResult} from '@/lib/api';

type Props = {
  thumb: string;
  full: string;
  onUploaded: (result: UploadResult) => void;
};

/**
 * یک آپلود، دو خروجی: بک‌اند خودش thumb (پیش‌نمایش) و full (کیفیت اصلی) را به
 * WebP تبدیل می‌کند و ابعاد/حجم را هم برمی‌گرداند، پس اینجا نیازی به آپلود جدا
 * برای هر فیلد یا وارد کردن دستی عرض/ارتفاع/حجم نیست.
 */
export default function WallpaperImageUploadField({thumb, full, onUploaded}: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const result = await api.upload(file);
      onUploaded(result);
      toast.success('عکس آپلود و تبدیل شد');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'آپلود ناموفق بود');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">تصویر والپیپر</label>
      <div className="flex items-center gap-3">
        {thumb ? (
          <img src={thumb} alt="" className="h-24 w-16 rounded-md border object-cover" />
        ) : (
          <div className="flex h-24 w-16 items-center justify-center rounded-md border border-dashed text-center text-xs text-muted-foreground">
            بدون عکس
          </div>
        )}
        <div className="flex flex-col gap-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onPick}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {uploading ? 'در حال آپلود…' : 'انتخاب و آپلود عکس'}
          </Button>
          {full ? (
            <p className="max-w-52 truncate text-xs text-muted-foreground" dir="ltr" title={full}>
              {full}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
