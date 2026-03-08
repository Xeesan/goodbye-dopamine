import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Play, Pause, RotateCcw, CheckCircle2, Zap } from 'lucide-react';
import { useGamification } from '@/hooks/useGamification';
import { useI18n } from '@/hooks/useI18n';
import { toast } from '@/hooks/use-toast';
import Storage from '@/lib/storage';
import type { TranslationKey } from '@/lib/i18n';

export interface FocusTask {
  id: string;
  title: string;
  type: 'task' | 'exam';
  date?: string;
  priority?: string;
  urgencyScore: number;
  reason: string;
}

interface FocusNowOverlayProps {
  task: FocusTask;
  duration: number; // minutes
  onClose: () => void;
  onComplete: () => void;
}

const FocusNowOverlay = ({ task, duration, onClose, onComplete }: FocusNowOverlayProps) => {
  const { t } = useI18n();
  const { addXP } = useGamification();

  // Clamp duration to 1-120 min
  const safeDuration = Math.max(1, Math.min(120, Math.round(duration || 25)));
  const totalSeconds = safeDuration * 60;

  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [running, setRunning] = useState(true);
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false); // prevent double-complete

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Play alert sound + vibrate when timer completes
  const alertOnComplete = useCallback(() => {
    // Vibration API (mobile)
    try {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 300]);
    } catch { /* not supported */ }
    // Audio beep using Web Audio API (no file needed)
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playBeep = (freq: number, delay: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.4);
      };
      playBeep(880, 0);
      playBeep(880, 0.5);
      playBeep(1100, 1.0);
    } catch { /* audio not supported */ }
  }, []);

  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setRunning(false);
            setCompleted(true);
            alertOnComplete();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, alertOnComplete]); // only depend on running

  // Prevent body scroll while overlay is open
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, []);

  const togglePause = useCallback(() => setRunning(r => !r), []);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSecondsLeft(totalSeconds);
    setRunning(false);
    setCompleted(false);
    completedRef.current = false;
  }, [totalSeconds]);

  const markDone = useCallback(() => {
    // Prevent double invocation
    if (completedRef.current) return;
    completedRef.current = true;

    if (intervalRef.current) clearInterval(intervalRef.current);

    const elapsed = Math.max(1, Math.round((totalSeconds - secondsLeft) / 60));

    try {
      Storage.addFocusSession({
        duration: elapsed,
        taskTitle: (task.title || '').slice(0, 200),
        taskType: task.type,
        completedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to save focus session:', e);
    }

    // Mark task done if it's a planner task
    if (task.type === 'task' && task.id) {
      try {
        Storage.updateTask(task.id, { status: 'done' });
      } catch (e) {
        console.error('Failed to update task:', e);
      }
    }

    addXP(30);
    toast({
      title: t('focus.completed_toast' as TranslationKey),
      description: `${elapsed} min → ${(task.title || '').slice(0, 60)}`,
    });
    onComplete();
  }, [totalSeconds, secondsLeft, task, addXP, t, onComplete]);

  // Keyboard: Escape to close, Space to pause/resume
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ' && !completed) {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, togglePause, completed]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  // Ring SVG dimensions
  const size = 260;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: 'hsl(var(--background) / 0.97)', backdropFilter: 'blur(20px)' }}
      role="dialog" aria-modal="true" aria-label="Focus Timer">

      {/* Close button */}
      <button onClick={onClose}
        className="absolute top-5 right-5 p-2 rounded-full hover:bg-muted transition-colors"
        aria-label="Close timer">
        <X className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Task info */}
      <div className="text-center mb-8 px-4 max-w-md">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[0.65rem] font-bold tracking-widest uppercase mb-3"
          style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}>
          <Zap className="w-3 h-3" />
          {task.type === 'exam' ? t('focus.exam_prep' as TranslationKey) : t('focus.task_focus' as TranslationKey)}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 break-words">{task.title}</h1>
        <p className="text-sm text-muted-foreground">{task.reason}</p>
      </div>

      {/* Timer ring */}
      <div className="relative mb-8">
        <svg width={size} height={size} className="transform -rotate-90" aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke="hsl(var(--muted))" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke="hsl(var(--primary))" strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-linear" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl sm:text-6xl font-mono font-bold text-foreground tabular-nums"
            aria-live="polite" aria-label={`${mins} minutes ${secs} seconds remaining`}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
          <span className="text-xs text-muted-foreground mt-1">
            {running ? t('focus.focusing' as TranslationKey) : completed ? t('focus.times_up' as TranslationKey) : t('focus.paused' as TranslationKey)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {!completed ? (
          <>
            <button onClick={reset}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'hsl(var(--muted))' }}
              aria-label="Reset timer">
              <RotateCcw className="w-5 h-5 text-muted-foreground" />
            </button>
            <button onClick={togglePause}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
              aria-label={running ? 'Pause' : 'Resume'}>
              {running ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>
            <button onClick={markDone}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'hsl(var(--green) / 0.15)', color: 'hsl(var(--green))' }}
              aria-label="Mark done early">
              <CheckCircle2 className="w-5 h-5" />
            </button>
          </>
        ) : (
          <button onClick={markDone}
            className="px-8 py-3 rounded-full font-semibold text-sm transition-all hover:scale-105 flex items-center gap-2"
            style={{ background: 'hsl(var(--green))', color: 'hsl(var(--green-foreground, 0 0% 100%))' }}>
            <CheckCircle2 className="w-4 h-4" /> {t('focus.mark_done' as TranslationKey)}
          </button>
        )}
      </div>

      {/* Keyboard hint */}
      <p className="absolute bottom-5 text-[0.6rem] text-muted-foreground/50 tracking-wider hidden sm:block">
        SPACE to pause · ESC to exit
      </p>
    </div>
  );
};

