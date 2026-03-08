import { useState } from 'react';
import Storage from '@/lib/storage';
import { getDailyQuote, getRandomQuote } from '@/lib/quotes';
import { Clock, CheckSquare, BarChart3, Heart, Zap, Star, RefreshCw, Link, Settings, Calendar, Monitor, Wallet, StickyNote, BookOpen, Timer, FileText } from 'lucide-react';

interface DashboardPageProps {
  navigateTo: (page: string) => void;
  user: any;
  refreshKey: number;
}

const ALL_TILES = [
  { id: 'planner', name: 'Planner', icon: Calendar, color: '#00FF88' },
  { id: 'routine', name: 'Routine', icon: Clock, color: '#3B82F6' },
  { id: 'exams', name: 'Exams', icon: FileText, color: '#F59E0B' },
  { id: 'academic-hub', name: 'Academic', icon: Monitor, color: '#8B5CF6' },
  { id: 'money', name: 'Money', icon: Wallet, color: '#10B981' },
  { id: 'notes', name: 'Notes', icon: StickyNote, color: '#EC4899' },
  { id: 'booklist', name: 'Booklist', icon: BookOpen, color: '#A78BFA' },
  { id: 'detox', name: 'Detox', icon: Timer, color: '#06B6D4' },
  { id: 'reports', name: 'Reports', icon: BarChart3, color: '#F97316' },
];

const DashboardPage = ({ navigateTo, user }: DashboardPageProps) => {
  const [quote, setQuote] = useState(getDailyQuote());
  const xp = Storage.getXP();
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
      {/* Welcome */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Welcome back, {user?.name?.split(' ')[0] || 'User'}</h1>
          <p className="text-muted-foreground text-sm">Here's your productivity overview for this week.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card !p-2 !px-4 flex items-center gap-2 text-xs font-semibold tracking-wider">
            LEVEL {xp.level}
            <span className="text-primary font-bold">{xp.total} XP</span>
          </div>
        </div>
      </div>

      {/* Daily Inspiration */}
      <div className="glass-card-accent relative overflow-hidden mb-6 !p-7">
        <div className="flex items-center gap-2 text-primary text-[0.7rem] font-bold tracking-widest uppercase mb-3">
          <span className="text-lg">❝</span> DAILY INSPIRATION
          <button className="ml-2 p-1 hover:bg-muted rounded" onClick={() => setQuote(getRandomQuote())}>
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="text-xl font-semibold leading-relaxed max-w-[65%] text-foreground">"{quote.text}"</div>
        <div className="text-muted-foreground text-sm mt-2">— {quote.author}</div>
        <div className="absolute right-8 top-4 text-6xl opacity-10 text-primary">❞</div>
      </div>

      {/* Quick Tiles */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-widest text-muted-foreground uppercase">
            <BarChart3 className="w-4 h-4" /> QUICK TILES
          </div>
          <button className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1" onClick={() => {
            const newTiles = prompt('Enter tile IDs (comma-separated):\nAvailable: planner, routine, exams, academic-hub, money, notes, detox, reports');
            if (newTiles) {
              Storage.setDashboardTiles(newTiles.split(',').map(s => s.trim()));
              navigateTo('dashboard');
            }
          }}>
            <Settings className="w-3 h-3" /> CUSTOMIZE
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {enabledTiles.map(tile => {
            const Icon = tile.icon;
            return (
              <button key={tile.id} onClick={() => navigateTo(tile.id)}
                className="glass-card !p-4 flex flex-col items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
                style={{ borderColor: `${tile.color}22` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${tile.color}15`, color: tile.color }}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-foreground">{tile.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Access Links */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-widest text-muted-foreground uppercase">
            <Link className="w-4 h-4" /> QUICK ACCESS
          </div>
          <button className="btn-outline !py-1.5 !px-3 !text-xs" onClick={() => {
            const name = prompt('Link name:');
            if (!name) return;
            const url = prompt('URL (include https://):');
            if (!url) return;
            Storage.addQuickLink({ name, url });
            navigateTo('dashboard');
          }}>+ ADD LINK</button>
        </div>
        {quickLinks.length === 0 ? (
          <p className="text-muted-foreground text-sm">No quick links added yet.</p>
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

      {/* Level & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="glass-card-accent flex items-center gap-6">
          <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center" style={{ background: 'hsl(var(--accent-dim))', border: '2px solid hsl(var(--primary))' }}>
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
        <div className="glass-card-accent">
          <h3 className="flex items-center gap-2 font-semibold text-foreground mb-3">
            <Star className="w-4 h-4" /> RECENT ACHIEVEMENTS
          </h3>
          <p className="text-sm text-muted-foreground">No badges earned yet. Keep pushing!</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {[
          { label: 'FOCUS TIME', value: `${(totalFocusMin / 60).toFixed(1)}h`, icon: Clock, color: 'hsl(var(--primary))' },
          { label: 'TASKS', value: completedTasks, icon: CheckSquare, color: 'hsl(var(--info))' },
          { label: 'DETOX', value: sessions.length, icon: BarChart3, color: 'hsl(var(--purple))' },
          { label: 'WELLNESS', value: 0, icon: Heart, color: 'hsl(var(--orange))' },
          { label: 'STREAK', value: streak, icon: Zap, color: 'hsl(var(--pink))' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-card !p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${stat.color}15`, color: stat.color }}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-1">{stat.label}</div>
              <div className="text-xl font-bold text-foreground">{stat.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardPage;
