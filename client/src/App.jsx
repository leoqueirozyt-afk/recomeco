import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth } from './services/api';
import { backupService } from './services/backupService';
import Dashboard from './pages/Dashboard';
import People from './pages/People';
import PersonForm from './pages/PersonForm';
import Mentors from './pages/Mentors';
import Login from './pages/Login';
import Backup from './pages/Backup';
import Visitors from './pages/Visitors';
import PublicVisitorRegistration from './pages/PublicVisitorRegistration';

function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const valid = await auth.verify();
      setIsAuth(valid);
      setChecking(false);
    };
    checkAuth();
  }, []);

  if (checking) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        background: '#000' 
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #dc143c',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  return isAuth ? children : <Navigate to="/login" replace />;
}

function App() {
  const [isAuth, setIsAuth] = useState(null);
  const [backupPending, setBackupPending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setIsAuth(auth.isAuthenticated());
    checkBackupPending();
  }, []);

  const checkBackupPending = async () => {
    try {
      const now = new Date();
      const isPending = await backupService.checkPendingBackup(now.getMonth() + 1, now.getFullYear());
      setBackupPending(isPending);
    } catch (e) {
      console.log('Erro ao verificar backup:', e);
    }
  };

  const handleLogout = () => {
    const token = localStorage.getItem('recomeco_token');
    auth.logout();
    if (token) {
      localStorage.removeItem('recomeco_token');
    }
    window.location.replace('/');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  if (isAuth === null) {
    return null;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          auth.isAuthenticated() ? <Navigate to="/" replace /> : <Login />
        } />
        <Route path="/cadastro-visitante" element={<PublicVisitorRegistration />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <div className="app-container">
              <button className="hamburger-btn" onClick={toggleSidebar}>
                ☰
              </button>
              <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                  <img src="/logo.png" alt="Recomeço" className="logo-img" />
                  <button className="close-btn" onClick={closeSidebar}>✕</button>
                </div>
                <nav>
                  <ul className="nav-menu">
                    <li className="nav-item">
                      <NavLink to="/mentors" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar} end>
                        <span className="nav-icon">👑</span>
                        Líderes
                      </NavLink>
                    </li>
                    <li className="nav-item">
                      <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar} end>
                        <span className="nav-icon">📊</span>
                        Dashboard
                      </NavLink>
                    </li>
                    <li className="nav-item">
                      <NavLink to="/people" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                        <span className="nav-icon">👥</span>
                        Pessoas
                      </NavLink>
                    </li>
                    <li className="nav-item">
                      <NavLink to="/visitors" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                        <span className="nav-icon">👋</span>
                        Visitantes
                      </NavLink>
                    </li>
                    <li className="nav-item">
                      <NavLink to="/people/new" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                        <span className="nav-icon">➕</span>
                        Novo
                      </NavLink>
                    </li>
                    <li className="nav-item">
                      <NavLink to="/backup" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} ${backupPending ? 'backup-pending' : ''}`} onClick={closeSidebar}>
                        <span className="nav-icon">{backupPending ? '🔔' : '💾'}</span>
                        Backup {backupPending && '⚠️'}
                      </NavLink>
                    </li>
                    <li className="nav-item" style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                      <button onClick={handleLogout} className="nav-link" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}>
                        <span className="nav-icon">🚪</span>
                        Sair
                      </button>
                    </li>
                  </ul>
                </nav>
              </aside>
              {sidebarOpen && <div className="overlay" onClick={closeSidebar}></div>}
              <main className="main-content">
                {backupPending && (
                  <div className="backup-notification" onClick={() => window.location.href = '/backup'}>
                    🔔 Backup mensal pendente!
                  </div>
                )}
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/people" element={<People />} />
                  <Route path="/people/new" element={<PersonForm />} />
                  <Route path="/people/:id" element={<PersonForm />} />
                  <Route path="/mentors" element={<Mentors />} />
                  <Route path="/visitors" element={<Visitors />} />
                  <Route path="/backup" element={<Backup />} />
                </Routes>
              </main>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;