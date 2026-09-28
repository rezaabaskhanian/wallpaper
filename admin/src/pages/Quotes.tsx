import {useEffect, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
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
import DeleteConfirmButton from '@/components/DeleteConfirmButton';
import SpotlightCard from '@/components/SpotlightCard';
import BulkActionsBar from '@/components/BulkActionsBar';
import StatusBadge from '@/components/StatusBadge';
import {useRowSelection} from '@/hooks/useRowSelection';
import {ApiError} from '@/lib/api';
import {
  useDeleteManyQuotes,
  useDeleteQuote,
  useQuotes,
  useSaveQuote,
  type QuoteInput,
} from '@/hooks/useQuotes';
import {useQuoteCategories} from '@/hooks/useQuoteCategories';
import type {Quote} from '@/lib/types';

const EMPTY: QuoteInput = {
  categoryId: '',
  line1: '',
  line2: '',
  source: '',
  sortOrder: 0,
  isActive: true,
};

function QuoteDialog({
  quote,
  open,
  onOpenChange,
  presetCategoryId,
}: {
  quote: Quote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetCategoryId?: string;
}) {
  const {data: categories} = useQuoteCategories();
  const initialForm = () => quote ?? {...EMPTY, categoryId: presetCategoryId ?? categories?.[0]?.id ?? ''};
  const [form, setForm] = useState<QuoteInput>(initialForm);
  const save = useSaveQuote();

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
      <DialogContent className="glass-panel">
        <DialogHeader>
          <DialogTitle>{quote ? 'ویرایش نقل‌قول' : 'نقل‌قول جدید'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="q-category">دسته</Label>
            <select
              id="q-category"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              value={form.categoryId}
              onChange={e => setForm({...form, categoryId: e.target.value})}
              required>
              <option value="" disabled>
                انتخاب دسته…
              </option>
              {categories?.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="q-line1">خط بالا (اختیاری)</Label>
            <Input id="q-line1" value={form.line1} onChange={e => setForm({...form, line1: e.target.value})} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="q-line2">خط اصلی</Label>
            <Input
              id="q-line2"
              value={form.line2}
              onChange={e => setForm({...form, line2: e.target.value})}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="q-source">منبع (اختیاری، نمایش داده نمی‌شود)</Label>
            <Input id="q-source" value={form.source} onChange={e => setForm({...form, source: e.target.value})} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="q-sort">ترتیب</Label>
            <Input
              id="q-sort"
              type="number"
              className="font-mono"
              value={form.sortOrder}
              onChange={e => setForm({...form, sortOrder: Number(e.target.value)})}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="q-active">فعال</Label>
            <Switch
              id="q-active"
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

export default function Quotes() {
  const {data: quotes, isLoading} = useQuotes();
  const {data: categories} = useQuoteCategories();
  const categoryTitle = (id: string) => categories?.find(c => c.id === id)?.title ?? '';
  const del = useDeleteQuote();
  const delMany = useDeleteManyQuotes();
  const [editing, setEditing] = useState<Quote | null>(null);
  const [dialogOpen, setDialogOpenState] = useState(false);
  // هر بار باز شدن کلید تازه می‌گیرد تا دیالوگ ری‌مونت شود و فرم از مقدار قبلی پاک شود.
  const [dialogKey, setDialogKey] = useState(0);
  const setDialogOpen = (open: boolean) => {
    if (open) setDialogKey(k => k + 1);
    setDialogOpenState(open);
  };
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

  const filtered = categoryFilter ? quotes?.filter(q => q.categoryId === categoryFilter) : quotes;
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
          <h1 className="text-2xl font-bold tracking-tight">نقل‌قول‌ها</h1>
          <p className="text-sm text-muted-foreground">متن پایین صفحه‌ی والپیپر</p>
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
            <option value="">همهٔ دسته‌ها</option>
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
            نقل‌قول جدید
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
              <TableHead>متن</TableHead>
              <TableHead>دسته</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5}>در حال بارگذاری…</TableCell>
              </TableRow>
            ) : (
              filtered?.map(q => (
                <TableRow key={q.id} data-state={sel.selected.has(q.id) && 'selected'}>
                  <TableCell>
                    <Checkbox
                      checked={sel.selected.has(q.id)}
                      onCheckedChange={() => sel.toggle(q.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {q.line1 ? <div className="text-xs text-muted-foreground">{q.line1}</div> : null}
                    <div className="font-medium">{q.line2}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {categoryTitle(q.categoryId) || '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={q.isActive ? 'فعال' : 'غیرفعال'}
                      tone={q.isActive ? 'success' : 'neutral'}
                    />
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(q);
                        setDialogOpen(true);
                      }}>
                      ویرایش
                    </Button>
                    <DeleteConfirmButton
                      itemLabel={q.line2}
                      onConfirm={async () => {
                        try {
                          await del.mutateAsync(q.id);
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

      <QuoteDialog
        key={dialogKey}
        quote={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        presetCategoryId={categoryFilter || undefined}
      />
    </div>
  );
}
