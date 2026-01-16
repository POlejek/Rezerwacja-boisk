import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useFields } from '../../hooks/useFields';
import { createBooking, isSlotAvailable } from '../../services/booking.service';
import { getGeneralSettings, estimateFee, isWithinWorkingHours, isWithinAdvanceDays } from '../../services/settings.service';

type FormState = {
  fieldId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  notes: string;
};

type Props = {
  initial?: Partial<FormState>;
};

export default function BookingForm({ initial }: Props) {
  const { user } = useAuth();
  const { fields } = useFields();
  const [settings, setSettings] = useState<any>(null);
  const [state, setState] = useState<FormState>({ fieldId: '', date: '', startTime: '', endTime: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    getGeneralSettings().then(setSettings).catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    if (initial) {
      setState((s) => ({
        fieldId: initial.fieldId ?? s.fieldId,
        date: initial.date ?? s.date,
        startTime: initial.startTime ?? s.startTime,
        endTime: initial.endTime ?? s.endTime,
        notes: s.notes,
      }));
    }
  }, [initial]);

  const selectedField = useMemo(() => fields.find((f: any) => f.id === state.fieldId), [fields, state.fieldId]);
  const durationMinutes = useMemo(() => {
    if (!state.startTime || !state.endTime) return 0;
    const [sh, sm] = state.startTime.split(':').map((n) => parseInt(n, 10));
    const [eh, em] = state.endTime.split(':').map((n) => parseInt(n, 10));
    return Math.max(0, eh * 60 + em - (sh * 60 + sm));
  }, [state.startTime, state.endTime]);

  const fee = useMemo(() => {
    const type = selectedField?.type || 'grass';
    const v = estimateFee(settings, type, durationMinutes);
    return v;
  }, [settings, selectedField, durationMinutes]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      if (!user) throw new Error('Musisz być zalogowany.');
      if (!state.fieldId || !state.date || !state.startTime || !state.endTime) throw new Error('Uzupełnij wszystkie pola.');
      if (durationMinutes <= 0) throw new Error('Godziny są nieprawidłowe.');
      const minDur = settings?.minimumBookingDuration || 0;
      if (minDur > 0 && durationMinutes < minDur) throw new Error(`Minimalny czas rezerwacji to ${minDur} minut.`);
      if (!isWithinWorkingHours(settings?.workingHours, state.startTime, state.endTime)) throw new Error('Godziny poza zakresem pracy obiektu.');
      if (!isWithinAdvanceDays(settings?.advanceBookingDays, state.date)) throw new Error('Termin zbyt odległy względem dopuszczalnego zakresu.');
      const ok = await isSlotAvailable(
        state.fieldId,
        state.date,
        state.startTime,
        state.endTime,
        settings?.workingHours
      );
      if (!ok) throw new Error('Termin niedostępny. Wybierz inną godzinę.');
      await createBooking({
        fieldId: state.fieldId,
        trainerId: user.uid,
        trainerName: user.email || 'trener',
        date: state.date,
        startTime: state.startTime,
        endTime: state.endTime,
        notes: state.notes,
        feeEstimate: fee ?? null,
      });
      setSuccess('Rezerwacja utworzona.');
      setState({ fieldId: '', date: '', startTime: '', endTime: '', notes: '' });
    } catch (err: any) {
      setError(err?.message || 'Błąd tworzenia rezerwacji');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg p-4 bg-white border rounded">
      <h3 className="text-lg font-semibold mb-4">Nowa rezerwacja</h3>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Boisko</label>
          <select
            className="w-full border rounded p-2"
            value={state.fieldId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setState((s: FormState) => ({ ...s, fieldId: e.target.value }))}
          >
            <option value="">Wybierz boisko</option>
            {fields.filter((f: any) => f.isActive !== false).map((f: any) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.type})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm mb-1">Data</label>
            <input
              type="date"
              className="w-full border rounded p-2"
              value={state.date}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setState((s: FormState) => ({ ...s, date: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Od</label>
            <input
              type="time"
              className="w-full border rounded p-2"
              value={state.startTime}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setState((s: FormState) => ({ ...s, startTime: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Do</label>
            <input
              type="time"
              className="w-full border rounded p-2"
              value={state.endTime}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setState((s: FormState) => ({ ...s, endTime: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Notatki</label>
          <textarea
            className="w-full border rounded p-2"
            value={state.notes}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setState((s: FormState) => ({ ...s, notes: e.target.value }))}
          />
        </div>

        <div className="text-sm text-gray-700">
          {durationMinutes > 0 && (
            <div>
              Czas: {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m
              {fee != null && <span className="ml-2">Szacowana opłata: {fee} PLN</span>}
            </div>
          )}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-700 text-sm">{success}</p>}
        <button disabled={submitting} className="bg-blue-600 text-white rounded p-2">
          {submitting ? 'Zapisywanie…' : 'Zarezerwuj'}
        </button>
      </form>
    </div>
  );
}
