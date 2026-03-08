import { useState, useRef, useEffect } from 'react';
import { Camera, ImageIcon, Loader2, X, Check, AlertCircle, Wifi, WifiOff, Key, ChevronDown, Settings2, Sparkles } from 'lucide-react';
import { recognizeImage, preprocessImage } from '@/lib/ocrWorker';
import { supabase } from '@/integrations/supabase/client';

interface ImageOCRImportProps {
  mode: 'routine' | 'exams';
  onImport: (items: any[]) => void;
  buttonClassName?: string;
}

type OcrMode = 'lovable' | 'offline' | 'online';

interface ApiConfig {
  provider: 'gemini' | 'openai' | 'custom';
  apiKey: string;
  model: string;
  endpoint: string;
}

const GEMINI_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Best)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

const OPENAI_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
];

const DEFAULT_CONFIGS: Record<string, Partial<ApiConfig>> = {
  gemini: { model: 'gemini-2.5-flash', endpoint: 'https://generativelanguage.googleapis.com/v1beta' },
  openai: { model: 'gpt-4o-mini', endpoint: 'https://api.openai.com/v1/chat/completions' },
  custom: { model: '', endpoint: '' },
};

const STORAGE_KEY = 'gbd_ocr_config';

const loadConfig = (): { ocrMode: OcrMode; api: ApiConfig } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Never load apiKey from storage - user must re-enter each session
      return { ...parsed, api: { ...parsed.api, apiKey: '' } };
    }
  } catch {}
  return { ocrMode: 'lovable', api: { provider: 'gemini', apiKey: '', model: 'gemini-2.0-flash', endpoint: DEFAULT_CONFIGS.gemini.endpoint! } };
};

const saveConfig = (ocrMode: OcrMode, api: ApiConfig) => {
  // Strip API key before persisting - never store secrets in localStorage
  const { apiKey, ...safeApi } = api;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ocrMode, api: { ...safeApi, apiKey: '' } }));
};

