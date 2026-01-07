import type { Booking } from '../../hooks/useBookings';

type Props = {
  date: string;
  bookings: Booking[];
  fieldById: Record<string, string>;
};

export default function DayView({ date, bookings, fieldById }: Props) {
  if (!date) return <div className="text-sm text-gray-600">Wybierz datę, aby zobaczyć rezerwacje.</div>;

  const items = bookings
    .filter((b) => b.date === date)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  if (items.length === 0) return <div className="text-sm text-gray-600">Brak rezerwacji w tym dniu.</div>;

  return (
    <div className="space-y-2">
      {items.map((b) => (
        <div key={b.id} className="p-3 bg-white rounded border shadow-sm">
          <div className="font-medium">{b.startTime}-{b.endTime} • {fieldById[b.fieldId] || b.fieldId}</div>
          <div className="text-sm text-gray-700">{b.trainerName || 'Trener'} • Status: {b.status || '—'}</div>
          {b.notes && <div className="text-sm text-gray-600">Notatki: {b.notes}</div>}
          {b.feeEstimate != null && <div className="text-sm text-gray-700">Opłata: {b.feeEstimate} PLN</div>}
        </div>
      ))}
    </div>
  );
}
