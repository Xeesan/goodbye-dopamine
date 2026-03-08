import { LayoutGrid, Calendar, Clock, FileText, Monitor, Wallet, StickyNote, Timer, Heart, BarChart3, Settings, LogOut, User } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  user: any;
  onLogout: () => void;
  isOpen: boolean;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, category: null },
  { id: '_academic', label: 'ACADEMIC', icon: null, category: 'header' },
  { id: 'planner', label: 'Planner', icon: Calendar, category: 'academic' },
  { id: 'routine', label: 'Routine', icon: Clock, category: 'academic' },
  { id: 'exams', label: 'Exams', icon: FileText, category: 'academic' },
  { id: 'academic-hub', label: 'Academic Hub', icon: Monitor, category: 'academic' },
  { id: '_personal', label: 'PERSONAL', icon: null, category: 'header' },
  { id: 'money', label: 'Money', icon: Wallet, category: 'personal' },
  { id: 'notes', label: 'Notes', icon: StickyNote, category: 'personal' },
  { id: 'booklist', label: 'Booklist', icon: BookOpen, category: 'personal' },
  { id: '_wellness', label: 'WELLNESS', icon: null, category: 'header' },
  { id: 'detox', label: 'Detox', icon: Timer, category: 'wellness' },
  { id: 'health', label: 'Health', icon: Heart, category: 'wellness' },
  { id: 'reports', label: 'Reports', icon: BarChart3, category: 'wellness' },
];

const Sidebar = ({ currentPage, onNavigate, user, onLogout, isOpen }: SidebarProps) => {
  return (
    <aside className={`w-[240px] min-w-[240px] h-screen flex flex-col overflow-y-auto overflow-x-hidden border-r transition-transform duration-300 ${isOpen ? 'translate-x-0' : ''}`}
      style={{
        background: 'hsl(var(--bg-secondary))',
        borderColor: 'hsl(var(--border))',
        zIndex: 100,
        position: typeof window !== 'undefined' && window.innerWidth <= 768 ? 'fixed' : 'relative',
        transform: typeof window !== 'undefined' && window.innerWidth <= 768 && !isOpen ? 'translateX(-100%)' : 'translateX(0)',
      }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-6">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-sm" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
          G
        </div>
        <div>
          <span className="text-xl font-extrabold tracking-tight text-foreground">GBD</span>
          <span className="block text-[0.6rem] text-muted-foreground tracking-wider">Good Bye Dopamine</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5">
        {navItems.map(item => {
          if (item.category === 'header') {
            return (
              <div key={item.id} className="flex items-center gap-2 px-3 pt-4 pb-2 text-[0.7rem] font-semibold tracking-widest text-muted-foreground uppercase">
                {item.label} <span className="ml-auto">›</span>
              </div>
            );
          }
          const Icon = item.icon!;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-all duration-200 w-full text-left ${
                currentPage === item.id
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={currentPage === item.id ? { background: 'hsl(var(--accent-dim))' } : {}}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 mt-auto">
        <button onClick={() => onNavigate('profile')} className="flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium text-muted-foreground hover:text-foreground w-full transition-all duration-200">
          <Settings className="w-5 h-5" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{user?.name || 'User'}</span>
            <span className="text-[0.65rem] text-muted-foreground">ID: {user?.uid || '---'}</span>
          </div>
        </button>
        <button onClick={onLogout} className="flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium text-destructive hover:bg-destructive/10 w-full transition-all duration-200">
          <LogOut className="w-5 h-5" />
          Exit Session
        </button>
        <p className="text-center text-[0.6rem] text-muted-foreground mt-3">
          Developed by <strong>Zia Uddin Zisan</strong>
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
