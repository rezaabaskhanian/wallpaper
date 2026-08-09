import {Navigate, Route, Routes} from 'react-router-dom';
import {Toaster} from '@/components/ui/sonner';
import {useAuth} from '@/hooks/useAuth';
import AdminLayout from '@/components/layout/AdminLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Wallpapers from '@/pages/Wallpapers';
import Categories from '@/pages/Categories';
import Martyrs from '@/pages/Martyrs';
import MartyrCategories from '@/pages/MartyrCategories';
import Quotes from '@/pages/Quotes';
import Hero from '@/pages/Hero';
import PromoCodes from '@/pages/PromoCodes';

function RequireAuth({children}: {children: React.ReactNode}) {
  const {isAuthed} = useAuth();
  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <Toaster richColors position="top-center" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }>
          <Route path="/" element={<Dashboard />} />
          <Route path="/wallpapers" element={<Wallpapers />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/martyrs" element={<Martyrs />} />
          <Route path="/martyr-categories" element={<MartyrCategories />} />
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/hero" element={<Hero />} />
          <Route path="/promo-codes" element={<PromoCodes />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
