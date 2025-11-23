import { useState, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MyScoringPage = lazy(() => import('./pages/MyScoringPage'));
const ProgramsPage = lazy(() => import('./pages/ProgramsPage'));
const PanitiaPage = lazy(() => import('./pages/PanitiaPage'));
const BulkPanitiaPage = lazy(() => import('./pages/BulkPanitiaPage'));
const WorkloadPage = lazy(() => import('./pages/WorkloadPage'));
const MembersPage = lazy(() => import('./pages/MembersPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProgramAssignmentsPage = lazy(() => import('./pages/ProgramAssignmentsPage'));

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'my-scoring':
        return <MyScoringPage />;
      case 'programs':
        return <ProgramsPage />;
      case 'panitia':
        return <PanitiaPage />;
      case 'bulk-panitia':
        return <BulkPanitiaPage />;
      case 'workload':
        return <WorkloadPage />;
      case 'members':
        return <MembersPage />;
      case 'assignments':
        return <ProgramAssignmentsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      }>
        {renderPage()}
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
