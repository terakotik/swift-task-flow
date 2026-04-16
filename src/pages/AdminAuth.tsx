import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import AdminDashboard from './AdminDashboard';

export default function AdminAuth() {
  const { user, loading, isAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user && isAdmin) return <AdminDashboard />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-3xl p-8 shadow-lg border border-border">
          <h1 className="text-2xl font-black text-foreground mb-1">Вход для админа</h1>
          <p className="text-muted-foreground text-sm mb-6">Панель управления заданиями</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            <Button type="submit" className="w-full font-bold" disabled={submitting}>
              {submitting ? 'Загрузка...' : 'Войти'}
            </Button>
          </form>
          {user && !isAdmin && (
            <p className="text-destructive text-sm mt-4 text-center font-semibold">У вас нет прав администратора</p>
          )}
        </div>
      </div>
    </div>
  );
}
