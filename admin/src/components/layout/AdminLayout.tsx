import {useState} from 'react';
import {NavLink, Outlet} from 'react-router-dom';
import {
  FolderTree,
  Image,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Quote,
  Sun,
  Tags,
  Ticket,
  User,
  Users,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Separator} from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {cn} from '@/lib/utils';
import {useAuth} from '@/hooks/useAuth';
import {useTheme} from '@/hooks/useTheme';

const NAV_ITEMS = [
  {to: '/', label: 'داشبورد', icon: LayoutDashboard, end: true},
  {to: '/wallpapers', label: 'والپیپرها', icon: Image},
  {to: '/categories', label: 'دسته‌ها', icon: Tags},
  {to: '/martyrs', label: 'شهدا', icon: Users},
  {to: '/martyr-categories', label: 'دسته‌بندی شهدا', icon: FolderTree},
  {to: '/quotes', label: 'نقل‌قول‌ها', icon: Quote},
  {to: '/hero', label: 'رهبر / لوگو', icon: User},
  {to: '/promo-codes', label: 'کدهای تخفیف', icon: Ticket},
];

function SidebarNavContent({onNavigate}: {onNavigate?: () => void}) {
  const {logout} = useAuth();
  const {theme, toggle} = useTheme();

  return (
    <div className="flex h-full flex-col">
      <div className="p-5">
        <h1 className="text-lg font-bold tracking-tight">پنل ادمین نور</h1>
        <p className="text-xs text-muted-foreground">مدیریت محتوای اپ</p>
      </div>
      <Separator className="opacity-50" />
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({isActive}) =>
              cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'glow-primary bg-primary/10 text-primary'
                  : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground',
              )
            }>
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Separator className="opacity-50" />
      <div className="flex items-center gap-2 p-3">
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="تغییر تم">
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        <Button variant="ghost" className="flex-1 justify-start gap-2" onClick={logout}>
          <LogOut className="size-4" />
          خروج
        </Button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="relative flex min-h-svh flex-col bg-background md:flex-row">
      {/* Ambient background glow — the fintech-dark "depth" cue behind the glass panels. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(1200px_circle_at_20%_-10%,var(--glow-primary),transparent_45%),radial-gradient(900px_circle_at_100%_10%,color-mix(in_oklch,var(--accent),transparent_40%),transparent_50%)]"
      />

      <header className="glass-panel sticky top-0 z-30 flex items-center gap-3 border-b p-3 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileNavOpen(true)}
          aria-label="باز کردن منو">
          <Menu className="size-5" />
        </Button>
        <h1 className="text-sm font-bold tracking-tight">پنل ادمین نور</h1>
      </header>

      <aside className="glass-panel sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-l md:flex">
        <SidebarNavContent />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="right" className="glass-panel w-72 border-l p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>منو</SheetTitle>
            <SheetDescription>ناوبری پنل ادمین</SheetDescription>
          </SheetHeader>
          <SidebarNavContent onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
