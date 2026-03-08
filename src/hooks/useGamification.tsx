import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Storage from '@/lib/storage';
import { enqueue, flushQueue } from '@/lib/syncQueue';

interface XPData {
  total: number;
  level: number;
}

interface GamificationContextType {
  xp: XPData;
  addXP: (amount: number) => void;
}

const GamificationContext = createContext<GamificationContextType>({
  xp: { total: 0, level: 1 },
  addXP: () => {},
});

export const useGamification = () => useContext(GamificationContext);

const calcLevel = (total: number) => Math.floor(total / 100) + 1;

export const GamificationProvider = ({ children }: { children: ReactNode }) => {
  const [xp, setXp] = useState<XPData>(() => Storage.getXP());

  // Load from DB on mount & flush any queued writes
  useEffect(() => {
    const load = async () => {
      if (!navigator.onLine) return;

      // Flush any pending sync queue items first
      await flushQueue();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_gamification')
        .select('total_xp, level')
        .eq('user_id', user.id)
        .single();

      if (data) {
        const localXp = Storage.getXP();
        const total = Math.max(data.total_xp, localXp.total);
        const level = calcLevel(total);
        setXp({ total, level });
        Storage.set('xp', { total, level });
        if (localXp.total > data.total_xp) {
          await supabase.from('user_gamification').update({ total_xp: total, level, updated_at: new Date().toISOString() }).eq('user_id', user.id);
        }
      } else {
        const localXp = Storage.getXP();
        await supabase.from('user_gamification').insert({
          user_id: user.id,
          total_xp: localXp.total,
          level: localXp.level,
        });
      }
    };
    load();

    // Also flush queue whenever we come back online
    const handleOnline = () => { flushQueue(); load(); };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const addXP = useCallback((amount: number) => {
    if (typeof amount !== 'number' || amount <= 0) return;

    setXp(prev => {
      const total = prev.total + amount;
      const level = calcLevel(total);
      const next = { total, level };

      // Always persist to localStorage
      Storage.set('xp', next);

      // Try DB, queue if offline
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (!navigator.onLine) {
          enqueue({
            table: 'user_gamification',
            operation: 'upsert',
            data: { user_id: user.id, total_xp: total, level, updated_at: new Date().toISOString() },
            matchColumn: 'user_id',
          });
          return;
        }

        const { data } = await supabase
          .from('user_gamification')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (data) {
          const res = await supabase.from('user_gamification').update({ total_xp: total, level, updated_at: new Date().toISOString() }).eq('user_id', user.id);
          if (res.error) {
            enqueue({ table: 'user_gamification', operation: 'upsert', data: { user_id: user.id, total_xp: total, level, updated_at: new Date().toISOString() }, matchColumn: 'user_id' });
          }
        } else {
          const res = await supabase.from('user_gamification').insert({ user_id: user.id, total_xp: total, level });
          if (res.error) {
            enqueue({ table: 'user_gamification', operation: 'upsert', data: { user_id: user.id, total_xp: total, level, updated_at: new Date().toISOString() }, matchColumn: 'user_id' });
          }
        }
      })();

      return next;
    });
  }, []);

  return (
    <GamificationContext.Provider value={{ xp, addXP }}>
      {children}
    </GamificationContext.Provider>
  );
};
