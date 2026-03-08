import { useState, useRef } from 'react';
import Storage from '@/lib/storage';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import HealthRemindersCard from '../HealthRemindersCard';

interface HealthPageProps {
  navigateTo: (page: string) => void;
  refreshKey: number;
  onRestartReminders?: () => void;
}

function getHealthData() {
  const today = new Date().toISOString().split('T')[0];
  const data = Storage.get('health', {});
  if (!data[today]) {
    data[today] = { water: 0, steps: 0, sleepHours: 0, bedtime: '', wakeup: '', sleepRating: 0, mood: '', moodNote: '', breathingDone: false };
  }
  return { all: data, today: data[today], date: today };
}

function saveHealthData(data: any) {
  Storage.set('health', data.all);
}

const HealthPage = ({ navigateTo, onRestartReminders }: HealthPageProps) => {
  const [tab, setTab] = useState('overview');
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState('START');
  const [, setRefreshCounter] = useState(0);
  const refresh = () => setRefreshCounter(c => c + 1);

  const h = getHealthData();
  const t = h.today;

  const waterScore = Math.min(t.water / 8, 1) * 25;
  const sleepScore = Math.min(t.sleepHours / 8, 1) * 25;
  const stepsScore = Math.min(t.steps / 10000, 1) * 25;
  const moodScore = t.mood ? 25 : 0;
  const score = Math.round(waterScore + sleepScore + stepsScore + moodScore);
  const level = score >= 80 ? 'Champion' : score >= 60 ? 'Warrior' : score >= 40 ? 'Apprentice' : 'Beginner';

  const adjustWater = (delta: number) => {
    const data = getHealthData();
    data.today.water = Math.max(0, Math.min(20, data.today.water + delta));
    saveHealthData(data);
    refresh();
    if (delta > 0) toast({ title: '💧 Water logged', description: `${data.today.water}/8 glasses` });
  };

  const updateSleep = (field: string, value: string) => {
    const data = getHealthData();
    data.today[field] = value;
    if (data.today.bedtime && data.today.wakeup) {
      const [bH, bM] = data.today.bedtime.split(':').map(Number);
      const [wH, wM] = data.today.wakeup.split(':').map(Number);
      let bedMin = bH * 60 + bM;
      let wakeMin = wH * 60 + wM;
      if (wakeMin <= bedMin) wakeMin += 24 * 60;
      data.today.sleepHours = +((wakeMin - bedMin) / 60).toFixed(1);
    }
    saveHealthData(data);
    refresh();
    toast({ title: '😴 Sleep updated', description: `${data.today.sleepHours}h logged` });
  };

  const rateSleep = (rating: number) => {
    const data = getHealthData();
    data.today.sleepRating = rating;
    saveHealthData(data);
    refresh();
    toast({ title: 'Sleep quality rated', description: `${rating}/5 stars` });
  };

  const updateSteps = () => {
    const input = document.getElementById('steps-input') as HTMLInputElement;
    if (!input) return;
    const data = getHealthData();
    data.today.steps = parseInt(input.value) || 0;
    saveHealthData(data);
    refresh();
    toast({ title: '👟 Steps updated', description: `${data.today.steps.toLocaleString()} steps` });
  };

  const setMood = (mood: string) => {
    const data = getHealthData();
    data.today.mood = mood;
    saveHealthData(data);
    refresh();
    toast({ title: 'Mood logged', description: `Feeling ${mood} today` });
  };

  const saveMoodNote = (note: string) => {
    const data = getHealthData();
    data.today.moodNote = note;
    saveHealthData(data);
  };

  const breathingRef = useRef(false);

  const startBreathing = () => {
    if (breathingRef.current) {
      breathingRef.current = false;
      setBreathingActive(false);
      setBreathingPhase('START');
      return;
    }
    breathingRef.current = true;
    setBreathingActive(true);
    const phases = [
      { label: 'INHALE', duration: 4000 },
      { label: 'HOLD', duration: 7000 },
      { label: 'EXHALE', duration: 8000 },
    ];
    let idx = 0;
    const run = () => {
      if (!breathingRef.current) return;
      setBreathingPhase(phases[idx % 3].label);
      idx++;
      setTimeout(run, phases[(idx - 1) % 3].duration);
    };
    run();
  };

  const circumference = 2 * Math.PI * 45;
  const dashoffset = circumference - (score / 100) * circumference;

  const moods = [
    { emoji: '😊', label: 'HAPPY', value: 'happy' },
    { emoji: '⚡', label: 'ENERGETIC', value: 'energetic' },
    { emoji: '😌', label: 'CALM', value: 'calm' },
    { emoji: '😐', label: 'NEUTRAL', value: 'neutral' },
    { emoji: '😴', label: 'TIRED', value: 'tired' },
    { emoji: '😰', label: 'STRESSED', value: 'stressed' },
  ];

  return (
    <div className="page-enter">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button className="icon-btn !w-9 !h-9" onClick={() => navigateTo('dashboard')}><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Wellness</h1>
            <p className="text-muted-foreground text-sm">Holistic health tracking for peak academic performance.</p>
          </div>
        </div>
        <div className="health-tabs">
          {['overview', 'physical', 'mental'].map(t => (
            <button key={t} className={`health-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="glass-card text-center">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Daily Wellness</h3>
                <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: 'hsl(var(--accent-dim))', color: 'hsl(var(--primary))' }}>{level.toUpperCase()}</span>
              </div>
              <svg width="120" height="120" viewBox="0 0 120 120" className="mx-auto mb-4">
                <circle cx="60" cy="60" r="45" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                <circle cx="60" cy="60" r="45" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                  strokeDasharray={circumference} strokeDashoffset={dashoffset} strokeLinecap="round"
                  transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                <text x="60" y="55" textAnchor="middle" fill="hsl(var(--primary))" fontSize="24" fontWeight="bold">{score}</text>
                <text x="60" y="72" textAnchor="middle" fill="hsl(var(--text-muted))" fontSize="10">SCORE</text>
              </svg>
              <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                <span>💧 {t.water} GLASSES</span>
                <span>👟 {t.steps.toLocaleString()} STEPS</span>
                <span>🌙 {t.sleepHours}H SLEEP</span>
              </div>
            </div>
            <div className="glass-card text-center flex flex-col items-center justify-center">
              <div className="text-5xl mb-3">{score >= 60 ? '🌟' : score >= 30 ? '🌱' : '💤'}</div>
              <h3 className="font-semibold text-foreground mb-2">Your Wellness Spirit</h3>
              <p className="text-sm text-muted-foreground">
                {score >= 60 ? 'Thriving! Keep it up!' : score >= 30 ? 'Growing... needs more care.' : 'Needs care & water.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <button className="glass-card !p-4 text-center cursor-pointer hover:scale-105 transition-transform" onClick={() => adjustWater(1)}>
              <span className="text-2xl">💧</span>
              <span className="block text-xs font-medium text-foreground mt-1">+ Water</span>
            </button>
            <button className="glass-card !p-4 text-center cursor-pointer hover:scale-105 transition-transform" onClick={() => setTab('physical')}>
              <span className="text-2xl">😴</span>
              <span className="block text-xs font-medium text-foreground mt-1">Log Sleep</span>
            </button>
            <button className="glass-card !p-4 text-center cursor-pointer hover:scale-105 transition-transform" onClick={() => setTab('mental')}>
              <span className="text-2xl">😊</span>
              <span className="block text-xs font-medium text-foreground mt-1">Log Mood</span>
            </button>
            <button className="glass-card !p-4 text-center cursor-pointer hover:scale-105 transition-transform" onClick={() => setTab('physical')}>
              <span className="text-2xl">👟</span>
              <span className="block text-xs font-medium text-foreground mt-1">Log Steps</span>
            </button>
          </div>

          {/* Health Reminders */}
          <HealthRemindersCard onRestartReminders={onRestartReminders || (() => {})} />
        </>
      )}

      {tab === 'physical' && (
        <>
          <div className="glass-card mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">💧 Hydration</h3>
              <span className="text-sm text-muted-foreground">{t.water}/8 glasses</span>
            </div>
            <div className="xp-bar !h-3 mb-3">
              <div className="xp-bar-fill" style={{ width: `${Math.min(t.water / 8 * 100, 100)}%` }} />
            </div>
            <div className="flex items-center justify-center gap-6">
              <button className="icon-btn !w-10 !h-10 text-lg" onClick={() => adjustWater(-1)}>−</button>
              <span className="text-2xl font-bold text-foreground">{t.water}</span>
              <button className="icon-btn !w-10 !h-10 text-lg" onClick={() => adjustWater(1)}>+</button>
            </div>
          </div>

          <div className="glass-card mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">😴 Sleep Tracker</h3>
              <span className="text-sm text-muted-foreground">{t.sleepHours}h / 8h goal</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div><label className="form-label">BEDTIME</label><input type="time" className="input-simple" defaultValue={t.bedtime} onChange={e => updateSleep('bedtime', e.target.value)} /></div>
              <div><label className="form-label">WAKEUP</label><input type="time" className="input-simple" defaultValue={t.wakeup} onChange={e => updateSleep('wakeup', e.target.value)} /></div>
            </div>
            <label className="form-label">SLEEP QUALITY</label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className={`star ${t.sleepRating >= i ? 'active' : ''}`} onClick={() => rateSleep(i)}>★</span>
              ))}
            </div>
          </div>

          <div className="glass-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">👟 Activity</h3>
              <span className="text-sm text-muted-foreground">{t.steps.toLocaleString()} / 10,000 steps</span>
            </div>
            <div className="xp-bar !h-3 mb-3">
              <div className="xp-bar-fill" style={{ width: `${Math.min(t.steps / 10000 * 100, 100)}%`, background: 'hsl(var(--purple))' }} />
            </div>
            <div className="flex gap-2">
              <input type="number" className="input-simple flex-1" id="steps-input" placeholder="Enter steps" defaultValue={t.steps > 0 ? t.steps : ''} />
              <button className="btn-green" onClick={updateSteps}>UPDATE</button>
            </div>
          </div>
        </>
      )}

      {tab === 'mental' && (
        <>
          <div className="glass-card mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">😊 Mood Journal</h3>
              <span className="text-xs text-muted-foreground tracking-wider">REFLECT ON YOUR DAY</span>
            </div>
            <div className="mood-grid mb-4">
              {moods.map(m => (
                <button key={m.value} className={`mood-btn ${t.mood === m.value ? 'active' : ''}`} onClick={() => setMood(m.value)}>
                  <span className="mood-emoji">{m.emoji}</span>
                  <span className="mood-label">{m.label}</span>
                </button>
              ))}
            </div>
            <textarea className="input-simple min-h-[80px] resize-y" placeholder="What's on your mind?"
              defaultValue={t.moodNote || ''} onChange={e => saveMoodNote(e.target.value)} />
            {t.mood && <p className="text-sm text-primary mt-2">You're feeling <strong>{t.mood}</strong> today ✨</p>}
          </div>

          <div className="glass-card">
            <h3 className="font-semibold text-foreground mb-4">🧘 Mindfulness</h3>
            <div className="text-center">
              <div className="breathing-circle mx-auto mb-4" style={{ transform: breathingPhase === 'INHALE' || breathingPhase === 'HOLD' ? 'scale(1.3)' : 'scale(1)' }}>
                {breathingPhase}
              </div>
              <p className="text-sm text-muted-foreground mb-1">4-7-8 Breathing Technique</p>
              <p className="text-xs text-muted-foreground mb-4">Inhale 4s → Hold 7s → Exhale 8s</p>
              <button className="btn-outline" onClick={startBreathing}>
                {breathingActive ? 'STOP' : 'BEGIN EXERCISE'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HealthPage;
