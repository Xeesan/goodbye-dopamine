import { useState, useRef } from 'react';
import { Camera, ImageIcon, Loader2, X, Check, AlertCircle } from 'lucide-react';
import Tesseract from 'tesseract.js';

interface ImageOCRImportProps {
  mode: 'routine' | 'exams';
  onImport: (items: any[]) => void;
  buttonClassName?: string;
}

const ImageOCRImport = ({ mode, onImport, buttonClassName = 'btn-outline' }: ImageOCRImportProps) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

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
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const parseRoutineFromText = (text: string): any[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const timeRegex = /(\d{1,2}[:.]\d{2})\s*[-–to]+\s*(\d{1,2}[:.]\d{2})/i;
    const items: any[] = [];
    let currentDay = '';

    for (const line of lines) {
      const lower = line.toLowerCase();
      const foundDay = days.find(d => lower.includes(d));
      if (foundDay) currentDay = foundDay;

      const timeMatch = line.match(timeRegex);
      if (timeMatch && currentDay) {
        const startTime = timeMatch[1].replace('.', ':');
        const endTime = timeMatch[2].replace('.', ':');
        const subject = line
          .replace(timeMatch[0], '')
          .replace(new RegExp(currentDay, 'i'), '')
          .replace(/room\s*[:\-]?\s*\S+/i, '')
          .trim() || 'Unknown Subject';
        const roomMatch = line.match(/room\s*[:\-]?\s*(\S+)/i);
        items.push({
          day: currentDay,
          subject,
          startTime,
          endTime,
          room: roomMatch?.[1] || '',
        });
      }
    }
    return items;
  };

  const parseExamsFromText = (text: string): any[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const dateRegex = /(\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/;
    const timeRegex = /(\d{1,2}[:.]\d{2}\s*(?:am|pm)?)/i;
    const items: any[] = [];

    for (const line of lines) {
      const dateMatch = line.match(dateRegex);
      if (dateMatch) {
        let date = dateMatch[1].replace(/\//g, '-');
        // Try to normalize to YYYY-MM-DD
        const parts = date.split('-');
        if (parts[0].length <= 2) {
          date = `20${parts[2].length === 2 ? parts[2] : parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
        const timeMatch = line.match(timeRegex);
        const subject = line
          .replace(dateMatch[0], '')
          .replace(timeMatch?.[0] || '', '')
          .replace(/room\s*[:\-]?\s*\S+/i, '')
          .trim() || 'Unknown Subject';
        const roomMatch = line.match(/room\s*[:\-]?\s*(\S+)/i);
        items.push({
          subject,
          date,
          time: timeMatch?.[1]?.replace('.', ':') || '09:00',
          room: roomMatch?.[1] || '',
          teacher: '',
          credits: 3,
          grade: '',
        });
      }
    }
    return items;
  };

  const processImage = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    setLoadingMsg('Loading OCR engine...');
    try {
      const { data: { text } } = await Tesseract.recognize(preview, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setLoadingMsg(`Recognizing... ${Math.round((m.progress || 0) * 100)}%`);
          }
        },
      });

      if (!text.trim()) {
        setError('No text could be extracted. Try a clearer, well-lit photo.');
        return;
      }

      const items = mode === 'routine' ? parseRoutineFromText(text) : parseExamsFromText(text);

      if (items.length === 0) {
        setError('Text was found but no structured data could be parsed. Try a clearer image with visible times and dates.');
      } else {
        setResults(items);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process image');
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const confirmImport = () => {
    if (results && results.length > 0) {
      onImport(results);
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
              <button className="icon-btn !w-8 !h-8" onClick={close}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Upload a photo of your {mode === 'routine' ? 'class timetable/routine' : 'exam schedule'} and AI will extract the data automatically.
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

            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFile}
            />

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />

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
                      <><Loader2 className="w-4 h-4 animate-spin inline-block mr-1.5" /> Processing...</>
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
