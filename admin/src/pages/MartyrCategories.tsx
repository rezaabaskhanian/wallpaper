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
  useMartyrCategories,
  useDeleteMartyrCategory,
  useSaveMartyrCategory,
  type MartyrCategoryInput,
} from '@/hooks/useMartyrCategories';
import type {MartyrCategory} from '@/lib/types';

const EMPTY: MartyrCategoryInput = {title: '', sortOrder: 0};

function CategoryDialog({
  category,
  open,
  onOpenChange,
}: {
  category: MartyrCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<MartyrCategoryInput>(category ?? EMPTY);
  const save = useSaveMartyrCategory();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save.mutateAsync({...form, id: category?.id});
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
        setForm(category ?? EMPTY);
        onOpenChange(o);
      }}>
      <DialogContent className="glass-panel">
        <DialogHeader>
          <DialogTitle>{category ? 'ویرایش دسته' : 'دستهٔ جدید'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="mc-title">عنوان</Label>
            <Input
              id="mc-title"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              placeholder="مثل شهدای شاخص"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mc-sort">ترتیب</Label>
            <Input
              id="mc-sort"
              type="number"
              className="font-mono"
              value={form.sortOrder}
              onChange={e => setForm({...form, sortOrder: Number(e.target.value)})}
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

export default function MartyrCategories() {
  const {data: categories, isLoading} = useMartyrCategories();
  const del = useDeleteMartyrCategory();
  const [editing, setEditing] = useState<MartyrCategory | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const sel = useRowSelection(categories);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">دسته‌بندی شهدا</h1>
          <p className="text-sm text-muted-foreground">
            برای گروه‌بندی شهدا در فرم ثبت شهید (مثل «شهدای هسته‌ای»، «شهدای جنگ دوازده روزه»)
          </p>
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
        deleting={del.isPending}
      />

      <SpotlightCard>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox checked={sel.allSelected} onCheckedChange={sel.toggleAll} />
              </TableHead>
              <TableHead>عنوان</TableHead>
              <TableHead>ترتیب</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4}>در حال بارگذاری…</TableCell>
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
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell className="font-mono">{c.sortOrder}</TableCell>
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

      <CategoryDialog category={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
