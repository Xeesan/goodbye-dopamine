import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import { useTheme } from '@/hooks/useTheme';
import { DialogProvider } from './DialogProvider';
import InstallPrompt from './InstallPrompt';
import { GamificationProvider } from '@/hooks/useGamification';
import { runAutoBackup } from '@/lib/autoBackup';
import { useHealthReminders } from '@/hooks/useHealthReminders';
import { flushQueue, getQueueLength } from '@/lib/syncQueue';
import { toast } from '@/hooks/use-toast';
import AIChatFAB from './AIChatFAB';
import DashboardPage from './pages/DashboardPage';

// Lazy-load non-dashboard pages — only downloaded when visited
const UnifiedCalendarWidget = lazy(() => import('./UnifiedCalendarWidget'));
const PlannerPage = lazy(() => import('./pages/PlannerPage'));
const RoutinePage = lazy(() => import('./pages/RoutinePage'));
const ExamsPage = lazy(() => import('./pages/ExamsPage'));
const AcademicHubPage = lazy(() => import('./pages/AcademicHubPage'));
const MoneyPage = lazy(() => import('./pages/MoneyPage'));
const NotesPage = lazy(() => import('./pages/NotesPage'));
const BooklistPage = lazy(() => import('./pages/BooklistPage'));
const DetoxPage = lazy(() => import('./pages/DetoxPage'));
const HealthPage = lazy(() => import('./pages/HealthPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));

const PageFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

interface AppShellProps {
  user: any;
  onLogout: () => void;
}

/** Map URL paths to page keys */
const pathToPage: Record<string, string> = {
  '/': 'dashboard',
  '/planner': 'planner',
  '/routine': 'routine',
  '/exams': 'exams',
  '/academic-hub': 'academic-hub',
  '/money': 'money',
  '/notes': 'notes',
  '/booklist': 'booklist',
  '/detox': 'detox',
  '/health': 'health',
  '/reports': 'reports',
  '/notifications': 'notifications',
  '/profile': 'profile',
};

const pageToPath: Record<string, string> = Object.fromEntries(
  Object.entries(pathToPage).map(([path, page]) => [page, path])
);

const AppShell = ({ user, onLogout }: AppShellProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = pathToPage[location.pathname] || 'dashboard';
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth >= 1024;
    return false;
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { restart: restartHealthReminders } = useHealthReminders();

  // Run silent auto-backup on mount (once per 24h)
  // Also show local backup reminder every 7 days
  useEffect(() => {
    const timer = setTimeout(() => { runAutoBackup().catch(() => {}); }, 5000);

    // Local backup reminder
    const REMINDER_KEY = 'gbd_backup_reminder_at';
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const lastReminder = localStorage.getItem(REMINDER_KEY);
    if (!lastReminder || Date.now() - Number(lastReminder) > SEVEN_DAYS) {
      setTimeout(() => {
        toast({
          title: '💾 Backup Reminder',
          description: 'It\'s been a while! Go to Profile → Export Data to save a local backup.',
          duration: 8000,
        });
        localStorage.setItem(REMINDER_KEY, String(Date.now()));
      }, 5 * 60 * 1000); // 5 minutes
    }

    return () => clearTimeout(timer);
  }, []);

  // Flush offline sync queue on mount and when coming back online
  useEffect(() => {
    const tryFlush = async () => {
      const pending = getQueueLength();
      if (pending > 0) {
        const processed = await flushQueue();
        if (processed > 0) {
          toast({
            title: '✅ Synced offline changes',
            description: `${processed} pending change${processed > 1 ? 's' : ''} synced to the server.`,
          });
        }
      }
    };
    tryFlush();
    window.addEventListener('online', tryFlush);
    return () => window.removeEventListener('online', tryFlush);
  }, []);

  // Sync sidebar state on resize (close on mobile, open on desktop)
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      setSidebarOpen(isDesktop);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigateTo = useCallback((page: string) => {
    const path = pageToPath[page] || '/';
    navigate(path);
    if (window.innerWidth < 1024) setSidebarOpen(false);
    setRefreshKey(k => k + 1);
  }, [navigate]);

  const renderPage = () => {
    const props = { navigateTo, refreshKey };
    switch (currentPage) {
      case 'dashboard': return <DashboardPage {...props} user={user} />;
      case 'planner': return <PlannerPage {...props} />;
      case 'routine': return <RoutinePage {...props} />;
      case 'exams': return <ExamsPage {...props} />;
      case 'academic-hub': return <AcademicHubPage {...props} />;
      case 'money': return <MoneyPage {...props} />;
      case 'notes': return <NotesPage {...props} />;
      case 'booklist': return <BooklistPage {...props} />;
      case 'detox': return <DetoxPage {...props} />;
      case 'health': return <HealthPage {...props} onRestartReminders={restartHealthReminders} />;
      case 'reports': return <ReportsPage {...props} />;
      case 'notifications': return <NotificationsPage {...props} />;
      case 'profile': return <ProfilePage {...props} user={user} onLogout={onLogout} />;
      default: return <DashboardPage {...props} user={user} />;
    }
  };

  return (
    <GamificationProvider>
      <DialogProvider>
        <div className="flex h-screen overflow-hidden">
          {sidebarOpen && (
            <div className="sidebar-overlay active" onClick={() => setSidebarOpen(false)} />
          )}
          <Sidebar
            currentPage={currentPage}
            onNavigate={navigateTo}
            user={user}
            onLogout={onLogout}
            isOpen={sidebarOpen}
          />
          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            <TopHeader
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              onNavigate={navigateTo}
              calendarOpen={calendarOpen}
              onToggleCalendar={() => setCalendarOpen(prev => !prev)}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8">
              <div className="max-w-[1200px] mx-auto w-full">
                {calendarOpen && (
                  <div className="mb-5 animate-[slideUp_0.2s_ease]">
                    <UnifiedCalendarWidget navigateTo={navigateTo} refreshKey={refreshKey} />
                  </div>
                )}
                {renderPage()}
              </div>
            </div>
          </main>
        </div>
        <InstallPrompt />
        <AIChatFAB onDataChanged={() => setRefreshKey(k => k + 1)} currentPage={currentPage} />
      </DialogProvider>
    </GamificationProvider>
  );
};

export default AppShell;
