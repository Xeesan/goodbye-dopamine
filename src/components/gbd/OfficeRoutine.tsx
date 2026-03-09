import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Settings, User, Link, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
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

interface SheetTab {
  name: string;
  gid: string;
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

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const OfficeRoutine = () => {
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem(LS_KEY_URL) || '');
  const [filterName, setFilterName] = useState(() => localStorage.getItem(LS_KEY_NAME) || '');
  const [data, setData] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [sheetTabs, setSheetTabs] = useState<SheetTab[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('');
  const [sheetId, setSheetId] = useState('');

  // Extract sheet ID from URL
  const extractSheetId = (url: string) => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : '';
  };

  // Fetch list of sheet tabs
  const fetchSheetTabs = useCallback(async (url: string) => {
    const id = extractSheetId(url);
    if (!id) return;
    setSheetId(id);
    try {
      // Fetch the HTML page to extract sheet tab names and gids
      const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/htmlview`);
      if (!res.ok) throw new Error('Failed to fetch sheet info');
      const html = await res.text();
      
      // Parse sheet tabs from the HTML
      const tabRegex = /id="sheet-button-(\d+)"[^>]*>([^<]+)</g;
      const tabs: SheetTab[] = [];
      let m;
      while ((m = tabRegex.exec(html)) !== null) {
        tabs.push({ gid: m[1], name: m[2].trim() });
      }
      
      // Fallback: try another pattern
      if (tabs.length === 0) {
        const altRegex = /gid=(\d+)[^>]*>([^<]*)</g;
        while ((m = altRegex.exec(html)) !== null) {
          const name = m[2].trim();
          if (name && !tabs.find(t => t.gid === m![1])) {
            tabs.push({ gid: m[1], name });
          }
        }
      }

      if (tabs.length > 0) {
        setSheetTabs(tabs);
        // Auto-select current month tab if it matches
        const now = new Date();
        const currentMonthName = MONTH_NAMES[now.getMonth()];
        const currentTab = tabs.find(t => 
          t.name.toLowerCase().includes(currentMonthName.toLowerCase())
        );
        if (currentTab && !selectedTab) {
          setSelectedTab(currentTab.gid);
        } else if (!selectedTab) {
          setSelectedTab(tabs[0].gid);
        }
      } else {
        // No tabs found, just use default (gid=0)
        setSheetTabs([{ gid: '0', name: 'Sheet 1' }]);
        if (!selectedTab) setSelectedTab('0');
      }
    } catch {
      // Fallback: use default sheet
      setSheetTabs([{ gid: '0', name: 'Default' }]);
      if (!selectedTab) setSelectedTab('0');
    }
  }, [selectedTab]);

  // Fetch data for a specific sheet tab
  const fetchData = useCallback(async (url: string, gid?: string) => {
    const id = extractSheetId(url);
    if (!id) return;
    setLoading(true);
    try {
      let csvUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`;
      if (gid && gid !== '0') {
        csvUrl += `&gid=${gid}`;
      }
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

  // Initial load: fetch tabs, then data
  useEffect(() => {
    if (sheetUrl) fetchSheetTabs(sheetUrl);
  }, [sheetUrl]);

  // Fetch data when selected tab changes
  useEffect(() => {
    if (sheetUrl && selectedTab) fetchData(sheetUrl, selectedTab);
  }, [sheetUrl, selectedTab, fetchData]);

  const saveSettings = () => {
    const url = urlInput.trim();
    const name = nameInput.trim();
    if (url) {
      localStorage.setItem(LS_KEY_URL, url);
      setSheetUrl(url);
      setSelectedTab(''); // Reset so auto-select works
      setSheetTabs([]);
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

  const navigateTab = (direction: -1 | 1) => {
    const idx = sheetTabs.findIndex(t => t.gid === selectedTab);
    const newIdx = idx + direction;
    if (newIdx >= 0 && newIdx < sheetTabs.length) {
      setSelectedTab(sheetTabs[newIdx].gid);
    }
  };

  const currentTabIdx = sheetTabs.findIndex(t => t.gid === selectedTab);
  const currentTabName = sheetTabs.find(t => t.gid === selectedTab)?.name || '';

  const filteredData = data.map(row => {
    if (!filterName) return row;
    const myShifts = row.shifts.filter(s =>
      s.name.toLowerCase().includes(filterName.toLowerCase())
    );
    return { ...row, shifts: myShifts };
  });

  const hasAnyData = filteredData.some(r => r.shifts.length > 0);

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

  return (
    <div>
      {/* Top bar: filter name, month selector, actions */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {filterName && (
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
              <User className="w-3 h-3" /> {filterName}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button className="icon-btn !w-8 !h-8" onClick={() => fetchData(sheetUrl, selectedTab)} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="icon-btn !w-8 !h-8" onClick={openSettings} title="Settings">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month/Sheet tab selector */}
      {sheetTabs.length > 1 && (
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            className="icon-btn !w-8 !h-8"
            onClick={() => navigateTab(-1)}
            disabled={currentTabIdx <= 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 min-w-[140px] justify-center">
            <Calendar className="w-4 h-4 text-primary" />
            <select
              className="input-simple !w-auto !py-1 !px-2 text-sm font-medium"
              value={selectedTab}
              onChange={e => setSelectedTab(e.target.value)}
            >
              {sheetTabs.map(tab => (
                <option key={tab.gid} value={tab.gid}>{tab.name}</option>
              ))}
            </select>
          </div>
          <button
            className="icon-btn !w-8 !h-8"
            onClick={() => navigateTab(1)}
            disabled={currentTabIdx >= sheetTabs.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="glass-card min-h-[200px] flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !hasAnyData ? (
        <div className="glass-card min-h-[200px]">
          <div className="empty-state">
            <p className="text-muted-foreground">
              {filterName ? `No shifts found for "${filterName}" in ${currentTabName}` : 'No data found in this sheet'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredData.filter(r => r.shifts.length > 0).map((row, i) => {
            // Highlight today's row
            const today = new Date().toISOString().split('T')[0];
            const isToday = row.date === today || row.date.replace(/\//g, '-') === today;
            return (
              <div key={i} className={`glass-card !p-3 ${isToday ? 'ring-2 ring-primary/50' : ''}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-primary whitespace-nowrap">{row.date}</span>
                    <span className="text-xs text-muted-foreground uppercase">{row.day}</span>
                    {isToday && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-medium">TODAY</span>}
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
            );
          })}
        </div>
      )}

      {settingsModal}
    </div>
  );
};

export default OfficeRoutine;
