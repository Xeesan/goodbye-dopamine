import { useState, useEffect, useRef, useCallback } from 'react';
import Storage from '@/lib/storage';
import { syncFocusSessionsFromDB, addFocusSessionToDB } from '@/lib/dbSync';
import { formatDate } from '@/lib/helpers';
import { Play, Square, Shield, Volume2, VolumeX, ArrowLeft, Youtube, FileText, ImageIcon, X, Maximize2, Minimize2 } from 'lucide-react';
import { useDialog } from '../DialogProvider';
import { useGamification } from '@/hooks/useGamification';
import { useI18n } from '@/hooks/useI18n';

interface DetoxPageProps {
  navigateTo: (page: string) => void;
  refreshKey: number;
}

function getTreeStage() {
  const sessions = Storage.getFocusSessions();
  const totalMin = sessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
  if (totalMin >= 600) return 5;
  if (totalMin >= 300) return 4;
  if (totalMin >= 120) return 3;
  if (totalMin >= 30) return 2;
  return 1;
}

function TreeSVG({ stage }: { stage: number }) {
  const colors = ['#1a4a1a', '#22662a', '#2d8a38', '#34d058', '#00ff88'];
  const c = colors[stage - 1];
  const s = [20, 28, 36, 44, 52][stage - 1];
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="55" fill={`${c}22`} stroke={c} strokeWidth="2" />
      <polygon points={`60,${65 - s} ${60 + s / 2},${65 + s / 4} ${60 - s / 2},${65 + s / 4}`} fill={c} opacity="0.9" />
      {stage >= 2 && <polygon points={`60,${55 - s} ${60 + s / 2 + 4},${55 + s / 4 + 4} ${60 - s / 2 - 4},${55 + s / 4 + 4}`} fill={c} opacity="0.6" />}
      {stage >= 3 && <polygon points={`60,${45 - s} ${60 + s / 2 + 8},${45 + s / 4 + 8} ${60 - s / 2 - 8},${45 + s / 4 + 8}`} fill={c} opacity="0.4" />}
      <rect x="57" y={65 + s / 4} width="6" height="16" rx="2" fill="#8B6914" />
    </svg>
  );
}

