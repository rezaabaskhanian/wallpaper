import {useState} from 'react';
import {Button} from '@/components/ui/button';
import SpotlightCard from '@/components/SpotlightCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {useAnalytics} from '@/hooks/useAnalytics';
import type {AnalyticsCohort} from '@/lib/types';

const RANGES = [7, 30, 90];

const SOURCE_LABELS: Record<string, string> = {
  onetap: 'دکمه‌ی اولین اجرا',
  settings: 'تنظیمات',
  gallery: 'گالری',
};
const METHOD_LABELS: Record<string, string> = {
  live: 'زنده',
  home: 'صفحه اصلی',
  lock: 'صفحه قفل',
  both: 'اصلی و قفل',
};

/** «۴۲٪ (۲۱ از ۵۰)» — or a dash while nobody has reached that day yet. */
function pct(retained: number, eligible: number) {
  if (eligible === 0) return '—';
  return `${Math.round((retained / eligible) * 100)}٪ (${retained} از ${eligible})`;
}

function CohortRow({c}: {c: AnalyticsCohort}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{c.label || 'نامشخص'}</TableCell>
      <TableCell className="tabular-nums">{c.newDevices}</TableCell>
      <TableCell className="tabular-nums">{pct(c.setWallpaperDay0, c.newDevices)}</TableCell>
      <TableCell className="tabular-nums">{pct(c.d1Retained, c.d1Eligible)}</TableCell>
      <TableCell className="tabular-nums">{pct(c.d7Retained, c.d7Eligible)}</TableCell>
    </TableRow>
  );
}

function CohortHeader({first}: {first: string}) {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="text-right">{first}</TableHead>
        <TableHead className="text-right">کاربر جدید</TableHead>
        <TableHead className="text-right">روز اول والپیپر گذاشت</TableHead>
        <TableHead className="text-right">برگشت روز ۱</TableHead>
        <TableHead className="text-right">برگشت روز ۷</TableHead>
      </TableRow>
    </TableHeader>
  );
}

export default function Analytics() {
  const [days, setDays] = useState(30);
  const {data, isLoading, error} = useAnalytics(days);

  const today = data?.daily[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">آمار</h1>
          <p className="text-sm text-muted-foreground">
            باز شدن اپ، تنظیم والپیپر و ماندگاری کاربران (روزها به وقت تهران)
          </p>
        </div>
        <div className="flex gap-2">
          {RANGES.map(r => (
            <Button
              key={r}
              size="sm"
              variant={r === days ? 'default' : 'outline'}
              onClick={() => setDays(r)}>
              {r} روز
            </Button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">دریافت آمار ممکن نشد.</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">در حال بارگذاری…</p> : null}

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              {label: 'کاربر فعال امروز', value: today?.activeDevices},
              {label: 'کاربر جدید امروز', value: today?.newDevices},
              {label: 'والپیپر تنظیم‌شده امروز', value: today?.wallpaperSets},
              {
                label: `کاربر جدید در ${days} روز`,
                value: data.daily.reduce((n, d) => n + d.newDevices, 0),
              },
            ].map(s => (
              <SpotlightCard key={s.label} className="p-5">
                <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
                <div className="mt-3 font-mono text-3xl font-semibold tabular-nums">
                  {s.value ?? '—'}
                </div>
              </SpotlightCard>
            ))}
          </div>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">ماندگاری به تفکیک نسخه</h2>
            <p className="text-sm text-muted-foreground">
              کاربرانی که اولین بار در این بازه اپ را باز کردند، بر اساس نسخه‌ی اولین
              اجرا. برای مقایسه‌ی اثر هر نسخه، این ردیف‌ها را کنار هم ببینید.
            </p>
            <Table>
              <CohortHeader first="نسخه" />
              <TableBody>
                {data.versions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      هنوز داده‌ای نیست
                    </TableCell>
                  </TableRow>
                ) : (
                  data.versions.map(v => <CohortRow key={v.label} c={v} />)
                )}
              </TableBody>
            </Table>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">اثر تنظیم والپیپر روی ماندگاری</h2>
            <Table>
              <CohortHeader first="گروه" />
              <TableBody>
                <CohortRow c={data.setters} />
                <CohortRow c={data.nonSetters} />
              </TableBody>
            </Table>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">قیف لانچر</h2>
            <p className="text-sm text-muted-foreground">
              درصدها نسبت به کاربرانی است که پیشنهاد لانچر را دیدند.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                {label: 'پیشنهاد را دیدند', value: data.launcher.shown},
                {label: '«امتحان می‌کنم» زدند', value: data.launcher.accepted},
                {label: 'لانچر پیش‌فرض شد', value: data.launcher.enabled},
              ].map((step, i) => (
                <SpotlightCard key={step.label} className="p-5">
                  <span className="text-sm font-medium text-muted-foreground">{step.label}</span>
                  <div className="mt-3 font-mono text-3xl font-semibold tabular-nums">
                    {step.value}
                  </div>
                  {i > 0 && data.launcher.shown > 0 ? (
                    <div className="mt-1 text-sm text-muted-foreground tabular-nums">
                      {Math.round((step.value / data.launcher.shown) * 100)}٪
                    </div>
                  ) : null}
                </SpotlightCard>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">والپیپر از کجا تنظیم شد</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">منبع</TableHead>
                  <TableHead className="text-right">نوع</TableHead>
                  <TableHead className="text-right">تعداد</TableHead>
                  <TableHead className="text-right">کاربر</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sources.map(s => (
                  <TableRow key={`${s.source}-${s.method}`}>
                    <TableCell>{SOURCE_LABELS[s.source] ?? s.source}</TableCell>
                    <TableCell>{METHOD_LABELS[s.method] ?? s.method}</TableCell>
                    <TableCell className="tabular-nums">{s.sets}</TableCell>
                    <TableCell className="tabular-nums">{s.devices}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">روزانه</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">تاریخ</TableHead>
                  <TableHead className="text-right">باز شدن اپ</TableHead>
                  <TableHead className="text-right">کاربر فعال</TableHead>
                  <TableHead className="text-right">کاربر جدید</TableHead>
                  <TableHead className="text-right">تنظیم والپیپر</TableHead>
                  <TableHead className="text-right">کاربرانی که تنظیم کردند</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.daily.map(d => (
                  <TableRow key={d.date}>
                    <TableCell className="tabular-nums">
                      {new Date(`${d.date}T12:00:00`).toLocaleDateString('fa-IR')}
                    </TableCell>
                    <TableCell className="tabular-nums">{d.opens}</TableCell>
                    <TableCell className="tabular-nums">{d.activeDevices}</TableCell>
                    <TableCell className="tabular-nums">{d.newDevices}</TableCell>
                    <TableCell className="tabular-nums">{d.wallpaperSets}</TableCell>
                    <TableCell className="tabular-nums">{d.wallpaperSetters}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </>
      ) : null}
    </div>
  );
}
