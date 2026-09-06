import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {toast} from 'sonner';
import {ListPlus, Plus} from 'lucide-react';
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
  useQuoteCategories,
  useDeleteQuoteCategory,
  useSaveQuoteCategory,
  type QuoteCategoryInput,
} from '@/hooks/useQuoteCategories';
import {useQuotes} from '@/hooks/useQuotes';
import type {QuoteCategory} from '@/lib/types';

const EMPTY: QuoteCategoryInput = {id: '', title: '', sort: 0};

function toInput(category: QuoteCategory | null): QuoteCategoryInput {
  return category ? {id: category.id, title: category.title, sort: category.sort} : EMPTY;
}

function CategoryDialog({
  category,
  open,
  onOpenChange,
}: {
  category: QuoteCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<QuoteCategoryInput>(toInput(category));
  const save = useSaveQuoteCategory(!category);

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
      <DialogContent className="glass-panel max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? 'ویرایش دسته‌ی نقل‌قول' : 'دسته‌ی نقل‌قول جدید'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="qc-id">شناسه (slug)</Label>
            <Input
              id="qc-id"
              className="font-mono"
              value={form.id}
              disabled={!!category}
              onChange={e => setForm({...form, id: e.target.value})}
              placeholder="مثل hadith"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="qc-title">عنوان (نمایش در اپ)</Label>
            <Input
              id="qc-title"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              placeholder="مثل احادیث"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="qc-sort">ترتیب</Label>
            <Input
              id="qc-sort"
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

export default function QuoteCategories() {
  const {data: categories, isLoading} = useQuoteCategories();
  const {data: quotes} = useQuotes();
  const del = useDeleteQuoteCategory();
  const [editing, setEditing] = useState<QuoteCategory | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const sel = useRowSelection(categories);
  const navigate = useNavigate();
  const quoteCount = (id: string) => quotes?.filter(q => q.categoryId === id).length ?? 0;

  const bulkDelete = async () => {
    try {
      await Promise.all([...sel.selected].map(id => del.mutateAsync(id)));
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
          <h1 className="text-2xl font-bold tracking-tight">دسته‌های نقل‌قول</h1>
          <p className="text-sm text-muted-foreground">
            مثل «احادیث»، «بیانات رهبر»، «جملات انگیزشی» — کاربر در اپ یکی از این دسته‌ها را
            برای نمایش انتخاب می‌کند
          </p>
        </div>
        <Button
          className="glow-primary"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}>
          <Plus className="size-4" />
          دسته‌ی جدید
        </Button>
      </div>

      <BulkActionsBar
        count={sel.selected.size}
        onClear={sel.clear}
        onDelete={bulkDelete}
        deleting={del.isPending}
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
              <TableHead>تعداد نقل‌قول</TableHead>
              <TableHead className="w-56" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>در حال بارگذاری…</TableCell>
              </TableRow>
            ) : (
              categories?.map(c => (
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
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell className="font-mono">{c.sort}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {quoteCount(c.id)}
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/quotes?category=${c.id}&new=1`)}>
                      <ListPlus className="size-4" />
                      افزودن نقل‌قول
                    </Button>
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

      <CategoryDialog category={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
