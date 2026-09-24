import { useState, useEffect } from 'react';
import { Attendance } from '../../../shared/types';
import { getAttendance, addAttendance } from '../api';
import { useUser } from '../context/UserContext';

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
    if (currentUser) loadAttendance();
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
    if (userId !== currentUser?.id || !date.startsWith(monthStr)) return;
    const current = attendance.find((a) => a.userId === userId && a.date === date);

    try {
      await addAttendance(userId, date, !current?.present);
      loadAttendance();
    } catch (err) {
      console.error('Erreur lors de la modification du pointage :', err);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
        <h2 className="text-2xl font-bold">Mon pointage</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            ← Mois précédent
          </button>
          <span className="order-first w-full sm:order-none sm:w-auto px-4 py-2 font-semibold text-center capitalize">{currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Mois suivant →
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-0">
          <div className="grid grid-cols-7 bg-gray-200">
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
              <div key={day} className="border border-gray-300 p-2 text-center text-sm font-semibold">
                {day}
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
                <div
                  key={dateKey}
                  onClick={() => canEdit && toggleAttendance(currentUser!.id, dateKey)}
                  onKeyDown={(event) => {
                    if (canEdit && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      toggleAttendance(currentUser!.id, dateKey);
                    }
                  }}
                  role="button"
                  tabIndex={canEdit ? 0 : -1}
                  aria-pressed={isPresent}
                  aria-label={`Pointer votre présence le ${date.toLocaleDateString('fr-FR')}`}
                  className={`aspect-square min-h-[58px] sm:min-h-[110px] border border-gray-300 p-1 sm:p-2 ${outsideMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'} ${canEdit ? 'cursor-pointer hover:bg-blue-50' : 'cursor-default'}`}
                >
                  <div className={`mb-2 text-right text-sm font-semibold ${dateKey === formatDate(new Date()) ? 'text-blue-600' : ''}`}>
                    {date.getDate()}
                  </div>
                  <div className="flex justify-center pt-4">
                    <span
                      aria-hidden="true"
                      className={`flex h-6 w-6 items-center justify-center rounded border-2 text-sm font-bold sm:h-8 sm:w-8 sm:text-lg ${isPresent ? 'border-green-600 bg-green-500 text-white' : 'border-gray-300 bg-white text-transparent'}`}
                    >
                      ✓
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
