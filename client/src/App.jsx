import { useState } from 'react';
import SearchPage from './pages/SearchPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LoginPage from './pages/LoginPage';
import ThemeToggle from './components/ThemeToggle';
import { useTheme } from './hooks/useTheme';

const AUTH_STORAGE_KEY = 'smart-search-auth';

function getSavedSession() {
  try {
    const session = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
    return session?.token && session?.user?.email ? session : null;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export default function App() {
  const [tab, setTab] = useState('search');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [session, setSession] = useState(getSavedSession);
  const { theme, toggleTheme } = useTheme();

  function selectTab(nextTab) {
    setTab(nextTab);
    setIsLoginOpen(false);
  }

  function handleLogin(nextSession) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    setTab('search');
    setIsLoginOpen(false);
  }

  function handleLogout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setSession(null);
  }

  return (
    <div className="app-shell">
      <div className="top-bar">
        <div className="logo">
          <span className="logo-dot" />
          smartsearch
        </div>
        <div className="top-bar-right">
          <div className="nav-tabs">
            <button className={`nav-tab ${!isLoginOpen && tab === 'search' ? 'active' : ''}`} onClick={() => selectTab('search')}>Search</button>
            <button className={`nav-tab ${!isLoginOpen && tab === 'analytics' ? 'active' : ''}`} onClick={() => selectTab('analytics')}>Engineering</button>
          </div>
          {session ? (
            <div className="user-session">
              <span className="user-email" title={session.user.email}>{session.user.email}</span>
              <button type="button" className="auth-trigger" onClick={handleLogout}>Sign out</button>
            </div>
          ) : (
            <button
              type="button"
              className={`auth-trigger ${isLoginOpen ? 'active' : ''}`}
              onClick={() => setIsLoginOpen(true)}
            >
              Sign in
            </button>
          )}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </div>
      {isLoginOpen ? (
        <LoginPage onLogin={handleLogin} onBack={() => setIsLoginOpen(false)} />
      ) : (
        tab === 'search' ? <SearchPage /> : <AnalyticsPage />
      )}
    </div>
  );
}
