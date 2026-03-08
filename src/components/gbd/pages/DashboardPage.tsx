import { useState, useCallback } from 'react';
import Storage from '@/lib/storage';
import { getDailyQuote, getRandomQuote } from '@/lib/quotes';
import { useGamification } from '@/hooks/useGamification';
import { useDialog } from '../DialogProvider';
import { Clock, CheckSquare, BarChart3, Heart, Zap, Star, RefreshCw, Link, Settings, Calendar, Monitor, Wallet, StickyNote, BookOpen, Timer, FileText } from 'lucide-react';
import UnifiedCalendarWidget from '../UnifiedCalendarWidget';

interface DashboardPageProps {
  navigateTo: (page: string) => void;
  user: any;
  refreshKey: number;
  calendarOpen?: boolean;
}

const ALL_TILES = [
  { id: 'planner', name: 'Planner', icon: Calendar, tokenColor: 'var(--green)' },
  { id: 'routine', name: 'Routine', icon: Clock, tokenColor: 'var(--info)' },
  { id: 'exams', name: 'Exams', icon: FileText, tokenColor: 'var(--warning)' },
  { id: 'academic-hub', name: 'Academic', icon: Monitor, tokenColor: 'var(--purple)' },
  { id: 'money', name: 'Money', icon: Wallet, tokenColor: 'var(--primary)' },
  { id: 'notes', name: 'Notes', icon: StickyNote, tokenColor: 'var(--pink)' },
  { id: 'booklist', name: 'Booklist', icon: BookOpen, tokenColor: 'var(--purple)' },
  { id: 'detox', name: 'Detox', icon: Timer, tokenColor: 'var(--info)' },
  { id: 'reports', name: 'Reports', icon: BarChart3, tokenColor: 'var(--orange)' },
];

