import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Storage from '@/lib/storage';

/**
 * Science-backed health reminder intervals:
 *
 * 1. 20-20-20 Rule — Every 20 minutes, look 20 feet away for 20 seconds.
 *    Source: American Academy of Ophthalmology
 *
 * 2. Blink Reminder — Every 15 minutes. Average blink rate drops from
 *    15–20/min to 3–4/min when using screens. (Optometry & Vision Science, 2013)
 *
 * 3. Sedentary Alert — Every 60 minutes. Prolonged sitting increases
 *    cardiovascular risk even with regular exercise. (Annals of Internal Medicine, 2015)
 *
 * 4. Water Reminder — Every 45 minutes. Recommended 8 glasses/day across
 *    ~12 waking hours ≈ every 90 min, but for screen workers every 45 min
 *    is better. (European Journal of Clinical Nutrition, 2003)
 *
 * 5. Posture Check — Every 30 minutes. Sustained poor posture causes
 *    musculoskeletal discomfort. (Applied Ergonomics, 2012)
 *
 * 6. Stretch Break — Every 50 minutes. Micro-breaks with stretching reduce
 *    discomfort by 27-32%. (Occupational & Environmental Medicine, 2019)
 */

export interface HealthReminder {
  id: string;
  title: string;
  body: string;
  tag: string;
  emoji: string;
  intervalMinutes: number;
  enabled: boolean;
}

export const DEFAULT_HEALTH_REMINDERS: HealthReminder[] = [
  {
    id: '20-20-20',
    title: '20-20-20 Rule',
    body: 'Look 20 feet away for 20 seconds to rest your eyes.',
    tag: '20-20-20-RULE',
    emoji: '👁️',
    intervalMinutes: 20,
    enabled: false,
  },
  {
    id: 'blink',
    title: 'Blink Reminder',
    body: "Don't forget to blink! Keep your eyes hydrated.",
    tag: 'BLINK-REMINDER',
    emoji: '😑',
    intervalMinutes: 15,
    enabled: false,
  },
  {
    id: 'sedentary',
    title: 'Sedentary Alert',
    body: 'Time to stand up and stretch! You have been static for an hour.',
    tag: 'SEDENTARY-ALERT',
    emoji: '🧍',
    intervalMinutes: 60,
    enabled: false,
  },
  {
    id: 'water',
    title: 'Water Reminder',
    body: 'Stay hydrated! Drink a glass of water now.',
    tag: 'WATER-REMINDER',
    emoji: '💧',
    intervalMinutes: 45,
    enabled: false,
  },
  {
    id: 'posture',
    title: 'Posture Check',
    body: 'Sit up straight! Align your spine, relax your shoulders.',
    tag: 'POSTURE-CHECK',
    emoji: '🪑',
    intervalMinutes: 30,
    enabled: false,
  },
  {
    id: 'stretch',
    title: 'Stretch Break',
    body: 'Take a quick stretch — neck rolls, wrist stretches, shoulder shrugs.',
    tag: 'STRETCH-BREAK',
    emoji: '🤸',
    intervalMinutes: 50,
    enabled: false,
  },
];

const STORAGE_KEY = 'health_reminders';

export function getHealthReminders(): HealthReminder[] {
  const saved = Storage.get(STORAGE_KEY, null);
  if (!saved) return DEFAULT_HEALTH_REMINDERS;

  // Merge saved with defaults (in case new reminders added)
  return DEFAULT_HEALTH_REMINDERS.map(def => {
    const found = saved.find((s: HealthReminder) => s.id === def.id);
    return found ? { ...def, enabled: found.enabled } : def;
  });
}

export function saveHealthReminders(reminders: HealthReminder[]) {
  Storage.set(STORAGE_KEY, reminders);
}

async function showNotification(reminder: HealthReminder) {
  // Show browser notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const reg = await navigator.serviceWorker?.ready;
      if (reg) {
        reg.showNotification(reminder.title, {
          body: reminder.body,
          icon: '/icon-512.svg',
          badge: '/icon-512.svg',
          tag: reminder.tag,
        } as NotificationOptions);
      } else {
        new Notification(reminder.title, {
          body: reminder.body,
          icon: '/icon-512.svg',
          tag: reminder.tag,
        });
      }
    } catch {
      new Notification(reminder.title, {
        body: reminder.body,
        icon: '/icon-512.svg',
        tag: reminder.tag,
      });
    }
  }

  // Log to notifications table
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: `${reminder.emoji} ${reminder.title}`,
        body: reminder.body,
        tag: reminder.tag,
      });
    }
  } catch (e) {
    console.error('Failed to log notification:', e);
  }
}

/**
 * Hook that runs health reminders at their configured intervals.
 * Only fires when the tab is visible and reminders are enabled.
 */
export function useHealthReminders() {
  const intervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const stopReminders = useCallback(() => {
    for (const [, id] of intervalsRef.current) {
      clearInterval(id);
    }
    intervalsRef.current.clear();
  }, []);

  const startReminders = useCallback(() => {
    stopReminders();
    const reminders = getHealthReminders();
    const activeReminders = reminders.filter(r => r.enabled);

    for (const reminder of activeReminders) {
      const id = setInterval(() => {
        // Only fire when tab is visible
        if (!document.hidden) {
          showNotification(reminder);
        }
      }, reminder.intervalMinutes * 60 * 1000);

      intervalsRef.current.set(reminder.id, id);
    }
  }, [stopReminders]);

  useEffect(() => {
    startReminders();
    return () => stopReminders();
  }, [startReminders, stopReminders]);

  const restart = useCallback(() => {
    startReminders();
  }, [startReminders]);

  return { restart };
}
