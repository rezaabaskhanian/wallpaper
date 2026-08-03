import {useEffect, useState} from 'react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import SpotlightCard from '@/components/SpotlightCard';
import ImageUploadField from '@/components/ImageUploadField';
import {ApiError} from '@/lib/api';
import {useHero, useSaveHero} from '@/hooks/useHero';
import type {Hero as HeroData} from '@/lib/types';

const EMPTY: HeroData = {title: '', slogan: '', image: ''};

export default function Hero() {
  const {data: hero, isLoading} = useHero();
  const save = useSaveHero();
  const [form, setForm] = useState<HeroData>(EMPTY);

  useEffect(() => {
    if (hero) setForm(hero);
  }, [hero]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save.mutateAsync(form);
      toast.success('ذخیره شد');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'ذخیره ناموفق بود');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">رهبر / لوگوی مرکزی</h1>
        <p className="text-sm text-muted-foreground">پرتره‌ی مرکزی صحنه‌ی هولوگرافیک</p>
      </div>

      <SpotlightCard className="max-w-lg p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="h-title">عنوان (اختیاری)</Label>
              <Input id="h-title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="h-slogan">شعار زیر پرتره</Label>
              <Input
                id="h-slogan"
                value={form.slogan}
                onChange={e => setForm({...form, slogan: e.target.value})}
              />
            </div>
            <ImageUploadField label="عکس" value={form.image} onChange={url => setForm({...form, image: url})} />
            <Button type="submit" disabled={save.isPending} className="glow-primary">
              ذخیره
            </Button>
          </form>
        )}
      </SpotlightCard>
    </div>
  );
}
