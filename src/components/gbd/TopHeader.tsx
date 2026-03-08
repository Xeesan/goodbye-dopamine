import { Menu, Bell, User } from 'lucide-react';
import { formatDateShort } from '@/lib/helpers';

interface TopHeaderProps {
  onToggleSidebar: () => void;
  onNavigate: (page: string) => void;
}

const TopHeader = ({ onToggleSidebar, onNavigate }: TopHeaderProps) => {
  return (
    <header className="flex items-center justify-between px-6 h-[60px] min-h-[60px]" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
      <button className="hamburger-btn" onClick={onToggleSidebar}>
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span>{formatDateShort(new Date())}</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="icon-btn" onClick={() => alert('Notifications')}>
          <Bell className="w-5 h-5" />
        </button>
        <button className="icon-btn" onClick={() => onNavigate('profile')}>
          <User className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

// Need Calendar icon
import { Calendar } from 'lucide-react';

export default TopHeader;
