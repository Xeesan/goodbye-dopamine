import { useState, useCallback } from 'react';
import Storage from '@/lib/storage';
import { formatDate, formatTime12h } from '@/lib/helpers';
import { Edit, Trash2, ArrowLeft } from 'lucide-react';
import ImageOCRImport from '../ImageOCRImport';
import { useDialog } from '../DialogProvider';
import { useGamification } from '@/hooks/useGamification';
import { toast } from '@/hooks/use-toast';

interface ExamsPageProps {
  navigateTo: (page: string) => void;
  refreshKey: number;
}

function getExamCountdown(dateStr: string, timeStr?: string) {
  try {
    const examDate = new Date(dateStr + 'T' + (timeStr || '09:00'));
    if (isNaN(examDate.getTime())) return { text: '—', days: 99, urgency: 'safe' };
    const now = new Date();
    const diff = examDate.getTime() - now.getTime();
    if (diff <= 0) return { text: 'PASSED', days: -1, urgency: 'passed' };
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days === 0) return { text: hours + 'h left', days: 0, urgency: 'critical' };
    if (days <= 3) return { text: days + 'd ' + hours + 'h', days, urgency: 'critical' };
    if (days <= 7) return { text: days + ' days', days, urgency: 'warning' };
    return { text: days + ' days', days, urgency: 'safe' };
  } catch { return { text: '—', days: 99, urgency: 'safe' }; }
}

