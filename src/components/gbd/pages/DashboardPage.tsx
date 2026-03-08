import { useState, useCallback, useEffect } from 'react';
import Storage from '@/lib/storage';
import { getDailyQuote, getRandomQuote } from '@/lib/quotes';
import { useGamification } from '@/hooks/useGamification';
import { levelProgress, levelTitle } from '@/lib/leveling';
import { useDialog } from '../DialogProvider';
import { useI18n } from '@/hooks/useI18n';
import type { TranslationKey } from '@/lib/i18n';
import { Clock, CheckSquare, BarChart3, Heart, Zap, Star, RefreshCw, Link, Settings, Calendar, Monitor, Wallet, StickyNote, BookOpen, Timer, FileText, RotateCcw, Target } from 'lucide-react';
import FocusNowOverlay, { getRankedTasks, type FocusTask } from '../FocusNowOverlay';

interface DashboardPageProps {
  navigateTo: (page: string) => void;
  user: any;
  refreshKey: number;
}

const ALL_TILES = [
  { id: 'planner', nameKey: 'tile.planner', icon: Calendar, tokenColor: 'var(--green)' },
  { id: 'routine', nameKey: 'tile.routine', icon: Clock, tokenColor: 'var(--info)' },
  { id: 'exams', nameKey: 'tile.exams', icon: FileText, tokenColor: 'var(--warning)' },
  { id: 'academic-hub', nameKey: 'tile.academic', icon: Monitor, tokenColor: 'var(--purple)' },
  { id: 'money', nameKey: 'tile.money', icon: Wallet, tokenColor: 'var(--primary)' },
  { id: 'notes', nameKey: 'tile.notes', icon: StickyNote, tokenColor: 'var(--pink)' },
  { id: 'booklist', nameKey: 'tile.booklist', icon: BookOpen, tokenColor: 'var(--purple)' },
  { id: 'detox', nameKey: 'tile.detox', icon: Timer, tokenColor: 'var(--info)' },
  { id: 'reports', nameKey: 'tile.reports', icon: BarChart3, tokenColor: 'var(--orange)' },
];

