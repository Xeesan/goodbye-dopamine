export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch { return dateStr; }
}

export function formatDateShort(dateOrStr: Date | string): string {
  try {
    const d = typeof dateOrStr === 'string' ? new Date(dateOrStr) : dateOrStr;
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch { return ''; }
}

export function getCurrentDayName(): string {
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
}

export function generateUniqueId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function formatTime12h(time: string): string {
  if (!time) return '—';
  // Handle range like "14:00-15:30"
  if (time.includes('-')) {
    const parts = time.split('-').map(t => formatTime12h(t.trim()));
    return parts.join(' - ');
  }
  const m = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time;
  let h = parseInt(m[1]);
  const min = m[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${min}${ampm}`;
}