const ExamsPage = ({ navigateTo }: ExamsPageProps) => {
  const [examTab, setExamTab] = useState('exams');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const { showDialog } = useDialog();
  const { addXP } = useGamification();
  const refresh = useCallback(() => setRefreshCounter(c => c + 1), []);

  const exams = Storage.getExams();
  const filtered = exams
    .filter(e => e.type === examTab || (!e.type && examTab === 'exams'))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const upcoming = filtered.filter(e => getExamCountdown(e.date, e.time).days >= 0);
  const thisWeek = upcoming.filter(e => getExamCountdown(e.date, e.time).days <= 7);
  const totalCredits = upcoming.reduce((s, e) => s + (parseInt(e.credits) || 0), 0);

  const addExam = async () => {
    const subject = (document.getElementById('exam-subject') as HTMLInputElement)?.value.trim();
    if (!subject) {
      await showDialog({ title: 'Missing Info', message: 'Please enter a subject name.', type: 'alert' });
      return;
    }
    const examData = {
      subject,
      date: (document.getElementById('exam-date') as HTMLInputElement)?.value,
      time: (document.getElementById('exam-time') as HTMLInputElement)?.value,
      grade: (document.getElementById('exam-grade') as HTMLInputElement)?.value,
      credits: parseInt((document.getElementById('exam-credits') as HTMLInputElement)?.value) || 3,
      teacher: (document.getElementById('exam-teacher') as HTMLInputElement)?.value.trim(),
      room: (document.getElementById('exam-room') as HTMLInputElement)?.value.trim(),
      type: examTab,
    };
    if (editingId) {
      Storage.updateExam({ ...examData, id: editingId });
      setEditingId(null);
      refresh();
      toast({ title: 'Exam updated', description: subject });
    } else {
      Storage.addExam(examData);
      addXP(15);
      (document.getElementById('exam-subject') as HTMLInputElement).value = '';
      refresh();
      toast({ title: `${examTab === 'exams' ? 'Exam' : 'Assignment'} added`, description: subject });
    }
  };

  const deleteExam = async (id: string) => {
    const exam = exams.find(e => e.id === id);
    const confirmed = await showDialog({ title: 'Delete Exam', message: 'Are you sure you want to delete this exam?', type: 'confirm', confirmText: 'Delete' });
    if (confirmed) {
      Storage.deleteExam(id);
      if (editingId === id) setEditingId(null);
      refresh();
      toast({ title: 'Exam deleted', description: exam?.subject || '' });
    }
  };

  const handleOCRImport = (items: any[]) => {
    items.forEach((item: any) => {
      Storage.addExam({
        subject: item.subject || 'Unknown',
        date: item.date || new Date().toISOString().split('T')[0],
        time: item.time || '09:00',
        room: item.room || '',
        teacher: item.teacher || '',
        credits: item.credits || 3,
        grade: item.grade || '',
        type: examTab,
      });
    });
    addXP(items.length * 15);
    refresh();
    toast({ title: 'Exams imported', description: `${items.length} item(s) added` });
  };

  return (
    <div className="page-enter max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button className="icon-btn !w-9 !h-9" onClick={() => navigateTo('dashboard')}><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Exam Tracker</h1>
            <p className="text-muted-foreground text-sm">Stay ahead of your academic schedule.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ImageOCRImport mode="exams" onImport={handleOCRImport} />
          {filtered.length > 0 && (
            <button className="btn-outline !text-destructive !border-destructive/30 hover:!bg-destructive/10" onClick={clearAllExams}>
              <Trash2 className="w-3.5 h-3.5 inline-block mr-1" />Clear All
            </button>
          )}
          <div className="tab-group">
            <button className={`tab-item ${examTab === 'exams' ? 'active' : ''}`} onClick={() => setExamTab('exams')}>EXAMS</button>
            <button className={`tab-item ${examTab === 'assignments' ? 'active' : ''}`} onClick={() => setExamTab('assignments')}>ASSIGNMENTS</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-card !p-4 text-center">
          <div className="text-2xl font-bold text-primary">{upcoming.length}</div>
          <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground">UPCOMING</div>
        </div>
        <div className="glass-card !p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: thisWeek.length > 0 ? 'hsl(var(--warning))' : undefined }}>{thisWeek.length}</div>
          <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground">THIS WEEK</div>
        </div>
        <div className="glass-card !p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: 'hsl(var(--purple))' }}>{totalCredits}</div>
          <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground">TOTAL CREDITS</div>
        </div>
      </div>

      <div className="glass-card mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div><label className="form-label">SUBJECT</label><input type="text" id="exam-subject" className="input-simple" placeholder="e.g. Mathematics" /></div>
          <div><label className="form-label">DATE</label><input type="date" id="exam-date" className="input-simple" defaultValue={new Date().toISOString().split('T')[0]} /></div>
          <div><label className="form-label">TIME</label><input type="time" id="exam-time" className="input-simple" defaultValue="09:00" /></div>
          <div><label className="form-label">TARGET GRADE</label><input type="text" id="exam-grade" className="input-simple" placeholder="A+" defaultValue="A+" /></div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div><label className="form-label">CREDITS</label><input type="number" id="exam-credits" className="input-simple" defaultValue={3} min={1} max={10} /></div>
          <div><label className="form-label">TEACHER</label><input type="text" id="exam-teacher" className="input-simple" placeholder="e.g. Dr. Smith" /></div>
          <div><label className="form-label">ROOM</label><input type="text" id="exam-room" className="input-simple" placeholder="e.g. Room 301" /></div>
        </div>
        <div className="flex gap-3">
          <button className="btn-green flex-1" onClick={addExam}>
            {editingId ? '✓ UPDATE' : '+'} {examTab === 'exams' ? 'EXAM' : 'ASSIGNMENT'}
          </button>
          {editingId && <button className="btn-outline" onClick={() => setEditingId(null)}>CANCEL</button>}
        </div>
      </div>

      <div className="space-y-3 min-h-[100px]">
        {filtered.length === 0 ? (
          <div className="glass-card empty-state !py-16">
            <p className="text-muted-foreground">No {examTab} tracked yet. Add your first one above!</p>
          </div>
        ) : filtered.map(e => {
          const cd = getExamCountdown(e.date, e.time);
          const urgencyColor = cd.urgency === 'critical' ? '#ef4444' : cd.urgency === 'warning' ? '#f59e0b' : cd.urgency === 'passed' ? 'hsl(var(--text-muted))' : 'hsl(var(--primary))';
          return (
            <div key={e.id} className="glass-card flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="inline-block text-xs font-bold px-2 py-0.5 rounded mb-2" style={{ background: `${urgencyColor}15`, color: urgencyColor, border: `1px solid ${urgencyColor}33` }}>
                  {cd.urgency === 'passed' ? '✓' : cd.days <= 3 ? '⚠' : '📅'} {cd.text}
                </span>
                <h3 className="font-semibold text-foreground">{e.subject}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                  <span>📅 {formatDate(e.date)}</span>
                  <span>🕐 {formatTime12h(e.time)}</span>
                  {e.room && <span>📍 {e.room}</span>}
                  {e.teacher && <span>🎓 {e.teacher}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-1 rounded" style={{ background: 'hsl(var(--accent-dim))', color: 'hsl(var(--primary))' }}>🎯 {e.grade || '—'}</span>
                <span className="text-xs font-semibold px-2 py-1 rounded" style={{ background: 'hsl(var(--purple) / 0.12)', color: 'hsl(var(--purple))' }}>{e.credits || 3} cr</span>
                <button className="icon-btn !w-7 !h-7 !text-primary" onClick={() => setEditingId(String(e.id))}><Edit className="w-3.5 h-3.5" /></button>
                <button className="icon-btn !w-7 !h-7 !text-destructive" onClick={() => deleteExam(String(e.id))}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExamsPage;
