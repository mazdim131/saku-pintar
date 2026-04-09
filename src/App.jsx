import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Savings from './pages/Savings';
import Budgets from './pages/Budgets';
import './App.css';

function AppContent() {
  const { user } = useAuth();
  const [page, setPage] = useState('dashboard');

  if (!user) return <AuthPage />;

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={setPage} />;
      case 'transactions': return <Transactions />;
      case 'savings': return <Savings />;
      case 'budgets': return <Budgets />;
      default: return <Dashboard onNavigate={setPage} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activePage={page} onNavigate={setPage} />
      <main className="app-main">
        {renderPage()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
