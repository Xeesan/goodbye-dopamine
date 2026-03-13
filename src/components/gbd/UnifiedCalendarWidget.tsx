import { useState, useMemo, useEffect } from 'react';
import Storage from '@/lib/storage';
import { ChevronLeft, ChevronRight, Calendar, FileText, Clock, CheckSquare, Plus, Flag } from 'lucide-react';
import { getHolidaysForMonth } from '@/lib/bdHolidays';
import { formatTime12h } from '@/lib/helpers';

interface UnifiedCalendarWidgetProps {
  navigateTo: (page: string) => void;
  refreshKey?: number;
}

interface DayEvent {
  type: 'exam' | 'task' | 'routine' | 'holiday';
  title: string;
  time?: string;
  meta?: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// DAY_NAMES_MAP no longer needed — using array index instead

const UnifiedCalendarWidget = ({ navigateTo, refreshKey }: UnifiedCalendarWidgetProps) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [localRefresh, setLocalRefresh] = useState(0);

  useEffect(() => {
    const handler = () => setLocalRefresh(k => k + 1);
    window.addEventListener('gbd_storage_changed', handler);
    return () => window.removeEventListener('gbd_storage_changed', handler);
  }, []);

  const eventsMap = useMemo(() => {
    const map: Record<string, DayEvent[]> = {};

    const addEvent = (dateKey: string, event: DayEvent) => {
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(event);
    };

    // Exams
    const exams = Storage.getExams();
    for (const exam of exams) {
      if (exam.date) {
        addEvent(exam.date, {
          type: 'exam',
          title: exam.subject || 'Exam',
          time: exam.time,
          meta: exam.room ? `Room: ${exam.room}` : undefined,
        });
      }
    }

    // Tasks (planner) - only those with dates
    const tasks = Storage.getTasks();
    for (const task of tasks) {
      if (task.date) {
        const dateKey = task.date.split('T')[0];
        addEvent(dateKey, {
          type: 'task',
          title: task.title || 'Task',
          time: task.time,
          meta: task.status === 'done' ? '✓ Done' : task.priority ? `Priority: ${task.priority}` : undefined,
        });
      }
    }

    // Routine + Fridays — single loop through month days
    const routine = Storage.getRoutine();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const totalDays = lastDay.getDate();

    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const mm = String(currentMonth + 1).padStart(2, '0');
      const dd = String(dayNum).padStart(2, '0');
      const dateKey = `${currentYear}-${mm}-${dd}`;
      const dow = new Date(currentYear, currentMonth, dayNum).getDay();

      // Friday weekly holiday
      if (dow === 5) {
        addEvent(dateKey, {
          type: 'holiday',
          title: 'Friday (Weekly Holiday)',
          meta: '📅 Weekly',
        });
      }

      // Routine classes
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dow];
      if (routine[dayName]?.length > 0) {
        for (const period of routine[dayName]) {
          addEvent(dateKey, {
            type: 'routine',
            title: period.subject || 'Class',
            time: period.startTime && period.endTime ? `${period.startTime}-${period.endTime}` : period.startTime,
            meta: period.room ? `Room: ${period.room}` : undefined,
          });
        }
      }
    }

    // Public holidays (Bangladesh)
    const holidays = getHolidaysForMonth(currentYear, currentMonth);
    for (const h of holidays) {
      const isMoonBased = h.name.includes('☪');
      addEvent(h.date, {
        type: 'holiday',
        title: h.name,
        meta: (h.type === 'national' ? '🇧🇩 National' : h.type === 'religious' ? '🕌 Religious' : '🎭 Cultural') + (isMoonBased ? ' · 🌙 Subject to moon sighting' : ''),
      });
    }

