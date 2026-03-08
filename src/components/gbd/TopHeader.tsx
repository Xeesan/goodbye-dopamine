import { useState, useEffect } from 'react';
import { Menu, Bell, User, Calendar, WifiOff, Sun, Moon } from 'lucide-react';
import { formatDateShort } from '@/lib/helpers';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';

interface TopHeaderProps {
  onToggleSidebar: () => void;
  onNavigate: (page: string) => void;
  calendarOpen?: boolean;
  onToggleCalendar?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const TopHeader = ({ onToggleSidebar, onNavigate, calendarOpen, onToggleCalendar, theme, onToggleTheme }: TopHeaderProps) => {
  const isOnline = useOnlineStatus();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false);
        if (!cancelled && !error) setUnreadCount(count || 0);
      } catch {
        // silently ignore network errors
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <header className="grid grid-cols-3 items-center px-3 sm:px-6 h-[56px] sm:h-[60px] min-h-[56px] sm:min-h-[60px] relative" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
      <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar menu">
        <Menu className="w-5 h-5" />
      </button>
      <button
        className={`flex items-center justify-center gap-2 text-sm transition-colors ${calendarOpen ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
        onClick={onToggleCalendar}
        title="Toggle calendar"
      >
        <Calendar className="w-4 h-4" />
        <span>{formatDateShort(new Date())}</span>
      </button>
      <div className="flex items-center justify-end gap-2">
        {!isOnline && (
          <span className="flex items-center gap-1 text-[0.7rem] font-semibold tracking-wider px-2 py-1 rounded-full text-warning" style={{ background: 'hsl(var(--warning) / 0.15)' }}>
            <WifiOff className="w-3.5 h-3.5" /> OFFLINE
          </span>
        )}
        <button className="icon-btn" onClick={onToggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button className={`icon-btn relative ${unreadCount > 0 ? 'animate-[bellPulse_2s_ease-in-out_infinite]' : ''}`} onClick={() => onNavigate('notifications')} aria-label="Notifications">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[0.6rem] font-bold leading-none px-1"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        <button className="icon-btn" onClick={() => onNavigate('profile')} aria-label="Profile">
          <User className="w-5 h-5" />
        </button>
      </div>

    </header>
  );
};

export default TopHeader;
