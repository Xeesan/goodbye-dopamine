import { useState, useCallback, useEffect } from 'react';
import Storage from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { Search, ArrowLeft, ArrowRight, CheckCircle2, Trash2, Undo2 } from 'lucide-react';
import { useDialog } from '../DialogProvider';
import { useGamification } from '@/hooks/useGamification';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/hooks/useI18n';

interface PlannerPageProps {
  navigateTo: (page: string) => void;
  refreshKey: number;
}

const PlannerPage = ({ navigateTo }: PlannerPageProps) => {
  const [priority, setPriority] = useState('medium');
  const [refreshCounter, setRefreshCounter] = useState(0);
  const { showDialog } = useDialog();
  const { addXP } = useGamification();
  const { t } = useI18n();
  const refresh = useCallback(() => setRefreshCounter(c => c + 1), []);

  const tasks = Storage.getTasks();
  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  const createTask = async () => {
    const title = (document.getElementById('task-title') as HTMLInputElement)?.value.trim();
    if (!title) {
      await showDialog({ title: 'Missing Info', message: 'Please enter a task title.', type: 'alert' });
      return;
    }
    const date = (document.getElementById('task-date') as HTMLInputElement)?.value;
    const time = (document.getElementById('task-time') as HTMLInputElement)?.value;
    const reminder = (document.getElementById('task-reminder') as HTMLSelectElement)?.value;
    Storage.addTask({ title, date, time, priority, reminder });
    addXP(10);
    (document.getElementById('task-title') as HTMLInputElement).value = '';
    refresh();
    toast({ title: 'Task created', description: title });

    if (reminder && date && time) {
      try {
        const taskDateTime = new Date(`${date}T${time}`);
        const reminderMinutes = parseInt(reminder, 10);
        if (!isNaN(taskDateTime.getTime()) && !isNaN(reminderMinutes)) {
          const remindAt = new Date(taskDateTime.getTime() - reminderMinutes * 60 * 1000);
          if (remindAt > new Date()) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from('task_reminders').insert({
                user_id: user.id,
                task_title: title,
                remind_at: remindAt.toISOString(),
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to save reminder:', e);
      }
    }
  };

  const moveTask = (id: string, status: string) => {
    const task = tasks.find(t => t.id === id);
    Storage.updateTask(id, { status });
    if (status === 'done') addXP(20);
    refresh();
    toast({ title: status === 'done' ? 'Task completed ✓' : 'Task moved', description: task?.title || '' });
  };

  const deleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    const confirmed = await showDialog({ title: t('common.delete'), message: 'Are you sure you want to delete this task?', type: 'confirm', confirmText: t('common.delete') });
    if (confirmed) {
      Storage.deleteTask(id);
      refresh();
      toast({ title: 'Task deleted', description: task?.title || '' });
    }
  };

  const renderTaskCard = (task: any) => (
    <div key={task.id} className="glass-card !p-4 mb-3 group hover:!border-primary/20">
      <div className="font-medium text-foreground text-sm mb-2">{task.title}</div>
      <div className="flex items-center gap-2 text-xs mb-3">
        <span className={`task-priority ${task.priority}`}>{task.priority}</span>
        <span className="text-muted-foreground">{task.date || ''}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {task.status === 'todo' && (
          <button
            className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-[0.7rem] font-semibold tracking-wide transition-all duration-200 border-none cursor-pointer"
            style={{ background: 'hsl(var(--info) / 0.15)', color: 'hsl(var(--info))' }}
            onClick={() => moveTask(task.id, 'in-progress')}
          >
            <ArrowRight className="w-3 h-3" /> {t('planner.progress')}
          </button>
        )}
        {task.status === 'in-progress' && (
          <button
            className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-[0.7rem] font-semibold tracking-wide transition-all duration-200 border-none cursor-pointer"
            style={{ background: 'hsl(var(--warning) / 0.15)', color: 'hsl(var(--warning))' }}
            onClick={() => moveTask(task.id, 'todo')}
          >
            <Undo2 className="w-3 h-3" /> {t('planner.todo')}
          </button>
        )}
        {task.status !== 'done' && (
          <button
            className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-[0.7rem] font-semibold tracking-wide transition-all duration-200 border-none cursor-pointer"
            style={{ background: 'hsl(var(--green) / 0.15)', color: 'hsl(var(--green))' }}
            onClick={() => moveTask(task.id, 'done')}
          >
            <CheckCircle2 className="w-3 h-3" /> {t('planner.done')}
          </button>
        )}
        {task.status === 'done' && (
          <button
            className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-[0.7rem] font-semibold tracking-wide transition-all duration-200 border-none cursor-pointer"
            style={{ background: 'hsl(var(--info) / 0.15)', color: 'hsl(var(--info))' }}
            onClick={() => moveTask(task.id, 'todo')}
          >
            <Undo2 className="w-3 h-3" /> {t('planner.reopen')}
          </button>
        )}
        <button
          className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-[0.7rem] font-semibold tracking-wide transition-all duration-200 border-none cursor-pointer"
          style={{ background: 'hsl(var(--destructive) / 0.12)', color: 'hsl(var(--destructive))' }}
          onClick={() => deleteTask(task.id)}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-enter">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button className="icon-btn !w-9 !h-9" onClick={() => navigateTo('dashboard')}><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('planner.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('planner.subtitle')}</p>
          </div>
        </div>
        <div className="search-input-wrap w-full sm:w-60">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder={t('planner.search_tasks')} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        <div className="glass-card">
          <h3 className="flex items-center gap-2 font-semibold text-foreground mb-5">
            <span className="text-primary text-lg">+</span> {t('planner.new_task')}
          </h3>
          <label className="form-label">{t('planner.task_title')}</label>
          <input type="text" id="task-title" className="input-simple mb-4" placeholder={t('planner.what_needs')} />
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><label className="form-label">{t('planner.date')}</label><input type="date" id="task-date" className="input-simple" defaultValue={new Date().toISOString().split('T')[0]} /></div>
            <div><label className="form-label">{t('planner.time')}</label><input type="time" id="task-time" className="input-simple" defaultValue="12:00" /></div>
          </div>
          <label className="form-label">{t('planner.priority')}</label>
          <div className="priority-group">
            {[{ key: 'low', label: t('planner.low') }, { key: 'medium', label: t('planner.medium') }, { key: 'high', label: t('planner.high') }].map(p => (
              <button key={p.key} className={`priority-btn ${priority === p.key ? 'active' : ''}`} onClick={() => setPriority(p.key)}>{p.label}</button>
            ))}
          </div>
          <label className="form-label">{t('planner.reminders')}</label>
          <select id="task-reminder" className="input-simple mb-5">
            <option value="">{t('planner.no_reminders')}</option>
            <option value="5">{t('planner.5_min')}</option>
            <option value="15">{t('planner.15_min')}</option>
            <option value="30">{t('planner.30_min')}</option>
            <option value="60">{t('planner.1_hour')}</option>
          </select>
          <button className="btn-green w-full" onClick={createTask}><span className="text-lg">+</span> {t('planner.create_task')}</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: t('planner.todo'), tasks: todoTasks, dot: 'bg-primary' },
            { title: t('planner.in_progress'), tasks: inProgressTasks, dot: 'bg-warning' },
            { title: t('planner.done'), tasks: doneTasks, dot: 'bg-muted-foreground' },
          ].map(col => (
            <div key={col.title}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-[0.75rem] font-bold tracking-wider text-foreground">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} /> {col.title}
                </div>
                <span className="text-[0.75rem] text-muted-foreground">{col.tasks.length}</span>
              </div>
              {col.tasks.length === 0 ? (
                <div className="empty-state !p-8">
                  <span className="text-3xl mb-1">{col.title === t('planner.todo') ? '📋' : col.title === t('planner.in_progress') ? '⚡' : '🎉'}</span>
                  <p className="text-sm">{col.title === t('planner.done') ? t('planner.complete_to_see') : t('planner.clear_agenda')}</p>
                </div>
              ) : col.tasks.map(t => renderTaskCard(t))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlannerPage;