    return map;
  }, [currentMonth, currentYear, refreshKey, localRefresh]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startPad = firstDay.getDay();
    const days: (number | null)[] = [];

    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);

    return days;
  }, [currentMonth, currentYear]);

  const getDateKey = (day: number) =>
    `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const isToday = (day: number) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
    setSelectedDate(null);
  };

  const selectedEvents = selectedDate ? eventsMap[selectedDate] || [] : [];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'exam': return <FileText className="w-3.5 h-3.5" />;
      case 'task': return <CheckSquare className="w-3.5 h-3.5" />;
      case 'routine': return <Clock className="w-3.5 h-3.5" />;
      case 'holiday': return <Flag className="w-3.5 h-3.5" />;
      default: return <Calendar className="w-3.5 h-3.5" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'exam': return 'hsl(var(--destructive))';
      case 'task': return 'hsl(var(--primary))';
      case 'routine': return 'hsl(var(--info))';
      case 'holiday': return 'hsl(var(--warning, 45 93% 47%))';
      default: return 'hsl(var(--muted-foreground))';
    }
  };

  const getDotColors = (dateKey: string) => {
    const events = eventsMap[dateKey];
    if (!events) return [];
    const types = new Set(events.map(e => e.type));
    return Array.from(types).map(getEventColor);
  };

  return (
    <div className="glass-card-accent">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-widest text-muted-foreground uppercase">
          <Calendar className="w-4 h-4" /> CALENDAR
        </div>
        <div className="flex items-center gap-2">
          <button className="icon-btn !w-7 !h-7" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold text-foreground min-w-[120px] text-center">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <button className="icon-btn !w-7 !h-7" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[0.6rem] font-semibold tracking-wider text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, i) => {
          if (day === null) return <div key={`pad-${i}`} />;
          const dateKey = getDateKey(day);
          const dots = getDotColors(dateKey);
          const selected = selectedDate === dateKey;
          const todayFlag = isToday(day);

          return (
            <button
              key={dateKey}
              onClick={() => setSelectedDate(selected ? null : dateKey)}
              className={`relative flex flex-col items-center justify-center py-1.5 rounded-lg text-sm transition-all ${
                selected
                  ? 'text-primary-foreground font-bold'
                  : todayFlag
                  ? 'text-primary font-bold'
                  : 'text-foreground hover:text-primary'
              }`}
              style={{
                background: selected
                  ? 'hsl(var(--primary))'
                  : todayFlag
                  ? 'hsl(var(--accent-dim))'
                  : 'transparent',
              }}
            >
              {day}
              {dots.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dots.slice(0, 3).map((color, j) => (
                    <div key={j} className="w-1 h-1 rounded-full" style={{ background: selected ? 'hsl(var(--primary-foreground))' : color }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-3 text-[0.6rem] text-muted-foreground">
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(var(--destructive))' }} /> Exams</span>
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(var(--primary))' }} /> Tasks</span>
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(var(--info))' }} /> Classes</span>
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(var(--warning, 45 93% 47%))' }} /> Holidays</span>
      </div>

      {/* Selected day details */}
      {selectedDate && (
        <div className="mt-4 pt-3 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-foreground">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>

          {/* Quick Add Buttons */}
          <div className="flex items-center gap-2 mb-3">
            {[
              { label: 'Task', page: 'planner', color: 'hsl(var(--primary))' },
              { label: 'Exam', page: 'exams', color: 'hsl(var(--destructive))' },
              { label: 'Class', page: 'routine', color: 'hsl(var(--info))' },
            ].map(item => (
              <button
                key={item.page}
                onClick={() => {
                  sessionStorage.setItem('calendar_prefill_date', selectedDate);
                  navigateTo(item.page);
                }}
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-[0.65rem] font-semibold tracking-wide transition-all border-none cursor-pointer hover:scale-105"
                style={{ background: `${item.color}15`, color: item.color }}
              >
                <Plus className="w-3 h-3" /> {item.label}
              </button>
            ))}
          </div>

          {selectedEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing scheduled for this day.</p>
          ) : (
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
              {selectedEvents.map((ev, i) => {
                const targetPage = ev.type === 'exam' ? 'exams' : ev.type === 'task' ? 'planner' : 'routine';
                return (
                  <button
                    key={i}
                    onClick={() => navigateTo(targetPage)}
                    className="w-full flex items-start gap-2 p-2 rounded-lg text-xs text-left hover:scale-[1.02] transition-transform cursor-pointer"
                    style={{ background: 'hsl(var(--bg-input))' }}
                  >
                    <div className="mt-0.5 shrink-0" style={{ color: getEventColor(ev.type) }}>
                      {getEventIcon(ev.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">{ev.title}</div>
                      <div className="text-muted-foreground flex items-center gap-2">
                        {ev.time && <span>{ev.time}</span>}
                        {ev.meta && <span>· {ev.meta}</span>}
                      </div>
                    </div>
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[0.55rem] font-semibold uppercase tracking-wider" style={{
                      background: `${getEventColor(ev.type)}15`,
                      color: getEventColor(ev.type),
                    }}>
                      {ev.type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UnifiedCalendarWidget;
