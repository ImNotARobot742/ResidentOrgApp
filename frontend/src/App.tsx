import { useEffect, useState } from 'react';
import { getUsers } from './api';
import { useUser } from './context/UserContext';
import UserPicker from './components/UserPicker';
import Timetable from './components/Timetable';
import Clocking from './components/Clocking';
import BorrowedTools from './components/BorrowedTools';
import './index.css';

type Tab = 'timetable' | 'clocking' | 'tools' | 'consumables';

export default function App() {
  const { currentUser, setCurrentUser, users, setUsers } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>('timetable');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await getUsers();
        setUsers(res.data);
      } catch (err) {
        console.error('Erreur lors du chargement des utilisateurs :', err);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Chargement...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <UserPicker users={users} onUserSelected={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <h1 className="text-2xl sm:text-3xl font-bold">🏢 Org'atelier</h1>
          <div className="flex w-full sm:w-auto items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: currentUser.color }}
              />
              <span className="max-w-[10rem] truncate font-semibold">{currentUser.name}</span>
            </div>
            <button
              onClick={() => setCurrentUser(null)}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              <span className="hidden sm:inline">Changer d'utilisateur</span>
              <span className="sm:hidden">Changer</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 sm:gap-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('timetable')}
            className={`py-4 px-2 whitespace-nowrap font-semibold border-b-4 transition ${
              activeTab === 'timetable'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📅 Planning
          </button>
          <button
            onClick={() => setActiveTab('clocking')}
            className={`py-4 px-2 whitespace-nowrap font-semibold border-b-4 transition ${
              activeTab === 'clocking'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            ⏰ Pointage
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`py-4 px-2 whitespace-nowrap font-semibold border-b-4 transition ${
              activeTab === 'tools'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🔧 Outils
          </button>
          <button
            onClick={() => setActiveTab('consumables')}
            className={`py-4 px-2 whitespace-nowrap font-semibold border-b-4 transition ${
              activeTab === 'consumables'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📦 Consommables
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'timetable' && <Timetable />}
        {activeTab === 'clocking' && <Clocking />}
        {activeTab === 'tools' && <BorrowedTools />}
        {activeTab === 'consumables' && <h2 className="text-2xl font-bold">Consommables</h2>}
      </main>
    </div>
  );
}
