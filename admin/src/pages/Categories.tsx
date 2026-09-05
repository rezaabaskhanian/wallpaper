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
import BulkActionsBar from '@/components/BulkActionsBar';
import DeleteConfirmButton from '@/components/DeleteConfirmButton';
import {useRowSelection} from '@/hooks/useRowSelection';
import {ApiError} from '@/lib/api';
import {
  useCategories,
  useDeleteCategory,
  useDeleteManyCategories,
  useSaveCategory,
  type CategoryInput,
} from '@/hooks/useWallpapers';
import type {Category} from '@/lib/types';

const EMPTY: CategoryInput = {id: '', title: '', sort: 0, parentId: null};

function toInput(category: Category | null): CategoryInput {
  return category
    ? {id: category.id, title: category.title, sort: category.sort, parentId: category.parentId ?? null}
    : EMPTY;
}

function CategoryDialog({
  category,
  categories,
  open,
  onOpenChange,
}: {
  category: Category | null;
  categories: Category[] | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<CategoryInput>(toInput(category));
  const save = useSaveCategory(!category);

  // فقط دسته‌های اصلی (بدون والد) و غیر از خودِ دسته می‌توانند والد باشند
  // تا سلسله‌مراتب در همان دو سطح (دسته > زیردسته) بماند.
  const parentOptions = (categories ?? []).filter(
    c => !c.parentId && c.id !== category?.id,
  );

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
        setForm(toInput(category));
        onOpenChange(o);
      }}>
      <DialogContent className="glass-panel">
        <DialogHeader>
          <DialogTitle>{category ? 'ویرایش دسته' : 'دستهٔ جدید'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cat-id">شناسه (slug)</Label>
            <Input
              id="cat-id"
              className="font-mono"
              value={form.id}
              disabled={!!category}
              onChange={e => setForm({...form, id: e.target.value})}
              placeholder="مثل shohada"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cat-title">عنوان</Label>
            <Input
              id="cat-title"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cat-parent">دستهٔ والد</Label>
            <select
              id="cat-parent"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={form.parentId ?? ''}
              onChange={e => setForm({...form, parentId: e.target.value || null})}>
              <option value="">بدون والد (دستهٔ اصلی)</option>
              {parentOptions.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cat-sort">ترتیب</Label>
            <Input
              id="cat-sort"
              type="number"
              className="font-mono"
              value={form.sort}
              onChange={e => setForm({...form, sort: Number(e.target.value)})}
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

export default function Categories() {
  const {data: categories, isLoading} = useCategories();
  const del = useDeleteCategory();
  const delMany = useDeleteManyCategories();
  const [editing, setEditing] = useState<Category | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const sel = useRowSelection(categories);

  // دسته‌های اصلی به همراه زیردسته‌هایشان بلافاصله بعدشان، برای نمایش سلسله‌مراتبی.
  const orderedCategories = (() => {
    const list = categories ?? [];
    const byParent = new Map<string, Category[]>();
    for (const c of list) {
      if (c.parentId) {
        byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]);
      }
    }
    const roots = list.filter(c => !c.parentId);
    const result: {category: Category; isChild: boolean}[] = [];
    for (const root of roots) {
      result.push({category: root, isChild: false});
      for (const child of byParent.get(root.id) ?? []) {
        result.push({category: child, isChild: true});
      }
    }
    return result;
  })();

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
          <h1 className="text-2xl font-bold tracking-tight">دسته‌ها</h1>
          <p className="text-sm text-muted-foreground">دسته‌بندی والپیپرها</p>
        </div>
        <Button
          className="glow-primary"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}>
          <Plus className="size-4" />
          دستهٔ جدید
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
              <TableHead>شناسه</TableHead>
              <TableHead>عنوان</TableHead>
              <TableHead>ترتیب</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5}>در حال بارگذاری…</TableCell>
              </TableRow>
            ) : (
              orderedCategories.map(({category: c, isChild}) => (
                <TableRow key={c.id} data-state={sel.selected.has(c.id) && 'selected'}>
                  <TableCell>
                    <Checkbox
                      checked={sel.selected.has(c.id)}
                      onCheckedChange={() => sel.toggle(c.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {c.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    {isChild ? <span className="text-muted-foreground">└ </span> : null}
                    {c.title}
                  </TableCell>
                  <TableCell className="font-mono">{c.sort}</TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(c);
                        setDialogOpen(true);
                      }}>
                      ویرایش
                    </Button>
                    <DeleteConfirmButton
                      itemLabel={c.title}
                      onConfirm={async () => {
                        try {
                          await del.mutateAsync(c.id);
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

      <CategoryDialog
        category={editing}
        categories={categories}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