const DashboardPage = ({ navigateTo, user, calendarOpen }: DashboardPageProps) => {
  const [quote, setQuote] = useState(getDailyQuote());
  const [quoteKey, setQuoteKey] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const { xp } = useGamification();
  const { showPrompt, showTileCustomizer } = useDialog();

  const refreshQuote = useCallback(() => {
    setSpinning(true);
    setQuoteKey(k => k + 1);
    setQuote(getRandomQuote());
    setTimeout(() => setSpinning(false), 900);
  }, []);
  const tasks = Storage.getTasks();
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const sessions = Storage.getFocusSessions();
  const totalFocusMin = sessions.reduce((a: number, s: any) => a + (s.duration || 0), 0);
  const streak = Storage.get('streak', 0);
  const enabledTileIds = Storage.getDashboardTiles();
  const enabledTiles = ALL_TILES.filter(t => enabledTileIds.includes(t.id));
  const quickLinks = Storage.getQuickLinks();

  return (
    <div className="page-enter max-w-[1200px] mx-auto">
      {/* Welcome + XP */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 truncate">Welcome back, {user?.name?.split(' ')[0] || user?.username || 'User'}</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Here's your productivity overview for this week.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card !p-2 !px-4 flex items-center gap-2 text-xs font-semibold tracking-wider">
            LEVEL {xp.level}
            <span className="text-primary font-bold">{xp.total} XP</span>
          </div>
        </div>
      </div>

      {/* Calendar — hidden by default, toggled from header date */}
      {calendarOpen && (
        <div className="mb-5 animate-[slideUp_0.2s_ease]">
          <UnifiedCalendarWidget navigateTo={navigateTo} />
        </div>
      )}

      {/* Level Progress + Daily Inspiration side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* Level Progress */}
        <div className="glass-card-accent flex items-center gap-6">
          <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center shrink-0" style={{ background: 'hsl(var(--accent-dim))', border: '2px solid hsl(var(--primary))' }}>
            <span className="text-xl font-bold text-primary">{xp.level}</span>
            <span className="text-[0.5rem] font-semibold text-muted-foreground tracking-widest">LEVEL</span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">Progress to Level {xp.level + 1}</h3>
            <p className="text-xs text-muted-foreground mb-2">{xp.total % 100} / 100 XP earned</p>
            <div className="xp-bar">
              <div className="xp-bar-fill" style={{ width: `${xp.total % 100}%` }} />
            </div>
            <div className="flex items-center gap-4 mt-2 text-[0.7rem] text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {xp.total} TOTAL XP</span>
            </div>
          </div>
        </div>

        {/* Daily Inspiration */}
        <div className="glass-card-accent relative overflow-hidden !p-6">
          {/* Silk spinning gradient border */}
          <div
            className="absolute inset-0 rounded-[inherit] animate-silk-spin opacity-20 pointer-events-none"
            style={{
              background: 'linear-gradient(270deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary) / 0.4), hsl(var(--primary)))',
              backgroundSize: '300% 300%',
            }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-primary text-[0.7rem] font-bold tracking-widest uppercase mb-2">
              <span className="text-lg">❝</span> DAILY INSPIRATION
              <button className="ml-2 p-1 hover:bg-muted rounded transition-transform" onClick={refreshQuote}>
                <RefreshCw className={`w-3.5 h-3.5 transition-transform duration-700 ${spinning ? 'animate-[spin_0.9s_ease-in-out]' : ''}`} />
              </button>
            </div>
            <div key={quoteKey} className="text-lg font-semibold leading-relaxed text-foreground animate-fade-in">"{quote.text}"</div>
            <div key={`a-${quoteKey}`} className="text-muted-foreground text-sm mt-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>— {quote.author}</div>
          </div>
          <div className="absolute right-6 top-3 text-5xl opacity-10 text-primary z-10">❞</div>
        </div>
      </div>

      {/* Quick Tiles */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-widest text-muted-foreground uppercase">
            <BarChart3 className="w-4 h-4" /> QUICK TILES
          </div>
          <button className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1" onClick={async () => {
            const result = await showTileCustomizer(ALL_TILES, Storage.getDashboardTiles());
            if (result) {
              Storage.setDashboardTiles(result);
              navigateTo('dashboard');
            }
          }}>
            <Settings className="w-3 h-3" /> CUSTOMIZE
          </button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
          {enabledTiles.map(tile => {
            const Icon = tile.icon;
            return (
              <button key={tile.id} onClick={() => navigateTo(tile.id)}
                className="glass-card !p-4 flex flex-col items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
                style={{ borderColor: `hsl(${tile.tokenColor} / 0.15)` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `hsl(${tile.tokenColor} / 0.1)`, color: `hsl(${tile.tokenColor})` }}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-foreground">{tile.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Access Links */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-widest text-muted-foreground uppercase">
            <Link className="w-4 h-4" /> QUICK ACCESS
          </div>
          <button className="btn-outline !py-1.5 !px-3 !text-xs" onClick={async () => {
            const name = await showPrompt({ title: 'Add Quick Link', message: 'Enter the link name:', placeholder: 'e.g. Google Classroom' });
            if (!name) return;
            const url = await showPrompt({ title: 'Link URL', message: 'Enter the URL (include https://):', placeholder: 'https://example.com' });
            if (!url) return;
            Storage.addQuickLink({ name, url });
            navigateTo('dashboard');
          }}>+ ADD LINK</button>
        </div>
        {quickLinks.length === 0 ? (
          <div className="glass-card !p-6 text-center"><span className="text-2xl mb-2 block">🔗</span><p className="text-muted-foreground text-sm">No quick links yet. Add your favorite resources!</p></div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {quickLinks.map((l: any) => (
              <span key={l.id} className="inline-flex items-center gap-2">
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium px-3 py-1.5 rounded-full text-primary" style={{ background: 'hsl(var(--accent-dim))' }}>
                  {l.name}
                </a>
                <button className="text-destructive text-xs" onClick={() => { Storage.removeQuickLink(l.id); navigateTo('dashboard'); }}>✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Achievements */}
      <div className="glass-card-accent">
        <h3 className="flex items-center gap-2 font-semibold text-foreground mb-3">
          <Star className="w-4 h-4" /> RECENT ACHIEVEMENTS
        </h3>
        <p className="text-sm text-muted-foreground"><span className="text-xl mr-1">🏆</span> No badges earned yet. Keep pushing!</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-5">
        {[
          { label: 'TASKS', value: completedTasks, icon: CheckSquare, color: 'hsl(var(--info))' },
          { label: 'FOCUS TIME', value: `${(totalFocusMin / 60).toFixed(1)}h`, icon: Clock, color: 'hsl(var(--primary))' },
          { label: 'STREAK', value: streak, icon: Zap, color: 'hsl(var(--pink))' },
          { label: 'DETOX', value: sessions.length, icon: BarChart3, color: 'hsl(var(--purple))' },
          { label: 'WELLNESS', value: 0, icon: Heart, color: 'hsl(var(--orange))' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-card !p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${stat.color}15`, color: stat.color }}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-[0.7rem] font-semibold tracking-widest text-muted-foreground mb-1">{stat.label}</div>
              <div className="text-xl font-bold text-foreground">{stat.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardPage;