const DetoxPage = ({ navigateTo }: DetoxPageProps) => {
  const [focusActive, setFocusActive] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [duration, setDuration] = useState(25);
  const [sound, setSound] = useState('none');
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioNodesRef = useRef<any[]>([]);
  const { showDialog } = useDialog();
  const { addXP } = useGamification();
  const { t } = useI18n();

  const sessions = Storage.getFocusSessions();
  const totalMin = sessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
  const stage = getTreeStage();

  // Sync focus sessions from DB on mount
  useEffect(() => {
    syncFocusSessionsFromDB();
  }, []);

  const stopSound = useCallback(() => {
    audioNodesRef.current.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch {} });
    audioNodesRef.current = [];
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} audioCtxRef.current = null; }
  }, []);

  const startSound = useCallback((type: string) => {
    stopSound();
    if (type === 'none') return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const bufSize = 2 * ctx.sampleRate;
      if (type === 'rain') {
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufSize; i++) { const w = Math.random() * 2 - 1; data[i] = (lastOut + 0.02 * w) / 1.02; lastOut = data[i]; data[i] *= 3.5; }
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        const gain = ctx.createGain(); gain.gain.value = 0.3;
        src.connect(gain).connect(ctx.destination); src.start();
        audioNodesRef.current = [src, gain];
      } else if (type === 'white') {
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        const gain = ctx.createGain(); gain.gain.value = 0.15;
        src.connect(gain).connect(ctx.destination); src.start();
        audioNodesRef.current = [src, gain];
      } else if (type === 'lofi') {
        const notes = [261.6, 329.6, 392.0];
        const masterGain = ctx.createGain(); masterGain.gain.value = 0.12;
        masterGain.connect(ctx.destination);
        const nodes: any[] = [masterGain];
        notes.forEach(freq => {
          const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
          const oscGain = ctx.createGain(); oscGain.gain.value = 0.3;
          osc.connect(oscGain).connect(masterGain); osc.start();
          nodes.push(osc, oscGain);
        });
        audioNodesRef.current = nodes;
      }
    } catch {}
  }, [stopSound]);

  const dialogRef = useRef(showDialog);
  dialogRef.current = showDialog;

  const startFocus = useCallback(() => {
    setFocusActive(true);
    setElapsed(0);
    startTimeRef.current = Date.now();
    startSound(sound);
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(elapsed);
        if (elapsed >= duration * 60) {
          clearInterval(intervalRef.current!);
          const durMin = Math.floor((Date.now() - startTimeRef.current) / 60000);
          if (durMin > 0) {
            Storage.addFocusSession({ date: new Date().toISOString(), duration: durMin });
            addFocusSessionToDB({ date: new Date().toISOString(), duration: durMin });
            addXP(Math.max(5, durMin));
          }
          stopSound();
          setFocusActive(false);
          startTimeRef.current = null;
          dialogRef.current({ title: 'Session Complete! 🎉', message: 'Great work! Your focus session has been recorded.', type: 'success', confirmText: 'Awesome!' });
          navigateTo('detox');
        }
      }
    }, 1000);
  }, [duration, sound, startSound, stopSound, navigateTo]);

  const stopFocus = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    stopSound();
    if (startTimeRef.current) {
      const durMin = Math.floor((Date.now() - startTimeRef.current) / 60000);
      if (durMin > 0) {
        Storage.addFocusSession({ date: new Date().toISOString(), duration: durMin });
        addFocusSessionToDB({ date: new Date().toISOString(), duration: durMin });
        addXP(Math.max(5, durMin));
      }
    }
    setFocusActive(false);
    startTimeRef.current = null;
    setElapsed(0);
    navigateTo('detox');
  }, [stopSound, navigateTo]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); stopSound(); };
  }, [stopSound]);

  const [mediaTab, setMediaTab] = useState<'none' | 'youtube' | 'pdf' | 'image'>('none');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [mediaExpanded, setMediaExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);

  const getYoutubeEmbedUrl = (url: string) => {
    try {
      let videoId = '';
      if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split(/[?&#]/)[0] || '';
      else if (url.includes('youtube.com')) videoId = new URL(url).searchParams.get('v') || '';
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : '';
    } catch { return ''; }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImageUrl(URL.createObjectURL(file)); setMediaTab('image'); }
  };
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setPdfUrl(URL.createObjectURL(file)); setMediaTab('pdf'); }
  };

  if (focusActive) {
    const remaining = Math.max(0, duration * 60 - elapsed);
    const m = String(Math.floor(remaining / 60)).padStart(2, '0');
    const s = String(remaining % 60).padStart(2, '0');
    const progress = duration * 60 > 0 ? ((elapsed / (duration * 60)) * 100).toFixed(1) : '0';

    const mediaContent = () => {
      if (mediaTab === 'youtube') {
        const embedUrl = getYoutubeEmbedUrl(youtubeUrl);
        return (
          <div className="glass-card !p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold tracking-widest text-muted-foreground flex items-center gap-1.5"><Youtube className="w-4 h-4 text-red-500" /> YOUTUBE</span>
              <button className="icon-btn !w-7 !h-7" onClick={() => setMediaTab('none')}><X className="w-3.5 h-3.5" /></button>
            </div>
            {!embedUrl ? (
              <div>
                <input type="text" className="input-simple w-full mb-2" placeholder="Paste YouTube URL..." value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} />
                <p className="text-[0.65rem] text-muted-foreground">Paste a YouTube link and press Enter to load</p>
              </div>
            ) : (
              <div className={`relative ${mediaExpanded ? 'fixed inset-4 z-50 bg-background rounded-xl p-2' : ''}`}>
                {mediaExpanded && <button className="absolute top-3 right-3 z-10 icon-btn !w-8 !h-8 bg-background/80" onClick={() => setMediaExpanded(false)}><Minimize2 className="w-4 h-4" /></button>}
                <div className="relative w-full" style={{ paddingBottom: mediaExpanded ? 'calc(100% - 40px)' : '56.25%' }}>
                  <iframe src={embedUrl} className="absolute inset-0 w-full h-full rounded-lg" allow="autoplay; encrypted-media" allowFullScreen />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setYoutubeUrl('')}>Change video</button>
                  {!mediaExpanded && <button className="icon-btn !w-7 !h-7" onClick={() => setMediaExpanded(true)}><Maximize2 className="w-3.5 h-3.5" /></button>}
                </div>
              </div>
            )}
          </div>
        );
      }
      if (mediaTab === 'pdf') {
        return (
          <div className="glass-card !p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold tracking-widest text-muted-foreground flex items-center gap-1.5"><FileText className="w-4 h-4 text-primary" /> PDF READER</span>
              <button className="icon-btn !w-7 !h-7" onClick={() => setMediaTab('none')}><X className="w-3.5 h-3.5" /></button>
            </div>
            {!pdfUrl ? (
              <div>
                <input type="text" className="input-simple w-full mb-2" placeholder="Paste PDF URL..." value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} />
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[0.65rem] text-muted-foreground">or</span>
                  <button className="btn-outline !py-1 !px-3 !text-xs" onClick={() => pdfFileInputRef.current?.click()}>Upload PDF</button>
                  <input ref={pdfFileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
                </div>
              </div>
            ) : (
              <div className={`relative ${mediaExpanded ? 'fixed inset-4 z-50 bg-background rounded-xl p-2' : ''}`}>
                {mediaExpanded && <button className="absolute top-3 right-3 z-10 icon-btn !w-8 !h-8 bg-background/80" onClick={() => setMediaExpanded(false)}><Minimize2 className="w-4 h-4" /></button>}
                <iframe src={pdfUrl} className="w-full rounded-lg border border-border" style={{ height: mediaExpanded ? 'calc(100vh - 60px)' : '400px' }} />
                <div className="flex items-center justify-between mt-2">
                  <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setPdfUrl('')}>Change PDF</button>
                  {!mediaExpanded && <button className="icon-btn !w-7 !h-7" onClick={() => setMediaExpanded(true)}><Maximize2 className="w-3.5 h-3.5" /></button>}
                </div>
              </div>
            )}
          </div>
        );
      }
      if (mediaTab === 'image') {
        return (
          <div className="glass-card !p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold tracking-widest text-muted-foreground flex items-center gap-1.5"><ImageIcon className="w-4 h-4" style={{ color: 'hsl(var(--green))' }} /> IMAGE VIEWER</span>
              <button className="icon-btn !w-7 !h-7" onClick={() => setMediaTab('none')}><X className="w-3.5 h-3.5" /></button>
            </div>
            {!imageUrl ? (
              <div>
                <input type="text" className="input-simple w-full mb-2" placeholder="Paste image URL..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[0.65rem] text-muted-foreground">or</span>
                  <button className="btn-outline !py-1 !px-3 !text-xs" onClick={() => fileInputRef.current?.click()}>Upload Image</button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
              </div>
            ) : (
              <div className={`relative ${mediaExpanded ? 'fixed inset-4 z-50 bg-background rounded-xl p-2 flex items-center justify-center' : ''}`}>
                {mediaExpanded && <button className="absolute top-3 right-3 z-10 icon-btn !w-8 !h-8 bg-background/80" onClick={() => setMediaExpanded(false)}><Minimize2 className="w-4 h-4" /></button>}
                <img src={imageUrl} alt="Study material" className="max-w-full rounded-lg" style={{ maxHeight: mediaExpanded ? 'calc(100vh - 60px)' : '400px', objectFit: 'contain' }} />
                <div className="flex items-center justify-between mt-2">
                  <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setImageUrl('')}>Change image</button>
                  {!mediaExpanded && <button className="icon-btn !w-7 !h-7" onClick={() => setMediaExpanded(true)}><Maximize2 className="w-3.5 h-3.5" /></button>}
                </div>
              </div>
            )}
          </div>
        );
      }
      return null;
    };

    return (
      <div className="page-enter max-w-[800px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-primary flex items-center gap-3">
              <div className="w-10 h-10 rounded-[0.6rem] bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.25)]">
                <Shield className="text-primary w-5 h-5 fill-primary/20" />
              </div>
              {t('detox.title')}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">{t('detox.distractions_blocked')}</p>
          </div>
          <div className="flex items-center gap-1 text-4xl font-mono font-bold text-foreground"><span>{m}</span><span className="text-muted-foreground">:</span><span>{s}</span></div>
          <button className="btn-danger" onClick={stopFocus}>{t('detox.exit')}</button>
        </div>

        <div className="xp-bar !h-3 mb-6"><div className="xp-bar-fill" style={{ width: `${Math.min(100, parseFloat(progress))}%` }} /></div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground mr-1">{t('detox.study_media')}</span>
          {[
            { id: 'youtube' as const, label: 'YouTube', icon: Youtube, color: '#FF0000' },
            { id: 'pdf' as const, label: 'PDF', icon: FileText, color: 'hsl(var(--primary))' },
            { id: 'image' as const, label: 'Image', icon: ImageIcon, color: 'hsl(var(--green))' },
          ].map(tab => {
            const Icon = tab.icon;
            const active = mediaTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setMediaTab(active ? 'none' : tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                style={active ? { background: `${tab.color}15`, color: tab.color, border: `1px solid ${tab.color}33` } : { border: '1px solid hsl(var(--border))' }}>
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>

        {mediaTab !== 'none' && <div className="mb-6">{mediaContent()}</div>}

        {mediaTab === 'none' && (
          <>
            <div className="mb-6 text-center"><TreeSVG stage={stage} /><div className="mt-3"><span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'hsl(var(--accent-dim))', color: 'hsl(var(--primary))' }}>STAGE {stage}/5</span></div></div>
            <div className="glass-card !p-6 mb-6 text-center"><Shield className="w-16 h-16 text-primary mx-auto mb-4" /><h2 className="text-lg font-bold text-foreground mb-2">{t('detox.deep_focus')}</h2><p className="text-sm text-muted-foreground">{t('detox.stay_focused')}</p></div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card !p-4 text-center"><div className="text-2xl font-bold text-primary">{Math.min(100, parseFloat(progress))}%</div><div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground">{t('detox.focus_level')}</div></div>
          <div className="glass-card !p-4 text-center"><div className="text-2xl font-bold text-foreground">5</div><div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground">{t('detox.sites_blocked')}</div></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button className="icon-btn !w-9 !h-9" onClick={() => navigateTo('dashboard')}><ArrowLeft className="w-4 h-4" /></button>
          <div><h1 className="text-2xl font-bold text-foreground">{t('detox.title')}</h1><p className="text-muted-foreground text-sm">{t('detox.subtitle')}</p></div>
        </div>
        <button className="btn-green flex items-center gap-2" onClick={() => setShowSetup(true)}><Play className="w-4 h-4 fill-current" /> {t('detox.start_focus')}</button>
      </div>
      {showSetup && (
        <div className="glass-card mb-6">
          <h3 className="text-primary font-semibold mb-4">⚡ {t('detox.configure')}</h3>
          <div className="mb-4">
            <label className="form-label">{t('detox.focus_duration')}</label>
            <div className="flex gap-2 flex-wrap">
              {[25, 50, 90].map(d => (<button key={d} className={`dur-btn ${duration === d ? 'active' : ''}`} onClick={() => setDuration(d)}>{d}m</button>))}
              <input type="number" className="input-simple w-24" placeholder="Custom" min={1} max={240} onChange={e => { const v = parseInt(e.target.value); if (v > 0) setDuration(v); }} />
            </div>
          </div>
          <div className="mb-4">
            <label className="form-label">🎵 {t('detox.focus_sounds')}</label>
            <div className="flex gap-2 flex-wrap">
              {[{ id: 'none', label: 'NONE', icon: VolumeX }, { id: 'rain', label: 'RAIN', icon: Volume2 }, { id: 'white', label: 'WHITE', icon: Volume2 }, { id: 'lofi', label: 'LOFI', icon: Volume2 }].map(s => {
                const Icon = s.icon;
                return <button key={s.id} className={`sound-btn ${sound === s.id ? 'active' : ''}`} onClick={() => setSound(s.id)}><Icon className="w-5 h-5" />{s.label}</button>;
              })}
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button className="btn-green flex-1 flex items-center justify-center gap-2" onClick={startFocus}><Play className="w-4 h-4 fill-current" /> {t('detox.begin_session')}</button>
            <button className="btn-outline" onClick={() => setShowSetup(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-card !p-4 text-center"><div className="text-2xl font-bold text-primary">{sessions.length}</div><div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground">{t('detox.total_sessions')}</div></div>
        <div className="glass-card !p-4 text-center"><div className="text-2xl font-bold" style={{ color: 'hsl(var(--purple))' }}>{(totalMin / 60).toFixed(1)}h</div><div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground">{t('detox.focus_time')}</div></div>
        <div className="glass-card !p-4 text-center"><div className="text-2xl font-bold" style={{ color: 'hsl(var(--warning))' }}>{stage}/5</div><div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground">{t('detox.tree_stage')}</div></div>
      </div>
      <div className="glass-card text-center !p-8 mb-6"><TreeSVG stage={stage} /><div className="mt-3"><span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'hsl(var(--accent-dim))', color: 'hsl(var(--primary))' }}>STAGE {stage}/5</span></div><p className="text-sm text-muted-foreground mt-2">{t('detox.keep_focusing')}</p></div>
      <div className="glass-card">
        <h3 className="font-semibold text-foreground mb-4">📊 {t('detox.recent_sessions')}</h3>
        {sessions.length === 0 ? (<p className="text-sm text-muted-foreground">{t('detox.no_sessions')}</p>) : sessions.slice().reverse().slice(0, 10).map((s: any) => (
          <div key={s.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>{formatDate(s.date)}</span>
            <span className="text-xs font-semibold px-2 py-1 rounded" style={{ background: 'hsl(var(--accent-dim))', color: 'hsl(var(--primary))' }}>{s.duration} min</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DetoxPage;
