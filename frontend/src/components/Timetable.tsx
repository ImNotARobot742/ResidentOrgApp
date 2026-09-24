import { useState, useEffect } from 'react';
import { Presence } from '../../../shared/types';
import { getPresence, addPresence, deletePresence } from '../api';
import { useUser } from '../context/UserContext';

const getDatesBetween = (startDate: Date, endDate: Date) => {
  const dates = [];
  const date = new Date(startDate);
  while (date <= endDate) {
    dates.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return dates;
};

const getPeriodDates = (anchorDate: Date) => {
  const startDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const endDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
  return getDatesBetween(startDate, endDate);
};

const getCalendarDates = (periodDates: Date[]) => {
  const startDate = new Date(periodDates[0]);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(periodDates[periodDates.length - 1]);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
  return getDatesBetween(startDate, endDate);
};

const shiftMonth = (date: Date, direction: number) => (
  new Date(date.getFullYear(), date.getMonth() + direction, 1)
);

type Activity = 'woodworking' | 'soldering';

const hasActivity = (activity: Presence['activity'], selectedActivity: Activity) => (
  activity?.split(',').includes(selectedActivity) ?? false
);

const toggleActivity = (activity: Presence['activity'], selectedActivity: Activity): Presence['activity'] => {
  const activities = activity?.split(',').filter(Boolean) ?? [];
  const nextActivities = activities.includes(selectedActivity)
    ? activities.filter((item) => item !== selectedActivity)
    : [...activities, selectedActivity];
  return nextActivities.length ? nextActivities.join(',') as Presence['activity'] : null;
};

export default function Timetable() {
  const { currentUser, users } = useUser();
  const timetableUsers = users.filter((user) => user.name !== 'Visiteur');
  const [presenceData, setPresenceData] = useState<Presence[]>([]);
  const [anchorDate, setAnchorDate] = useState(new Date());
  const periodDates = getPeriodDates(anchorDate);
  const calendarDates = getCalendarDates(periodDates);

  useEffect(() => {
    loadPresence();
  }, [anchorDate]);

  const loadPresence = async () => {
    try {
      const res = await getPresence();
      setPresenceData(res.data);
    } catch (err) {
      console.error('Erreur lors du chargement des présences :', err);
    }
  };

  const togglePresence = async (userId: number, date: string) => {
    if (userId !== currentUser?.id) return;
    const existingPresence = presenceData.find(
      (presence) => presence.userId === userId && presence.date === date
    );

    try {
      if (existingPresence) {
        await deletePresence(existingPresence.id);
      } else {
        await addPresence(userId, date, 'present');
      }
      loadPresence();
    } catch (err) {
      console.error('Erreur lors de la modification de la présence :', err);
    }
  };

  const savePresenceDetails = async (
    date: string,
    activity: Presence['activity'],
    note: string | null
  ) => {
    if (!currentUser) return;

    try {
      await addPresence(currentUser.id, date, 'present', activity, note?.trim() || null);
      setPresenceData((currentPresence) => {
        const existingPresence = currentPresence.find(
          (presence) => presence.userId === currentUser.id && presence.date === date
        );
        const updatedPresence: Presence = {
          id: existingPresence?.id ?? Date.now(),
          userId: currentUser.id,
          date,
          status: 'present',
          activity,
          note: note?.trim() || null,
        };

        return existingPresence
          ? currentPresence.map((presence) => presence.id === existingPresence.id ? updatedPresence : presence)
          : [...currentPresence, updatedPresence];
      });
    } catch (err) {
      console.error('Erreur lors de la sauvegarde des détails :', err);
    }
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isInPeriod = (date: Date) => periodDates.some((periodDate) => formatDate(periodDate) === formatDate(date));
  const isToday = (date: Date) => formatDate(date) === formatDate(new Date());

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
        <h2 className="text-2xl font-bold">Planning des présences</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAnchorDate(shiftMonth(anchorDate, -1))}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Mois précédent
          </button>
          <span className="order-first w-full sm:order-none sm:w-auto px-2 py-2 font-semibold sm:min-w-48 text-center capitalize">{anchorDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
          <button
            onClick={() => setAnchorDate(new Date())}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setAnchorDate(shiftMonth(anchorDate, 1))}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Mois suivant
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
              const outsidePeriod = !isInPeriod(date);
              return (
                <div
                  key={dateKey}
                  onClick={() => currentUser?.name !== 'Visiteur' && currentUser && togglePresence(currentUser.id, dateKey)}
                  onKeyDown={(event) => {
                    if (currentUser?.name !== 'Visiteur' && currentUser && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      togglePresence(currentUser.id, dateKey);
                    }
                  }}
                  role="button"
                  tabIndex={currentUser?.name === 'Visiteur' ? -1 : 0}
                  aria-label={`Indiquer votre présence le ${date.toLocaleDateString('fr-FR')}`}
                  className={`aspect-square min-h-[76px] sm:min-h-[110px] border border-gray-300 p-1 sm:p-2 ${outsidePeriod ? 'bg-gray-50 text-gray-400' : 'bg-white'} ${isToday(date) ? 'ring-2 ring-inset ring-blue-500' : ''} ${currentUser?.name === 'Visiteur' ? 'cursor-default' : 'cursor-pointer hover:bg-blue-50'}`}
                >
                  <div className={`mb-2 text-right text-sm font-semibold ${isToday(date) ? 'text-blue-600' : ''}`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {timetableUsers.map((user) => {
                      const presence = presenceData.find(
                        (entry) => entry.userId === user.id && entry.date === dateKey
                      );
                      const isPresent = Boolean(presence);
                      const canEdit = currentUser?.name !== 'Visiteur' && currentUser?.id === user.id;
                      if (canEdit) {
                        return (
                          <div
                            key={user.id}
                            className={`group/name relative flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-xs ${isPresent ? 'text-white' : 'text-gray-700'}`}
                            style={isPresent ? { backgroundColor: user.color } : undefined}
                          >
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: user.color }} />
                            <span className="hidden truncate sm:inline">{user.name}</span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                savePresenceDetails(dateKey, toggleActivity(presence?.activity ?? null, 'woodworking'), presence?.note ?? null);
                              }}
                              aria-label="Sélectionner la menuiserie"
                              aria-pressed={hasActivity(presence?.activity ?? null, 'woodworking')}
                              className={`ml-auto shrink-0 rounded-lg px-0.5 text-lg leading-none transition sm:px-1.5 sm:py-1 sm:text-2xl ${hasActivity(presence?.activity ?? null, 'woodworking') ? 'bg-yellow-300 ring-2 ring-yellow-500 shadow-sm' : 'opacity-40 grayscale group-hover/name:opacity-100'}`}
                              title="Menuiserie"
                            >
                              🪚
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                savePresenceDetails(dateKey, toggleActivity(presence?.activity ?? null, 'soldering'), presence?.note ?? null);
                              }}
                              aria-label="Sélectionner la soudure"
                              aria-pressed={hasActivity(presence?.activity ?? null, 'soldering')}
                              className={`shrink-0 rounded-lg px-0.5 text-lg leading-none transition sm:px-1.5 sm:py-1 sm:text-2xl ${hasActivity(presence?.activity ?? null, 'soldering') ? 'bg-yellow-300 ring-2 ring-yellow-500 shadow-sm' : 'opacity-40 grayscale group-hover/name:opacity-100'}`}
                              title="Soudure"
                            >
                              ⚡
                            </button>
                            <input
                              type="text"
                              defaultValue={presence?.note ?? ''}
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                              onBlur={(event) => savePresenceDetails(dateKey, presence?.activity ?? null, event.currentTarget.value)}
                              placeholder="Note..."
                              aria-label={`Note pour ${date.toLocaleDateString('fr-FR')}`}
                              className="absolute left-0 top-full z-10 mt-1 hidden w-full min-w-32 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow group-hover/name:block focus:block"
                            />
                          </div>
                        );
                      }

                      return (
                        <button
                          key={user.id}
                          disabled
                          title={`${user.name} : ${isPresent ? 'présent' : 'absent'}`}
                          className={`flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-xs ${isPresent ? 'text-white' : 'text-gray-700'}`}
                          style={isPresent ? { backgroundColor: user.color } : undefined}
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: user.color }} />
                          <span className="hidden truncate sm:inline">{user.name}</span>
                          <span
                            className={`ml-auto rounded-lg px-0.5 text-lg leading-none sm:px-1.5 sm:py-1 sm:text-2xl ${hasActivity(presence?.activity ?? null, 'woodworking') ? 'bg-yellow-300 ring-2 ring-yellow-500 shadow-sm' : 'opacity-30 grayscale'}`}
                            title="Menuiserie"
                          >
                            🪚
                          </span>
                          <span
                            className={`rounded-lg px-0.5 text-lg leading-none sm:px-1.5 sm:py-1 sm:text-2xl ${hasActivity(presence?.activity ?? null, 'soldering') ? 'bg-yellow-300 ring-2 ring-yellow-500 shadow-sm' : 'opacity-30 grayscale'}`}
                            title="Soudure"
                          >
                            ⚡
                          </span>
                        </button>
                      );
                    })}
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
