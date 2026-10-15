import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { TopBar } from './components/layout/TopBar.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { OnboardingPage } from './pages/OnboardingPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { InventoryPage } from './pages/InventoryPage.tsx';
import { DestinationsPage } from './pages/DestinationsPage.tsx';
import { DistributionPage } from './pages/DistributionPage.tsx';
import { DiscountsPage } from './pages/DiscountsPage.tsx';
import { ReportsPage } from './pages/ReportsPage.tsx';
import { SimulationPage } from './pages/SimulationPage.tsx';
import { TestSuitePage } from './pages/TestSuitePage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';

function MainRouter() {
  const { user, company, isAuthenticated, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const path = window.location.pathname;
    return path === '/' ? '/dashboard' : path;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Sync with browser navigation
  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      setCurrentPath(p === '/' ? '/dashboard' : p);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    setCurrentPath(path);
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSelect = (type: 'batch' | 'destination', _id: string) => {
    if (type === 'batch') {
      navigate('/inventory');
    } else {
      navigate('/destinations');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F0E6] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-[#243D2B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="font-heading font-bold text-sm text-[#243D2B]">Initializing AgroRoute Engine...</div>
        </div>
      </div>
    );
  }

  // Unauthenticated flow
  if (!isAuthenticated) {
    if (currentPath === '/signup') {
      return <AuthPage initialMode="signup" onSuccess={() => navigate('/onboarding')} />;
    }
    return <AuthPage initialMode="login" onSuccess={() => navigate('/dashboard')} />;
  }

  // Onboarding flow
  if (company && !company.onboardingCompleted && currentPath !== '/onboarding') {
    return <OnboardingPage onComplete={() => navigate('/dashboard')} />;
  }

  if (currentPath === '/onboarding') {
    return <OnboardingPage onComplete={() => navigate('/dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAF7] text-[#202820]">
      {/* Fixed Sidebar */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={navigate}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Fixed Top Bar */}
      <TopBar
        currentPath={currentPath}
        isCollapsed={isSidebarCollapsed}
        onRefreshData={() => setRefreshKey(k => k + 1)}
        onSearchSelect={handleSearchSelect}
      />

      {/* Main Viewport Content */}
      <main
        className={`pt-20 pb-12 px-6 lg:px-8 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <div className="max-w-7xl mx-auto" key={refreshKey}>
          {currentPath === '/dashboard' && <DashboardPage onNavigate={navigate} />}
          {currentPath === '/inventory' && <InventoryPage />}
          {currentPath === '/destinations' && <DestinationsPage />}
          {currentPath === '/distribution' && <DistributionPage />}
          {currentPath === '/discounts' && <DiscountsPage />}
          {currentPath === '/reports' && <ReportsPage />}
          {currentPath === '/simulation' && <SimulationPage />}
          {currentPath === '/tests' && <TestSuitePage />}
          {currentPath === '/settings' && <SettingsPage />}
          {currentPath === '/login' && <DashboardPage onNavigate={navigate} />}
          {currentPath === '/signup' && <DashboardPage onNavigate={navigate} />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}
