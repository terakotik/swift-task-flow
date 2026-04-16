import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, ArrowLeft, Info, LogOut, CheckCircle, Clock, Package } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Task = Tables<'tasks'>;

interface CompletedTaskWithDetails {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  task_id: string;
  tasks: { name: string; task_id: string } | null;
}

const DEMO_TASKS: Task[] = [
  {
    id: 'demo-1', task_id: 'vezem_losos_1739888235', name: 'VEZEM LOSOS · ул. Тургенева',
    addr1: 'улица Тургенева, 155/1', addr2: 'улица Дальняя, 39/5',
    link: 'https://eda.yandex.ru/r/vezem_losos_1739888235',
    status: 'available', created_at: new Date().toISOString(), expires_at: null, created_by: null,
  },
  {
    id: 'demo-2', task_id: 'yoyo_sushi_1739888240', name: 'YOYO SUSHI · ул. Ставропольская',
    addr1: 'улица Ставропольская, 218', addr2: 'улица Селезнева, 4/15',
    link: 'https://eda.yandex.ru/r/yoyo_sushi_1739888240',
    status: 'available', created_at: new Date().toISOString(), expires_at: null, created_by: null,
  },
  {
    id: 'demo-3', task_id: 'umami_sushi_1739888245', name: 'UMAMI SUSHI · ул. Красная',
    addr1: 'улица Красная, 176', addr2: 'улица Северная, 324',
    link: 'https://eda.yandex.ru/r/umami_sushi_1739888245',
    status: 'available', created_at: new Date().toISOString(), expires_at: null, created_by: null,
  },
];

interface Props {
  demoMode?: boolean;
  onExitDemo?: () => void;
}

export default function ExecutorDashboard({ demoMode = false, onExitDemo }: Props) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>(demoMode ? DEMO_TASKS : []);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [orderInput, setOrderInput] = useState('');
  const [showInstruction, setShowInstruction] = useState(false);
  const [balance, setBalance] = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [myCompleted, setMyCompleted] = useState<CompletedTaskWithDetails[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');

  useEffect(() => {
    if (demoMode || !user) return;
    loadTasks();
    loadProfile();
    loadCompletedTasks();
  }, [user, demoMode]);

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
    const { data } = await supabase
      .from('completed_tasks')
      .select('id, order_number, status, created_at, task_id, tasks(name, task_id)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) {
      setCompletedIds(new Set(data.map(d => d.task_id)));
      setMyCompleted(data as any);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Скопировано!' });
  };

  const finishTask = async () => {
    if (!currentTask || orderInput.trim().length < 3) return;
    if (demoMode) {
      setCompletedIds(prev => new Set(prev).add(currentTask.id));
      setCurrentTask(null);
      setOrderInput('');
      toast({ title: 'Демо: задание отправлено на проверку!' });
      return;
    }
    if (!user) return;
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
    loadCompletedTasks();
    toast({ title: 'Задание отправлено на проверку!' });
  };

  const availableTasks = tasks.filter(t => !completedIds.has(t.id));

  const statusLabel = (s: string) => {
    if (s === 'pending') return { text: 'На проверке', icon: <Clock size={14} className="text-warning" />, color: 'text-warning' };
    if (s === 'accepted') return { text: 'Принят', icon: <Package size={14} className="text-primary" />, color: 'text-primary' };
    return { text: '+20₽ зачислено', icon: <CheckCircle size={14} className="text-accent" />, color: 'text-accent' };
  };

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
      <header className="bg-card border-b border-border sticky top-0 z-30 shadow-sm">
        <div className="p-5 pb-3">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-black text-foreground">
              {demoMode ? 'Демо-режим' : 'Мои задания'}
            </h1>
            <div className="flex gap-2">
              <button onClick={() => setShowInstruction(true)} className="p-2 bg-primary/10 text-primary rounded-full">
                <Info size={24} />
              </button>
              {demoMode ? (
                <button onClick={onExitDemo} className="p-2 bg-destructive/10 text-destructive rounded-full">
                  <LogOut size={24} />
                </button>
              ) : (
                <button onClick={signOut} className="p-2 bg-destructive/10 text-destructive rounded-full">
                  <LogOut size={24} />
                </button>
              )}
            </div>
          </div>

          {/* Balance Card */}
          {!demoMode && (
            <div className="bg-accent/10 rounded-2xl p-4 flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] font-black text-accent uppercase tracking-widest">Ваш баланс</p>
                <p className="text-3xl font-black text-accent">{balance}₽</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Активных заданий</p>
                <p className="text-2xl font-black text-foreground">{availableTasks.length}</p>
              </div>
            </div>
          )}
          {demoMode && (
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-3">
              Активных: {availableTasks.length}
            </p>
          )}
        </div>
        {!demoMode && (
          <div className="flex gap-2 px-5 pb-4">
            <button
              onClick={() => setActiveTab('available')}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase ${activeTab === 'available' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Задания
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase ${activeTab === 'history' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Мои выполненные
            </button>
          </div>
        )}
      </header>

      <main className="p-4 space-y-3">
        {(demoMode || activeTab === 'available') && (
          <>
            {availableTasks.length === 0 && (
              <p className="text-center text-muted-foreground py-12">Нет доступных заданий</p>
            )}
            {availableTasks.map(task => (
              <div
                key={task.id}
                className="task-card bg-card p-5 rounded-2xl border border-border shadow-sm flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform"
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
          </>
        )}

        {!demoMode && activeTab === 'history' && (
          <>
            {myCompleted.length === 0 && (
              <p className="text-center text-muted-foreground py-12">Нет выполненных заданий</p>
            )}
            {myCompleted.map(ct => {
              const s = statusLabel(ct.status);
              return (
                <div key={ct.id} className={`bg-card p-5 rounded-2xl border shadow-sm space-y-2 ${ct.status === 'done' ? 'border-accent/30' : 'border-border'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-3">
                      <h3 className="font-black text-foreground text-sm uppercase">{ct.tasks?.name ?? 'Задание'}</h3>
                      <p className="text-[9px] text-muted-foreground font-bold">Заказ: {ct.order_number}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1">
                        {s.icon}
                        <span className={`text-[10px] font-black uppercase ${s.color}`}>{s.text}</span>
                      </div>
                      {ct.status === 'done' && (
                        <span className="text-lg font-black text-accent">+20₽</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
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
