import { useState, useEffect, useRef, useCallback } from 'react';
import Storage from '@/lib/storage';
import { formatDate } from '@/lib/helpers';
import { Play, Square, Shield, Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { useDialog } from '../DialogProvider';

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

  const sessions = Storage.getFocusSessions();
  const totalMin = sessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
  const stage = getTreeStage();

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
            Storage.addXP(Math.max(5, durMin));
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
        Storage.addXP(Math.max(5, durMin));
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

  if (focusActive) {
    const remaining = Math.max(0, duration * 60 - elapsed);
    const m = String(Math.floor(remaining / 60)).padStart(2, '0');
    const s = String(remaining % 60).padStart(2, '0');
    const progress = duration * 60 > 0 ? ((elapsed / (duration * 60)) * 100).toFixed(1) : '0';
    return (
      <div className="page-enter max-w-[800px] mx-auto text-center">
        <div className="flex items-center justify-between mb-8">
          <div><h2 className="text-xl font-bold text-primary">🛡️ Detox</h2><p className="text-xs text-muted-foreground">DISTRACTIONS BLOCKED</p></div>
          <div className="flex items-center gap-1 text-4xl font-mono font-bold text-foreground"><span>{m}</span><span className="text-muted-foreground">:</span><span>{s}</span></div>
          <button className="btn-danger" onClick={stopFocus}>EXIT</button>
        </div>
        <div className="mb-8"><TreeSVG stage={stage} /><div className="mt-3"><span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'hsl(var(--accent-dim))', color: 'hsl(var(--primary))' }}>STAGE {stage}/5</span></div></div>
        <div className="glass-card !p-6 mb-6"><Shield className="w-16 h-16 text-primary mx-auto mb-4" /><h2 className="text-lg font-bold text-foreground mb-2">Deep Focus Active</h2><p className="text-sm text-muted-foreground">Stay focused. All distractions are blocked.</p></div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="glass-card !p-4"><div className="text-2xl font-bold text-primary">{Math.min(100, parseFloat(progress))}%</div><div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground">FOCUS LEVEL</div></div>
          <div className="glass-card !p-4"><div className="text-2xl font-bold text-foreground">5</div><div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground">SITES BLOCKED</div></div>
        </div>
        <div className="xp-bar !h-3"><div className="xp-bar-fill" style={{ width: `${Math.min(100, parseFloat(progress))}%` }} /></div>
      </div>
    );
  }

  return (
    <div className="page-enter max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold text-foreground">Detox</h1><p className="text-muted-foreground text-sm">Lock in. Eliminate distractions. Grow your focus tree.</p></div>
        <button className="btn-green flex items-center gap-2" onClick={() => setShowSetup(true)}><Play className="w-4 h-4 fill-current" /> START FOCUS</button>
      </div>
      {showSetup && (
        <div className="glass-card mb-6">
          <h3 className="text-primary font-semibold mb-4">⚡ Configure Focus Session</h3>
          <div className="mb-4">
            <label className="form-label">FOCUS DURATION</label>
            <div className="flex gap-2 flex-wrap">
              {[25, 50, 90].map(d => (<button key={d} className={`dur-btn ${duration === d ? 'active' : ''}`} onClick={() => setDuration(d)}>{d}m</button>))}
              <input type="number" className="input-simple w-24" placeholder="Custom" min={1} max={240} onChange={e => { const v = parseInt(e.target.value); if (v > 0) setDuration(v); }} />
            </div>
          </div>
          <div className="mb-4">
            <label className="form-label">🎵 FOCUS SOUNDS</label>
            <div className="flex gap-2 flex-wrap">
              {[{ id: 'none', label: 'NONE', icon: VolumeX }, { id: 'rain', label: 'RAIN', icon: Volume2 }, { id: 'white', label: 'WHITE', icon: Volume2 }, { id: 'lofi', label: 'LOFI', icon: Volume2 }].map(s => {
                const Icon = s.icon;
                return <button key={s.id} className={`sound-btn ${sound === s.id ? 'active' : ''}`} onClick={() => setSound(s.id)}><Icon className="w-5 h-5" />{s.label}</button>;
              })}
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button className="btn-green flex-1 flex items-center justify-center gap-2" onClick={startFocus}><Play className="w-4 h-4 fill-current" /> BEGIN SESSION</button>
            <button className="btn-outline" onClick={() => setShowSetup(false)}>CANCEL</button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-card !p-4 text-center"><div className="text-2xl font-bold text-primary">{sessions.length}</div><div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground">TOTAL SESSIONS</div></div>
        <div className="glass-card !p-4 text-center"><div className="text-2xl font-bold" style={{ color: 'hsl(var(--purple))' }}>{(totalMin / 60).toFixed(1)}h</div><div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground">FOCUS TIME</div></div>
        <div className="glass-card !p-4 text-center"><div className="text-2xl font-bold" style={{ color: 'hsl(var(--warning))' }}>{stage}/5</div><div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground">TREE STAGE</div></div>
      </div>
      <div className="glass-card text-center !p-8 mb-6"><TreeSVG stage={stage} /><div className="mt-3"><span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'hsl(var(--accent-dim))', color: 'hsl(var(--primary))' }}>STAGE {stage}/5</span></div><p className="text-sm text-muted-foreground mt-2">Keep focusing to grow your tree 🌳</p></div>
      <div className="glass-card">
        <h3 className="font-semibold text-foreground mb-4">📊 Recent Sessions</h3>
        {sessions.length === 0 ? (<p className="text-sm text-muted-foreground">No focus sessions yet. Start your first one!</p>) : sessions.slice().reverse().slice(0, 10).map((s: any) => (
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
