import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { updateBooking } from '../../services/booking.service';
import { useFields } from '../../hooks/useFields';

 type Booking = {
  id: string;
  fieldId: string;
  trainerId: string;
  trainerName?: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
  feeEstimate?: number;
  status: string;
};

export default function TrainerBookings() {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const { fields } = useFields();

  const fieldById = useMemo(() => {
    const map: Record<string, string> = {};
    fields.forEach((f: any) => {
      map[f.id] = f.name || f.id;
    });
    return map;
  }, [fields]);

  useEffect(() => {
    const qRef = query(collection(db, 'bookings'), where('status', '==', 'pending'));
    const unsub = onSnapshot(qRef, (snap) => {
      const data = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Record<string, any>) })) as Booking[];
      // Sort by date then start time for stable display
      data.sort((a, b) => {
        if (a.date === b.date) return (a.startTime || '').localeCompare(b.startTime || '');
        return (a.date || '').localeCompare(b.date || '');
      });
      setItems(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function setStatus(id: string, status: 'approved' | 'rejected') {
    setSubmittingId(id);
    setError(null);
    try {
      await updateBooking(id, { status });
    } catch (e: any) {
      setError(e?.message || 'Błąd zapisu statusu');
    } finally {
      setSubmittingId(null);
    }
  }

  if (loading) return <div>Ładowanie rezerwacji trenerów…</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Rezerwacje trenerów do akceptacji</h2>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-gray-700">Brak rezerwacji oczekujących.</p>
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <div key={b.id} className="p-3 bg-white border rounded shadow-sm">
              <div className="font-medium">{b.trainerName || 'Trener'} — {b.date} {b.startTime}-{b.endTime}</div>
              <div className="text-sm text-gray-700">Boisko: {fieldById[b.fieldId] || b.fieldId}</div>
              {b.feeEstimate != null && <div className="text-sm text-gray-700">Szacowana opłata: {b.feeEstimate} PLN</div>}
              {b.notes && <div className="text-sm text-gray-600">Notatki: {b.notes}</div>}
              <div className="mt-2 flex gap-2">
                <button
                  className="bg-green-600 text-white rounded px-3 py-1"
                  onClick={() => setStatus(b.id, 'approved')}
                  disabled={submittingId === b.id}
                >
                  Zatwierdź
                </button>
                <button
                  className="bg-red-600 text-white rounded px-3 py-1"
                  onClick={() => setStatus(b.id, 'rejected')}
                  disabled={submittingId === b.id}
                >
                  Odrzuć
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
