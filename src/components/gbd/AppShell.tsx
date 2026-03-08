import { useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import { DialogProvider } from './DialogProvider';
import DashboardPage from './pages/DashboardPage';
import PlannerPage from './pages/PlannerPage';
import RoutinePage from './pages/RoutinePage';
import ExamsPage from './pages/ExamsPage';
import AcademicHubPage from './pages/AcademicHubPage';
import MoneyPage from './pages/MoneyPage';
import NotesPage from './pages/NotesPage';
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

  const navigateTo = useCallback((page: string) => {
    setCurrentPage(page);
    setSidebarOpen(false);
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
      case 'detox': return <DetoxPage {...props} />;
      case 'health': return <HealthPage {...props} />;
      case 'reports': return <ReportsPage {...props} />;
      case 'profile': return <ProfilePage {...props} user={user} onLogout={onLogout} />;
      default: return <DashboardPage {...props} user={user} />;
    }
  };

  return (
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
          <TopHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} onNavigate={navigateTo} />
          <div className="flex-1 overflow-y-auto p-6" key={refreshKey}>
            {renderPage()}
          </div>
        </main>
      </div>
    </DialogProvider>
  );
};

export default AppShell;
