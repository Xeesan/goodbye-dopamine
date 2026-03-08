/**
 * .ics (iCalendar) export utility for Exams and Routine.
 * Generates RFC 5545 compliant calendar files with VALARM reminders.
 */

function icsEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function toICSDate(dateStr: string, timeStr?: string): string {
  // dateStr: "2026-03-15", timeStr: "09:00"
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
  const d = dateStr.replace(/-/g, '');
  const time = (timeStr || '09:00').replace(/[^0-9]/g, '').slice(0, 4).padEnd(4, '0') + '00';
  return d + 'T' + time;
}

function uid(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10) + '@gbd';
}

function nowStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
}

function buildEvent(opts: {
  summary: string;
  dtstart: string;
  dtend: string;
  location?: string;
  description?: string;
  alarmMinutes?: number[];
}): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid()}`,
    `DTSTAMP:${nowStamp()}`,
    `DTSTART:${opts.dtstart}`,
    `DTEND:${opts.dtend}`,
    `SUMMARY:${icsEscape(opts.summary)}`,
  ];

  if (opts.location) lines.push(`LOCATION:${icsEscape(opts.location)}`);
  if (opts.description) lines.push(`DESCRIPTION:${icsEscape(opts.description)}`);

  // Add alarm reminders
  const alarms = opts.alarmMinutes || [30, 1440]; // 30min + 1 day before
  for (const mins of alarms) {
    lines.push(
      'BEGIN:VALARM',
      'TRIGGER:-PT' + mins + 'M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsEscape(opts.summary)} reminder`,
      'END:VALARM'
    );
  }

  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

function wrapCalendar(events: string[], calName: string): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GoodByeDopamine//EN',
    `X-WR-CALNAME:${icsEscape(calName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export exams as .ics calendar file.
 * Each exam becomes a 2-hour event with 30min + 1day reminders.
 */
export function exportExamsToICS(exams: any[], label = 'Exams') {
  if (!exams || exams.length === 0) return false;

  const events = exams
    .filter(e => e.date && e.subject)
    .map(e => {
      const start = toICSDate(e.date, e.time);
      // Default 2hr duration for exams
      const endTime = e.time ? addMinutes(e.time, 120) : '11:00';
      const end = toICSDate(e.date, endTime);

      const descParts: string[] = [];
      if (e.teacher) descParts.push(`Teacher: ${e.teacher}`);
      if (e.credits) descParts.push(`Credits: ${e.credits}`);
      if (e.grade) descParts.push(`Grade: ${e.grade}`);

      return buildEvent({
        summary: `📝 ${e.subject}`,
        dtstart: start,
        dtend: end,
        location: e.room || undefined,
        description: descParts.join(', ') || undefined,
        alarmMinutes: [30, 1440], // 30 min + 1 day before
      });
    });

  if (events.length === 0) return false;

  const cal = wrapCalendar(events, `GBD - ${label}`);
  downloadICS(cal, `gbd-${label.toLowerCase().replace(/\s+/g, '-')}.ics`);
  return true;
}

/**
 * Export weekly routine as recurring .ics events.
 * Each class becomes a weekly recurring event.
 */
export function exportRoutineToICS(routine: Record<string, any[]>) {
  if (!routine) return false;

  const dayMap: Record<string, { rruleDay: string; offset: number }> = {
    monday: { rruleDay: 'MO', offset: 1 },
    tuesday: { rruleDay: 'TU', offset: 2 },
    wednesday: { rruleDay: 'WE', offset: 3 },
    thursday: { rruleDay: 'TH', offset: 4 },
    friday: { rruleDay: 'FR', offset: 5 },
    saturday: { rruleDay: 'SA', offset: 6 },
    sunday: { rruleDay: 'SU', offset: 0 },
  };

  const events: string[] = [];

  for (const [day, periods] of Object.entries(routine)) {
    const dayInfo = dayMap[day];
    if (!dayInfo || !Array.isArray(periods)) continue;

    for (const p of periods) {
      if (!p.subject || !p.startTime || !p.endTime) continue;

      // Find the next occurrence of this day
      const nextDate = getNextDayDate(dayInfo.offset);
      const start = toICSDate(nextDate, p.startTime);
      const end = toICSDate(nextDate, p.endTime);

      const eventLines = [
        'BEGIN:VEVENT',
        `UID:${uid()}`,
        `DTSTAMP:${nowStamp()}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${dayInfo.rruleDay}`,
        `SUMMARY:📚 ${icsEscape(p.subject)}`,
      ];

      if (p.room) eventLines.push(`LOCATION:${icsEscape(p.room)}`);

      // 15min reminder for classes
      eventLines.push(
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'ACTION:DISPLAY',
        `DESCRIPTION:${icsEscape(p.subject)} in 15 minutes`,
        'END:VALARM',
        'END:VEVENT'
      );

      events.push(eventLines.join('\r\n'));
    }
  }

  if (events.length === 0) return false;

  const cal = wrapCalendar(events, 'GBD - Class Routine');
  downloadICS(cal, 'gbd-routine.ics');
  return true;
}

// Helper: add minutes to a "HH:MM" time string
function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return String(newH).padStart(2, '0') + ':' + String(newM).padStart(2, '0');
}

// Helper: get YYYY-MM-DD for the next occurrence of a weekday (0=Sun..6=Sat)
function getNextDayDate(targetDay: number): string {
  const now = new Date();
  const current = now.getDay();
  let diff = targetDay - current;
  if (diff <= 0) diff += 7;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  return next.toISOString().split('T')[0];
}
