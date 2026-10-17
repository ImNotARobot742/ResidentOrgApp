import { useState, useEffect } from 'react';
import { Attendance } from '../../../shared/types';
import { getAttendance, addAttendance } from '../api';
import { useUser } from '../context/UserContext';
import AdminAttendance from './AdminAttendance';

const getMonthString = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthCalendarDates = (date: Date) => {
  const firstDate = new Date(date.getFullYear(), date.getMonth(), 1);
  firstDate.setDate(firstDate.getDate() - firstDate.getDay());
  const lastDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  lastDate.setDate(lastDate.getDate() + (6 - lastDate.getDay()));
  const dates: Date[] = [];
  const currentDate = new Date(firstDate);

  while (currentDate <= lastDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

export default function Clocking() {
  const { currentUser } = useUser();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthStr = getMonthString(currentDate);
  const calendarDates = getMonthCalendarDates(currentDate);

  useEffect(() => {
    if (currentUser?.role === 'artisan') loadAttendance();
  }, [currentDate, currentUser?.id]);

  const loadAttendance = async () => {
    try {
      const res = await getAttendance(currentUser?.id, monthStr);
      setAttendance(res.data);
    } catch (err) {
      console.error('Erreur lors du chargement du pointage :', err);
    }
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toggleAttendance = async (userId: number, date: string) => {
    if (currentUser?.role !== 'artisan' || userId !== currentUser.id || !date.startsWith(monthStr)) return;
    const current = attendance.find((a) => a.userId === userId && a.date === date);

    try {
      await addAttendance(userId, date, !current?.present);
      loadAttendance();
    } catch (err) {
      console.error('Erreur lors de la modification du pointage :', err);
    }
  };

  if (currentUser?.role === 'admin') return <AdminAttendance />;

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
        <h2 className="text-2xl font-bold">Mon pointage</h2>
        <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2 sm:flex">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            aria-label="Mois précédent"
            className="h-11 w-11 rounded bg-gray-200 text-xl font-semibold text-gray-700 hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            ←
          </button>
          <span className="px-1 text-center font-semibold capitalize sm:order-none sm:w-auto sm:px-4 sm:py-2">{currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            aria-label="Mois suivant"
            className="h-11 w-11 rounded bg-gray-200 text-xl font-semibold text-gray-700 hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            →
          </button>
        </div>
      </div>

      <div>
          <div className="grid grid-cols-7 bg-gray-200">
            {[
              ['Di', 'Dim'], ['Lu', 'Lun'], ['Ma', 'Mar'], ['Me', 'Mer'],
              ['Je', 'Jeu'], ['Ve', 'Ven'], ['Sa', 'Sam'],
            ].map(([shortDay, fullDay]) => (
              <div key={fullDay} className="border border-gray-300 py-2 text-center text-xs font-semibold sm:p-2 sm:text-sm">
                <span className="sm:hidden">{shortDay}</span>
                <span className="hidden sm:inline">{fullDay}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDates.map((date) => {
              const dateKey = formatDate(date);
              const outsideMonth = !dateKey.startsWith(monthStr);
              const canEdit = Boolean(currentUser) && !outsideMonth;
              const isPresent = Boolean(currentUser && attendance.some(
                (record) => record.userId === currentUser.id && record.date === dateKey && record.present
              ));
              return (
                <button
                  key={dateKey}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => currentUser && toggleAttendance(currentUser.id, dateKey)}
                  aria-pressed={isPresent}
                  aria-label={`Pointer votre présence le ${date.toLocaleDateString('fr-FR')}`}
                  className={`flex min-h-12 w-full touch-manipulation flex-col items-center justify-center gap-1 border border-gray-300 py-1 text-sm transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-600 sm:min-h-[110px] sm:items-stretch sm:justify-start sm:gap-2 sm:p-2 ${outsideMonth ? 'bg-gray-50 text-gray-400' : isPresent ? 'bg-green-100 text-green-900 hover:bg-green-200' : 'bg-white text-gray-800 hover:bg-blue-50'} ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <span className={`font-semibold ${dateKey === formatDate(new Date()) ? 'flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white' : ''} sm:self-end`}>
                    {date.getDate()}
                  </span>
                  <span className={`h-1.5 w-1.5 rounded-full sm:h-auto sm:w-auto sm:self-start sm:rounded-none sm:bg-transparent sm:text-xs sm:font-medium ${isPresent ? 'bg-green-600 sm:text-green-800' : 'bg-transparent sm:text-gray-400'}`}>
                    <span className="hidden sm:inline">{isPresent ? 'Présent' : 'Absent'}</span>
                  </span>
                </button>
              );
            })}
          </div>
      </div>
    </div>
  );
}
