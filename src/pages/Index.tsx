import { useAuth } from '@/hooks/useAuth';
import Auth from './Auth';
import ExecutorDashboard from './ExecutorDashboard';
import AdminDashboard from './AdminDashboard';

export default function Index() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Auth />;
  if (isAdmin) return <AdminDashboard />;
  return <ExecutorDashboard />;
}
