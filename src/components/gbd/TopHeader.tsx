import { Menu, Bell, User, Calendar, WifiOff, Sun, Moon } from 'lucide-react';
import { formatDateShort } from '@/lib/helpers';
import { useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface TopHeaderProps {
  onToggleSidebar: () => void;
  onNavigate: (page: string) => void;
  calendarOpen?: boolean;
  onToggleCalendar?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const TopHeader = ({ onToggleSidebar, onNavigate, calendarOpen, onToggleCalendar, theme, onToggleTheme }: TopHeaderProps) => {
  const [showNotif, setShowNotif] = useState(false);
  const isOnline = useOnlineStatus();

  return (
    <header className="grid grid-cols-3 items-center px-3 sm:px-6 h-[56px] sm:h-[60px] min-h-[56px] sm:min-h-[60px] relative" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
      <button className="hamburger-btn" onClick={onToggleSidebar}>
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
        <button className="icon-btn relative" onClick={() => setShowNotif(!showNotif)}>
          <Bell className="w-5 h-5" />
        </button>
        <button className="icon-btn" onClick={() => onNavigate('profile')}>
          <User className="w-5 h-5" />
        </button>
      </div>

      {/* Notification dropdown */}
      {showNotif && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
          <div className="absolute right-4 top-[54px] z-50 w-72 rounded-xl overflow-hidden animate-[slideUp_0.15s_ease]" style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border))', boxShadow: '0 15px 40px rgba(0,0,0,0.3)' }}>
            <div className="p-4 font-semibold text-foreground text-sm" style={{ borderBottom: '1px solid hsl(var(--border))' }}>Notifications</div>
            <div className="p-6 text-center">
              <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No new notifications</p>
            </div>
          </div>
        </>
      )}
    </header>
  );
};

export default TopHeader;
