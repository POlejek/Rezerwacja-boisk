import { useMemo, useState } from 'react';
import { useBookings } from '../../hooks/useBookings';
import { useFields } from '../../hooks/useFields';
import WeekView from './WeekView';
import BookingForm from '../booking/BookingForm';

const STATUS_OPTIONS = ['pending', 'approved', 'rejected', 'cancelled'];

export default function CalendarView() {
  const { bookings, loading } = useBookings();
  const { fields } = useFields();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string[]>(['pending', 'approved']);
  const [showBookingForm, setShowBookingForm] = useState(false);

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
          <h2 className="text-xl font-semibold">Kalendarz Tygodnia</h2>
          <p className="text-sm text-gray-600">Wybierz datę i filtruj po statusie rezerwacji.</p>
        </div>
        <div className="flex gap-2 flex-wrap md:ml-auto">
          <button className="px-3 py-1 rounded border bg-green-600 text-white" onClick={() => setShowBookingForm((v) => !v)}>
            {showBookingForm ? 'Zamknij formularz' : 'Nowa rezerwacja'}
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

      <WeekView weekStart={weekStart || selectedDate} bookings={filtered} fieldById={fieldById} />

      {showBookingForm && (
        <div className="bg-white border rounded p-4 shadow-sm">
          <BookingForm />
        </div>
      )}
    </div>
  );
}