const ImageOCRImport = ({ mode, onImport, buttonClassName = 'btn-outline' }: ImageOCRImportProps) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const saved = loadConfig();
  const [ocrMode, setOcrMode] = useState<OcrMode>(saved.ocrMode);
  const [apiConfig, setApiConfig] = useState<ApiConfig>(saved.api);

  useEffect(() => {
    saveConfig(ocrMode, apiConfig);
  }, [ocrMode, apiConfig]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB');
      return;
    }
    setError(null);
    setResults(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const getSystemPrompt = () => {
    if (mode === 'routine') {
      return `You are an OCR assistant that extracts class routine/timetable data from images.
Extract ALL class periods visible in the image. For each period return:
- day: the day of the week (lowercase: monday, tuesday, etc.)
- subject: the subject/course name
- startTime: start time in HH:MM 24h format
- endTime: end time in HH:MM 24h format  
- room: room number/name if visible (empty string if not)

Return ONLY a valid JSON array of objects. No markdown, no explanation.
Example: [{"day":"monday","subject":"Mathematics","startTime":"09:00","endTime":"10:00","room":"Room 301"}]
If you cannot read anything, return an empty array: []`;
    }
    return `You are an OCR assistant that extracts exam/assignment schedule data from images.
Extract ALL exams or assignments visible in the image. For each item return:
- subject: the subject/course name
- date: the date in YYYY-MM-DD format
- time: the time in HH:MM 24h format (use "09:00" if not visible)
- room: room number/name if visible (empty string if not)
- teacher: teacher name if visible (empty string if not)
- credits: credit hours as a number if visible (3 if not)
- grade: target grade if visible (empty string if not)

Return ONLY a valid JSON array of objects. No markdown, no explanation.
If you cannot read anything, return an empty array: []`;
  };

  const processOnlineViaEdge = async (base64: string): Promise<any[]> => {
    const { data, error } = await supabase.functions.invoke('ocr-extract', {
      body: {
        provider: apiConfig.provider,
        apiKey: apiConfig.apiKey,
        model: apiConfig.model,
        endpoint: apiConfig.endpoint,
        base64,
        systemPrompt: getSystemPrompt(),
      },
    });
    if (error) throw new Error(error.message || 'Edge function error');
    if (data?.error) throw new Error(data.error);
    return data?.items || [];
  };

  const processViaLovableAI = async (base64: string): Promise<any[]> => {
    const { data, error } = await supabase.functions.invoke('ocr-lovable', {
      body: {
        base64,
        systemPrompt: getSystemPrompt(),
      },
    });
    if (error) throw new Error(error.message || 'AI processing error');
    if (data?.error) throw new Error(data.error);
    return data?.items || [];
  };

  // -- Helpers --
  const normalizeDate = (raw: string): string => {
    const cleaned = raw.replace(/\s+/g, '').replace(/[,]/g, '');
    // DD-MM-YYYY
    let m = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    // YYYY-MM-DD
    m = cleaned.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    // DD-MM-YY
    m = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
    if (m) return `20${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return raw;
  };

  const to24h = (t: string): string => {
    t = t.replace(/\./g, ':').trim();
    const m = t.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
    if (!m) return t;
    let h = parseInt(m[1]);
    const min = m[2];
    const ampm = (m[3] || '').toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${min}`;
  };

  // -- Offline parsing (optimized for table-format timetables) --
  const parseRoutineFromText = (text: string): any[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const timeRangeRegex = /(\d{1,2}[:.]\d{2}\s*(?:am|pm)?)\s*[-–to]+\s*(\d{1,2}[:.]\d{2}\s*(?:am|pm)?)/i;
    const courseCodeRegex = /\b([A-Z]{2,5}[-\s]?\d{2,4})\b/;
    const roomAltRegex = /\b(Room:\s*\S+|[A-Z]\d{1,2}|H\d(?:\+H\d)?|Online|Lab|D\d|E\d|C\d|Chemistry)\b/i;
    const items: any[] = [];
    let currentDay = '';

    // Detect table header with time slots (e.g. "9:30AM-10:10AM 10:10AM-10:50AM ...")
    let timeSlots: { start: string; end: string }[] = [];
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('day/time') || lower.includes('day time') || lower.includes('time slot')) {
        const matches = [...line.matchAll(/(\d{1,2}[:.]\d{2}\s*(?:AM|PM|am|pm)?)\s*[-–]\s*(\d{1,2}[:.]\d{2}\s*(?:AM|PM|am|pm)?)/g)];
        timeSlots = matches.map(m => ({ start: to24h(m[1]), end: to24h(m[2]) }));
      }
    }

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('day/time') || lower.includes('semester') || lower.includes('batch') || lower.includes('course code') || lower.includes('credit')) continue;

      const foundDay = days.find(d => lower.startsWith(d) || new RegExp(`\\b${d}\\b`).test(lower));
      if (foundDay) currentDay = foundDay;
      if (!currentDay) continue;

      // Table mode: match course codes by position within segments
      if (timeSlots.length > 0) {
        const segments = line.replace(new RegExp(`\\b${currentDay}\\b`, 'i'), '').split(/\s{3,}|\||\t/).map(s => s.trim()).filter(Boolean);
        let slotIdx = 0;
        for (const seg of segments) {
          const codeMatch = seg.match(courseCodeRegex);
          if (codeMatch && slotIdx < timeSlots.length) {
            const subject = codeMatch[1].replace(/\s+/g, '-');
            const roomMatch = seg.match(roomAltRegex);
            items.push({
              day: currentDay, subject,
              startTime: timeSlots[slotIdx]?.start || '09:00',
              endTime: timeSlots[slotIdx]?.end || '10:00',
              room: roomMatch?.[1]?.trim() || '',
            });
          }
          slotIdx++;
        }
        continue;
      }

      // Fallback: line-by-line time range detection
      const timeMatch = line.match(timeRangeRegex);
      if (timeMatch && currentDay) {
        const startTime = to24h(timeMatch[1]);
        const endTime = to24h(timeMatch[2]);
        const codeMatch = line.match(courseCodeRegex);
        const subject = codeMatch?.[1]?.replace(/\s+/g, '-') ||
          line.replace(timeMatch[0], '').replace(new RegExp(currentDay, 'i'), '').replace(/room\s*[:\-]?\s*\S+/i, '').trim() || 'Unknown Subject';
        const roomMatch = line.match(roomAltRegex);
        items.push({ day: currentDay, subject, startTime, endTime, room: roomMatch?.[1]?.trim() || '' });
      }
    }
    return items;
  };

  const parseExamsFromText = (text: string): any[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const dateRegex = /(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/;
    const timeRangeRegex = /(\d{1,2}[:.]\d{2}\s*(?:am|pm)?)\s*[-–to]+\s*(\d{1,2}[:.]\d{2}\s*(?:am|pm)?)/i;
    const singleTimeRegex = /(\d{1,2}[:.]\d{2}\s*(?:am|pm))/i;
    const courseCodeRegex = /\b([A-Z]{2,5}[-\s]?\d{2,4})\b/;
    const dayNames = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
    const items: any[] = [];

    // Filter header lines
    const dataLines = lines.filter(l => {
      const lower = l.toLowerCase();
      return !lower.includes('semester') && !lower.includes('course code') &&
             !lower.includes('course name') && !lower.includes('faculty member') &&
             !(lower.startsWith('date') && (lower.includes('day') || lower.includes('time')));
    });

    for (const line of dataLines) {
      const dateMatch = line.match(dateRegex);
      if (!dateMatch) continue;

      const date = normalizeDate(dateMatch[1]);

      // Extract time
      const timeRangeMatch = line.match(timeRangeRegex);
      let time = '09:00';
      if (timeRangeMatch) {
        time = to24h(timeRangeMatch[1]);
      } else {
        const st = line.match(singleTimeRegex);
        if (st) time = to24h(st[1]);
      }

      // Extract course code
      const codeMatch = line.match(courseCodeRegex);
      const courseCode = codeMatch?.[1]?.replace(/\s+/g, '-') || '';

      // Remove known parts to get subject + teacher
      let remainder = line
        .replace(dateMatch[0], ' ')
        .replace(timeRangeMatch?.[0] || '', ' ')
        .replace(dayNames, ' ')
        .replace(courseCodeRegex, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

      const words = remainder.split(/\s+/).filter(Boolean);
      let subject = courseCode;
      let teacher = '';

      if (words.length >= 3) {
        // Teacher is usually the last 2-4 proper-noun words
        let splitIdx = words.length;
        for (let i = words.length - 1; i >= Math.max(0, words.length - 4); i--) {
          if (/^[A-Z][a-z]/.test(words[i]) || /^(Md|Mohd|Dr|Mr|Mrs|Ms|Prof)\.?$/i.test(words[i])) {
            splitIdx = i;
          } else {
            break;
          }
        }
        const subjectPart = words.slice(0, splitIdx).join(' ').trim();
        const teacherPart = words.slice(splitIdx).join(' ').trim();
        if (subjectPart) subject = courseCode ? `${courseCode} ${subjectPart}` : subjectPart;
        if (teacherPart) teacher = teacherPart;
      } else if (remainder) {
        subject = courseCode ? `${courseCode} ${remainder}` : remainder;
      }

      items.push({
        subject: (subject || 'Unknown Subject').trim(),
        date,
        time,
        room: '',
        teacher: teacher.trim(),
        credits: 3,
        grade: '',
      });
    }
    return items;
  };

  const processImage = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);

    try {
      if ((ocrMode === 'lovable' || ocrMode === 'online') && !navigator.onLine) {
        setError('You are offline. Please switch to Offline mode or connect to the internet.');
        setLoading(false);
        return;
      }

      if (ocrMode === 'lovable') {
        setLoadingMsg('Analyzing with AI...');
        const base64 = preview.split(',')[1];
        const items = await processViaLovableAI(base64);
        const arr = Array.isArray(items) ? items : [];
        if (arr.length === 0) {
          setError('No data could be extracted. Try a clearer photo.');
        } else {
          setResults(arr);
        }
      } else if (ocrMode === 'online') {
        if (!apiConfig.apiKey) {
          setError('Please add your API key in settings first.');
          setLoading(false);
          return;
        }
        setLoadingMsg('Sending to AI...');
        const base64 = preview.split(',')[1];
        const items = await processOnlineViaEdge(base64);
        const arr = Array.isArray(items) ? items : [];
        if (arr.length === 0) {
          setError('No data could be extracted. Try a clearer photo.');
        } else {
          setResults(arr);
        }
      } else {
        setLoadingMsg('Preprocessing image...');
        const text = await recognizeImage(preview);
        setLoadingMsg('Parsing results...');
        if (!text.trim()) {
          setError('No text could be extracted. Try a clearer, well-lit photo.');
          return;
        }
        const items = mode === 'routine' ? parseRoutineFromText(text) : parseExamsFromText(text);
        if (items.length === 0) {
          setError('Text was found but no structured data could be parsed. Try a clearer image.');
        } else {
          setResults(items);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process image');
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const validateRoutineItem = (item: any) => ({
    day: String(item.day ?? '').toLowerCase().slice(0, 20),
    subject: String(item.subject ?? 'Unknown').slice(0, 100),
    startTime: String(item.startTime ?? '09:00').slice(0, 5),
    endTime: String(item.endTime ?? '10:00').slice(0, 5),
    room: String(item.room ?? '').slice(0, 50),
  });

  const validateExamItem = (item: any) => ({
    subject: String(item.subject ?? 'Unknown Subject').slice(0, 100),
    date: String(item.date ?? new Date().toISOString().split('T')[0]).slice(0, 10),
    time: String(item.time ?? '09:00').slice(0, 5),
    room: String(item.room ?? '').slice(0, 50),
    teacher: String(item.teacher ?? '').slice(0, 100),
    credits: Math.min(Math.max(parseInt(item.credits) || 3, 0), 20),
    grade: String(item.grade ?? '').slice(0, 5),
  });

  const confirmImport = () => {
    if (results && results.length > 0) {
      const validated = mode === 'routine'
        ? results.map(validateRoutineItem).filter(item => item.day && item.subject !== 'Unknown')
        : results.map(validateExamItem).filter(item => item.subject !== 'Unknown Subject');
      if (validated.length > 0) {
        onImport(validated);
      }
      close();
    }
  };

  const close = () => {
    setShowModal(false);
    setPreview(null);
    setResults(null);
    setError(null);
    setLoading(false);
    setLoadingMsg('');
    setShowSettings(false);
  };

  const handleProviderChange = (provider: 'gemini' | 'openai' | 'custom') => {
    const defaults = DEFAULT_CONFIGS[provider];
    setApiConfig(prev => ({
      ...prev,
      provider,
      model: defaults.model || prev.model,
      endpoint: defaults.endpoint || prev.endpoint,
    }));
  };

  return (
    <>
      <button className={buttonClassName} onClick={() => setShowModal(true)}>
        <Camera className="w-4 h-4 inline-block mr-1.5" />
        Import from Image
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal-card !max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">
                Import {mode === 'routine' ? 'Routine' : 'Exams'} from Image
              </h2>
              <div className="flex items-center gap-1">
                {ocrMode !== 'lovable' && (
                  <button
                    className="icon-btn !w-8 !h-8"
                    onClick={() => setShowSettings(!showSettings)}
                    title="OCR Settings"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>
                )}
                <button className="icon-btn !w-8 !h-8" onClick={close}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* OCR Mode Toggle - 3 tabs */}
            <div className="flex items-center gap-1 mb-3 p-1.5 rounded-lg" style={{ background: 'hsl(var(--bg-input))' }}>
              <button
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-all ${
                  ocrMode === 'lovable'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setOcrMode('lovable')}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI (Free)
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-all ${
                  ocrMode === 'online'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setOcrMode('online')}
              >
                <Wifi className="w-3.5 h-3.5" />
                Your API
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-all ${
                  ocrMode === 'offline'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setOcrMode('offline')}
              >
                <WifiOff className="w-3.5 h-3.5" />
                Offline
              </button>
            </div>

            {/* Lovable AI info */}
            {ocrMode === 'lovable' && (
              <div className="mb-4 p-3 rounded-lg border" style={{ borderColor: 'hsl(var(--primary) / 0.3)', background: 'hsl(var(--primary) / 0.05)' }}>
                <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-1">
                  <Sparkles className="w-4 h-4" />
                  Powered by AI
                </div>
                <p className="text-xs text-muted-foreground">
                  Best accuracy — no API key needed. Uses advanced vision AI to extract structured data from your images.
                </p>
              </div>
            )}

            {/* Settings Panel for online mode */}
            {showSettings && ocrMode === 'online' && (
              <div className="mb-4 p-3 rounded-lg space-y-3 border" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-input))' }}>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Key className="w-4 h-4 text-primary" />
                  API Configuration
                </div>

                {/* Provider Select */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Provider</label>
                  <div className="relative">
                    <select
                      value={apiConfig.provider}
                      onChange={e => handleProviderChange(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-md text-sm appearance-none cursor-pointer"
                      style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}
                    >
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI (GPT-4o)</option>
                      <option value="custom">Custom (OpenAI-compatible)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* API Key */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">API Key</label>
                  <input
                    type="password"
                    value={apiConfig.apiKey}
                    onChange={e => setApiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder={apiConfig.provider === 'gemini' ? 'AIza...' : 'sk-...'}
                    className="w-full px-3 py-2 rounded-md text-sm"
                    style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {apiConfig.provider === 'gemini'
                      ? 'Get your key from aistudio.google.com'
                      : apiConfig.provider === 'openai'
                      ? 'Get your key from platform.openai.com'
                      : 'Enter your API key'}
                  </p>
                </div>

                {/* Model */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Model</label>
                  {apiConfig.provider === 'gemini' || apiConfig.provider === 'openai' ? (
                    <div className="relative">
                      <select
                        value={apiConfig.model}
                        onChange={e => setApiConfig(prev => ({ ...prev, model: e.target.value }))}
                        className="w-full px-3 py-2 rounded-md text-sm appearance-none cursor-pointer"
                        style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}
                      >
                        {(apiConfig.provider === 'gemini' ? GEMINI_MODELS : OPENAI_MODELS).map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={apiConfig.model}
                      onChange={e => setApiConfig(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="Model name"
                      className="w-full px-3 py-2 rounded-md text-sm"
                      style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}
                    />
                  )}
                </div>

                {/* Custom Endpoint (only for custom provider) */}
                {apiConfig.provider === 'custom' && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">API Endpoint</label>
                    <input
                      type="text"
                      value={apiConfig.endpoint}
                      onChange={e => setApiConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                      placeholder="https://api.example.com/v1/chat/completions"
                      className="w-full px-3 py-2 rounded-md text-sm"
                      style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}
                    />
                  </div>
                )}

                {apiConfig.apiKey && (
                  <div className="flex items-center gap-1.5 text-xs text-primary">
                    <Check className="w-3 h-3" /> API key set for this session
                  </div>
                )}
              </div>
            )}

            {showSettings && ocrMode === 'offline' && (
              <div className="mb-4 p-3 rounded-lg border" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-input))' }}>
                <p className="text-sm text-muted-foreground">
                  Offline mode uses <strong className="text-foreground">Tesseract.js</strong> — runs entirely in your browser, no API key needed. Works best with clean, high-contrast images.
                </p>
              </div>
            )}

            <p className="text-sm text-muted-foreground mb-4">
              Upload a photo of your {mode === 'routine' ? 'class timetable/routine' : 'exam schedule'}.
              {ocrMode === 'lovable' ? ' AI will analyze and extract structured data.' : ocrMode === 'offline' ? ' Text will be extracted offline using Tesseract.js.' : ' AI will analyze and extract structured data.'}
            </p>

            {!preview && (
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:opacity-80"
                  style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-input))' }}
                  onClick={() => cameraRef.current?.click()}
                >
                  <Camera className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium text-foreground">Take Photo</p>
                  <p className="text-xs text-muted-foreground mt-1">Use camera</p>
                </div>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:opacity-80"
                  style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-input))' }}
                  onClick={() => fileRef.current?.click()}
                >
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium text-foreground">Choose File</p>
                  <p className="text-xs text-muted-foreground mt-1">From gallery</p>
                </div>
              </div>
            )}

            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

            {preview && !results && (
              <div className="space-y-3">
                <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'hsl(var(--border))' }}>
                  <img src={preview} alt="Preview" className="w-full max-h-64 object-contain" style={{ background: 'hsl(var(--bg-input))' }} />
                </div>
                <div className="flex gap-3">
                  <button className="btn-outline flex-1" onClick={() => { setPreview(null); setError(null); }}>
                    Change Image
                  </button>
                  <button className="btn-green flex-1" onClick={processImage} disabled={loading}>
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin inline-block mr-1.5" /> {loadingMsg || 'Processing...'}</>
                    ) : (
                      'Extract Data'
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg mt-3" style={{ background: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' }}>
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {results && results.length > 0 && (
              <div className="space-y-3 mt-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Check className="w-4 h-4" />
                  Found {results.length} {mode === 'routine' ? 'period' : 'exam'}{results.length > 1 ? 's' : ''}
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {results.map((item, i) => (
                    <div key={i} className="p-2.5 rounded-lg text-sm" style={{ background: 'hsl(var(--bg-input))' }}>
                      {mode === 'routine' ? (
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-semibold text-primary capitalize">{item.day}</span>
                          <span className="text-foreground">{item.subject}</span>
                          <span className="text-muted-foreground">{item.startTime} - {item.endTime}</span>
                          {item.room && <span className="text-xs text-muted-foreground">{item.room}</span>}
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-semibold text-foreground">{item.subject}</span>
                          <span className="text-muted-foreground">{item.date}</span>
                          <span className="text-muted-foreground">{item.time}</span>
                          {item.room && <span className="text-xs text-muted-foreground">{item.room}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button className="btn-outline flex-1" onClick={() => { setResults(null); setPreview(null); }}>
                    Try Another
                  </button>
                  <button className="btn-green flex-1" onClick={confirmImport}>
                    <Check className="w-4 h-4 inline-block mr-1" /> Import All
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ImageOCRImport;
