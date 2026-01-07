import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useFields } from '../../hooks/useFields';
import { createRentalRequest } from '../../services/rentalRequest.service';
import { getGeneralSettings, estimateFee, isWithinWorkingHours } from '../../services/settings.service';

type FormState = {
  name: string;
  email: string;
  phone: string;
  fieldId: string;
  date: string;
  startTime: string;
  endTime: string;
  message: string;
};

export default function PublicRequest() {
  const { fields } = useFields();
  const [settings, setSettings] = useState<any>(null);
  const [state, setState] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    fieldId: '',
    date: '',
    startTime: '',
    endTime: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    getGeneralSettings().then(setSettings).catch(() => setSettings(null));
  }, []);

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
      if (!state.name || !state.email || !state.phone || !state.fieldId || !state.date || !state.startTime || !state.endTime) {
        throw new Error('Uzupełnij wszystkie pola.');
      }
      // Publiczny formularz: walidacja godzin względem godzin pracy (jeśli ustawione)
      if (!isWithinWorkingHours(settings?.workingHours, state.startTime, state.endTime)) {
        throw new Error('Wybrany termin poza godzinami pracy obiektu.');
      }
      const minDur = settings?.minimumBookingDuration || 0;
      if (minDur > 0) {
        const [sh, sm] = state.startTime.split(':').map((n) => parseInt(n, 10));
        const [eh, em] = state.endTime.split(':').map((n) => parseInt(n, 10));
        const dur = Math.max(0, eh * 60 + em - (sh * 60 + sm));
        if (dur < minDur) throw new Error(`Minimalny czas rezerwacji to ${minDur} minut.`);
      }
      await createRentalRequest({
        name: state.name,
        email: state.email,
        phone: state.phone,
        fieldId: state.fieldId,
        date: state.date,
        startTime: state.startTime,
        endTime: state.endTime,
        message: state.message,
        feeEstimate: fee ?? null,
      });
      setSuccess('Wysłano zapytanie o wynajem. Skontaktujemy się wkrótce.');
      setState({ name: '', email: '', phone: '', fieldId: '', date: '', startTime: '', endTime: '', message: '' });
    } catch (err: any) {
      setError(err?.message || 'Błąd wysyłania zapytania');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg p-4 bg-white border rounded mx-auto">
      <h3 className="text-lg font-semibold mb-4">Wynajem boiska (bez konta)</h3>
      <p className="text-sm text-gray-700 mb-3">
        Podaj dane kontaktowe i preferowany termin. Opłata szacunkowa zależy od czasu i rodzaju boiska.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input className="border rounded p-2" placeholder="Imię i nazwisko" value={state.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setState((s: FormState) => ({ ...s, name: e.target.value }))} />
          <input className="border rounded p-2" placeholder="Email" value={state.email} onChange={(e: ChangeEvent<HTMLInputElement>) => setState((s: FormState) => ({ ...s, email: e.target.value }))} />
          <input className="border rounded p-2 col-span-2" placeholder="Telefon" value={state.phone} onChange={(e: ChangeEvent<HTMLInputElement>) => setState((s: FormState) => ({ ...s, phone: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm mb-1">Boisko</label>
          <select className="w-full border rounded p-2" value={state.fieldId} onChange={(e: ChangeEvent<HTMLSelectElement>) => setState((s: FormState) => ({ ...s, fieldId: e.target.value }))}>
            <option value="">Wybierz boisko</option>
            {fields.filter((f: any) => f.isActive !== false).map((f: any) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.type})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className="border rounded p-2" value={state.date} onChange={(e: ChangeEvent<HTMLInputElement>) => setState((s: FormState) => ({ ...s, date: e.target.value }))} />
          <input type="time" className="border rounded p-2" value={state.startTime} onChange={(e: ChangeEvent<HTMLInputElement>) => setState((s: FormState) => ({ ...s, startTime: e.target.value }))} />
          <input type="time" className="border rounded p-2" value={state.endTime} onChange={(e: ChangeEvent<HTMLInputElement>) => setState((s: FormState) => ({ ...s, endTime: e.target.value }))} />
        </div>
        <textarea className="w-full border rounded p-2" placeholder="Wiadomość (opcjonalnie)" value={state.message} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setState((s: FormState) => ({ ...s, message: e.target.value }))} />

        {durationMinutes > 0 && (
          <div className="text-sm text-gray-700">
            Czas: {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m
            {fee != null && <span className="ml-2">Szacowana opłata: {fee} PLN</span>}
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-700 text-sm">{success}</p>}
        <button disabled={submitting} className="bg-blue-600 text-white rounded p-2">
          {submitting ? 'Wysyłanie…' : 'Wyślij zapytanie'}
        </button>
      </form>
    </div>
  );
}
