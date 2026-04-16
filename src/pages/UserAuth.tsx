import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import ExecutorDashboard from './ExecutorDashboard';
import { Play } from 'lucide-react';

export default function UserAuth() {
  const { user, loading, isAdmin } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user && !isAdmin) return <ExecutorDashboard />;
  if (demoMode) return <ExecutorDashboard demoMode onExitDemo={() => setDemoMode(false)} />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast({ title: 'Регистрация успешна', description: 'Проверьте почту для подтверждения' });
      }
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="bg-card rounded-3xl p-8 shadow-lg border border-border">
          <h1 className="text-2xl font-black text-foreground mb-1">
            {isLogin ? 'Вход' : 'Регистрация'}
          </h1>
          <p className="text-muted-foreground text-sm mb-6">Кабинет исполнителя</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            <Button type="submit" className="w-full font-bold" disabled={submitting}>
              {submitting ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
            </Button>
          </form>
          <button onClick={() => setIsLogin(!isLogin)} className="w-full text-center text-sm text-primary mt-4 font-semibold">
            {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Есть аккаунт? Войти'}
          </button>
        </div>
        <Button onClick={() => setDemoMode(true)} variant="outline" className="w-full font-bold gap-2 rounded-2xl h-14">
          <Play size={18} />
          Демо
        </Button>
      </div>
    </div>
  );
}
