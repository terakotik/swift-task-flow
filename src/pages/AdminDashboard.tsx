import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Plus, CheckCircle, Clock, Package } from 'lucide-react';

interface CompletedTask {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  user_id: string;
  task_id: string;
  tasks: { task_id: string; name: string } | null;
  profiles: { display_name: string | null } | null;
}

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ task_id: '', name: '', addr1: '', addr2: '', link: '', expires_at: '' });
  const [activeTab, setActiveTab] = useState<'pending' | 'done'>('pending');

  useEffect(() => {
    loadCompletedTasks();
  }, []);

  const loadCompletedTasks = async () => {
    const { data } = await supabase
      .from('completed_tasks')
      .select('*, tasks(task_id, name), profiles(display_name)')
      .order('created_at', { ascending: false });
    setCompletedTasks((data as any) ?? []);
  };

  const acceptTask = async (id: string) => {
    await supabase.from('completed_tasks').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', id);
    loadCompletedTasks();
    toast({ title: 'Заказ принят' });
  };

  const completeTask = async (ct: CompletedTask) => {
    // Mark as done
    await supabase.from('completed_tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', ct.id);
    // Credit 20 rubles
    const { data: profile } = await supabase.from('profiles').select('balance').eq('user_id', ct.user_id).single();
    if (profile) {
      await supabase.from('profiles').update({ balance: profile.balance + 20 }).eq('user_id', ct.user_id);
    }
    loadCompletedTasks();
    toast({ title: 'Готово! 20₽ зачислено исполнителю' });
  };

  const addTask = async () => {
    if (!newTask.task_id || !newTask.name || !newTask.addr1 || !newTask.addr2 || !newTask.link) return;
    const { error } = await supabase.from('tasks').insert({
      task_id: newTask.task_id,
      name: newTask.name,
      addr1: newTask.addr1,
      addr2: newTask.addr2,
      link: newTask.link,
      expires_at: newTask.expires_at || null,
    });
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      return;
    }
    setNewTask({ task_id: '', name: '', addr1: '', addr2: '', link: '', expires_at: '' });
    setShowAddTask(false);
    toast({ title: 'Задание добавлено' });
  };

  const filtered = completedTasks.filter(ct =>
    activeTab === 'pending' ? ct.status !== 'done' : ct.status === 'done'
  );

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col">
      <header className="bg-card border-b border-border p-5 sticky top-0 z-30 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-xl font-black text-foreground">Админ-панель</h1>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
              Заявок: {completedTasks.filter(c => c.status === 'pending').length}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddTask(true)} className="p-2 bg-accent/10 text-accent rounded-full">
              <Plus size={24} />
            </button>
            <button onClick={signOut} className="p-2 bg-destructive/10 text-destructive rounded-full">
              <LogOut size={24} />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase ${activeTab === 'pending' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            На проверке
          </button>
          <button
            onClick={() => setActiveTab('done')}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase ${activeTab === 'done' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            Завершённые
          </button>
        </div>
      </header>

      <main className="p-4 space-y-3">
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">Пусто</p>
        )}
        {filtered.map(ct => (
          <div key={ct.id} className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-black text-foreground text-sm uppercase">{ct.tasks?.name ?? 'Задание'}</h3>
                <p className="text-[9px] text-muted-foreground font-bold uppercase">ID: {ct.tasks?.task_id}</p>
                <p className="text-[9px] text-muted-foreground font-bold">Исполнитель: {ct.profiles?.display_name ?? 'N/A'}</p>
              </div>
              <div className="flex items-center gap-1">
                {ct.status === 'pending' && <Clock size={14} className="text-warning" />}
                {ct.status === 'accepted' && <Package size={14} className="text-primary" />}
                {ct.status === 'done' && <CheckCircle size={14} className="text-accent" />}
                <span className="text-[10px] font-black uppercase text-muted-foreground">
                  {ct.status === 'pending' ? 'Ожидает' : ct.status === 'accepted' ? 'Принят' : 'Готово'}
                </span>
              </div>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Номер заказа</p>
              <p className="text-foreground font-black text-lg">{ct.order_number}</p>
            </div>
            {ct.status !== 'done' && (
              <div className="flex gap-2">
                {ct.status === 'pending' && (
                  <Button onClick={() => acceptTask(ct.id)} variant="outline" className="flex-1 font-bold text-xs">
                    Принял заказ
                  </Button>
                )}
                <Button onClick={() => completeTask(ct)} className="flex-1 font-bold text-xs bg-accent text-accent-foreground hover:bg-accent/90">
                  Готово (+20₽)
                </Button>
              </div>
            )}
          </div>
        ))}
      </main>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={() => setShowAddTask(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-[40px] p-8 pb-12 animate-in slide-in-from-bottom">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" />
            <h2 className="text-xl font-black text-foreground mb-4">Добавить задание</h2>
            <div className="space-y-3">
              <Input placeholder="ID задания" value={newTask.task_id} onChange={e => setNewTask(p => ({ ...p, task_id: e.target.value }))} />
              <Input placeholder="Название ресторана" value={newTask.name} onChange={e => setNewTask(p => ({ ...p, name: e.target.value }))} />
              <Input placeholder="Адрес А (ресторан)" value={newTask.addr1} onChange={e => setNewTask(p => ({ ...p, addr1: e.target.value }))} />
              <Input placeholder="Адрес Б (доставка)" value={newTask.addr2} onChange={e => setNewTask(p => ({ ...p, addr2: e.target.value }))} />
              <Input placeholder="Ссылка на Яндекс Еду" value={newTask.link} onChange={e => setNewTask(p => ({ ...p, link: e.target.value }))} />
              <Input type="datetime-local" placeholder="Истекает" value={newTask.expires_at} onChange={e => setNewTask(p => ({ ...p, expires_at: e.target.value }))} />
              <Button onClick={addTask} className="w-full font-black uppercase bg-accent text-accent-foreground hover:bg-accent/90">
                Добавить
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
