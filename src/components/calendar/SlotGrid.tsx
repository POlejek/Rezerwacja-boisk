import type { Field } from '../../services/field.service';
import type { Booking } from '../../hooks/useBookings';

const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00-21:00

const palette = ['emerald', 'blue', 'indigo', 'violet', 'amber', 'teal', 'rose'];

function fieldColor(fieldId: string, index: number) {
  const pick = palette[index % palette.length];
  const colors: Record<string, { bg: string; text: string }> = {
    emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-500' },
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-500' },
    indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-500' },
    violet: { bg: 'bg-violet-500/20', text: 'text-violet-500' },
    amber: { bg: 'bg-amber-500/20', text: 'text-amber-600' },
    teal: { bg: 'bg-teal-500/20', text: 'text-teal-500' },
    rose: { bg: 'bg-rose-500/20', text: 'text-rose-500' },
  };
  return colors[pick];
}

function statusColor(status?: string) {
  switch (status) {
    case 'approved':
      return 'bg-green-500 text-white';
    case 'pending':
      return 'bg-yellow-500 text-white';
    case 'rejected':
      return 'bg-red-500 text-white';
    default:
      return 'bg-slate-500 text-white';
  }
}

type Props = {
  date: string;
  bookings: Booking[];
  fields: Field[];
};

export default function SlotGrid({ date, bookings, fields }: Props) {
  if (!date) return <div className="text-sm text-gray-600">Wybierz datę, aby zobaczyć siatkę.</div>;

  const bookingsByField: Record<string, Booking[]> = {};
  fields.forEach((f) => {
    bookingsByField[f.id || ''] = [];
  });
  bookings.forEach((b) => {
    if (b.date === date && bookingsByField[b.fieldId]) {
      bookingsByField[b.fieldId].push(b);
    }
  });

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="grid grid-cols-[100px_repeat(auto-fit,minmax(200px,1fr))] bg-slate-100 border-b border-slate-200">
          <div className="p-3 font-semibold text-slate-600">Godzina</div>
          {fields.map((f, idx) => {
            const col = fieldColor(f.id || '', idx);
            return (
              <div key={f.id} className="p-3 text-center border-l border-slate-200">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${col.bg} ${col.text}`}>
                  {f.name || f.id}
                </div>
              </div>
            );
          })}
        </div>

        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-[100px_repeat(auto-fit,minmax(200px,1fr))] border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <div className="p-3 text-slate-500 font-medium">{hour.toString().padStart(2, '0')}:00</div>
            {fields.map((f) => {
              const fieldBookings = bookingsByField[f.id || ''] || [];
              const booking = fieldBookings.find((b) => {
                const s = parseInt(b.startTime.split(':')[0], 10);
                const e = parseInt(b.endTime.split(':')[0], 10);
                return hour >= s && hour < e;
              });
              const isStart = booking ? parseInt(booking.startTime.split(':')[0], 10) === hour : false;

              return (
                <div key={f.id} className="p-2 border-l border-slate-100 relative min-h-[60px]">
                  {booking && isStart ? (
                    <div className={`${statusColor(booking.status)} rounded-lg p-3 shadow-sm h-full`}> 
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-semibold text-sm">{booking.trainerName || 'Trener'}</span>
                        <span className="text-xs opacity-90">{booking.status}</span>
                      </div>
                      <div className="text-xs opacity-90">{booking.startTime} - {booking.endTime}</div>
                      {booking.notes && <div className="text-xs opacity-80 mt-1 truncate">{booking.notes}</div>}
                    </div>
                  ) : booking ? null : (
                    <div className="w-full h-full min-h-[60px] rounded-lg border-2 border-dashed border-slate-300 bg-slate-50" />
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
