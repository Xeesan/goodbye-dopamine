import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Settings, User, Link, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const LS_KEY_URL = 'gbd_office_sheet_url';
const LS_KEY_NAME = 'gbd_office_routine_name';

interface ShiftEntry {
  shift: string;
  name: string;
}

interface DayRow {
  date: string;
  day: string;
  shifts: ShiftEntry[];
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

const OfficeRoutine = () => {
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem(LS_KEY_URL) || '');
  const [filterName, setFilterName] = useState(() => localStorage.getItem(LS_KEY_NAME) || '');
  const [data, setData] = useState<DayRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  const fetchData = useCallback(async (url: string) => {
    if (!url) return;
    setLoading(true);
    try {
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      if (!match) throw new Error('Invalid Google Sheets URL');
      const csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv`;
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error('Failed to fetch');
      const text = await res.text();
      const rows = parseCSV(text);
      if (rows.length < 2) throw new Error('No data found');

      const hdr = rows[0];
      setHeaders(hdr);

      const parsed: DayRow[] = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const date = r[0] || '';
        const day = r[1] || '';
        const shifts: ShiftEntry[] = [];
        for (let j = 2; j < r.length && j < hdr.length; j++) {
          if (r[j]) {
            shifts.push({ shift: hdr[j], name: r[j] });
          }
        }
        if (date || day) parsed.push({ date, day, shifts });
      }
      setData(parsed);
    } catch (err: any) {
      toast({ title: 'Error loading sheet', description: err.message });
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sheetUrl) fetchData(sheetUrl);
  }, [sheetUrl, fetchData]);

  const saveSettings = () => {
    const url = urlInput.trim();
    const name = nameInput.trim();
    if (url) {
      localStorage.setItem(LS_KEY_URL, url);
      setSheetUrl(url);
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

  const filteredData = data.map(row => {
    if (!filterName) return row;
    const myShifts = row.shifts.filter(s =>
      s.name.toLowerCase().includes(filterName.toLowerCase())
    );
    return { ...row, shifts: myShifts };
  });

  const hasAnyData = filteredData.some(r => r.shifts.length > 0);

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

        {showSettings && (
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
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
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

      {loading ? (
        <div className="glass-card min-h-[200px] flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !hasAnyData ? (
        <div className="glass-card min-h-[200px]">
          <div className="empty-state">
            <p className="text-muted-foreground">
              {filterName ? `No shifts found for "${filterName}"` : 'No data found in the sheet'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredData.filter(r => r.shifts.length > 0).map((row, i) => (
            <div key={i} className="glass-card !p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold text-primary whitespace-nowrap">{row.date}</span>
                  <span className="text-xs text-muted-foreground">{row.day}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {row.shifts.map((s, j) => (
                  <span key={j} className="text-xs px-2 py-1 rounded-md bg-accent/50 text-accent-foreground">
                    <span className="font-medium">{s.shift}:</span> {s.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showSettings && (
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
      )}
    </div>
  );
};

export default OfficeRoutine;
