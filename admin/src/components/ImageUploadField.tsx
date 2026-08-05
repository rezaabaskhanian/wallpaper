import {useRef, useState} from 'react';
import {toast} from 'sonner';
import {Loader2, Upload} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {api, ApiError} from '@/lib/api';

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
};

/** A URL text field plus an "upload from device" button that fills it in. */
export default function ImageUploadField({label, value, onChange}: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const {full} = await api.upload(file);
      onChange(full);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'آپلود ناموفق بود');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <Input
          className="min-w-0 flex-1"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="آدرس تصویر یا آپلود کن"
        />
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
        </Button>
      </div>
      {value ? (
        <img src={value} alt="" className="h-24 w-24 rounded-md border object-cover" />
      ) : null}
    </div>
  );
}
