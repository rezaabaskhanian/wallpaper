import {useMemo, useState} from 'react';
import {toast} from 'sonner';
import {Plus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import SpotlightCard from '@/components/SpotlightCard';
import DeleteConfirmButton from '@/components/DeleteConfirmButton';
import {ApiError} from '@/lib/api';
import {useCategories} from '@/hooks/useWallpapers';
import {
  useClosePoll,
  useCreatePoll,
  useDeletePoll,
  useDevice,
  usePolls,
  useRequests,
  useUpdateRequests,
} from '@/hooks/useFeedback';
import type {Poll, WallpaperRequest} from '@/lib/types';

const errText = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback;

function CategorySelect({value, onChange}: {value: string; onChange: (v: string) => void}) {
  const {data: categories} = useCategories();
  return (
    <select
      className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
      value={value}
      onChange={e => onChange(e.target.value)}>
      <option value="">بدون دسته</option>
      {(categories ?? []).map(c => (
        <option key={c.id} value={c.id}>
          {c.title}
        </option>
      ))}
    </select>
  );
}

/** First 6 characters of an anonymous device id — enough to tell devices apart. */
const shortId = (id: string) => id.slice(0, 6);

const STATUS_LABEL: Record<WallpaperRequest['status'], string> = {
  pending: 'در انتظار',
  done: 'انجام شد',
  rejected: 'رد شد',
};

function faDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * One anonymous device: every request it sent plus a short activity summary
 * from the analytics events sharing the same id. No personal data exists —
 * the id is an anonymous per-phone code.
 */
function DeviceDialog({deviceId, onClose}: {deviceId: string | null; onClose: () => void}) {
  const {data, isLoading} = useDevice(deviceId);
  return (
    <Dialog open={!!deviceId} onOpenChange={o => (!o ? onClose() : undefined)}>
      <DialogContent className="glass-panel max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            دستگاه <span className="font-mono">{deviceId ? shortId(deviceId) : ''}</span>
          </DialogTitle>
        </DialogHeader>
        {isLoading || !data ? (
          <p>در حال بارگذاری…</p>
        ) : (
          <div className="flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>اولین ورود: {faDate(data.firstSeen)}</div>
              <div>آخرین ورود: {faDate(data.lastSeen)}</div>
              <div>نسخه‌ی اپ: <span className="font-mono">{data.appVersion || '—'}</span></div>
              <div>دفعات باز کردن: {data.opens}</div>
              <div>والپیپرهای گذاشته‌شده: {data.wallpaperSets}</div>
              <div>رأی‌ها: {data.pollVotes}</div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="font-semibold">درخواست‌ها ({data.requests.length})</div>
              {data.requests.map(r => (
                <div key={r.id} className="rounded-md border p-2">
                  <div>{r.text}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {STATUS_LABEL[r.status]} · {faDate(r.createdAt)}
                    {r.reply ? ` · جواب: ${r.reply}` : ''}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              این شناسه ناشناس است؛ اطلاعات شخصی کاربر (اسم، شماره) ثبت نمی‌شود.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Requests are grouped by their (normalized) text, most-asked first, so the
 * admin sees demand at a glance and resolves a whole group at once — every
 * device in it then gets a notification, carrying the admin's reply if one
 * was written (a rejection is only notified when it has a reply).
 */
function RequestsSection() {
  const {data: requests, isLoading} = useRequests();
  const update = useUpdateRequests();
  const [showDone, setShowDone] = useState(false);
  const [catFor, setCatFor] = useState<Record<string, string>>({});
  const [replyFor, setReplyFor] = useState<Record<string, string>>({});
  const [device, setDevice] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, WallpaperRequest[]>();
    for (const r of requests ?? []) {
      if (!showDone && r.status !== 'pending') continue;
      const key = `${r.status}|${r.text.trim().toLowerCase()}`;
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    const devices = (list: WallpaperRequest[]) => new Set(list.map(r => r.deviceId)).size;
    return [...map.entries()].sort((a, b) => devices(b[1]) - devices(a[1]));
  }, [requests, showDone]);

  const resolve = async (list: WallpaperRequest[], status: WallpaperRequest['status'], key: string) => {
    const reply = (replyFor[key] ?? '').trim();
    try {
      await update.mutateAsync({
        ids: list.map(r => r.id),
        status,
        categoryId: catFor[key] ?? '',
        reply,
      });
      toast.success(
        status === 'done'
          ? 'انجام شد؛ به درخواست‌دهنده‌ها خبر می‌رسد'
          : status === 'rejected' && reply
            ? 'رد شد؛ جوابت به درخواست‌دهنده‌ها می‌رسد'
            : 'ذخیره شد',
      );
    } catch (err) {
      toast.error(errText(err, 'ذخیره ناموفق بود'));
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">درخواست‌ها</h2>
          <p className="text-sm text-muted-foreground">
            درخواست‌های هم‌متن کنار هم‌اند؛ آن‌هایی که گوشی‌های بیشتری خواسته‌اند بالاترند. «جواب»
            اختیاری است و در نوتیفیکیشن کاربر نشان داده می‌شود؛ برای «رد» فقط وقتی جواب بنویسی خبر
            می‌رود. روی کد هر دستگاه بزن تا درخواست‌ها و آمارش را ببینی.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} />
          نمایش انجام‌شده/ردشده‌ها
        </label>
      </div>
      <SpotlightCard>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>درخواست</TableHead>
              <TableHead>گوشی‌ها</TableHead>
              <TableHead>پیام‌ها</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead>دسته و جواب</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>در حال بارگذاری…</TableCell>
              </TableRow>
            ) : groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  درخواستی نیست.
                </TableCell>
              </TableRow>
            ) : (
              groups.map(([key, list]) => {
                const deviceIds = [...new Set(list.map(r => r.deviceId))];
                const pending = list[0].status === 'pending';
                return (
                  <TableRow key={key}>
                    <TableCell className="max-w-xs">
                      <div className="font-medium">{list[0].text}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {deviceIds.slice(0, 8).map(id => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setDevice(id)}
                            className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs hover:bg-primary/20"
                            title="درخواست‌ها و آمار این گوشی">
                            {shortId(id)}
                          </button>
                        ))}
                        {deviceIds.length > 8 ? (
                          <span className="text-xs text-muted-foreground">
                            +{deviceIds.length - 8}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{deviceIds.length}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{list.length}</TableCell>
                    <TableCell className="text-sm">{STATUS_LABEL[list[0].status]}</TableCell>
                    <TableCell className="min-w-56">
                      {pending ? (
                        <div className="flex flex-col gap-1">
                          <CategorySelect
                            value={catFor[key] ?? ''}
                            onChange={v => setCatFor({...catFor, [key]: v})}
                          />
                          <Input
                            value={replyFor[key] ?? ''}
                            maxLength={200}
                            placeholder="جواب (اختیاری) — مثل «توی دسته‌ی ملی گذاشتیم»"
                            onChange={e => setReplyFor({...replyFor, [key]: e.target.value})}
                          />
                        </div>
                      ) : (
                        <div className="text-xs">
                          <span className="font-mono">{list[0].categoryId || '—'}</span>
                          {list[0].reply ? (
                            <div className="mt-1 text-muted-foreground">جواب: {list[0].reply}</div>
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="flex justify-end gap-1">
                      {pending ? (
                        <>
                          <Button size="sm" onClick={() => resolve(list, 'done', key)}>
                            انجام شد
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => resolve(list, 'rejected', key)}>
                            رد
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => resolve(list, 'pending', key)}>
                          برگشت به انتظار
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </SpotlightCard>
      <DeviceDialog deviceId={device} onClose={() => setDevice(null)} />
    </section>
  );
}

function NewPollForm() {
  const create = useCreatePoll();
  const [question, setQuestion] = useState('دسته‌ی بعدی چی باشه؟');
  const [options, setOptions] = useState([
    {title: '', categoryId: ''},
    {title: '', categoryId: ''},
    {title: '', categoryId: ''},
  ]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({question, options});
      toast.success('رأی‌گیری شروع شد (رأی‌گیری قبلی بسته شد)');
      setOptions(options.map(() => ({title: '', categoryId: ''})));
    } catch (err) {
      toast.error(errText(err, 'ساخت رأی‌گیری ناموفق بود'));
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="poll-q">سؤال</Label>
        <Input id="poll-q" value={question} onChange={e => setQuestion(e.target.value)} required />
      </div>
      {options.map((o, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <Input
            className="min-w-0 flex-1"
            value={o.title}
            placeholder={`گزینه‌ی ${i + 1} (مثل ماشین اسپورت)`}
            onChange={e => setOptions(options.map((x, j) => (j === i ? {...x, title: e.target.value} : x)))}
          />
          <CategorySelect
            value={o.categoryId}
            onChange={v => setOptions(options.map((x, j) => (j === i ? {...x, categoryId: v} : x)))}
          />
        </div>
      ))}
      <div className="flex gap-2">
        {options.length < 4 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setOptions([...options, {title: '', categoryId: ''}])}>
            <Plus className="size-4" />
            گزینه
          </Button>
        ) : null}
        <Button type="submit" disabled={create.isPending} className="glow-primary">
          شروع رأی‌گیری
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        دسته‌ی هر گزینه اختیاری است؛ اگر آن گزینه برنده شود و دسته داشته باشد، رأی‌دهنده‌ها با زدن خبر
        به همان دسته می‌روند. بهتر است اول دسته را بسازی و بعد رأی‌گیری را ببندی.
      </p>
    </form>
  );
}

function PollRow({poll}: {poll: Poll}) {
  const close = useClosePoll();
  const del = useDeletePoll();
  const [winner, setWinner] = useState(poll.winnerOptionId ?? '');
  const leader = [...poll.options].sort((a, b) => b.votes - a.votes)[0];

  return (
    <div className="flex flex-col gap-2 border-b p-4 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium">
          {poll.question}{' '}
          <span className="text-xs text-muted-foreground">
            {poll.isActive ? '· فعال' : '· بسته'} · {poll.totalVotes} رأی
          </span>
        </div>
        <DeleteConfirmButton
          itemLabel={poll.question}
          onConfirm={async () => {
            try {
              await del.mutateAsync(poll.id);
              toast.success('حذف شد');
            } catch (err) {
              toast.error(errText(err, 'حذف ناموفق بود'));
            }
          }}
        />
      </div>
      {poll.options.map(o => {
        const pct = poll.totalVotes ? Math.round((o.votes / poll.totalVotes) * 100) : 0;
        return (
          <div key={o.id} className="flex items-center gap-2 text-sm">
            <span className="w-32 truncate">
              {o.title}
              {poll.winnerOptionId === o.id ? ' 🏆' : ''}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
              <div className="h-full bg-primary" style={{width: `${pct}%`}} />
            </div>
            <span className="w-16 text-left font-mono text-xs">
              {o.votes} ({pct}٪)
            </span>
          </div>
        );
      })}
      {poll.isActive ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            value={winner || leader?.id || ''}
            onChange={e => setWinner(e.target.value)}>
            {poll.options.map(o => (
              <option key={o.id} value={o.id}>
                برنده: {o.title}
              </option>
            ))}
            <option value="none">بدون اعلام برنده</option>
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const w = winner || leader?.id || '';
              try {
                await close.mutateAsync({id: poll.id, winnerOptionId: w === 'none' ? '' : w});
                toast.success('رأی‌گیری بسته شد؛ به رأی‌دهنده‌ها خبر می‌رسد');
              } catch (err) {
                toast.error(errText(err, 'بستن ناموفق بود'));
              }
            }}>
            بستن رأی‌گیری
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function PollsSection() {
  const {data: polls, isLoading} = usePolls();
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">رأی‌گیری</h2>
        <p className="text-sm text-muted-foreground">
          همیشه یک رأی‌گیری فعال است و در گالری اپ دیده می‌شود. با بستنِ آن و انتخاب برنده، به همه‌ی
          کسانی که رأی داده‌اند خبر می‌رسد.
        </p>
      </div>
      <SpotlightCard>
        <NewPollForm />
      </SpotlightCard>
      <SpotlightCard>
        {isLoading ? (
          <p className="p-4">در حال بارگذاری…</p>
        ) : (polls ?? []).length === 0 ? (
          <p className="p-4 text-muted-foreground">هنوز رأی‌گیری‌ای نیست.</p>
        ) : (
          polls!.map(p => <PollRow key={p.id} poll={p} />)
        )}
      </SpotlightCard>
    </section>
  );
}

export default function Feedback() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">درخواست و رأی</h1>
        <p className="text-sm text-muted-foreground">
          کاربرها از گالری اپ والپیپر درخواست می‌دهند یا رأی می‌دهند
        </p>
      </div>
      <RequestsSection />
      <PollsSection />
    </div>
  );
}
