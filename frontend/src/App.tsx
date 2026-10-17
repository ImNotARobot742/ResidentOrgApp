import { useEffect, useState } from 'react';
import { useUser } from './context/UserContext';
import Login from './components/Login';
import PlanningCalendar from './components/PlanningCalendar';
import Clocking from './components/Clocking';
import BorrowedTools from './components/BorrowedTools';
import AdminUsers from './components/AdminUsers';
import MyAccount from './components/MyAccount';
import SetPassword from './components/SetPassword';
import './index.css';

type Tab = 'planning' | 'clocking' | 'tools' | 'accounts' | 'my-account';
const roleNames = { admin: 'Admin', artisan: 'Artisan', institut: 'Institut' };

export default function App() {
  const { currentUser, loading, logout } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>('planning');
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const savedPreference = localStorage.getItem('darkMode');
    const enabled = savedPreference === null
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : savedPreference === 'true';
    document.documentElement.classList.toggle('dark', enabled);
    return enabled;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    setActiveTab('planning');
    setNavigationOpen(false);
    setAccountMenuOpen(false);
  }, [currentUser?.id, currentUser?.role]);

  if (window.location.pathname === '/set-password') return <SetPassword />;
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p>Chargement…</p></div>;
  }
  if (!currentUser) return <Login />;

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'planning', label: 'Planning', icon: '📅' },
    ...(currentUser.role === 'admin' || currentUser.role === 'artisan'
      ? [{ id: 'clocking' as Tab, label: 'Pointage', icon: '⏰' }, { id: 'tools' as Tab, label: 'Outils', icon: '🔧' }]
      : []),
    ...(currentUser.role === 'admin' ? [{ id: 'accounts' as Tab, label: 'Comptes', icon: '♙' }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="relative z-20 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label="Ouvrir le menu des sections"
                aria-expanded={navigationOpen}
                aria-controls="section-menu"
                onClick={() => {
                  setNavigationOpen((open) => !open);
                  setAccountMenuOpen(false);
                }}
                className="flex h-11 w-11 items-center justify-center rounded border border-gray-200 text-xl text-gray-700 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                {navigationOpen ? '×' : '☰'}
              </button>
              {navigationOpen && (
                <div id="section-menu" role="menu" className="absolute left-0 top-full mt-2 w-[min(18rem,calc(100vw-2rem))] rounded border border-gray-200 bg-white p-2 shadow-lg">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="menuitem"
                      aria-current={activeTab === tab.id ? 'page' : undefined}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setNavigationOpen(false);
                      }}
                      className={`flex min-h-12 w-full items-center gap-3 rounded px-3 text-left text-sm font-medium ${activeTab === tab.id ? 'bg-blue-50 text-blue-800' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <span aria-hidden="true" className="w-6 text-center text-lg">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <h1 className="truncate text-xl font-bold sm:text-2xl">Org’atelier</h1>
          </div>
          <div className="relative">
            <button
              type="button"
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="flex min-h-11 items-center gap-2 rounded px-2 py-1 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              {currentUser.profilePicture ? (
                <img src={currentUser.profilePicture} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full font-semibold text-white" style={{ backgroundColor: currentUser.color }}>
                  {currentUser.firstName[0]}{currentUser.lastName[0]}
                </span>
              )}
              <span className="hidden max-w-40 text-left sm:block">
                <span className="block truncate text-sm font-semibold">{currentUser.name}</span>
                <span className="block text-xs text-gray-500">{roleNames[currentUser.role]}</span>
              </span>
              <span aria-hidden="true" className="text-xs text-gray-500">⌄</span>
            </button>

            {accountMenuOpen && (
              <div role="menu" className="absolute right-0 top-full mt-2 w-[min(20rem,calc(100vw-2rem))] rounded border border-gray-200 bg-white p-3 shadow-lg">
                <div className="flex items-center justify-between gap-2 px-2 pb-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold">{currentUser.email}</p>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={darkMode}
                    aria-label={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
                    onClick={() => setDarkMode((enabled) => !enabled)}
                    className="flex h-9 w-12 shrink-0 items-center justify-center rounded text-gray-700 hover:bg-gray-50"
                  >
                    <span className="relative flex h-6 w-12 shrink-0 items-center rounded-full bg-gray-200 p-0.5" aria-hidden="true">
                      <span className={`absolute inset-y-0.5 left-0.5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                      <span className="relative z-10 flex w-5 justify-center text-[10px] text-amber-500">☀</span>
                      <span className="relative z-10 flex w-5 translate-x-1 justify-center text-[10px] text-blue-700">☾</span>
                    </span>
                  </button>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActiveTab('my-account');
                    setAccountMenuOpen(false);
                  }}
                  className="min-h-11 w-full rounded px-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Mon compte
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    void logout();
                  }}
                  className="mt-2 min-h-11 w-full rounded bg-gray-900 px-3 text-left text-sm font-semibold text-white hover:bg-black"
                >
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {activeTab === 'planning' && <PlanningCalendar />}
        {activeTab === 'clocking' && <Clocking />}
        {activeTab === 'tools' && <BorrowedTools />}
        {activeTab === 'accounts' && currentUser.role === 'admin' && <AdminUsers />}
        {activeTab === 'my-account' && <MyAccount />}
      </main>
    </div>
  );
}