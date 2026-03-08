import { useState, useCallback, useEffect } from 'react';
import Storage from '@/lib/storage';
import { syncExamsFromDB, addExamToDB, updateExamInDB, deleteExamFromDB, clearExamsInDB } from '@/lib/dbSync';
import { formatDate, formatTime12h } from '@/lib/helpers';
import { Edit, Trash2, ArrowLeft, Download } from 'lucide-react';
import { exportExamsToICS } from '@/lib/icsExport';
import ImageOCRImport from '../ImageOCRImport';
import { useDialog } from '../DialogProvider';
import { useGamification } from '@/hooks/useGamification';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/hooks/useI18n';

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

const ExamsPage = ({ navigateTo, refreshKey }: ExamsPageProps) => {
  const [examTab, setExamTab] = useState('exams');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const { showDialog } = useDialog();
  const { addXP } = useGamification();
  const { t } = useI18n();
  const refresh = useCallback(() => setRefreshCounter(c => c + 1), []);

  useEffect(() => {
    syncExamsFromDB().then(() => refresh());
  }, [refreshKey]);

  // Pre-fill date from calendar quick-add
  useEffect(() => {
    const prefillDate = sessionStorage.getItem('calendar_prefill_date');
    if (prefillDate) {
      sessionStorage.removeItem('calendar_prefill_date');
      const dateInput = document.getElementById('exam-date') as HTMLInputElement;
      if (dateInput) dateInput.value = prefillDate;
      setTimeout(() => {
        const subjectInput = document.getElementById('exam-subject') as HTMLInputElement;
        subjectInput?.focus();
      }, 100);
    }
  }, []);

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
      updateExamInDB({ ...examData, id: editingId });
      setEditingId(null);
      refresh();
      toast({ title: 'Exam updated', description: subject });
    } else {
      Storage.addExam(examData);
      addExamToDB(examData).then(dbId => {
        if (dbId) {
          const current = Storage.getExams();
          const last = current[current.length - 1];
          if (last) { last.id = dbId; Storage.setExams(current); refresh(); }
        }
      });
      addXP(15);
      (document.getElementById('exam-subject') as HTMLInputElement).value = '';
      refresh();
      toast({ title: `${examTab === 'exams' ? t('exams.exam') : t('exams.assignment')} added`, description: subject });
    }
  };

  const deleteExam = async (id: string) => {
    const exam = exams.find(e => e.id === id);
    const confirmed = await showDialog({ title: t('common.delete'), message: 'Are you sure you want to delete this exam?', type: 'confirm', confirmText: t('common.delete') });
    if (confirmed) {
      Storage.deleteExam(id);
      deleteExamFromDB(id);
      if (editingId === id) setEditingId(null);
      refresh();
      toast({ title: 'Exam deleted', description: exam?.subject || '' });
    }
  };

  const clearAllExams = async () => {
    const label = examTab === 'exams' ? t('exams.exams').toLowerCase() : t('exams.assignments').toLowerCase();
    const confirmed = await showDialog({ title: `Clear All ${label}`, message: `Are you sure you want to delete ALL ${filtered.length} ${label}? This cannot be undone.`, type: 'confirm', confirmText: 'Delete All' });
    if (confirmed) {
      const remaining = exams.filter(e => (e.type || 'exams') !== examTab);
      Storage.setExams(remaining);
      clearExamsInDB(examTab);
      setEditingId(null);
      refresh();
      toast({ title: `All ${label} cleared`, description: `${filtered.length} item(s) removed` });
    }
  };

  const handleOCRImport = (items: any[]) => {
    items.forEach((item: any) => {
      const examData = {
        subject: item.subject || 'Unknown',
        date: item.date || new Date().toISOString().split('T')[0],
        time: item.time || '09:00',
        room: item.room || '',
        teacher: item.teacher || '',
        credits: item.credits || 3,
        grade: item.grade || '',
        type: examTab,
      };
      Storage.addExam(examData);
      addExamToDB(examData);
    });
    addXP(items.length * 15);
    refresh();
    toast({ title: 'Exams imported', description: `${items.length} item(s) added` });
  };

  return (
    <div className="page-enter">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button className="icon-btn !w-9 !h-9" onClick={() => navigateTo('dashboard')}><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('exams.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('exams.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            className="btn-outline text-sm flex items-center gap-1.5"
            onClick={() => {
              const success = exportExamsToICS(upcoming, examTab === 'exams' ? 'Exams' : 'Assignments');
              if (success) toast({ title: 'Calendar exported', description: 'Open the .ics file to add to your calendar' });
              else toast({ title: 'Nothing to export', description: 'No upcoming items found' });
            }}
            title="Export to calendar"
          >
            <Download className="w-4 h-4" /> .ics
          </button>
          <ImageOCRImport mode="exams" onImport={handleOCRImport} />
          <div className="tab-group">
            <button className={`tab-item ${examTab === 'exams' ? 'active' : ''}`} onClick={() => setExamTab('exams')}>{t('exams.exams')}</button>
            <button className={`tab-item ${examTab === 'assignments' ? 'active' : ''}`} onClick={() => setExamTab('assignments')}>{t('exams.assignments')}</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        <div className="glass-card !p-3 sm:!p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-primary">{upcoming.length}</div>
          <div className="text-[0.6rem] sm:text-[0.65rem] font-semibold tracking-widest text-muted-foreground">{t('exams.upcoming')}</div>
        </div>
        <div className="glass-card !p-3 sm:!p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold" style={{ color: thisWeek.length > 0 ? 'hsl(var(--warning))' : undefined }}>{thisWeek.length}</div>
          <div className="text-[0.6rem] sm:text-[0.65rem] font-semibold tracking-widest text-muted-foreground">{t('exams.this_week')}</div>
        </div>
        <div className="glass-card !p-3 sm:!p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold" style={{ color: 'hsl(var(--purple))' }}>{totalCredits}</div>
          <div className="text-[0.6rem] sm:text-[0.65rem] font-semibold tracking-widest text-muted-foreground">{t('exams.credits')}</div>
        </div>
      </div>

      <div className="glass-card mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div><label className="form-label">{t('exams.subject')}</label><input type="text" id="exam-subject" className="input-simple" placeholder="e.g. Mathematics" /></div>
          <div><label className="form-label">{t('exams.date')}</label><input type="date" id="exam-date" className="input-simple" defaultValue={new Date().toISOString().split('T')[0]} /></div>
          <div><label className="form-label">{t('exams.time')}</label><input type="time" id="exam-time" className="input-simple" defaultValue="09:00" /></div>
          <div><label className="form-label">{t('exams.target_grade')}</label><input type="text" id="exam-grade" className="input-simple" placeholder="A+" defaultValue="A+" /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div><label className="form-label">{t('exams.credits')}</label><input type="number" id="exam-credits" className="input-simple" defaultValue={3} min={1} max={10} /></div>
          <div><label className="form-label">{t('exams.teacher')}</label><input type="text" id="exam-teacher" className="input-simple" placeholder="e.g. Dr. Smith" /></div>
          <div><label className="form-label">{t('exams.room')}</label><input type="text" id="exam-room" className="input-simple" placeholder="e.g. Room 301" /></div>
        </div>
        <div className="flex gap-3">
          <button className="btn-green flex-1" onClick={addExam}>
            {editingId ? `✓ ${t('common.update')}` : '+'} {examTab === 'exams' ? t('exams.exam') : t('exams.assignment')}
          </button>
          {editingId && <button className="btn-outline" onClick={() => setEditingId(null)}>{t('common.cancel')}</button>}
        </div>
      </div>

      <div className="space-y-3 min-h-[100px]">
        {filtered.length === 0 ? (
          <div className="glass-card empty-state !py-16">
            <p className="text-muted-foreground">{examTab === 'exams' ? t('exams.exams') : t('exams.assignments')} {t('exams.no_items')}</p>
          </div>
        ) : filtered.map(e => {
          const cd = getExamCountdown(e.date, e.time);
          const urgencyColor = cd.urgency === 'critical' ? '#ef4444' : cd.urgency === 'warning' ? '#f59e0b' : cd.urgency === 'passed' ? 'hsl(var(--text-muted))' : 'hsl(var(--primary))';
          return (
            <div key={e.id} className="glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
      {filtered.length > 0 && (
        <div className="mt-4 flex justify-center">
          <button className="btn-outline !text-destructive !border-destructive/30 hover:!bg-destructive/10 text-sm" onClick={clearAllExams}>
            <Trash2 className="w-3.5 h-3.5 inline-block mr-1" />{examTab === 'exams' ? t('exams.clear_all_exams') : t('exams.clear_all_assignments')}
          </button>
        </div>
      )}
    </div>
  );
};

export default ExamsPage;
