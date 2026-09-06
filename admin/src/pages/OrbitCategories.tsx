import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {toast} from 'sonner';
import {ImagePlus, Plus} from 'lucide-react';
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
import ImageUploadField from '@/components/ImageUploadField';
import SpotlightCard from '@/components/SpotlightCard';
import BulkActionsBar from '@/components/BulkActionsBar';
import DeleteConfirmButton from '@/components/DeleteConfirmButton';
import {useRowSelection} from '@/hooks/useRowSelection';
import {ApiError} from '@/lib/api';
import {
  useOrbitCategories,
  useDeleteOrbitCategory,
  useSaveOrbitCategory,
  type OrbitCategoryInput,
} from '@/hooks/useOrbitCategories';
import {useOrbitItems} from '@/hooks/useOrbitItems';
import type {OrbitCategory} from '@/lib/types';

const EMPTY: OrbitCategoryInput = {
  id: '',
  title: '',
  sort: 0,
  centerImage: '',
  centerTitle: '',
  centerSlogan: '',
};

function toInput(category: OrbitCategory | null): OrbitCategoryInput {
  return category
    ? {
        id: category.id,
        title: category.title,
        sort: category.sort,
        centerImage: category.centerImage ?? '',
        centerTitle: category.centerTitle ?? '',
        centerSlogan: category.centerSlogan ?? '',
      }
    : EMPTY;
}

function CategoryDialog({
  category,
  open,
  onOpenChange,
}: {
  category: OrbitCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<OrbitCategoryInput>(toInput(category));
  const save = useSaveOrbitCategory(!category);

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
      <DialogContent className="glass-panel max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{category ? 'ویرایش تم اوربیت' : 'تم اوربیت جدید'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="oc-id">شناسه (slug)</Label>
            <Input
              id="oc-id"
              className="font-mono"
              value={form.id}
              disabled={!!category}
              onChange={e => setForm({...form, id: e.target.value})}
              placeholder="مثل nature"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="oc-title">عنوان (نمایش در تب سوییچ اپ)</Label>
            <Input
              id="oc-title"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              placeholder="مثل طبیعت"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="oc-sort">ترتیب</Label>
            <Input
              id="oc-sort"
              type="number"
              className="font-mono"
              value={form.sort}
              onChange={e => setForm({...form, sort: Number(e.target.value)})}
            />
          </div>

          <div className="rounded-lg border border-dashed p-3">
            <p className="mb-3 text-xs text-muted-foreground">
              عکس/عنوان مرکزی اختیاریه — اگه خالی بمونه، اپ همون عکس و عنوان «رهبر» رو وسط
              نشون می‌ده. پرش کن تا این تم عکس مرکزی خودش رو داشته باشه (مثلاً خورشید برای
              طبیعت).
            </p>
            <ImageUploadField
              label="عکس مرکزی (اختیاری)"
              value={form.centerImage}
              onChange={url => setForm({...form, centerImage: url})}
            />
            <div className="mt-3 flex flex-col gap-2">
              <Label htmlFor="oc-center-title">عنوان مرکزی (اختیاری)</Label>
              <Input
                id="oc-center-title"
                value={form.centerTitle}
                onChange={e => setForm({...form, centerTitle: e.target.value})}
              />
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <Label htmlFor="oc-center-slogan">شعار مرکزی (اختیاری)</Label>
              <Input
                id="oc-center-slogan"
                value={form.centerSlogan}
                onChange={e => setForm({...form, centerSlogan: e.target.value})}
              />
            </div>
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

export default function OrbitCategories() {
  const {data: categories, isLoading} = useOrbitCategories();
  const {data: items} = useOrbitItems();
  const del = useDeleteOrbitCategory();
  const [editing, setEditing] = useState<OrbitCategory | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const sel = useRowSelection(categories);
  const navigate = useNavigate();
  const itemCount = (id: string) => items?.filter(it => it.categoryId === id).length ?? 0;

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
          <h1 className="text-2xl font-bold tracking-tight">تم‌های اوربیت</h1>
          <p className="text-sm text-muted-foreground">
            دسته‌های لوگوهایی که دور عکس مرکزی صفحهٔ اصلی می‌چرخند (مثل «شهدا»، «طبیعت»)
          </p>
        </div>
        <Button
          className="glow-primary"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}>
          <Plus className="size-4" />
          تم جدید
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
              <TableHead>عکس مرکزی</TableHead>
              <TableHead>ترتیب</TableHead>
              <TableHead>تعداد آیتم</TableHead>
              <TableHead className="w-56" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>در حال بارگذاری…</TableCell>
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
                  <TableCell>
                    {c.centerImage ? (
                      <img
                        src={c.centerImage}
                        alt=""
                        className="size-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">رهبر (پیش‌فرض)</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono">{c.sort}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {itemCount(c.id)}
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/orbit-items?category=${c.id}&new=1`)}>
                      <ImagePlus className="size-4" />
                      افزودن آیتم
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
