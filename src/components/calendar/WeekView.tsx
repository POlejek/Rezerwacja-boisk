import { parseISO, addDays, formatISO } from 'date-fns';
import type { Booking } from '../../hooks/useBookings';

type Props = {
  weekStart: string; // YYYY-MM-DD (poniedziałek)
  bookings: Booking[];
  fieldById: Record<string, string>;
};

function toDayKey(d: Date) {
  return formatISO(d, { representation: 'date' });
}

export default function WeekView({ weekStart, bookings, fieldById }: Props) {
  if (!weekStart) return <div className="text-sm text-gray-600">Wybierz datę, aby zobaczyć tydzień.</div>;

  const startDate = parseISO(weekStart);
  const days = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));
  const dayKeys = days.map(toDayKey);

  const grouped: Record<string, Booking[]> = {};
  dayKeys.forEach((k) => {
    grouped[k] = [];
  });

  bookings.forEach((b) => {
    if (grouped[b.date]) grouped[b.date].push(b);
  });

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {days.map((d) => {
        const key = toDayKey(d);
        const items = (grouped[key] || []).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        return (
          <div key={key} className="bg-white border rounded p-3 shadow-sm">
            <div className="font-semibold mb-2">{key}</div>
            {items.length === 0 ? (
              <div className="text-sm text-gray-600">Brak rezerwacji.</div>
            ) : (
              <ul className="space-y-2">
                {items.map((b) => (
                  <li key={b.id} className="p-2 border rounded">
                    <div className="font-medium">{b.startTime}-{b.endTime} • {fieldById[b.fieldId] || b.fieldId}</div>
                    <div className="text-sm text-gray-700">{b.trainerName || 'Trener'} • Status: {b.status || '—'}</div>
                    {b.feeEstimate != null && <div className="text-xs text-gray-700">Opłata: {b.feeEstimate} PLN</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
