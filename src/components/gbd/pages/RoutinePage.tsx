import { useState } from 'react';
import Storage from '@/lib/storage';
import { getCurrentDayName } from '@/lib/helpers';
import { Trash2, ArrowLeft } from 'lucide-react';
import ImageOCRImport from '../ImageOCRImport';
import { useDialog } from '../DialogProvider';
import { useGamification } from '@/hooks/useGamification';

interface RoutinePageProps {
  navigateTo: (page: string) => void;
  refreshKey: number;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const RoutinePage = ({ navigateTo }: RoutinePageProps) => {
  const [selectedDay, setSelectedDay] = useState(getCurrentDayName());
  const [showModal, setShowModal] = useState(false);
  const { showDialog } = useDialog();
  const { addXP } = useGamification();
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
    Storage.addPeriod(selectedDay, { subject, startTime, endTime, room });
    addXP(5);
    setShowModal(false);
    navigateTo('routine');
  };

  const deletePeriod = async (id: string) => {
    const confirmed = await showDialog({ title: 'Delete Period', message: 'Are you sure you want to delete this period?', type: 'confirm', confirmText: 'Delete' });
    if (confirmed) {
      Storage.deletePeriod(selectedDay, id);
      navigateTo('routine');
    }
  };

  const handleOCRImport = (items: any[]) => {
    items.forEach((item: any) => {
      const day = (item.day || '').toLowerCase();
      if (DAYS.includes(day)) {
        Storage.addPeriod(day, { subject: item.subject || 'Unknown', startTime: item.startTime || '09:00', endTime: item.endTime || '10:00', room: item.room || '' });
      }
    });
    Storage.addXP(items.length * 5);
    navigateTo('routine');
  };

  return (
    <div className="page-enter max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button className="icon-btn !w-9 !h-9" onClick={() => navigateTo('dashboard')}><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Class Routine</h1>
            <p className="text-muted-foreground text-sm">Your weekly academic schedule at a glance.</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ImageOCRImport mode="routine" onImport={handleOCRImport} />
          <button className="btn-green" onClick={() => setShowModal(true)}><span>+</span> Add Period</button>
        </div>
      </div>

      <div className="day-tabs mb-6">
        {DAYS.map((d, i) => (
          <button key={d} className={`day-tab ${d === selectedDay ? 'active' : ''}`} onClick={() => setSelectedDay(d)}>{DAY_LABELS[i]}</button>
        ))}
      </div>

      <div className="glass-card min-h-[200px]">
        {periods.length === 0 ? (
          <div className="empty-state">
            <p>No classes scheduled for {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}</p>
            <button className="btn-outline mt-3" onClick={() => setShowModal(true)}>+ ADD PERIOD</button>
          </div>
        ) : (
          <div className="space-y-3">
            {periods.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'hsl(var(--bg-input))' }}>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-primary">{p.startTime} - {p.endTime}</span>
                  <span className="text-sm font-medium text-foreground">{p.subject}</span>
                  {p.room && <span className="text-xs text-muted-foreground">{p.room}</span>}
                </div>
                <button className="icon-btn !w-8 !h-8 !text-destructive" onClick={() => deletePeriod(p.id)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-4">Add Period</h2>
            <div className="space-y-3">
              <div><label className="form-label">Subject</label><input type="text" id="period-subject" className="input-simple" placeholder="e.g. Mathematics" /></div>
              <div><label className="form-label">Start Time</label><input type="time" id="period-start" className="input-simple" defaultValue="09:00" /></div>
              <div><label className="form-label">End Time</label><input type="time" id="period-end" className="input-simple" defaultValue="10:00" /></div>
              <div><label className="form-label">Room (Optional)</label><input type="text" id="period-room" className="input-simple" placeholder="e.g. Room 302" /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-outline flex-1" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-green flex-1" onClick={addPeriod}>Add Period</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutinePage;
