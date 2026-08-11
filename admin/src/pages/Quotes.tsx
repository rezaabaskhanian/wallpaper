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
import type {Quote} from '@/lib/types';

const EMPTY: QuoteInput = {line1: '', line2: '', source: '', sortOrder: 0, isActive: true};

function QuoteDialog({
  quote,
  open,
  onOpenChange,
}: {
  quote: Quote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<QuoteInput>(quote ?? EMPTY);
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
        setForm(quote ?? EMPTY);
        onOpenChange(o);
      }}>
      <DialogContent className="glass-panel">
        <DialogHeader>
          <DialogTitle>{quote ? 'ویرایش نقل‌قول' : 'نقل‌قول جدید'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
  const del = useDeleteQuote();
  const delMany = useDeleteManyQuotes();
  const [editing, setEditing] = useState<Quote | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const sel = useRowSelection(quotes);

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
              <TableHead>وضعیت</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4}>در حال بارگذاری…</TableCell>
              </TableRow>
            ) : (
              quotes?.map(q => (
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

      <QuoteDialog quote={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