// ─── Urgency Algorithm ───
export function getRankedTasks(): FocusTask[] {
  const now = new Date();
  const candidates: FocusTask[] = [];

  // 1. Planner tasks (not done)
  try {
    const tasks = Storage.getTasks().filter((t: any) => t && t.status !== 'done');
    for (const task of tasks) {
      if (!task.id || !task.title) continue;
      let score = 50;
      if (task.priority === 'high') score += 40;
      else if (task.priority === 'medium') score += 20;

      if (task.date) {
        try {
          const timeStr = typeof task.time === 'string' && task.time ? `T${task.time}` : 'T23:59';
          const deadline = new Date(task.date + timeStr);
          if (!isNaN(deadline.getTime())) {
            const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
            if (hoursUntil < 0) score += 60;
            else if (hoursUntil < 3) score += 50;
            else if (hoursUntil < 12) score += 35;
            else if (hoursUntil < 24) score += 25;
            else if (hoursUntil < 72) score += 15;
          }
        } catch { /* skip */ }
      }
      if (task.status === 'in-progress') score += 10;

      let reason = '';
      if (task.date) {
        try {
          const timeStr = typeof task.time === 'string' && task.time ? `T${task.time}` : 'T23:59';
          const deadline = new Date(task.date + timeStr);
          if (!isNaN(deadline.getTime())) {
            const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
            if (hoursUntil < 0) reason = 'Overdue!';
            else if (hoursUntil < 24) reason = `Due in ${Math.max(1, Math.round(hoursUntil))}h`;
            else if (hoursUntil < 72) reason = `Due in ${Math.round(hoursUntil / 24)}d`;
            else reason = `Due ${task.date}`;
          }
        } catch { /* skip */ }
      }
      if (!reason && task.priority === 'high') reason = 'High priority';

      candidates.push({
        id: task.id,
        title: String(task.title).slice(0, 200),
        type: 'task',
        date: task.date,
        priority: task.priority,
        urgencyScore: score,
        reason: reason || 'Pending task',
      });
    }
  } catch (e) {
    console.error('Focus algorithm: error reading tasks', e);
  }

  // 2. Upcoming exams (next 14 days)
  try {
    const exams = Storage.getExams();
    for (const exam of exams) {
      if (!exam.date || !exam.id || !exam.subject) continue;
      try {
        const timeStr = typeof exam.time === 'string' && exam.time ? `T${exam.time}` : 'T09:00';
        const examDate = new Date(exam.date + timeStr);
        if (isNaN(examDate.getTime())) continue;
        const hoursUntil = (examDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursUntil < 0 || hoursUntil > 14 * 24) continue;

        let score = 60;
        const credits = Math.max(1, Math.min(20, Number(exam.credits) || 3));
        score += credits * 5;
        if (hoursUntil < 24) score += 60;
        else if (hoursUntil < 48) score += 45;
        else if (hoursUntil < 72) score += 30;
        else if (hoursUntil < 168) score += 15;

        const daysUntil = Math.max(0, Math.round(hoursUntil / 24));
        const reason = daysUntil === 0
          ? 'Exam today!'
          : daysUntil === 1
          ? 'Exam tomorrow'
          : `Exam in ${daysUntil} days (${credits} cr)`;

        candidates.push({
          id: exam.id,
          title: `Study: ${String(exam.subject).slice(0, 100)}`,
          type: 'exam',
          date: exam.date,
          urgencyScore: score,
          reason,
        });
      } catch { /* skip */ }
    }
  } catch (e) {
    console.error('Focus algorithm: error reading exams', e);
  }

  // Sort by urgency score descending
  candidates.sort((a, b) => b.urgencyScore - a.urgencyScore);
  return candidates;
}

/** Legacy compat — returns the single most urgent task */
export function pickMostUrgentTask(): FocusTask | null {
  const ranked = getRankedTasks();
  return ranked.length > 0 ? ranked[0] : null;
}

export default FocusNowOverlay;
