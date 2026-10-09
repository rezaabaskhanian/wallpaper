import {useState} from 'react';
import {toast} from 'sonner';
import {Plus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Checkbox} from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ImageUploadField from '@/components/ImageUploadField';
import SpotlightCard from '@/components/SpotlightCard';
import DeleteConfirmButton from '@/components/DeleteConfirmButton';
import {ApiError} from '@/lib/api';
import {
  useAppThemes,
  useDeleteAppTheme,
  useSaveAppTheme,
  type AppThemeInput,
} from '@/hooks/useAppThemes';
import type {AppTheme} from '@/lib/types';

const EMPTY: AppThemeInput = {
  id: '',
  title: '',
  wallpaperUrl: '',
  widgetBgSmall: '',
  widgetBgWide: '',
  textColor: '#FFFFFF',
  accentColor: '#F5E6B3',
  isPremium: false,
  sort: 0,
  isActive: true,
};

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          className="h-9 w-10 cursor-pointer rounded border bg-transparent"
          value={value.slice(0, 7)}
          onChange={e => onChange(e.target.value.toUpperCase())}
        />
        <Input
          id={id}
          className="font-mono"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#FFFFFF"
        />
      </div>
    </div>
  );
}

function ThemeDialog({
  theme,
  open,
  onOpenChange,
}: {
  theme: AppTheme | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<AppThemeInput>(theme ?? EMPTY);
  const save = useSaveAppTheme(!theme);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save.mutateAsync(form);
      toast.success('ذخیره شد');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'ذخیره ناموفق بود');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{theme ? 'ویرایش تم' : 'تم جدید'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="th-id">شناسه (slug، اختیاری)</Label>
            <Input
              id="th-id"
              className="font-mono"
              value={form.id}
              disabled={!!theme}
              onChange={e => setForm({...form, id: e.target.value})}
              placeholder="مثل night-sky — خالی بماند، خودکار ساخته می‌شود"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="th-title">نام فارسی</Label>
            <Input
              id="th-title"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              placeholder="مثل آسمان شب"
              required
            />
          </div>
          <ImageUploadField
            label="والپیپر"
            value={form.wallpaperUrl}
            onChange={url => setForm({...form, wallpaperUrl: url})}
          />
          <ImageUploadField
            label="پس‌زمینه‌ی ویجت ۲×۲ (مربعی)"
            value={form.widgetBgSmall}
            onChange={url => setForm({...form, widgetBgSmall: url})}
          />
          <ImageUploadField
            label="پس‌زمینه‌ی ویجت ۴×۲ (پهن)"
            value={form.widgetBgWide}
            onChange={url => setForm({...form, widgetBgWide: url})}
          />
          <div className="grid grid-cols-2 gap-3">
            <ColorField
              id="th-text"
              label="رنگ متن"
              value={form.textColor}
              onChange={v => setForm({...form, textColor: v})}
            />
            <ColorField
              id="th-accent"
              label="رنگ تأکید"
              value={form.accentColor}
              onChange={v => setForm({...form, accentColor: v})}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="th-sort">ترتیب</Label>
            <Input
              id="th-sort"
              type="number"
              className="font-mono"
              value={form.sort}
              onChange={e => setForm({...form, sort: Number(e.target.value)})}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.isActive}
              onCheckedChange={v => setForm({...form, isActive: v === true})}
            />
            فعال (در اپ دیده شود)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.isPremium}
              onCheckedChange={v => setForm({...form, isPremium: v === true})}
            />
            ویژه (فعلاً فقط علامت؛ پرداخت ندارد)
          </label>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending} className="glow-primary">
              ذخیره
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AppThemes() {
  const {data: themes, isLoading} = useAppThemes();
  const del = useDeleteAppTheme();
  const [editing, setEditing] = useState<AppTheme | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // کلید تازه در هر باز شدن تا فرم از مقدار قبلی پاک شود.
  const [dialogKey, setDialogKey] = useState(0);
  const openDialog = (t: AppTheme | null) => {
    setEditing(t);
    setDialogKey(k => k + 1);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">تم‌های ویجت</h1>
          <p className="text-sm text-muted-foreground">
            هر تم یک والپیپر و پس‌زمینه‌ی ویجت‌های صفحه‌ی اصلی با همان طرح است
          </p>
        </div>
        <Button className="glow-primary" onClick={() => openDialog(null)}>
          <Plus className="size-4" />
          تم جدید
        </Button>
      </div>

      <SpotlightCard>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>پیش‌نمایش</TableHead>
              <TableHead>نام</TableHead>
              <TableHead>رنگ‌ها</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead>ترتیب</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>در حال بارگذاری…</TableCell>
              </TableRow>
            ) : (themes ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  هنوز تمی نیست. تا وقتی تمی اضافه نشود، اپ تم نمونه‌ی داخلی را نشان می‌دهد.
                </TableCell>
              </TableRow>
            ) : (
              themes!.map(t => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <img
                        src={t.wallpaperUrl}
                        alt=""
                        className="h-16 w-9 rounded border object-cover"
                      />
                      {t.widgetBgWide ? (
                        <img
                          src={t.widgetBgWide}
                          alt=""
                          className="h-8 w-16 rounded border object-cover"
                        />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <span
                        className="size-5 rounded-full border"
                        style={{background: t.textColor}}
                        title={t.textColor}
                      />
                      <span
                        className="size-5 rounded-full border"
                        style={{background: t.accentColor}}
                        title={t.accentColor}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {t.isActive ? 'فعال' : 'غیرفعال'}
                    {t.isPremium ? ' · ویژه' : ''}
                  </TableCell>
                  <TableCell className="font-mono">{t.sort}</TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openDialog(t)}>
                      ویرایش
                    </Button>
                    <DeleteConfirmButton
                      itemLabel={t.title}
                      onConfirm={async () => {
                        try {
                          await del.mutateAsync(t.id);
                          toast.success('حذف شد');
                        } catch (err) {
                          toast.error(err instanceof ApiError ? err.message : 'حذف ناموفق بود');
                        }
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </SpotlightCard>

      <ThemeDialog
        key={dialogKey}
        theme={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
