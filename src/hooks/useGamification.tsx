import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Storage from '@/lib/storage';
import { calcLevel, levelTitle } from '@/lib/leveling';
import { toast } from '@/hooks/use-toast';

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



export const GamificationProvider = ({ children }: { children: ReactNode }) => {
  const [xp, setXp] = useState<XPData>(() => Storage.getXP());

  // Load from DB on mount — server is authoritative
  useEffect(() => {
    const load = async () => {
      if (!navigator.onLine) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_gamification')
        .select('total_xp, level')
        .eq('user_id', user.id)
        .single();

      if (data) {
        // Server value is always authoritative
        const next = { total: data.total_xp, level: data.level };
        setXp(next);
        Storage.set('xp', next);
      } else {
        // No server record yet — create one with zero
        await supabase.from('user_gamification').insert({
          user_id: user.id,
          total_xp: 0,
          level: 1,
        });
        const next = { total: 0, level: 1 };
        setXp(next);
        Storage.set('xp', next);
      }
    };
    load();

    const handleOnline = () => { load(); };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const addXP = useCallback((amount: number) => {
    if (typeof amount !== 'number' || amount <= 0 || amount > 100) return;

    // Optimistic local update
    setXp(prev => {
      const total = prev.total + amount;
      const level = calcLevel(total);
      const next = { total, level };
      Storage.set('xp', next);

      // Level-up celebration
      if (level > prev.level) {
        const title = levelTitle(level);
        setTimeout(() => {
          toast({
            title: `🎉 Level Up!`,
            description: `You reached Level ${level} — ${title}! Keep going!`,
            duration: 5000,
          });
        }, 100);
      }

      return next;
    });

    // Server-side atomic increment — server is authoritative
    (async () => {
      try {
        const { data, error } = await supabase.rpc('increment_xp', { delta: amount });
        if (!error && data && data.length > 0) {
          const serverResult = { total: data[0].total_xp, level: data[0].level };
          setXp(serverResult);
          Storage.set('xp', serverResult);
        }
      } catch {
        // Keep optimistic value if offline
      }
    })();
  }, []);

  return (
    <GamificationContext.Provider value={{ xp, addXP }}>
      {children}
    </GamificationContext.Provider>
  );
};
