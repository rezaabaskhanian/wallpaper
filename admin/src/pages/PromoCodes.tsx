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
  usePromoCodes,
  useDeletePromoCode,
  useSavePromoCode,
  type PromoCodeInput,
} from '@/hooks/usePromoCodes';
import type {PromoCode} from '@/lib/types';

const EMPTY: PromoCodeInput = {code: '', isActive: true};

function PromoCodeDialog({
  promoCode,
  open,
  onOpenChange,
}: {
  promoCode: PromoCode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<PromoCodeInput>(promoCode ?? EMPTY);
  const save = useSavePromoCode();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save.mutateAsync({...form, id: promoCode?.id});
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
        setForm(promoCode ?? EMPTY);
        onOpenChange(o);
      }}>
      <DialogContent className="glass-panel">
        <DialogHeader>
          <DialogTitle>{promoCode ? 'ویرایش کد تخفیف' : 'کد تخفیف جدید'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pc-code">کد</Label>
            <Input
              id="pc-code"
              className="font-mono uppercase"
              value={form.code}
              onChange={e => setForm({...form, code: e.target.value})}
              placeholder="مثل EID1404"
              required
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="pc-active">فعال</Label>
            <Switch
              id="pc-active"
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

export default function PromoCodes() {
  const {data: promoCodes, isLoading} = usePromoCodes();
  const del = useDeletePromoCode();
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const sel = useRowSelection(promoCodes);

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
          <h1 className="text-2xl font-bold tracking-tight">کدهای تخفیف</h1>
          <p className="text-sm text-muted-foreground">
            وارد کردن یک کد فعال در اپ، همهٔ والپیپرهای پرمیوم را برای کاربر باز می‌کند
          </p>
        </div>
        <Button
          className="glow-primary"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}>
          <Plus className="size-4" />
          کد جدید
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
              <TableHead>کد</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead>تعداد استفاده</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5}>در حال بارگذاری…</TableCell>
              </TableRow>
            ) : (
              promoCodes?.map(p => (
                <TableRow key={p.id} data-state={sel.selected.has(p.id) && 'selected'}>
                  <TableCell>
                    <Checkbox
                      checked={sel.selected.has(p.id)}
                      onCheckedChange={() => sel.toggle(p.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono font-medium">{p.code}</TableCell>
                  <TableCell>
                    <StatusBadge
                      label={p.isActive ? 'فعال' : 'غیرفعال'}
                      tone={p.isActive ? 'success' : 'neutral'}
                    />
                  </TableCell>
                  <TableCell className="font-mono">{p.usedCount}</TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(p);
                        setDialogOpen(true);
                      }}>
                      ویرایش
                    </Button>
                    <DeleteConfirmButton
                      itemLabel={p.code}
                      onConfirm={async () => {
                        try {
                          await del.mutateAsync(p.id);
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

      <PromoCodeDialog promoCode={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
