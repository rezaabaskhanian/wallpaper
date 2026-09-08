import {useEffect, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {toast} from 'sonner';
import {Plus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
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
import ImageUploadField from '@/components/ImageUploadField';
import DeleteConfirmButton from '@/components/DeleteConfirmButton';
import SpotlightCard from '@/components/SpotlightCard';
import BulkActionsBar from '@/components/BulkActionsBar';
import StatusBadge from '@/components/StatusBadge';
import {useRowSelection} from '@/hooks/useRowSelection';
import {ApiError} from '@/lib/api';
import {
  useDeleteManyOrbitItems,
  useDeleteOrbitItem,
  useOrbitItems,
  useSaveOrbitItem,
  type OrbitItemInput,
} from '@/hooks/useOrbitItems';
import {useOrbitCategories} from '@/hooks/useOrbitCategories';
import type {OrbitItem} from '@/lib/types';

const EMPTY: OrbitItemInput = {
  categoryId: '',
  label: '',
  image: '',
  description: '',
  sort: 0,
  isActive: true,
};

function OrbitItemDialog({
  item,
  open,
  onOpenChange,
  presetCategoryId,
}: {
  item: OrbitItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetCategoryId?: string;
}) {
  const initialForm = () =>
    item
      ? {...item, description: item.description ?? ''}
      : {...EMPTY, categoryId: presetCategoryId ?? ''};
  const [form, setForm] = useState<OrbitItemInput>(initialForm);
  const save = useSaveOrbitItem();
  const {data: categories} = useOrbitCategories();

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
        setForm(initialForm());
        onOpenChange(o);
      }}>
      <DialogContent className="glass-panel max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'ویرایش آیتم اوربیت' : 'آیتم اوربیت جدید'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="oi-category">تم اوربیت</Label>
            <select
              id="oi-category"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={form.categoryId}
              onChange={e => setForm({...form, categoryId: e.target.value})}
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="oi-label">برچسب (زیر عکس نشون داده می‌شه)</Label>
            <Input
              id="oi-label"
              value={form.label}
              onChange={e => setForm({...form, label: e.target.value})}
              required
            />
          </div>

          <ImageUploadField
            label="عکس"
            value={form.image}
            onChange={url => setForm({...form, image: url})}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="oi-description">توضیح (وقتی روی آیتم زده می‌شود نشان داده می‌شود)</Label>
            <Textarea
              id="oi-description"
              rows={4}
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="oi-sort">ترتیب</Label>
            <Input
              id="oi-sort"
              type="number"
              className="font-mono"
              value={form.sort}
              onChange={e => setForm({...form, sort: Number(e.target.value)})}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="oi-active">فعال (در مدار نمایش داده شود)</Label>
            <Switch
              id="oi-active"
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

export default function OrbitItems() {
  const {data: items, isLoading} = useOrbitItems();
  const {data: categories} = useOrbitCategories();
  const categoryTitle = (id: string) => categories?.find(c => c.id === id)?.title ?? '';
  const del = useDeleteOrbitItem();
  const delMany = useDeleteManyOrbitItems();
  const [editing, setEditing] = useState<OrbitItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category') ?? '';

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditing(null);
      setDialogOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, {replace: true});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filtered = categoryFilter ? items?.filter(it => it.categoryId === categoryFilter) : items;
  const sel = useRowSelection(filtered);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">آیتم‌های اوربیت</h1>
          <p className="text-sm text-muted-foreground">
            لوگوها/عکس‌هایی که دور عکس مرکزی صفحهٔ اصلی می‌چرخند
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            value={categoryFilter}
            onChange={e => {
              const next = new URLSearchParams(searchParams);
              if (e.target.value) next.set('category', e.target.value);
              else next.delete('category');
              setSearchParams(next);
            }}>
            <option value="">همهٔ تم‌ها</option>
            {categories?.map(c => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <Button
            className="glow-primary"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}>
            <Plus className="size-4" />
            آیتم جدید
          </Button>
        </div>
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
              <TableHead>عکس</TableHead>
              <TableHead>برچسب</TableHead>
              <TableHead>تم</TableHead>
              <TableHead>ترتیب</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>در حال بارگذاری…</TableCell>
              </TableRow>
            ) : !filtered?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  آیتمی در این تم ثبت نشده است.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(it => (
                <TableRow key={it.id} data-state={sel.selected.has(it.id) && 'selected'}>
                  <TableCell>
                    <Checkbox
                      checked={sel.selected.has(it.id)}
                      onCheckedChange={() => sel.toggle(it.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {it.image ? (
                      <img src={it.image} alt="" className="size-10 rounded-full object-cover" />
                    ) : null}
                  </TableCell>
                  <TableCell className="font-medium">{it.label}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {categoryTitle(it.categoryId) || '—'}
                  </TableCell>
                  <TableCell className="font-mono">{it.sort}</TableCell>
                  <TableCell>
                    <StatusBadge
                      label={it.isActive ? 'فعال' : 'غیرفعال'}
                      tone={it.isActive ? 'success' : 'neutral'}
                    />
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(it);
                        setDialogOpen(true);
                      }}>
                      ویرایش
                    </Button>
                    <DeleteConfirmButton
                      itemLabel={it.label}
                      onConfirm={async () => {
                        try {
                          await del.mutateAsync(it.id);
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

      <OrbitItemDialog
        key={editing?.id ?? `new:${categoryFilter}`}
        item={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        presetCategoryId={categoryFilter}
      />
    </div>
  );
}
