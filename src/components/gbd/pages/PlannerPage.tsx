import { useState } from 'react';
import Storage from '@/lib/storage';
import { Search, ArrowLeft } from 'lucide-react';
import { useDialog } from '../DialogProvider';
import { useGamification } from '@/hooks/useGamification';

interface PlannerPageProps {
  navigateTo: (page: string) => void;
  refreshKey: number;
}

const PlannerPage = ({ navigateTo }: PlannerPageProps) => {
  const [priority, setPriority] = useState('medium');
  const { showDialog } = useDialog();
  const { addXP } = useGamification();
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
    navigateTo('planner');
  };

  const moveTask = (id: string, status: string) => {
    Storage.updateTask(id, { status });
    if (status === 'done') addXP(20);
    navigateTo('planner');
  };

  const deleteTask = async (id: string) => {
    const confirmed = await showDialog({ title: 'Delete Task', message: 'Are you sure you want to delete this task?', type: 'confirm', confirmText: 'Delete' });
    if (confirmed) {
      Storage.deleteTask(id);
      navigateTo('planner');
    }
  };

  const renderTaskCard = (task: any) => (
    <div key={task.id} className="glass-card !p-4 mb-3">
      <div className="font-medium text-foreground text-sm mb-2">{task.title}</div>
      <div className="flex items-center gap-2 text-xs mb-2">
        <span className={`task-priority ${task.priority}`}>{task.priority}</span>
        <span className="text-muted-foreground">{task.date || ''}</span>
      </div>
      <div className="flex gap-1.5">
        {task.status !== 'in-progress' && (
          <button className="btn-outline !py-1 !px-2.5 !text-[0.65rem]" onClick={() => moveTask(task.id, 'in-progress')}>→ Progress</button>
        )}
        {task.status !== 'done' && (
          <button className="btn-outline !py-1 !px-2.5 !text-[0.65rem]" onClick={() => moveTask(task.id, 'done')}>✓ Done</button>
        )}
        <button className="btn-outline !py-1 !px-2.5 !text-[0.65rem] !text-destructive !border-destructive/30" onClick={() => deleteTask(task.id)}>✕</button>
      </div>
    </div>
  );

  return (
    <div className="page-enter max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button className="icon-btn !w-9 !h-9" onClick={() => navigateTo('dashboard')}><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Daily Planner</h1>
            <p className="text-muted-foreground text-sm">Master your schedule, conquer your goals.</p>
          </div>
        </div>
        <div className="search-input-wrap w-60">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search tasks..." />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        <div className="glass-card">
          <h3 className="flex items-center gap-2 font-semibold text-foreground mb-5">
            <span className="text-primary text-lg">+</span> New Task
          </h3>
          <label className="form-label">TASK TITLE</label>
          <input type="text" id="task-title" className="input-simple mb-4" placeholder="What needs to be done" />
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><label className="form-label">DATE</label><input type="date" id="task-date" className="input-simple" defaultValue={new Date().toISOString().split('T')[0]} /></div>
            <div><label className="form-label">TIME</label><input type="time" id="task-time" className="input-simple" defaultValue="12:00" /></div>
          </div>
          <label className="form-label">PRIORITY</label>
          <div className="priority-group">
            {['low', 'medium', 'high'].map(p => (
              <button key={p} className={`priority-btn ${priority === p ? 'active' : ''}`} onClick={() => setPriority(p)}>{p.toUpperCase()}</button>
            ))}
          </div>
          <label className="form-label">REMINDERS</label>
          <select id="task-reminder" className="input-simple mb-5">
            <option value="">No reminders</option>
            <option value="5">5 minutes before</option>
            <option value="15">15 minutes before</option>
            <option value="30">30 minutes before</option>
            <option value="60">1 hour before</option>
          </select>
          <button className="btn-green w-full" onClick={createTask}><span className="text-lg">+</span> CREATE TASK</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'TO DO', tasks: todoTasks, dot: 'bg-primary' },
            { title: 'IN PROGRESS', tasks: inProgressTasks, dot: 'bg-warning' },
            { title: 'DONE', tasks: doneTasks, dot: 'bg-muted-foreground' },
          ].map(col => (
            <div key={col.title}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-[0.75rem] font-bold tracking-wider text-foreground">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} /> {col.title}
                </div>
                <span className="text-[0.75rem] text-muted-foreground">{col.tasks.length}</span>
              </div>
              {col.tasks.length === 0 ? (
                <div className="empty-state !p-8"><p className="text-sm">Your agenda is clear.</p></div>
              ) : col.tasks.map(t => renderTaskCard(t))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlannerPage;
