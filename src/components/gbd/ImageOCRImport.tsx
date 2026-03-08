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

  const processImage = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const base64 = preview.split(',')[1];
      const { data, error: fnError } = await supabase.functions.invoke('ocr-extract', {
        body: { imageBase64: base64, mode },
      });
      if (fnError) throw new Error(fnError.message || 'Failed to process image');
      if (data?.error) throw new Error(data.error);
      const items = data?.items || [];
      if (items.length === 0) {
        setError('No data could be extracted from this image. Try a clearer photo.');
      } else {
        setResults(items);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process image');
    } finally {
      setLoading(false);
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
