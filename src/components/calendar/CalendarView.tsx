import { useMemo, useState } from 'react';
import { useBookings } from '../../hooks/useBookings';
import { useFields } from '../../hooks/useFields';
import DayView from './DayView';
import WeekView from './WeekView';

type ViewMode = 'list' | 'day' | 'week';
const STATUS_OPTIONS = ['pending', 'approved', 'rejected', 'cancelled'];

export default function CalendarView() {
  const { bookings, loading } = useBookings();
  const { fields } = useFields();
  const [view, setView] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string[]>(['pending', 'approved']);

  const fieldById = useMemo(() => {
    const map: Record<string, string> = {};
    fields.forEach((f: any) => {
      map[f.id] = f.name || f.id;
    });
    return map;
  }, [fields]);

  const filtered = useMemo(() => {
    if (!statusFilter.length) return bookings;
    return bookings.filter((b: any) => statusFilter.includes(b.status || ''));
  }, [bookings, statusFilter]);

  function toggleStatus(status: string) {
    setStatusFilter((prev) => {
      if (prev.includes(status)) return prev.filter((s) => s !== status);
      return [...prev, status];
    });
  }

  const weekStart = useMemo(() => {
    if (!selectedDate) return '';
    const d = new Date(selectedDate);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day); // Monday as start
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    return monday.toISOString().slice(0, 10);
  }, [selectedDate]);

  if (loading) return <div>Ładowanie kalendarza…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div>
          <h2 className="text-xl font-semibold">Kalendarz</h2>
          <p className="text-sm text-gray-600">Przełącz widok i filtruj po statusie.</p>
        </div>
        <div className="flex gap-2 flex-wrap md:ml-auto">
          <button className={`px-3 py-1 rounded border ${view === 'list' ? 'bg-blue-600 text-white' : ''}`} onClick={() => setView('list')}>
            Lista
          </button>
          <button className={`px-3 py-1 rounded border ${view === 'day' ? 'bg-blue-600 text-white' : ''}`} onClick={() => setView('day')}>
            Dzień
          </button>
          <button className={`px-3 py-1 rounded border ${view === 'week' ? 'bg-blue-600 text-white' : ''}`} onClick={() => setView('week')}>
            Tydzień
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-start">
        <div>
          <label className="block text-sm mb-1">Data odniesienia</label>
          <input type="date" className="border rounded p-2" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <label key={s} className="flex items-center gap-1 text-sm border rounded px-2 py-1">
              <input type="checkbox" checked={statusFilter.includes(s)} onChange={() => toggleStatus(s)} />
              {s}
            </label>
          ))}
        </div>
      </div>

      {view === 'list' && (
        <ul className="space-y-2">
          {filtered
            .slice()
            .sort((a: any, b: any) => (a.date === b.date ? (a.startTime || '').localeCompare(b.startTime || '') : (a.date || '').localeCompare(b.date || '')))
            .map((b: any) => (
              <li key={b.id} className="p-2 bg-white rounded border">
                <div className="font-medium">{b.trainerName || 'Trener'} — {b.date} {b.startTime}-{b.endTime}</div>
                <div className="text-sm text-gray-600">Boisko: {fieldById[b.fieldId] || b.fieldId} • Status: {b.status}</div>
              </li>
            ))}
        </ul>
      )}

      {view === 'day' && <DayView date={selectedDate} bookings={filtered} fieldById={fieldById} />}
      {view === 'week' && <WeekView weekStart={weekStart || selectedDate} bookings={filtered} fieldById={fieldById} />}
    </div>
  );
}
