import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {toast} from 'sonner';
import {ShieldCheck} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import SpotlightCard from '@/components/SpotlightCard';
import {ApiError, setAdminKey} from '@/lib/api';
import {api} from '@/lib/api';
import {useAuth} from '@/hooks/useAuth';

export default function Login() {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const {login} = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Set the key before probing so the request carries it, then verify
      // against a real admin endpoint — wrong/missing keys come back 401.
      setAdminKey(key);
      await api.get('/admin/categories');
      login(key);
      navigate('/', {replace: true});
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'اتصال به سرور برقرار نشد';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background p-4">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_circle_at_50%_0%,var(--glow-primary),transparent_50%)]"
      />
      <SpotlightCard className="w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="glow-primary flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="font-semibold">ورود به پنل ادمین</h1>
            <p className="text-xs text-muted-foreground">Xan CRM · نور</p>
          </div>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">
          کلید ادمین سرور را وارد کن. اگر روی سرور کلیدی تنظیم نشده، این فیلد را خالی بگذار و مستقیم وارد شو.
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-key">کلید ادمین (X-Admin-Key)</Label>
            <Input
              id="admin-key"
              type="password"
              className="font-mono"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="اختیاری"
              autoFocus
            />
          </div>
          <Button type="submit" disabled={loading} className="glow-primary">
            {loading ? 'در حال بررسی…' : 'ورود'}
          </Button>
        </form>
      </SpotlightCard>
    </div>
  );
}
