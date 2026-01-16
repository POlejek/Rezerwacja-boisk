import { parseISO, addDays, formatISO, format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Booking } from '../../hooks/useBookings';

type Props = {
  weekStart: string; // YYYY-MM-DD (poniedziałek)
  bookings: Booking[];
  fieldById: Record<string, string>;
  selectedFieldId?: string;
  onEmptySlotClick?: (payload: { date: string; startTime: string; endTime: string }) => void;
};

function toDayKey(d: Date) {
  return formatISO(d, { representation: 'date' });
}

const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00-21:00

export default function WeekView({ weekStart, bookings, fieldById, selectedFieldId, onEmptySlotClick }: Props) {
  if (!weekStart) return <div className="text-sm text-gray-600">Wybierz datę, aby zobaczyć tydzień.</div>;

  const startDate = parseISO(weekStart);
  const days = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));
  const dayKeys = days.map(toDayKey);

  const bookingsByDay: Record<string, Booking[]> = {};
  dayKeys.forEach((k) => {
    bookingsByDay[k] = [];
  });

  bookings
    .filter((b) => (selectedFieldId ? b.fieldId === selectedFieldId : true))
    .forEach((b) => {
      if (bookingsByDay[b.date]) bookingsByDay[b.date].push(b);
    });

  function getStatusColor(status?: string) {
    switch (status) {
      case 'approved':
        return 'bg-green-500 text-white';
      case 'pending':
        return 'bg-yellow-500 text-white';
      case 'rejected':
        return 'bg-red-500 text-white';
      default:
        return 'bg-slate-400 text-white';
    }
  }

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
      <div className="min-w-[1200px]">
        {/* Header: Days of week */}
        <div className="grid grid-cols-[100px_repeat(7,1fr)] bg-slate-100 border-b border-slate-200 sticky top-0">
          <div className="p-3 font-semibold text-slate-600">Godzina</div>
          {days.map((d) => {
            const key = toDayKey(d);
            return (
              <div key={key} className="p-3 text-center border-l border-slate-200">
                <div className="font-semibold text-slate-700">{format(d, 'EEE', { locale: pl })}</div>
                <div className="text-sm text-slate-600">{format(d, 'd MMM', { locale: pl })}</div>
              </div>
            );
          })}
        </div>

        {/* Time rows */}
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <div className="p-3 text-center text-slate-500 font-medium text-sm">{hour.toString().padStart(2, '0')}:00</div>
            {days.map((d) => {
              const dayKey = toDayKey(d);
              const dayBookings = bookingsByDay[dayKey] || [];
              const bookingInSlot = dayBookings.find((b) => {
                const s = parseInt(b.startTime.split(':')[0], 10);
                const e = parseInt(b.endTime.split(':')[0], 10);
                return hour >= s && hour < e;
              });
              const isStartHour = bookingInSlot ? parseInt(bookingInSlot.startTime.split(':')[0], 10) === hour : false;

              return (
                <div
                  key={dayKey}
                  className="p-2 border-l border-slate-100 min-h-[80px] bg-slate-50"
                >
                  {bookingInSlot && isStartHour ? (
                    <div className={`${getStatusColor(bookingInSlot.status)} rounded-lg p-2 h-full text-xs shadow-sm`}>
                      <div className="font-semibold truncate">{bookingInSlot.trainerName || 'Trener'}</div>
                      <div className="opacity-90 truncate">{fieldById[bookingInSlot.fieldId] || bookingInSlot.fieldId}</div>
                      <div className="opacity-90 truncate">{bookingInSlot.startTime}–{bookingInSlot.endTime}</div>
                      {bookingInSlot.notes && <div className="opacity-75 truncate mt-1">{bookingInSlot.notes}</div>}
                      {bookingInSlot.feeEstimate != null && <div className="opacity-75 text-xs">{bookingInSlot.feeEstimate} PLN</div>}
                    </div>
                  ) : bookingInSlot ? null : (
                    <button
                      type="button"
                      className="w-full h-full rounded-lg border border-dashed border-slate-300 hover:bg-slate-100 transition-colors"
                      onClick={() => {
                        if (!onEmptySlotClick) return;
                        const startTime = `${hour.toString().padStart(2, '0')}:00`;
                        const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
                        onEmptySlotClick({ date: dayKey, startTime, endTime });
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
