import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Storage from '@/lib/storage';

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

  // Load from DB on mount
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_gamification')
        .select('total_xp, level')
        .eq('user_id', user.id)
        .single();

      if (data) {
        // Merge: take whichever is higher (DB or local)
        const localXp = Storage.getXP();
        const total = Math.max(data.total_xp, localXp.total);
        const level = calcLevel(total);
        setXp({ total, level });
        Storage.set('xp', { total, level });
        // Sync back if local was higher
        if (localXp.total > data.total_xp) {
          await supabase.from('user_gamification').update({ total_xp: total, level, updated_at: new Date().toISOString() }).eq('user_id', user.id);
        }
      } else {
        // First time: create row with local XP
        const localXp = Storage.getXP();
        await supabase.from('user_gamification').insert({
          user_id: user.id,
          total_xp: localXp.total,
          level: localXp.level,
        });
      }
    };
    load();
  }, []);

  const addXP = useCallback((amount: number) => {
    if (typeof amount !== 'number' || amount <= 0) return;

    setXp(prev => {
      const total = prev.total + amount;
      const level = calcLevel(total);
      const next = { total, level };

      // Persist to localStorage
      Storage.set('xp', next);

      // Persist to DB (fire-and-forget)
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('user_gamification')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (data) {
          await supabase.from('user_gamification').update({ total_xp: total, level, updated_at: new Date().toISOString() }).eq('user_id', user.id);
        } else {
          await supabase.from('user_gamification').insert({ user_id: user.id, total_xp: total, level });
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
