import { LayoutGrid, Calendar, Clock, FileText, Monitor, Wallet, StickyNote, BookOpen, Timer, Heart, BarChart3, Settings, LogOut, User, Bell, Globe } from 'lucide-react';
import appLogo from '@/assets/icon.png';
import { useI18n } from '@/hooks/useI18n';
import type { TranslationKey } from '@/lib/i18n';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  user: any;
  onLogout: () => void;
  isOpen: boolean;
}

const navItems = [
  { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutGrid, category: null },
  { id: '_academic', labelKey: 'nav.academic', icon: null, category: 'header' },
  { id: 'planner', labelKey: 'nav.planner', icon: Calendar, category: 'academic' },
  { id: 'routine', labelKey: 'nav.routine', icon: Clock, category: 'academic' },
  { id: 'exams', labelKey: 'nav.exams', icon: FileText, category: 'academic' },
  { id: 'academic-hub', labelKey: 'nav.academic_hub', icon: Monitor, category: 'academic' },
  { id: '_personal', labelKey: 'nav.personal', icon: null, category: 'header' },
  { id: 'money', labelKey: 'nav.money', icon: Wallet, category: 'personal' },
  { id: 'notes', labelKey: 'nav.notes', icon: StickyNote, category: 'personal' },
  { id: 'booklist', labelKey: 'nav.booklist', icon: BookOpen, category: 'personal' },
  { id: '_wellness', labelKey: 'nav.wellness', icon: null, category: 'header' },
  { id: 'detox', labelKey: 'nav.detox', icon: Timer, category: 'wellness' },
  { id: 'health', labelKey: 'nav.health', icon: Heart, category: 'wellness' },
  { id: 'reports', labelKey: 'nav.reports', icon: BarChart3, category: 'wellness' },
  { id: '_system', labelKey: 'nav.system', icon: null, category: 'header' },
  { id: 'notifications', labelKey: 'nav.notifications', icon: Bell, category: 'system' },
];

const Sidebar = ({ currentPage, onNavigate, user, onLogout, isOpen }: SidebarProps) => {
  const { t, toggleLang, lang } = useI18n();

  return (
    <aside className={`sidebar-container ${isOpen ? 'sidebar-open' : ''}`}
      style={{
        background: 'hsl(var(--bg-secondary))',
        borderColor: 'hsl(var(--border))',
      }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-5" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <img src={appLogo} alt="GBD Logo" className="w-9 h-9 rounded-lg shrink-0" />
        <div>
          <span className="text-lg font-extrabold tracking-tight text-foreground">{t('app.name')}</span>
          <span className="block text-[0.6rem] font-medium tracking-widest uppercase" style={{ color: 'hsl(var(--primary))' }}>{t('app.tagline')}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5">
        {navItems.map(item => {
          if (item.category === 'header') {
            return (
              <div key={item.id} className="flex items-center gap-2 px-3 pt-4 pb-2 text-[0.7rem] font-semibold tracking-widest text-muted-foreground uppercase">
                {t(item.labelKey as TranslationKey)}
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
              {t(item.labelKey as TranslationKey)}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 mt-auto">
        {/* Language Toggle */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium text-muted-foreground hover:text-foreground w-full transition-all duration-200"
        >
          <Globe className="w-5 h-5" />
          {t('lang.switch')}
          <span className="ml-auto text-[0.6rem] font-bold tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'hsl(var(--accent-dim))', color: 'hsl(var(--primary))' }}>
            {lang === 'en' ? 'EN' : 'বা'}
          </span>
        </button>

        <button onClick={() => onNavigate('profile')} className="flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium text-muted-foreground hover:text-foreground w-full transition-all duration-200">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-extrabold" style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(263 70% 76%))',
              color: 'hsl(var(--primary-foreground))',
            }}>
              {(user?.username || 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{user?.name || user?.username || 'User'}</span>
            <span className="text-[0.65rem] text-muted-foreground">@{user?.username || '---'}</span>
          </div>
        </button>
        <button onClick={onLogout} className="flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium text-destructive hover:bg-destructive/10 w-full transition-all duration-200">
          <LogOut className="w-5 h-5" />
          {t('nav.exit')}
        </button>
        <p className="text-center text-[0.6rem] text-muted-foreground mt-3">
          {t('nav.developed_by')} <strong>Zia Uddin Zisan</strong>
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
