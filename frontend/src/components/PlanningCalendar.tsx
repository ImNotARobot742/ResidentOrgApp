import { useEffect, useState } from 'react';
import type {
  PlanningDay,
  PlanningPeriod,
  PlanningRegistration,
  PlanningSpace,
} from '../../../shared/types';
import {
  addPlanningRegistration,
  deletePlanningRegistration,
  getPlanning,
  updatePlanningNote,
} from '../api';
import { useUser } from '../context/UserContext';

const periods: { value: PlanningPeriod; label: string; shortLabel: string }[] = [
  { value: 'morning', label: 'Matin', shortLabel: 'M' },
  { value: 'afternoon', label: 'Après-midi', shortLabel: 'A' },
];
const spaces: { value: PlanningSpace; label: string; icon: string }[] = [
  { value: 'wood', label: 'Bois', icon: '🪵' },
  { value: 'metal', label: 'Métal', icon: '⚡' },
];

const getMonthString = (date: Date) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
);
const formatDate = (date: Date) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);
const createEmptyDay = (date: string): PlanningDay => ({
  date,
  morning: { wood: [], metal: [] },
  afternoon: { wood: [], metal: [] },
});

const getCalendarDates = (month: Date) => {
  const firstDate = new Date(month.getFullYear(), month.getMonth(), 1);
  firstDate.setDate(firstDate.getDate() - ((firstDate.getDay() + 6) % 7));
  const lastDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const sundayOffset = (6 - ((lastDate.getDay() + 6) % 7) + 7) % 7;
  lastDate.setDate(lastDate.getDate() + sundayOffset);

  const dates: Date[] = [];
  const currentDate = new Date(firstDate);
  while (currentDate <= lastDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

const getErrorMessage = (error: unknown) => {
  const response = (error as { response?: { data?: { error?: string } } }).response;
  return response?.data?.error ?? 'Impossible d’enregistrer cette modification.';
};

function SpaceOccupancyIcon({
  registrations,
  space,
  date,
  period,
}: {
  registrations: PlanningRegistration[];
  space: PlanningSpace;
  date: string;
  period: PlanningPeriod;
}) {
  const gradientId = `occupancy-${date}-${period}-${space}`;
  const people = registrations.flatMap((registration) => (
    Array.from({ length: registration.peopleCount }, (_, index) => ({
      id: `${registration.id}-${index}`,
      color: registration.color,
    }))
  )).slice(0, 3);
  const iconPath = space === 'wood'
    ? 'M6 4.5h12a3.5 3.5 0 0 1 0 7H6a3.5 3.5 0 0 1 0-7Zm0 8h12a3.5 3.5 0 0 1 0 7H6a3.5 3.5 0 0 1 0-7Z'
    : 'M13.5 2.5 6 13h5l-.5 8.5L18 11h-5l.5-8.5Z';

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0 sm:h-5 sm:w-5"
      role="img"
      aria-label={`${space === 'wood' ? 'Bois' : 'Métal'} : ${people.length} personne${people.length === 1 ? '' : 's'} sur 3, ${period === 'morning' ? 'matin' : 'après-midi'}`}
    >
      {people.length > 0 && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
            {people.flatMap((person, index) => [
              <stop key={`${person.id}-start`} offset={`${(index / 3) * 100}%`} stopColor={person.color} />,
              <stop key={`${person.id}-end`} offset={`${((index + 1) / 3) * 100}%`} stopColor={person.color} />,
            ])}
            <stop offset={`${(people.length / 3) * 100}%`} stopColor="#F3F4F6" />
            <stop offset="100%" stopColor="#F3F4F6" />
          </linearGradient>
        </defs>
      )}
      <path
        d={iconPath}
        fill={people.length ? `url(#${gradientId})` : '#F3F4F6'}
        stroke={people.length ? '#475569' : '#9CA3AF'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {space === 'wood' && (
        <path d="M7 8h4m3 8h4" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
      )}
    </svg>
  );
}

export default function PlanningCalendar() {
  const { currentUser } = useUser();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [planningDays, setPlanningDays] = useState<PlanningDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PlanningPeriod>('morning');
  const [selectedSpace, setSelectedSpace] = useState<PlanningSpace>('wood');
  const [editingRegistrationId, setEditingRegistrationId] = useState<number | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [peopleDrafts, setPeopleDrafts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const monthString = getMonthString(anchorDate);
  const calendarDates = getCalendarDates(anchorDate);
  const canRegister = Boolean(currentUser);
  const canReserveForGroup = currentUser?.role === 'institut' || currentUser?.role === 'admin';

  const loadPlanning = async () => {
    const response = await getPlanning(monthString);
    setPlanningDays(response.data);
  };

  useEffect(() => {
    const refresh = async () => {
      try {
        await loadPlanning();
        setNotice('');
      } catch (error) {
        console.error('Erreur lors du chargement du planning :', error);
        setNotice('Impossible de charger le planning.');
      }
    };
    void refresh();
  }, [monthString]);

  useEffect(() => {
    if (!selectedDate) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedDate(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedDate]);

  const getDay = (date: string) => (
    planningDays.find((planningDay) => planningDay.date === date) ?? createEmptyDay(date)
  );
  const getSlotKey = (date: string, period: PlanningPeriod, space: PlanningSpace) => (
    `${date}-${period}-${space}`
  );

  const selectedDay = selectedDate ? getDay(selectedDate) : null;
  const selectedRegistrations = selectedDay?.[selectedPeriod][selectedSpace] ?? [];
  const ownRegistration = selectedRegistrations.find((registration) => registration.userId === currentUser?.id);
  const selectedRegistration = currentUser?.role === 'admin'
    ? selectedRegistrations.find((registration) => registration.id === editingRegistrationId) ?? ownRegistration
    : ownRegistration;
  const selectedSlotKey = selectedDate ? getSlotKey(selectedDate, selectedPeriod, selectedSpace) : '';
  const noteKey = `${selectedSlotKey}-${selectedRegistration?.id ?? 'new'}`;
  const selectedOccupiedCount = selectedRegistrations.reduce((sum, item) => sum + item.peopleCount, 0);
  const noteValue = noteDrafts[noteKey] ?? selectedRegistration?.note ?? '';

  const selectSlot = (
    period: PlanningPeriod,
    space: PlanningSpace,
    registrationId: number | null = null
  ) => {
    setSelectedPeriod(period);
    setSelectedSpace(space);
    setEditingRegistrationId(registrationId);
  };

  const register = async () => {
    if (!currentUser || !selectedDate) return;
    setSaving(true);
    setNotice('');
    try {
      await addPlanningRegistration(
        selectedDate,
        selectedPeriod,
        selectedSpace,
        noteDrafts[noteKey] ?? '',
        peopleDrafts[selectedSlotKey] ?? 1
      );
      setNoteDrafts((drafts) => ({ ...drafts, [noteKey]: '' }));
      setPeopleDrafts((drafts) => ({ ...drafts, [selectedSlotKey]: 1 }));
      await loadPlanning();
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const saveNote = async (registration: PlanningRegistration) => {
    if (!currentUser || !selectedDate) return;
    setSaving(true);
    setNotice('');
    try {
      await updatePlanningNote(registration.id, noteDrafts[noteKey] ?? registration.note ?? '');
      await loadPlanning();
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const withdraw = async (registration: PlanningRegistration) => {
    if (!currentUser) return;
    setSaving(true);
    setNotice('');
    try {
      await deletePlanningRegistration(registration.id);
      await loadPlanning();
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const selectedDayLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    : '';

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold sm:text-2xl">Planning des espaces</h2>
        <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => setAnchorDate(new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 1, 1))}
            aria-label="Mois précédent"
            className="h-11 w-11 rounded bg-gray-200 text-xl font-semibold text-gray-700 hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >←</button>
          <span className="px-1 text-center font-semibold capitalize sm:min-w-48 sm:px-4">
            {anchorDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
          <button
            type="button"
            onClick={() => setAnchorDate(new Date())}
            className="hidden h-11 rounded bg-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-300 sm:block"
          >Aujourd’hui</button>
          <button
            type="button"
            onClick={() => setAnchorDate(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1))}
            aria-label="Mois suivant"
            className="h-11 w-11 rounded bg-gray-200 text-xl font-semibold text-gray-700 hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >→</button>
        </div>
      </div>

      {notice && !selectedDate && (
        <p role="status" className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{notice}</p>
      )}
      <div className="grid grid-cols-7 bg-gray-200">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((weekday) => (
          <div key={weekday} className="border border-gray-300 py-2 text-center text-xs font-semibold sm:p-2 sm:text-sm">
            <span className="sm:hidden">{weekday.slice(0, 2)}</span>
            <span className="hidden sm:inline">{weekday}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {calendarDates.map((date) => {
          const dateKey = formatDate(date);
          const day = getDay(dateKey);
          const outsideMonth = !dateKey.startsWith(monthString);
          const today = dateKey === formatDate(new Date());
          const accessibleSummary = periods.map(({ value, label }) => (
            `${label}: bois ${day[value].wood.reduce((sum, item) => sum + item.peopleCount, 0)}/3, métal ${day[value].metal.reduce((sum, item) => sum + item.peopleCount, 0)}/3`
          )).join('; ');

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => {
                if (outsideMonth) setAnchorDate(new Date(date.getFullYear(), date.getMonth(), 1));
                setSelectedDate(dateKey);
                setSelectedPeriod('morning');
                setSelectedSpace('wood');
                setEditingRegistrationId(null);
                setNotice('');
              }}
              aria-label={`${date.toLocaleDateString('fr-FR')}. ${accessibleSummary}`}
              className={`flex min-h-[76px] flex-col items-stretch border border-gray-300 p-1 text-left transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-600 sm:min-h-[116px] sm:p-2 ${outsideMonth ? 'bg-gray-50 text-gray-400 hover:bg-gray-100' : 'bg-white text-gray-800 hover:bg-blue-50'} ${today ? 'ring-2 ring-inset ring-blue-500' : ''}`}
            >
              <span className={`flex h-6 w-6 items-center justify-center self-end text-xs font-semibold sm:text-sm ${today ? 'rounded-full bg-blue-600 text-white' : ''}`}>
                {date.getDate()}
              </span>
              <span className="mt-1 flex flex-1 flex-col justify-center gap-1 sm:mt-2 sm:gap-2">
                {periods.map(({ value, label, shortLabel }) => (
                  <span key={value} className="flex items-center justify-between gap-0.5 sm:justify-start sm:gap-2">
                    <span className="hidden w-14 text-[11px] text-gray-500 sm:inline">{label}</span>
                    <span className="w-2 text-[8px] font-semibold text-gray-500 sm:hidden">{shortLabel}</span>
                    {spaces.map(({ value: space }) => (
                      <SpaceOccupancyIcon
                        key={space}
                        date={dateKey}
                        period={value}
                        space={space}
                        registrations={day[value][space].slice(0, 3)}
                      />
                    ))}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {selectedDate && selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedDate(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="planning-dialog-title"
            className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-xl bg-white shadow-xl sm:rounded-lg"
          >
            <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Planning du jour</p>
                <h3 id="planning-dialog-title" className="mt-1 text-lg font-bold capitalize sm:text-xl">{selectedDayLabel}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                aria-label="Fermer"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-gray-100 text-2xl text-gray-700 hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              >×</button>
            </header>

            <div className="overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
              {notice && <p role="status" className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{notice}</p>}
              {!canRegister && <p className="mb-3 text-sm text-gray-600">Consultation uniquement.</p>}
              <section aria-label="Occupation du jour" className="mb-5">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {periods.flatMap(({ value: period, label: periodLabel }) => spaces.map(({ value: space, label: spaceLabel, icon }) => {
                    const registrations = selectedDay[period][space];
                    const occupied = registrations.reduce((sum, registration) => sum + registration.peopleCount, 0);
                    const selected = selectedPeriod === period && selectedSpace === space;
                    return (
                      <section key={`${period}-${space}`} className={`min-w-0 rounded border p-2 ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                        <button type="button" onClick={() => selectSlot(period, space)} className="flex min-h-10 w-full items-center justify-between gap-1 text-left">
                          <span className="truncate text-xs font-semibold sm:text-sm">{periodLabel} · <span aria-hidden="true">{icon}</span> {spaceLabel}</span>
                          <span className="shrink-0 text-xs font-semibold text-gray-500">{occupied}/3</span>
                        </button>
                        {registrations.length ? (
                          <ul className="mt-1 space-y-1">
                            {registrations.map((registration) => (
                              <li key={registration.id}>
                                {currentUser?.role === 'admin' ? (
                                  <button type="button" onClick={() => selectSlot(period, space, registration.id)} className="flex w-full items-center gap-1 truncate text-left text-xs hover:underline">
                                    <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: registration.color }} />
                                    <span className="truncate">{registration.userName}{registration.peopleCount > 1 ? ` ×${registration.peopleCount}` : ''}</span>
                                  </button>
                                ) : (
                                  <span className="flex items-center gap-1 truncate text-xs">
                                    <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: registration.color }} />
                                    <span className="truncate">{registration.userName}{registration.peopleCount > 1 ? ` ×${registration.peopleCount}` : ''}</span>
                                  </span>
                                )}
                                {registration.note && <p className="truncate pl-3 text-[11px] text-gray-500">{registration.note}</p>}
                              </li>
                            ))}
                          </ul>
                        ) : <p className="mt-1 text-[11px] text-gray-500">Libre</p>}
                      </section>
                    );
                  }))}
                </div>
              </section>

              {canRegister && (
                <section className="border-t border-gray-200 pt-4">
                  <h4 className="mb-3 font-semibold">{selectedRegistration ? `Inscription · ${selectedRegistration.userName}` : 'Nouvelle inscription'}</h4>

                  {currentUser?.role === 'admin' && selectedRegistrations.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2" aria-label="Choisir une inscription à modifier">
                      {selectedRegistrations.map((registration) => (
                        <button
                          key={registration.id}
                          type="button"
                          aria-pressed={selectedRegistration?.id === registration.id}
                          onClick={() => setEditingRegistrationId(registration.id)}
                          className={`min-h-9 rounded border px-2 text-xs font-medium ${selectedRegistration?.id === registration.id ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-300 text-gray-700'}`}
                        >
                          {registration.userName}
                        </button>
                      ))}
                    </div>
                  )}

                  <div role="group" aria-label="Choisir un créneau" className="grid grid-cols-2 gap-2">
                    {periods.flatMap(({ value: period, label: periodLabel }) => spaces.map(({ value: space, label: spaceLabel, icon }) => {
                      const selected = selectedPeriod === period && selectedSpace === space;
                      return (
                        <button
                          key={`${period}-${space}`}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => selectSlot(period, space)}
                          className={`min-h-11 rounded border px-2 text-sm font-semibold ${selected ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        >
                          {periodLabel} · <span aria-hidden="true">{icon}</span> {spaceLabel}
                        </button>
                      );
                    }))}
                  </div>

                  {selectedRegistration?.peopleCount && selectedRegistration.peopleCount > 1 && (
                    <p className="mt-3 text-xs text-gray-600">Réservation de groupe · {selectedRegistration.peopleCount} personnes</p>
                  )}
                  {!selectedRegistration && canReserveForGroup && selectedOccupiedCount < 3 && (
                    <label className={`mt-3 block text-sm font-medium ${currentUser?.role === 'institut' ? 'rounded bg-blue-50 p-3 text-blue-900' : 'text-gray-700'}`}>
                      {currentUser?.role === 'institut' ? 'Réservation de groupe · nombre de personnes' : 'Nombre de personnes'}
                      <select
                        value={peopleDrafts[selectedSlotKey] ?? 1}
                        onChange={(event) => {
                          const count = Number(event.currentTarget.value);
                          setPeopleDrafts((drafts) => ({ ...drafts, [selectedSlotKey]: count }));
                        }}
                        className="mt-1 min-h-11 w-full rounded border border-gray-300 bg-white px-3"
                      >
                        {Array.from({ length: 3 - selectedOccupiedCount }, (_, index) => index + 1).map((count) => (
                          <option key={count} value={count}>{count} personne{count > 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="mt-3 block text-sm font-medium text-gray-700">
                    Commentaire pour cette réservation
                    <textarea
                      rows={2}
                      maxLength={300}
                      value={noteValue}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setNoteDrafts((drafts) => ({ ...drafts, [noteKey]: value }));
                      }}
                      placeholder="Commentaire facultatif"
                      className="mt-1 w-full resize-y rounded border border-gray-300 p-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </label>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    {selectedRegistration ? (
                      <>
                        <button type="button" disabled={saving} onClick={() => void saveNote(selectedRegistration)} className="min-h-11 flex-1 rounded bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">Enregistrer le commentaire</button>
                        <button type="button" disabled={saving} onClick={() => void withdraw(selectedRegistration)} className="min-h-11 rounded border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50">Se désinscrire</button>
                      </>
                    ) : selectedOccupiedCount >= 3 ? (
                      <p className="py-2 text-sm font-medium text-gray-600">Espace complet pour cette demi-journée.</p>
                    ) : (
                      <button type="button" disabled={saving} onClick={() => void register()} className="min-h-11 w-full rounded bg-green-700 px-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50">
                        {currentUser?.role === 'institut' ? 'Réserver pour le groupe' : 'M’inscrire'}
                      </button>
                    )}
                  </div>
                </section>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
