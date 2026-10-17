import { useEffect, useState } from 'react';
import { ArtisanAttendanceSummary } from '../../../shared/types';
import { exportArtisanAttendance, getArtisanAttendance } from '../api';

const getMonthString = (date: Date) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
);

export default function AdminAttendance() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [artisans, setArtisans] = useState<ArtisanAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const month = getMonthString(currentDate);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getArtisanAttendance(month)
      .then((response) => {
        if (active) setArtisans(response.data);
      })
      .catch(() => {
        if (active) setError('Impossible de charger le pointage des artisans.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [month]);

  const exportCsv = async () => {
    setExporting(true);
    setError('');
    try {
      const response = await exportArtisanAttendance(month);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `artisan-attendance-${month}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Impossible d’exporter le pointage.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold sm:text-2xl">Pointage des artisans</h2>
        <button
          type="button"
          disabled={exporting || loading}
          onClick={() => void exportCsv()}
          className="min-h-11 rounded bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {exporting ? 'Export…' : '↓ Exporter'}
        </button>
      </header>

      <div className="flex items-center justify-between gap-3 rounded border border-gray-200 bg-white p-3">
        <button
          type="button"
          aria-label="Mois précédent"
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
          className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-xl hover:bg-gray-200"
        >←</button>
        <h3 className="text-center font-semibold capitalize">
          {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          type="button"
          aria-label="Mois suivant"
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
          className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-xl hover:bg-gray-200"
        >→</button>
      </div>

      {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {loading ? (
        <p className="py-8 text-center text-sm text-gray-500">Chargement du pointage…</p>
      ) : artisans.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">Aucun compte artisan.</p>
      ) : (
        <div className="overflow-hidden rounded border border-gray-200 bg-white">
          <div className="grid grid-cols-[1fr_auto] border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase text-gray-500">
            <span>Nom et prénom</span>
            <span className="text-right">Jours complets</span>
          </div>
          <ul className="divide-y divide-gray-200">
            {artisans.map((artisan) => (
              <li key={artisan.userId} className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3">
                <span className="min-w-0 truncate font-medium">{artisan.firstName} {artisan.lastName}</span>
                <span className="min-w-12 text-right font-semibold tabular-nums">{artisan.fullDaysSpent}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}