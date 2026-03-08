import { useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import { useTheme } from '@/hooks/useTheme';
import { DialogProvider } from './DialogProvider';
import InstallPrompt from './InstallPrompt';
import { GamificationProvider } from '@/hooks/useGamification';
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

interface AppShellProps {
  user: any;
  onLogout: () => void;
}

const AppShell = ({ user, onLogout }: AppShellProps) => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const navigateTo = useCallback((page: string) => {
    setCurrentPage(page);
    setSidebarOpen(false);
    setRefreshKey(k => k + 1);
  }, []);

  const renderPage = () => {
    const props = { navigateTo, refreshKey };
    switch (currentPage) {
      case 'dashboard': return <DashboardPage {...props} user={user} calendarOpen={calendarOpen} />;
      case 'planner': return <PlannerPage {...props} />;
      case 'routine': return <RoutinePage {...props} />;
      case 'exams': return <ExamsPage {...props} />;
      case 'academic-hub': return <AcademicHubPage {...props} />;
      case 'money': return <MoneyPage {...props} />;
      case 'notes': return <NotesPage {...props} />;
      case 'booklist': return <BooklistPage {...props} />;
      case 'detox': return <DetoxPage {...props} />;
      case 'health': return <HealthPage {...props} />;
      case 'reports': return <ReportsPage {...props} />;
      case 'profile': return <ProfilePage {...props} user={user} onLogout={onLogout} />;
      default: return <DashboardPage {...props} user={user} calendarOpen={calendarOpen} />;
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
          <main className="flex-1 flex flex-col overflow-hidden">
            <TopHeader
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              onNavigate={navigateTo}
              calendarOpen={calendarOpen}
              onToggleCalendar={() => setCalendarOpen(prev => !prev)}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
            <div className="flex-1 overflow-y-auto p-3 sm:p-6" key={refreshKey}>
              {renderPage()}
            </div>
          </main>
        </div>
        <InstallPrompt />
      </DialogProvider>
    </GamificationProvider>
  );
};

export default AppShell;
