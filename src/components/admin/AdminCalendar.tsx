import { useEffect, useMemo, useState } from 'react';
import { useFields } from '../../hooks/useFields';
import { getBookingsForDates } from '../../services/booking.service';

function datesInRange(start: string, end: string): string[] {
  if (!start || !end) return [];
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const out: string[] = [];
  const cur = new Date(s);
  while (cur <= e && out.length < 31) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function toCSV(rows: any[]): string {
  const header = ['id', 'fieldId', 'trainerName', 'date', 'startTime', 'endTime', 'status'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([
      r.id,
      r.fieldId,
      r.trainerName,
      r.date,
      r.startTime,
      r.endTime,
      r.status,
    ].map((v) => (v ?? '').toString().replace(/,/g, ' ')).join(','));
  }
  return lines.join('\n');
}

export default function AdminCalendar() {
  const { fields } = useFields();
  const [fieldId, setFieldId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rangeDates = useMemo(() => datesInRange(startDate, endDate), [startDate, endDate]);
  const chunks = useMemo(() => {
    const arr: string[][] = [];
    for (let i = 0; i < rangeDates.length; i += 10) arr.push(rangeDates.slice(i, i + 10));
    return arr;
  }, [rangeDates]);
  const [page, setPage] = useState(0);

  async function search() {
    setLoading(true);
    setError(null);
    try {
      const res = await getBookingsForDates(chunks[page] || [], fieldId || undefined);
      setItems(res);
    } catch (e: any) {
      setError(e?.message || 'Błąd pobierania rezerwacji');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // opcjonalnie auto-szukaj po ustawieniu zakresu
    // if (rangeDates.length) search();
  }, [rangeDates, fieldId]);

  async function exportCSV() {
    try {
      setLoading(true);
      const all: any[] = [];
      for (const c of chunks) {
        const res = await getBookingsForDates(c, fieldId || undefined);
        all.push(...res);
      }
      const csv = toCSV(all);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rezerwacje.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Kalendarz (admin) — filtrowanie</h2>
      <div className="grid grid-cols-4 gap-2 mb-4">
        <select className="border rounded p-2" value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
          <option value="">Wszystkie boiska</option>
          {fields.map((f: any) => (
            <option key={f.id} value={f.id}>{f.name} ({f.type})</option>
          ))}
        </select>
        <input type="date" className="border rounded p-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" className="border rounded p-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={search} className="bg-blue-600 text-white rounded px-4">Szukaj</button>
          <button onClick={exportCSV} className="bg-gray-700 text-white rounded px-4">Eksport CSV</button>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <button disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="px-3 py-1 border rounded">Poprzednie</button>
        <span className="text-sm">Strona {page + 1} z {Math.max(1, chunks.length)}</span>
        <button disabled={page >= chunks.length - 1} onClick={() => setPage((p) => Math.min(chunks.length - 1, p + 1))} className="px-3 py-1 border rounded">Następne</button>
      </div>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      {loading ? (
        <div>Ładowanie…</div>
      ) : (
        <ul className="space-y-2">
          {items.map((b) => (
            <li key={b.id} className="p-2 bg-white rounded border">
              <div className="font-medium">{b.trainerName} — {b.date} {b.startTime}-{b.endTime}</div>
              <div className="text-sm text-gray-600">Boisko: {b.fieldId} • Status: {b.status}</div>
            </li>
          ))}
          {items.length === 0 && <li>Brak rezerwacji dla wybranego zakresu/boiska.</li>}
        </ul>
      )}
      <p className="text-xs text-gray-500 mt-3">Uwaga: Firestore 'in' ogranicza zapytanie do 10 dni na stronę. Użyj paginacji lub eksportu CSV dla pełnego zakresu.</p>
    </div>
  );
}
