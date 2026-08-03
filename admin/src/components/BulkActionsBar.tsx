import {Trash2, X} from 'lucide-react';
import {Button} from '@/components/ui/button';

type Props = {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  deleting?: boolean;
};

/** Sticky glass toolbar that appears once one or more table rows are selected. */
export default function BulkActionsBar({count, onClear, onDelete, deleting}: Props) {
  if (count === 0) return null;

  return (
    <div className="glass-panel glow-primary sticky top-0 z-10 flex items-center justify-between gap-3 rounded-xl px-4 py-2.5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="size-7" onClick={onClear}>
          <X className="size-4" />
        </Button>
        <span className="font-mono text-sm">
          <span className="font-semibold text-primary">{count}</span> مورد انتخاب شده
        </span>
      </div>
      <Button variant="destructive" size="sm" disabled={deleting} onClick={onDelete}>
        <Trash2 className="size-4" />
        حذف گروهی
      </Button>
    </div>
  );
}
