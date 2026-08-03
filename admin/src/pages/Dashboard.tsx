import {Image, Quote, Tags, Users} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import {useCategories, useWallpapers} from '@/hooks/useWallpapers';
import {useMartyrs} from '@/hooks/useMartyrs';
import {useQuotes} from '@/hooks/useQuotes';

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number | undefined;
}) {
  return (
    <SpotlightCard className="p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className="glow-primary flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-3 font-mono text-3xl font-semibold tabular-nums">
        {value ?? '—'}
      </div>
    </SpotlightCard>
  );
}

export default function Dashboard() {
  const {data: wallpapers} = useWallpapers();
  const {data: categories} = useCategories();
  const {data: martyrs} = useMartyrs();
  const {data: quotes} = useQuotes();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">داشبورد</h1>
        <p className="text-sm text-muted-foreground">نمای کلی محتوای اپ</p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Image} label="والپیپرها" value={wallpapers?.length} />
        <StatCard icon={Tags} label="دسته‌ها" value={categories?.length} />
        <StatCard icon={Users} label="شهدا" value={martyrs?.length} />
        <StatCard icon={Quote} label="نقل‌قول‌ها" value={quotes?.length} />
      </div>
    </div>
  );
}
