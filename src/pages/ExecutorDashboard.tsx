import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, ArrowLeft, Info, LogOut } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Task = Tables<'tasks'>;

export default function ExecutorDashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [orderInput, setOrderInput] = useState('');
  const [showInstruction, setShowInstruction] = useState(false);
  const [balance, setBalance] = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    loadTasks();
    loadProfile();
    loadCompletedTasks();
  }, [user]);

  const loadTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').eq('status', 'available');
    setTasks(data ?? []);
  };

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('balance').eq('user_id', user.id).single();
    if (data) setBalance(data.balance);
  };

  const loadCompletedTasks = async () => {
    if (!user) return;
    const { data } = await supabase.from('completed_tasks').select('task_id').eq('user_id', user.id);
    if (data) setCompletedIds(new Set(data.map(d => d.task_id)));
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Скопировано!' });
  };

  const finishTask = async () => {
    if (!currentTask || !user || orderInput.trim().length < 3) return;
    const { error } = await supabase.from('completed_tasks').insert({
      task_id: currentTask.id,
      user_id: user.id,
      order_number: orderInput.trim(),
    });
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      return;
    }
    setCompletedIds(prev => new Set(prev).add(currentTask.id));
    setCurrentTask(null);
    setOrderInput('');
    toast({ title: 'Задание отправлено на проверку!' });
  };

  const availableTasks = tasks.filter(t => !completedIds.has(t.id));

  if (currentTask) {
    return (
      <div className="max-w-md mx-auto min-h-screen p-4 space-y-4">
        <button onClick={() => setCurrentTask(null)} className="flex items-center gap-2 text-primary font-bold text-sm">
          <ArrowLeft size={18} /> Назад к списку
        </button>
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border space-y-6">
          <div>
            <h2 className="text-xl font-black text-foreground">{currentTask.name}</h2>
            <span className="text-[10px] bg-muted px-2 py-1 rounded text-muted-foreground font-black mt-2 inline-block uppercase tracking-wider break-all">
              ID: {currentTask.task_id}
            </span>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-primary uppercase tracking-widest">Адрес ресторана (Пункт А)</label>
              <div className="flex items-center gap-3">
                <span className="flex-1 text-foreground text-sm font-bold">{currentTask.addr1}</span>
                <button onClick={() => copyText(currentTask.addr1)} className="shrink-0 p-3 bg-primary/10 rounded-xl text-primary">
                  <Copy size={20} />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-accent uppercase tracking-widest">Адрес доставки (Пункт Б)</label>
              <div className="flex items-center gap-3">
                <span className="flex-1 text-foreground text-sm font-bold">{currentTask.addr2}</span>
                <button onClick={() => copyText(currentTask.addr2)} className="shrink-0 p-3 bg-accent/10 rounded-xl text-accent">
                  <Copy size={20} />
                </button>
              </div>
            </div>
            <a
              href={currentTask.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full gap-3 bg-warning text-warning-foreground font-black py-4 rounded-2xl shadow-sm active:scale-95 transition-transform text-sm"
            >
              ПЕРЕЙТИ В ЯНДЕКС ЕДУ
            </a>
          </div>
          <div className="pt-4 border-t border-border">
            <Input
              value={orderInput}
              onChange={e => setOrderInput(e.target.value)}
              placeholder="Введите номер заказа"
              className="mb-3"
            />
            <Button onClick={finishTask} className="w-full font-black uppercase bg-foreground text-background hover:bg-foreground/90">
              Завершить задание
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col">
      <header className="bg-card border-b border-border p-5 sticky top-0 z-30 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-xl font-black text-foreground">Мои задания</h1>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
              Активных: {availableTasks.length} · Баланс: {balance}₽
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowInstruction(true)} className="p-2 bg-primary/10 text-primary rounded-full">
              <Info size={24} />
            </button>
            <button onClick={signOut} className="p-2 bg-destructive/10 text-destructive rounded-full">
              <LogOut size={24} />
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-3">
        {availableTasks.length === 0 && (
          <p className="text-center text-muted-foreground py-12">Нет доступных заданий</p>
        )}
        {availableTasks.map(task => (
          <div
            key={task.id}
            className="task-card bg-card p-5 rounded-2xl border border-border shadow-sm flex justify-between items-center cursor-pointer"
            onClick={() => setCurrentTask(task)}
          >
            <div className="flex-1 pr-4">
              <h3 className="font-black text-foreground text-sm truncate uppercase">{task.name}</h3>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight break-all">ID: {task.task_id}</p>
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md bg-primary/10 text-primary">
              Начать
            </span>
          </div>
        ))}
      </main>

      {/* Instruction Modal */}
      {showInstruction && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={() => setShowInstruction(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-[40px] p-8 pb-12 animate-in slide-in-from-bottom">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-8" />
            <h2 className="text-2xl font-black text-foreground mb-6">Инструкция</h2>
            <div className="space-y-4 text-sm text-muted-foreground font-medium">
              <p>1. Вводим адрес А в Яндекс Еде.</p>
              <p>2. Ищем ресторан в поиске.</p>
              <p>3. Выбираем <b className="text-foreground">соус васаби</b>.</p>
              <p>4. Меняем адрес на <b className="text-foreground">адрес Б</b>.</p>
              <p>5. Оплата — <b className="text-foreground">Наличные</b>.</p>
              <p>6. Ждем статус "Доставлен", ставим <b className="text-foreground">5 звезд</b>.</p>
            </div>
            <Button onClick={() => setShowInstruction(false)} className="w-full mt-8 font-black uppercase bg-foreground text-background hover:bg-foreground/90">
              Понятно
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
