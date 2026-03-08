import { useState, useCallback, useEffect } from 'react';
import Storage from '@/lib/storage';
import { syncRoutineFromDB, addPeriodToDB, deletePeriodFromDB, clearRoutineInDB } from '@/lib/dbSync';
import { getCurrentDayName } from '@/lib/helpers';
import { Trash2, ArrowLeft } from 'lucide-react';
import ImageOCRImport from '../ImageOCRImport';
import { useDialog } from '../DialogProvider';
import { useGamification } from '@/hooks/useGamification';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/hooks/useI18n';
import type { TranslationKey } from '@/lib/i18n';

interface RoutinePageProps {
  navigateTo: (page: string) => void;
  refreshKey: number;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_KEYS: TranslationKey[] = ['day.monday', 'day.tuesday', 'day.wednesday', 'day.thursday', 'day.friday', 'day.saturday', 'day.sunday'];

const RoutinePage = ({ navigateTo }: RoutinePageProps) => {
  const [selectedDay, setSelectedDay] = useState(getCurrentDayName());
  const [showModal, setShowModal] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const { showDialog } = useDialog();
  const { addXP } = useGamification();
  const { t } = useI18n();
  const refresh = useCallback(() => setRefreshCounter(c => c + 1), []);

  useEffect(() => {
    syncRoutineFromDB().then(() => refresh());
  }, []);

  // Pre-fill day from calendar quick-add
  useEffect(() => {
    const prefillDate = sessionStorage.getItem('calendar_prefill_date');
    if (prefillDate) {
      sessionStorage.removeItem('calendar_prefill_date');
      const date = new Date(prefillDate + 'T00:00:00');
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[date.getDay()];
      if (DAYS.includes(dayName)) {
        setSelectedDay(dayName);
      }
      setShowModal(true);
    }
  }, []);

  const routine = Storage.getRoutine();
  const periods = routine[selectedDay] || [];

  const addPeriod = async () => {
    const subject = (document.getElementById('period-subject') as HTMLInputElement)?.value.trim();
    if (!subject) {
      await showDialog({ title: 'Missing Info', message: 'Please enter a subject name.', type: 'alert' });
      return;
    }
    const startTime = (document.getElementById('period-start') as HTMLInputElement)?.value;
    const endTime = (document.getElementById('period-end') as HTMLInputElement)?.value;
    const room = (document.getElementById('period-room') as HTMLInputElement)?.value.trim();
    const periodData = { subject, startTime, endTime, room };
    Storage.addPeriod(selectedDay, periodData);
    addPeriodToDB(selectedDay, periodData).then(dbId => {
      if (dbId) {
        const r = Storage.getRoutine();
        const dayPeriods = r[selectedDay] || [];
        const last = dayPeriods[dayPeriods.length - 1];
        if (last) { last.id = dbId; Storage.setRoutine(r); refresh(); }
      }
    });
    addXP(5);
    setShowModal(false);
    refresh();
    toast({ title: t('routine.add_period'), description: `${subject}` });
  };

  const deletePeriod = async (id: string) => {
    const period = periods.find((p: any) => p.id === id);
    const confirmed = await showDialog({ title: t('common.delete'), message: 'Are you sure you want to delete this period?', type: 'confirm', confirmText: t('common.delete') });
    if (confirmed) {
      Storage.deletePeriod(selectedDay, id);
      deletePeriodFromDB(id);
      refresh();
      toast({ title: 'Period deleted', description: period?.subject || '' });
    }
  };

  const handleOCRImport = (items: any[]) => {
    items.forEach((item: any) => {
      const day = (item.day || '').toLowerCase();
      if (DAYS.includes(day)) {
        const periodData = { subject: item.subject || 'Unknown', startTime: item.startTime || '09:00', endTime: item.endTime || '10:00', room: item.room || '' };
        Storage.addPeriod(day, periodData);
        addPeriodToDB(day, periodData);
      }
    });
    addXP(items.length * 5);
    refresh();
    toast({ title: 'Routine imported', description: `${items.length} period(s) added` });
  };

  const clearAllRoutine = async () => {
    const totalPeriods = Object.values(routine).reduce((s, arr) => s + arr.length, 0);
    if (totalPeriods === 0) return;
    const confirmed = await showDialog({ title: t('routine.clear_all'), message: `Are you sure you want to delete ALL ${totalPeriods} periods across all days? This cannot be undone.`, type: 'confirm', confirmText: 'Delete All' });
    if (confirmed) {
      Storage.clearRoutine();
      clearRoutineInDB();
      refresh();
      toast({ title: t('routine.clear_all'), description: `${totalPeriods} period(s) removed` });
    }
  };

  return (
    <div className="page-enter">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button className="icon-btn !w-9 !h-9" onClick={() => navigateTo('dashboard')}><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('routine.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('routine.subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ImageOCRImport mode="routine" onImport={handleOCRImport} />
          <button className="btn-green" onClick={() => setShowModal(true)}><span>+</span> {t('routine.add_period')}</button>
        </div>
      </div>

      <div className="day-tabs mb-6">
        {DAYS.map((d, i) => (
          <button key={d} className={`day-tab ${d === selectedDay ? 'active' : ''}`} onClick={() => setSelectedDay(d)}>{t(DAY_KEYS[i])}</button>
        ))}
      </div>

      <div className="glass-card min-h-[200px]">
        {periods.length === 0 ? (
          <div className="empty-state">
            <p>{t('routine.no_classes')} {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}</p>
            <button className="btn-outline mt-3" onClick={() => setShowModal(true)}>{t('routine.add_period_btn')}</button>
          </div>
        ) : (
          <div className="space-y-3">
            {periods.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg flex-wrap" style={{ background: 'hsl(var(--bg-input))' }}>
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-wrap">
                  <span className="text-sm font-semibold text-primary whitespace-nowrap">{p.startTime} - {p.endTime}</span>
                  <span className="text-sm font-medium text-foreground truncate">{p.subject}</span>
                  {p.room && <span className="text-xs text-muted-foreground">{p.room}</span>}
                </div>
                <button className="icon-btn !w-8 !h-8 !text-destructive shrink-0" onClick={() => deletePeriod(p.id)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {Object.values(routine).some(arr => arr.length > 0) && (
        <div className="mt-4 flex justify-center">
          <button className="btn-outline !text-destructive !border-destructive/30 hover:!bg-destructive/10 text-sm" onClick={clearAllRoutine}>
            <Trash2 className="w-3.5 h-3.5 inline-block mr-1" />{t('routine.clear_all')}
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-4">{t('routine.add_period')}</h2>
            <div className="space-y-3">
              <div><label className="form-label">{t('routine.subject')}</label><input type="text" id="period-subject" className="input-simple" placeholder="e.g. Mathematics" /></div>
              <div><label className="form-label">{t('routine.start_time')}</label><input type="time" id="period-start" className="input-simple" defaultValue="09:00" /></div>
              <div><label className="form-label">{t('routine.end_time')}</label><input type="time" id="period-end" className="input-simple" defaultValue="10:00" /></div>
              <div><label className="form-label">{t('routine.room')}</label><input type="text" id="period-room" className="input-simple" placeholder="e.g. Room 302" /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-outline flex-1" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
              <button className="btn-green flex-1" onClick={addPeriod}>{t('routine.add_period')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutinePage;
