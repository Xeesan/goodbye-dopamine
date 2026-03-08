import { Menu, Bell, User, Calendar } from 'lucide-react';
import { formatDateShort } from '@/lib/helpers';
import { useState } from 'react';

interface TopHeaderProps {
  onToggleSidebar: () => void;
  onNavigate: (page: string) => void;
}

const TopHeader = ({ onToggleSidebar, onNavigate }: TopHeaderProps) => {
  const [showNotif, setShowNotif] = useState(false);

  return (
    <header className="flex items-center justify-between px-6 h-[60px] min-h-[60px] relative" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
      <button className="hamburger-btn" onClick={onToggleSidebar}>
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span>{formatDateShort(new Date())}</span>
      </div>
      <div className="flex items-center gap-2">
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
