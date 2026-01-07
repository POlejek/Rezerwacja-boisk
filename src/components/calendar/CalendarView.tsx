import { useBookings } from '../../hooks/useBookings';

export default function CalendarView() {
  const { bookings, loading } = useBookings();
  if (loading) return <div>Ładowanie kalendarza…</div>;
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Kalendarz</h2>
      <ul className="space-y-2">
        {bookings.map((b: any) => (
          <li key={b.id} className="p-2 bg-white rounded border">
            <div className="font-medium">{b.trainerName} — {b.date} {b.startTime}-{b.endTime}</div>
            <div className="text-sm text-gray-600">Boisko: {b.fieldId} • Status: {b.status}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
