import { useEffect, useState } from 'react';
import { approveRentalRequest, subscribeRentalRequests, updateRentalRequestStatus } from '../../services/rentalRequest.service';

export default function PendingBookings() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeRentalRequests((items) => {
      setRequests(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function approve(req: any) {
    try {
      setError(null);
      await approveRentalRequest(req);
    } catch (e: any) {
      setError(e?.message || 'Błąd zatwierdzania');
    }
  }

  async function reject(reqId: string) {
    try {
      setError(null);
      await updateRentalRequestStatus(reqId, 'rejected');
    } catch (e: any) {
      setError(e?.message || 'Błąd odrzucania');
    }
  }

  if (loading) return <div>Ładowanie zapytań…</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Zapytania o wynajem</h2>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      {requests.length === 0 ? (
        <p>Brak nowych zapytań.</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li key={r.id} className="p-3 bg-white rounded border">
              <div className="font-medium">{r.name} — {r.email} • {r.phone}</div>
              <div className="text-sm text-gray-700">Boisko: {r.fieldId} • {r.date} {r.startTime}-{r.endTime}</div>
              {r.feeEstimate != null && (
                <div className="text-sm text-gray-700">Szacowana opłata: {r.feeEstimate} PLN</div>
              )}
              <div className="text-sm text-gray-600">Status: {r.status}</div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => approve(r)} className="bg-green-600 text-white rounded px-3 py-1">Zatwierdź jako rezerwację</button>
                <button onClick={() => reject(r.id)} className="bg-red-600 text-white rounded px-3 py-1">Odrzuć</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
