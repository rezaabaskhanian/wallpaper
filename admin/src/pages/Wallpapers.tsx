import {useState} from 'react';
import {toast} from 'sonner';
import {Plus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Switch} from '@/components/ui/switch';
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
import WallpaperImageUploadField from '@/components/WallpaperImageUploadField';
import DeleteConfirmButton from '@/components/DeleteConfirmButton';
import SpotlightCard from '@/components/SpotlightCard';
import BulkActionsBar from '@/components/BulkActionsBar';
import StatusBadge from '@/components/StatusBadge';
import {useRowSelection} from '@/hooks/useRowSelection';
import {ApiError} from '@/lib/api';
import {
  useCategories,
  useDeleteManyWallpapers,
  useDeleteWallpaper,
  useSaveWallpaper,
  useWallpapers,
  type WallpaperInput,
} from '@/hooks/useWallpapers';
import type {Wallpaper} from '@/lib/types';

function emptyForm(defaultCategory: string): WallpaperInput {
  return {
    title: '',
    category: defaultCategory,
    premium: false,
    thumb: '',
    full: '',
    width: 0,
    height: 0,
    bytes: 0,
    isActive: true,
  };
}

function toInput(w: Wallpaper): WallpaperInput {
  return {...w};
}

function WallpaperDialog({
  wallpaper,
  open,
  onOpenChange,
}: {
  wallpaper: Wallpaper | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {data: categories} = useCategories();
  const [form, setForm] = useState<WallpaperInput>(
    wallpaper ? toInput(wallpaper) : emptyForm(categories?.[0]?.id ?? ''),
  );
  const save = useSaveWallpaper();

  const reset = () => setForm(wallpaper ? toInput(wallpaper) : emptyForm(categories?.[0]?.id ?? ''));

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
    <Dialog
      open={open}
      onOpenChange={o => {
        reset();
        onOpenChange(o);
      }}>
      <DialogContent className="glass-panel max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{wallpaper ? 'ویرایش والپیپر' : 'والپیپر جدید'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="wp-title">عنوان</Label>
            <Input
              id="wp-title"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="wp-category">دسته</Label>
            <select
              id="wp-category"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={form.category}
              onChange={e => setForm({...form, category: e.target.value})}
              required>
              <option value="" disabled>
                انتخاب کن…
              </option>
              {categories?.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <WallpaperImageUploadField
            thumb={form.thumb}
            full={form.full}
            onUploaded={({thumb, full, width, height, bytes}) =>
              setForm({...form, thumb, full, width, height, bytes})
            }
          />

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="wp-width">عرض</Label>
              <Input
                id="wp-width"
                type="number"
                className="font-mono"
                value={form.width}
                readOnly
                disabled
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="wp-height">ارتفاع</Label>
              <Input
                id="wp-height"
                type="number"
                className="font-mono"
                value={form.height}
                readOnly
                disabled
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="wp-bytes">حجم (بایت)</Label>
              <Input
                id="wp-bytes"
                type="number"
                className="font-mono"
                value={form.bytes}
                readOnly
                disabled
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="wp-premium">پولی (پشت خرید)</Label>
            <Switch
              id="wp-premium"
              checked={form.premium}
              onCheckedChange={v => setForm({...form, premium: v})}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="wp-active">فعال (در گالری نمایش داده شود)</Label>
            <Switch
              id="wp-active"
              checked={form.isActive}
              onCheckedChange={v => setForm({...form, isActive: v})}
            />
          </div>

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

export default function Wallpapers() {
  const {data: wallpapers, isLoading} = useWallpapers();
  const del = useDeleteWallpaper();
  const delMany = useDeleteManyWallpapers();
  const [editing, setEditing] = useState<Wallpaper | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const sel = useRowSelection(wallpapers);

  const bulkDelete = async () => {
    try {
      await delMany.mutateAsync([...sel.selected]);
      toast.success('حذف گروهی انجام شد');
      sel.clear();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'حذف گروهی ناموفق بود');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">والپیپرها</h1>
          <p className="text-sm text-muted-foreground">کاتالوگ والپیپرهای اپ</p>
        </div>
        <Button
          className="glow-primary"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}>
          <Plus className="size-4" />
          والپیپر جدید
        </Button>
      </div>

      <BulkActionsBar
        count={sel.selected.size}
        onClear={sel.clear}
        onDelete={bulkDelete}
        deleting={delMany.isPending}
      />

      <SpotlightCard>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox checked={sel.allSelected} onCheckedChange={sel.toggleAll} />
              </TableHead>
              <TableHead>پیش‌نمایش</TableHead>
              <TableHead>عنوان</TableHead>
              <TableHead>دسته</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>در حال بارگذاری…</TableCell>
              </TableRow>
            ) : (
              wallpapers?.map(w => (
                <TableRow key={w.id} data-state={sel.selected.has(w.id) && 'selected'}>
                  <TableCell>
                    <Checkbox
                      checked={sel.selected.has(w.id)}
                      onCheckedChange={() => sel.toggle(w.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {w.thumb ? (
                      <img src={w.thumb} alt="" className="h-14 w-10 rounded-md object-cover" />
                    ) : null}
                  </TableCell>
                  <TableCell className="font-medium">{w.title}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {w.category}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <StatusBadge
                        label={w.isActive ? 'فعال' : 'غیرفعال'}
                        tone={w.isActive ? 'success' : 'neutral'}
                      />
                      {w.premium ? <StatusBadge label="پولی" tone="warning" /> : null}
                    </div>
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(w);
                        setDialogOpen(true);
                      }}>
                      ویرایش
                    </Button>
                    <DeleteConfirmButton
                      itemLabel={w.title}
                      onConfirm={async () => {
                        try {
                          await del.mutateAsync(w.id);
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

      <WallpaperDialog wallpaper={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
