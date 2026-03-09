import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Settings, User, Link, X, ChevronLeft, ChevronRight, Calendar, Palmtree } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const LS_KEY_URL = 'gbd_office_sheet_url';
const LS_KEY_NAME = 'gbd_office_routine_name';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface ShiftEntry {
  shift: string;
  name: string;
}

interface DayRow {
  date: string;
  day: string;
  shifts: ShiftEntry[];
  monthKey: string; // "2026-03" format
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current.trim());
        current = '';
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        row.push(current.trim());
        if (row.some(c => c)) rows.push(row);
        row = [];
        current = '';
        if (ch === '\r') i++;
      } else {
        current += ch;
      }
    }
  }
  row.push(current.trim());
  if (row.some(c => c)) rows.push(row);
  return rows;
}

function extractMonthKey(dateStr: string): string {
  // Handle formats like "2026-03-01" or "2026/03/01"
  const normalized = dateStr.replace(/\//g, '-');
  const parts = normalized.split('-');
  if (parts.length >= 2) return `${parts[0]}-${parts[1].padStart(2, '0')}`;
  return '';
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const monthIdx = parseInt(month, 10) - 1;
  if (monthIdx >= 0 && monthIdx < 12) return `${MONTH_NAMES[monthIdx]} ${year}`;
  return monthKey;
}

const OfficeRoutine = () => {
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem(LS_KEY_URL) || '');
  const [filterName, setFilterName] = useState(() => localStorage.getItem(LS_KEY_NAME) || '');
  const [allData, setAllData] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  const fetchData = useCallback(async (url: string) => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return;
    setLoading(true);
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv`;
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error('Failed to fetch');
      const text = await res.text();
      const rows = parseCSV(text);
      if (rows.length < 2) throw new Error('No data found');

      const hdr = rows[0];
      const parsed: DayRow[] = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const date = r[0] || '';
        const day = r[1] || '';
        const shifts: ShiftEntry[] = [];
        for (let j = 2; j < r.length && j < hdr.length; j++) {
          if (r[j]) shifts.push({ shift: hdr[j], name: r[j] });
        }
        const monthKey = extractMonthKey(date);
        if (date || day) parsed.push({ date, day, shifts, monthKey });
      }
      setAllData(parsed);

      // Auto-select current month or first available
      const now = new Date();
      const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const availableMonths = [...new Set(parsed.map(r => r.monthKey).filter(Boolean))];
      if (availableMonths.includes(currentKey)) {
        setSelectedMonth(currentKey);
      } else if (availableMonths.length > 0) {
        setSelectedMonth(availableMonths[availableMonths.length - 1]);
      }
    } catch (err: any) {
      toast({ title: 'Error loading sheet', description: err.message });
      setAllData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sheetUrl) fetchData(sheetUrl);
  }, [sheetUrl, fetchData]);

  const availableMonths = useMemo(() => {
    const months = [...new Set(allData.map(r => r.monthKey).filter(Boolean))];
    months.sort();
    return months;
  }, [allData]);

  const monthData = useMemo(() => {
    if (!selectedMonth) return [];
    return allData.filter(r => r.monthKey === selectedMonth);
  }, [allData, selectedMonth]);

  const navigateMonth = (dir: -1 | 1) => {
    const idx = availableMonths.indexOf(selectedMonth);
    const next = idx + dir;
    if (next >= 0 && next < availableMonths.length) setSelectedMonth(availableMonths[next]);
  };

  const currentMonthIdx = availableMonths.indexOf(selectedMonth);

  const saveSettings = () => {
    const url = urlInput.trim();
    const name = nameInput.trim();
    if (url) {
      localStorage.setItem(LS_KEY_URL, url);
      setSheetUrl(url);
      setSelectedMonth('');
      setAllData([]);
    }
    localStorage.setItem(LS_KEY_NAME, name);
    setFilterName(name);
    setShowSettings(false);
    if (url) toast({ title: 'Settings saved', description: 'Fetching duty roster...' });
  };

  const openSettings = () => {
    setUrlInput(sheetUrl);
    setNameInput(filterName);
    setShowSettings(true);
  };

  const settingsModal = showSettings && (
    <div className="modal-overlay" onClick={() => setShowSettings(false)}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Office Routine Settings</h2>
          <button className="icon-btn !w-8 !h-8" onClick={() => setShowSettings(false)}><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="form-label">Google Sheets Link</label>
            <input type="url" className="input-simple" placeholder="https://docs.google.com/spreadsheets/d/..." value={urlInput} onChange={e => setUrlInput(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Your Name (to filter shifts)</label>
            <input type="text" className="input-simple" placeholder="e.g. Zia" value={nameInput} onChange={e => setNameInput(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button className="btn-outline flex-1" onClick={() => setShowSettings(false)}>Cancel</button>
          <button className="btn-green flex-1" onClick={saveSettings}>Save</button>
        </div>
      </div>
    </div>
  );

  if (!sheetUrl) {
    return (
      <div className="glass-card min-h-[200px]">
        <div className="empty-state">
          <Link className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-1">No Google Sheet linked</p>
          <p className="text-xs text-muted-foreground mb-4">Add your duty roster spreadsheet link to get started</p>
          <button className="btn-green" onClick={openSettings}>
            <Link className="w-4 h-4 mr-1.5" /> Add Sheet Link
          </button>
        </div>
        {settingsModal}
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {filterName && (
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
              <User className="w-3 h-3" /> {filterName}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button className="icon-btn !w-8 !h-8" onClick={() => fetchData(sheetUrl)} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="icon-btn !w-8 !h-8" onClick={openSettings} title="Settings">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month selector */}
      {availableMonths.length > 0 && (
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            className="icon-btn !w-8 !h-8"
            onClick={() => navigateMonth(-1)}
            disabled={currentMonthIdx <= 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 min-w-[160px] justify-center">
            <Calendar className="w-4 h-4 text-primary" />
            <select
              className="input-simple !w-auto !py-1 !px-2 text-sm font-medium"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>{formatMonthLabel(m)}</option>
              ))}
            </select>
          </div>
          <button
            className="icon-btn !w-8 !h-8"
            onClick={() => navigateMonth(1)}
            disabled={currentMonthIdx >= availableMonths.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="glass-card min-h-[200px] flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : monthData.length === 0 ? (
        <div className="glass-card min-h-[200px]">
          <div className="empty-state">
            <p className="text-muted-foreground">No data found for this month</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {monthData.map((row, i) => {
            const isToday = row.date === today || row.date.replace(/\//g, '-') === today;
            const hasMyShift = filterName
              ? row.shifts.some(s => s.name.toLowerCase().includes(filterName.toLowerCase()))
              : true;
            const myShifts = filterName
              ? row.shifts.filter(s => s.name.toLowerCase().includes(filterName.toLowerCase()))
              : row.shifts;
            const isHoliday = filterName && !hasMyShift;

            return (
              <div
                key={i}
                className={`glass-card !p-3 ${isToday ? 'ring-2 ring-primary/50' : ''} ${isHoliday ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-primary whitespace-nowrap">{row.date}</span>
                    <span className="text-xs text-muted-foreground uppercase">{row.day}</span>
                    {isToday && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-medium">TODAY</span>
                    )}
                  </div>
                  {isHoliday && (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/15 text-green-500 flex items-center gap-1 font-medium">
                      <Palmtree className="w-3 h-3" /> Holiday
                    </span>
                  )}
                </div>
                {!isHoliday && myShifts.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {myShifts.map((s, j) => (
                      <span key={j} className="text-xs px-2 py-1 rounded-md bg-accent/50 text-accent-foreground">
                        <span className="font-medium">{s.shift}:</span> {s.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {settingsModal}
    </div>
  );
};

export default OfficeRoutine;
