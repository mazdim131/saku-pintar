import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'transactions', label: 'Transaksi', icon: '💳' },
  { id: 'savings', label: 'Tabungan', icon: '🎯' },
  { id: 'budgets', label: 'Anggaran', icon: '📋' },
];

export default function Sidebar({ activePage, onNavigate }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (id) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <>
      <div className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>💰</span>
          <span style={{ fontWeight: 700, fontSize: '16px' }}>SakuPintar</span>
        </div>
        <button className="hamburger" onClick={() => setMobileOpen(true)}>☰</button>
      </div>

      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}                                                                            

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-icon">💰</span>
          <span className="brand-name">SakuPintar</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => handleNavigate(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
            <div className="user-details">
              <div className="user-name">{user?.name || 'User'}</div>
              <div className="user-email">{user?.email || ''}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout} title="Keluar">↩</button>
        </div>
      </aside>
    </>
  );
}