const DashboardPage = ({ navigateTo, user }: DashboardPageProps) => {
  const { t, lang } = useI18n();
  const [quote, setQuote] = useState(() => getDailyQuote());
  const [quoteKey, setQuoteKey] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [showXpBadge, setShowXpBadge] = useState(false);
  const [refreshSpinning, setRefreshSpinning] = useState(false);
  const [focusDuration, setFocusDuration] = useState<number | null>(null);
  const [focusTask, setFocusTask] = useState<ReturnType<typeof pickMostUrgentTask>>(null);
  const { xp } = useGamification();
  const { showPrompt, showTileCustomizer } = useDialog();

  // Update quote when language changes
  useEffect(() => { setQuote(getDailyQuote()); }, [lang]);

  // Compute urgent task
  const urgentTask = pickMostUrgentTask();


  const refreshQuote = useCallback(() => {
    setSpinning(true);
    setQuoteKey(k => k + 1);
    setQuote(getRandomQuote());
    setTimeout(() => setSpinning(false), 900);
  }, []);

  const refreshDashboard = useCallback(() => {
    setRefreshSpinning(true);
    navigateTo('dashboard');
    setTimeout(() => setRefreshSpinning(false), 800);
  }, [navigateTo]);

  const tasks = Storage.getTasks();
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const sessions = Storage.getFocusSessions();
  const totalFocusMin = sessions.reduce((a: number, s: any) => a + (s.duration || 0), 0);
  const streak = Storage.get('streak', 0);
  const enabledTileIds = Storage.getDashboardTiles();
  // Need to pass ALL_TILES with name property for tile customizer compatibility
  const allTilesWithName = ALL_TILES.map(tile => ({ ...tile, name: t(tile.nameKey as TranslationKey) }));
  const enabledTiles = ALL_TILES.filter(tile => enabledTileIds.includes(tile.id));
  const quickLinks = Storage.getQuickLinks();

  return (
    <div className="page-enter">
      {/* Welcome + XP + Refresh */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 truncate">{t('dash.welcome')} {user?.name?.split(' ')[0] || user?.username || 'User'}</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">{t('dash.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="glass-card !p-2 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
            onClick={refreshDashboard}
            title={t('common.refresh')}
          >
            <RotateCcw className={`w-4 h-4 text-muted-foreground transition-transform duration-700 ${refreshSpinning ? 'animate-[spin_0.8s_ease-in-out]' : ''}`} />
          </button>
          <button
            className="glass-card !p-2 !px-4 flex items-center gap-2 text-xs font-semibold tracking-wider cursor-pointer hover:scale-105 transition-transform"
            onClick={() => setShowXpBadge(prev => !prev)}
            title="Toggle XP details"
          >
            <Star className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary font-bold">{xp.total} XP</span>
          </button>
        </div>
      </div>

      {/* ─── Focus Now Hero Card ─── */}
      <div className="glass-card-accent relative overflow-hidden !p-5 mb-5 group">
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-[0.65rem] font-bold tracking-widest uppercase mb-2"
            style={{ color: 'hsl(var(--primary))' }}>
            <Target className="w-3.5 h-3.5" /> {t('focus.title' as TranslationKey)}
          </div>
          {urgentTask ? (
            <div>
              <p className="text-lg font-bold text-foreground mb-1">{urgentTask.title}</p>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[0.65rem] font-bold tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: 'hsl(var(--warning) / 0.15)', color: 'hsl(var(--warning))' }}>
                  {t('focus.most_urgent' as TranslationKey)}
                </span>
                <span className="text-xs text-muted-foreground">{urgentTask.reason}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[15, 25, 45, 60].map(min => (
                  <button key={min}
                    onClick={() => { setFocusTask(urgentTask); setFocusDuration(min); }}
                    className="px-4 py-2 rounded-full text-xs font-semibold transition-all hover:scale-105 cursor-pointer"
                    style={{
                      background: min === 25 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.1)',
                      color: min === 25 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary))',
                    }}>
                    {min} min
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="text-sm font-medium text-foreground">{t('focus.no_tasks' as TranslationKey)}</p>
                <p className="text-xs text-muted-foreground">{t('focus.subtitle' as TranslationKey)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Focus Timer Overlay */}
      {focusTask && focusDuration && (
        <FocusNowOverlay
          task={focusTask}
          duration={focusDuration}
          onClose={() => { setFocusTask(null); setFocusDuration(null); }}
          onComplete={() => { setFocusTask(null); setFocusDuration(null); navigateTo('dashboard'); }}
        />
      )}


      <div className={`grid grid-cols-1 ${showXpBadge ? 'lg:grid-cols-2' : ''} gap-4 mb-5`}>
        {showXpBadge && (
          <div className="glass-card-accent flex items-center gap-6 animate-fade-in">
            {(() => {
              const prog = levelProgress(xp.total);
              const title = levelTitle(xp.level);
              return (
                <>
                  <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center shrink-0" style={{ background: 'hsl(var(--accent-dim))', border: '2px solid hsl(var(--primary))' }}>
                    <span className="text-xl font-bold text-primary">{xp.level}</span>
                    <span className="text-[0.5rem] font-semibold text-muted-foreground tracking-widest">{t('dash.level')}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{t('dash.progress_to')} {xp.level + 1}</h3>
                      <span className="text-[0.6rem] font-bold tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">{title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{prog.current} / {prog.required} {t('dash.xp_earned')}</p>
                    <div className="xp-bar">
                      <div className="xp-bar-fill" style={{ width: `${prog.percent}%` }} />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-[0.7rem] text-muted-foreground">
                      <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {xp.total} {t('dash.total_xp')}</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {prog.required - prog.current} {t('dash.xp_to_go')}</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

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
              <span className="text-lg">❝</span> {t('dash.daily_inspiration')}
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
            <BarChart3 className="w-4 h-4" /> {t('dash.quick_tiles')}
          </div>
          <button className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1" onClick={async () => {
            const result = await showTileCustomizer(allTilesWithName, Storage.getDashboardTiles());
            if (result) {
              Storage.setDashboardTiles(result);
              navigateTo('dashboard');
            }
          }}>
            <Settings className="w-3 h-3" /> {t('common.customize')}
          </button>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
          {enabledTiles.map(tile => {
            const Icon = tile.icon;
            return (
              <button key={tile.id} onClick={() => navigateTo(tile.id)}
                className="glass-card !p-4 flex flex-col items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
                style={{ borderColor: `hsl(${tile.tokenColor} / 0.15)` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `hsl(${tile.tokenColor} / 0.1)`, color: `hsl(${tile.tokenColor})` }}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-foreground">{t(tile.nameKey as TranslationKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Access Links */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-widest text-muted-foreground uppercase">
            <Link className="w-4 h-4" /> {t('dash.quick_access')}
          </div>
          <button className="btn-outline !py-1.5 !px-3 !text-xs" onClick={async () => {
            const name = await showPrompt({ title: t('dash.add_link_title'), message: t('dash.link_name_prompt'), placeholder: 'e.g. Google Classroom' });
            if (!name) return;
            const url = await showPrompt({ title: 'Link URL', message: t('dash.link_url_prompt'), placeholder: 'https://example.com' });
            if (!url) return;
            Storage.addQuickLink({ name, url });
            navigateTo('dashboard');
          }}>{t('dash.add_link')}</button>
        </div>
        {quickLinks.length === 0 ? (
          <div className="glass-card !p-6 text-center"><span className="text-2xl mb-2 block">🔗</span><p className="text-muted-foreground text-sm">{t('dash.no_links')}</p></div>
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
          <Star className="w-4 h-4" /> {t('dash.achievements')}
        </h3>
        <p className="text-sm text-muted-foreground"><span className="text-xl mr-1">🏆</span> {t('dash.no_badges')}</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mt-5">
        {[
          { label: t('dash.tasks'), value: completedTasks, icon: CheckSquare, color: 'hsl(var(--info))' },
          { label: t('dash.focus_time'), value: `${(totalFocusMin / 60).toFixed(1)}h`, icon: Clock, color: 'hsl(var(--primary))' },
          { label: t('dash.streak'), value: streak, icon: Zap, color: 'hsl(var(--pink))' },
          { label: t('dash.detox'), value: sessions.length, icon: BarChart3, color: 'hsl(var(--purple))' },
          { label: t('dash.wellness'), value: 0, icon: Heart, color: 'hsl(var(--orange))' },
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
