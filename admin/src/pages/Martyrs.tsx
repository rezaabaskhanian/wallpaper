import {useState} from 'react';
import {toast} from 'sonner';
import {Plus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
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
  useDeleteManyMartyrs,
  useDeleteMartyr,
  useMartyrs,
  useSaveMartyr,
  type MartyrInput,
} from '@/hooks/useMartyrs';
import type {Martyr} from '@/lib/types';

const EMPTY: MartyrInput = {
  name: '',
  martyrdom: '',
  born: '',
  martyredOn: '',
  place: '',
  will: '',
  photo: '',
  sortOrder: 0,
  isActive: true,
};

function MartyrDialog({
  martyr,
  open,
  onOpenChange,
}: {
  martyr: Martyr | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<MartyrInput>(martyr ?? EMPTY);
  const save = useSaveMartyr();

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
        setForm(martyr ?? EMPTY);
        onOpenChange(o);
      }}>
      <DialogContent className="glass-panel max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{martyr ? 'ویرایش شهید' : 'شهید جدید'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="m-name">نام</Label>
            <Input
              id="m-name"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              required
            />
          </div>

          <ImageUploadField label="عکس" value={form.photo} onChange={url => setForm({...form, photo: url})} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="m-martyrdom">نحوهٔ شهادت</Label>
            <Textarea
              id="m-martyrdom"
              rows={4}
              value={form.martyrdom}
              onChange={e => setForm({...form, martyrdom: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="m-born">تولد</Label>
              <Input id="m-born" value={form.born} onChange={e => setForm({...form, born: e.target.value})} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="m-martyredOn">تاریخ شهادت</Label>
              <Input
                id="m-martyredOn"
                value={form.martyredOn}
                onChange={e => setForm({...form, martyredOn: e.target.value})}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="m-place">محل شهادت</Label>
            <Input id="m-place" value={form.place} onChange={e => setForm({...form, place: e.target.value})} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="m-will">از وصیت‌نامه (اختیاری)</Label>
            <Textarea
              id="m-will"
              rows={3}
              value={form.will}
              onChange={e => setForm({...form, will: e.target.value})}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="m-sort">ترتیب</Label>
            <Input
              id="m-sort"
              type="number"
              className="font-mono"
              value={form.sortOrder}
              onChange={e => setForm({...form, sortOrder: Number(e.target.value)})}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="m-active">فعال (در مدار نمایش داده شود)</Label>
            <Switch
              id="m-active"
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

export default function Martyrs() {
  const {data: martyrs, isLoading} = useMartyrs();
  const del = useDeleteMartyr();
  const delMany = useDeleteManyMartyrs();
  const [editing, setEditing] = useState<Martyr | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const sel = useRowSelection(martyrs);

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
          <h1 className="text-2xl font-bold tracking-tight">شهدا</h1>
          <p className="text-sm text-muted-foreground">گالری اوربیت شهدا</p>
        </div>
        <Button
          className="glow-primary"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}>
          <Plus className="size-4" />
          شهید جدید
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
              <TableHead>عکس</TableHead>
              <TableHead>نام</TableHead>
              <TableHead>تاریخ شهادت</TableHead>
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
              martyrs?.map(m => (
                <TableRow key={m.id} data-state={sel.selected.has(m.id) && 'selected'}>
                  <TableCell>
                    <Checkbox
                      checked={sel.selected.has(m.id)}
                      onCheckedChange={() => sel.toggle(m.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {m.photo ? (
                      <img src={m.photo} alt="" className="size-10 rounded-full object-cover" />
                    ) : null}
                  </TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {m.martyredOn}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={m.isActive ? 'فعال' : 'غیرفعال'}
                      tone={m.isActive ? 'success' : 'neutral'}
                    />
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(m);
                        setDialogOpen(true);
                      }}>
                      ویرایش
                    </Button>
                    <DeleteConfirmButton
                      itemLabel={m.name}
                      onConfirm={async () => {
                        try {
                          await del.mutateAsync(m.id);
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

      <MartyrDialog martyr={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
