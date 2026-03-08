import { useState, useCallback, useEffect } from 'react';
import Sidebar from './Sidebar';
import UnifiedCalendarWidget from './UnifiedCalendarWidget';
import TopHeader from './TopHeader';
import { useTheme } from '@/hooks/useTheme';
import { DialogProvider } from './DialogProvider';
import InstallPrompt from './InstallPrompt';
import { GamificationProvider } from '@/hooks/useGamification';
import { runAutoBackup } from '@/lib/autoBackup';
import { useHealthReminders } from '@/hooks/useHealthReminders';
import { toast } from '@/hooks/use-toast';
import AIChatFAB from './AIChatFAB';
import DashboardPage from './pages/DashboardPage';
import PlannerPage from './pages/PlannerPage';
import RoutinePage from './pages/RoutinePage';
import ExamsPage from './pages/ExamsPage';
import AcademicHubPage from './pages/AcademicHubPage';
import MoneyPage from './pages/MoneyPage';
import NotesPage from './pages/NotesPage';
import BooklistPage from './pages/BooklistPage';
import DetoxPage from './pages/DetoxPage';
import HealthPage from './pages/HealthPage';
import ReportsPage from './pages/ReportsPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';

interface AppShellProps {
  user: any;
  onLogout: () => void;
}

const AppShell = ({ user, onLogout }: AppShellProps) => {
  const [currentPage, setCurrentPage] = useState('dashboard');
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
      }, 10000);
    }

    return () => clearTimeout(timer);
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
    setCurrentPage(page);
    if (window.innerWidth < 1024) setSidebarOpen(false);
    setRefreshKey(k => k + 1);
  }, []);

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
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8" key={refreshKey}>
              <div className="max-w-[1200px] mx-auto w-full">
                {calendarOpen && (
                  <div className="mb-5 animate-[slideUp_0.2s_ease]">
                    <UnifiedCalendarWidget navigateTo={navigateTo} />
                  </div>
                )}
                {renderPage()}
              </div>
            </div>
          </main>
        </div>
        <InstallPrompt />
      </DialogProvider>
    </GamificationProvider>
  );
};

export default AppShell;
