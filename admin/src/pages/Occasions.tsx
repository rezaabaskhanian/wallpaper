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
import SpotlightCard from '@/components/SpotlightCard';
import DeleteConfirmButton from '@/components/DeleteConfirmButton';
import {ApiError} from '@/lib/api';
import {useCategories} from '@/hooks/useWallpapers';
import {useDeleteOccasion, useOccasions, useSaveOccasion} from '@/hooks/useOccasions';
import type {Occasion} from '@/lib/types';

const EMPTY: Occasion = {
  id: '',
  title: '',
  date: '',
  categoryId: '',
  notifyTitle: '',
  notifyBody: '',
  daysBefore: 3,
  isActive: true,
};

/** «۱ مهر ۱۴۰۵» برای یک تاریخ YYYY-MM-DD — فقط برای نمایش کنار تاریخ میلادی. */
function jalaliLabel(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${iso}T00:00:00Z`));
  } catch {
    return '';
  }
}

function OccasionDialog({
  occasion,
  open,
  onOpenChange,
}: {
  occasion: Occasion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<Occasion>(occasion ?? EMPTY);
  const save = useSaveOccasion(!occasion);
  const {data: categories} = useCategories();

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
          <DialogTitle>{occasion ? 'ویرایش مناسبت' : 'مناسبت جدید'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="oc-title">نام مناسبت</Label>
            <Input
              id="oc-title"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              placeholder="مثل محرم، یلدا، نوروز"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="oc-date">تاریخ (میلادی)</Label>
            <Input
              id="oc-date"
              type="date"
              className="font-mono"
              value={form.date}
              onChange={e => setForm({...form, date: e.target.value})}
              required
            />
            {form.date ? (
              <p className="text-xs text-muted-foreground">برابر با {jalaliLabel(form.date)}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              تاریخ مناسبت‌های قمری (محرم، اربعین…) هر سال عوض می‌شود؛ هر سال اینجا به‌روزش کن.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="oc-cat">دسته‌ی والپیپرهای مناسبت</Label>
            <select
              id="oc-cat"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={form.categoryId}
              onChange={e => setForm({...form, categoryId: e.target.value})}>
              <option value="">بدون دسته</option>
              {(categories ?? []).map(c => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              با زدن یادآور، همین دسته در گالری باز می‌شود و بالای گالری کارت بزرگ می‌گیرد.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="oc-days">چند روز قبل یادآوری شود</Label>
            <Input
              id="oc-days"
              type="number"
              min={0}
              max={30}
              className="font-mono"
              value={form.daysBefore}
              onChange={e => setForm({...form, daysBefore: Number(e.target.value)})}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="oc-ntitle">عنوان یادآور (اختیاری)</Label>
            <Input
              id="oc-ntitle"
              value={form.notifyTitle}
              onChange={e => setForm({...form, notifyTitle: e.target.value})}
              placeholder={`خالی بماند: «والپیپرهای ${form.title || '…'} اضافه شد»`}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="oc-nbody">متن یادآور (اختیاری)</Label>
            <Input
              id="oc-nbody"
              value={form.notifyBody}
              onChange={e => setForm({...form, notifyBody: e.target.value})}
              placeholder={`خالی بماند: «بزن و والپیپر ${form.title || '…'} رو روی گوشیت بذار.»`}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.isActive}
              onCheckedChange={v => setForm({...form, isActive: v === true})}
            />
            فعال
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

export default function Occasions() {
  const {data: occasions, isLoading} = useOccasions();
  const {data: categories} = useCategories();
  const del = useDeleteOccasion();
  const [editing, setEditing] = useState<Occasion | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // کلید تازه در هر باز شدن تا فرم از مقدار قبلی پاک شود.
  const [dialogKey, setDialogKey] = useState(0);
  const openDialog = (o: Occasion | null) => {
    setEditing(o);
    setDialogKey(k => k + 1);
    setDialogOpen(true);
  };
  const catTitle = (id: string) => categories?.find(c => c.id === id)?.title ?? id;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">مناسبت‌ها</h1>
          <p className="text-sm text-muted-foreground">
            چند روز قبل از هر مناسبت، اپ یادآور نشان می‌دهد و دسته‌اش را بالای گالری می‌آورد
          </p>
        </div>
        <Button className="glow-primary" onClick={() => openDialog(null)}>
          <Plus className="size-4" />
          مناسبت جدید
        </Button>
      </div>

      <SpotlightCard>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>نام</TableHead>
              <TableHead>تاریخ</TableHead>
              <TableHead>دسته</TableHead>
              <TableHead>یادآوری</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>در حال بارگذاری…</TableCell>
              </TableRow>
            ) : (occasions ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  هنوز مناسبتی ثبت نشده.
                </TableCell>
              </TableRow>
            ) : (
              occasions!.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.title}</TableCell>
                  <TableCell>
                    <div>{jalaliLabel(o.date)}</div>
                    <div className="font-mono text-xs text-muted-foreground">{o.date}</div>
                  </TableCell>
                  <TableCell>{o.categoryId ? catTitle(o.categoryId) : '—'}</TableCell>
                  <TableCell className="text-sm">{o.daysBefore} روز قبل</TableCell>
                  <TableCell className="text-sm">{o.isActive ? 'فعال' : 'غیرفعال'}</TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openDialog(o)}>
                      ویرایش
                    </Button>
                    <DeleteConfirmButton
                      itemLabel={o.title}
                      onConfirm={async () => {
                        try {
                          await del.mutateAsync(o.id);
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

      <OccasionDialog
        key={dialogKey}
        occasion={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
