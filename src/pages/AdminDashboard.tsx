import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LogOut, Plus, CheckCircle, Clock, Package } from 'lucide-react';

interface CompletedTask {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  user_id: string;
  task_id: string;
  tasks: { task_id: string; name: string } | null;
}

interface CompletedTaskWithProfile extends CompletedTask {
  executor_name?: string;
}

function parseTaskText(text: string): { name: string; addr1: string; addr2: string; link: string; task_id: string } | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  let addr1 = '';
  let addr2 = '';
  let link = '';
  let name = '';

  for (const line of lines) {
    if (line.startsWith('http') && line.includes('eda.yandex')) {
      if (!link) link = line;
    } else if (line.startsWith('[') || line === 'Яндекс') {
      continue;
    } else if (!addr1) {
      addr1 = line;
    } else if (!addr2) {
      addr2 = line;
    }
  }

  if (!link || !addr1 || !addr2) return null;

  // Extract restaurant name from link slug
  const slugMatch = link.match(/placeSlug=([^&]+)/);
  if (slugMatch) {
    name = slugMatch[1].replace(/_/g, ' ').replace(/\s+[a-z0-9]+$/, '').toUpperCase();
  } else {
    const rMatch = link.match(/\/r\/([^?]+)/);
    name = rMatch ? rMatch[1].replace(/_/g, ' ').toUpperCase() : 'Ресторан';
  }

  // Add street to name for branch identification
  const streetMatch = addr1.match(/(?:улица|ул\.|переулок|проспект|бульвар|шоссе)\s+[^,]+/i) 
    || addr1.match(/([^,]+)/);
  if (streetMatch) {
    name = name + ' · ' + streetMatch[0].trim();
  }

  const task_id = (slugMatch?.[1] || 'task') + '_' + Date.now();

  return { name, addr1, addr2, link, task_id };
}

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [completedTasks, setCompletedTasks] = useState<CompletedTaskWithProfile[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'done'>('pending');

  useEffect(() => {
    loadCompletedTasks();
  }, []);

  const loadCompletedTasks = async () => {
    const { data } = await supabase
      .from('completed_tasks')
      .select('*, tasks(task_id, name)')
      .order('created_at', { ascending: false });
    
    if (!data) { setCompletedTasks([]); return; }

    // Fetch executor names separately
    const userIds = [...new Set(data.map(d => d.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', userIds);
    
    const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) ?? []);
    
    setCompletedTasks(data.map(ct => ({
      ...ct,
      tasks: ct.tasks as any,
      executor_name: profileMap.get(ct.user_id) ?? undefined,
    })));
  };

  const acceptTask = async (id: string) => {
    await supabase.from('completed_tasks').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', id);
    loadCompletedTasks();
    toast({ title: 'Заказ принят' });
  };

  const completeTask = async (ct: CompletedTaskWithProfile) => {
    await supabase.from('completed_tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', ct.id);
    const { data: profile } = await supabase.from('profiles').select('balance').eq('user_id', ct.user_id).single();
    if (profile) {
      await supabase.from('profiles').update({ balance: profile.balance + 20 }).eq('user_id', ct.user_id);
    }
    loadCompletedTasks();
    toast({ title: 'Готово! 20₽ зачислено исполнителю' });
  };

  const addTask = async () => {
    const parsed = parseTaskText(taskText);
    if (!parsed) {
      toast({ title: 'Ошибка', description: 'Не удалось распознать задание. Вставьте текст с адресами и ссылкой.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('tasks').insert({
      task_id: parsed.task_id,
      name: parsed.name,
      addr1: parsed.addr1,
      addr2: parsed.addr2,
      link: parsed.link,
    });
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      return;
    }
    setTaskText('');
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
                <p className="text-[9px] text-muted-foreground font-bold">Исполнитель: {ct.executor_name ?? 'N/A'}</p>
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

      {/* Add Task Modal - Simple Textarea */}
      {showAddTask && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={() => setShowAddTask(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-[40px] p-8 pb-12 animate-in slide-in-from-bottom">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" />
            <h2 className="text-xl font-black text-foreground mb-4">Добавить задания</h2>
            <Textarea
              placeholder="Вставьте текст заданий..."
              value={taskText}
              onChange={e => setTaskText(e.target.value)}
              className="min-h-[200px] mb-4 rounded-2xl"
            />
            <Button onClick={addTask} className="w-full font-black uppercase bg-accent text-accent-foreground hover:bg-accent/90 rounded-2xl h-14 text-base">
              Добавить
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
