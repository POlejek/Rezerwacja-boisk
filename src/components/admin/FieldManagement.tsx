import { useState, type FormEvent } from 'react';
import { useFields } from '../../hooks/useFields';
import { createField, updateField, deleteField, type Field } from '../../services/field.service';

type FormState = {
  name: string;
  type: string;
  location: string;
  isActive: boolean;
  notes: string;
};

const emptyForm: FormState = {
  name: '',
  type: 'football',
  location: '',
  isActive: true,
  notes: '',
};

export default function FieldManagement() {
  const { fields, loading } = useFields();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formValid = form.name.trim().length > 0 && form.type.trim().length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    setError(null);
    try {
      if (!formValid) throw new Error('Uzupełnij nazwę i typ.');
      if (editingId) {
        await updateField(editingId, form);
        setMsg('Zaktualizowano boisko.');
      } else {
        await createField(form);
        setMsg('Dodano nowe boisko.');
      }
      setForm(emptyForm);
      setEditingId(null);
    } catch (err: any) {
      setError(err?.message || 'Błąd zapisu');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(field: Field) {
    setEditingId(field.id || null);
    setForm({
      name: field.name || '',
      type: field.type || 'football',
      location: field.location || '',
      isActive: field.isActive !== false,
      notes: field.notes || '',
    });
    setMsg(null);
    setError(null);
  }

  async function toggleActive(field: Field) {
    if (!field.id) return;
    setSubmitting(true);
    setMsg(null);
    setError(null);
    try {
      await updateField(field.id, { isActive: field.isActive === false ? true : false });
    } catch (err: any) {
      setError(err?.message || 'Błąd zmiany statusu');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(field: Field) {
    if (!field.id) return;
    const ok = window.confirm(`Usunąć boisko "${field.name}"?`);
    if (!ok) return;
    setSubmitting(true);
    setMsg(null);
    setError(null);
    try {
      await deleteField(field.id);
      setMsg('Usunięto boisko.');
    } catch (err: any) {
      setError(err?.message || 'Błąd usuwania');
    } finally {
      setSubmitting(false);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setMsg(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded p-4 shadow-sm">
        <h2 className="text-xl font-semibold mb-3">{editingId ? 'Edytuj boisko' : 'Dodaj boisko'}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Nazwa</label>
            <input
              className="w-full border rounded p-2"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Boisko A"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Typ</label>
            <select className="w-full border rounded p-2" value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}>
              <option value="football">Piłka nożna</option>
              <option value="tennis">Tenis</option>
              <option value="futsal">Futsal/Hala</option>
              <option value="grass">Trawa</option>
              <option value="artificial">Sztuczna</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Lokalizacja</label>
            <input
              className="w-full border rounded p-2"
              value={form.location}
              onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))}
              placeholder="Stadion, Hala"
            />
          </div>
          <div className="flex items-center space-x-2 mt-6">
            <input
              id="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))}
            />
            <label htmlFor="isActive" className="text-sm">
              Aktywne
            </label>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Notatki</label>
            <textarea
              className="w-full border rounded p-2"
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              placeholder="Uwagi, opis nawierzchni, wyposażenie"
            />
          </div>
          <div className="md:col-span-2 flex items-center space-x-2">
            <button
              type="submit"
              disabled={submitting || !formValid}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
            >
              {submitting ? 'Zapisywanie…' : editingId ? 'Zapisz zmiany' : 'Dodaj boisko'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="text-sm text-gray-700 underline">
                Anuluj edycję
              </button>
            )}
            {msg && <span className="text-green-700 text-sm">{msg}</span>}
            {error && <span className="text-red-600 text-sm">{error}</span>}
          </div>
        </form>
      </div>

      <div className="bg-white border rounded p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Lista boisk</h3>
        {loading ? (
          <div>Ładowanie…</div>
        ) : fields.length === 0 ? (
          <div className="text-sm text-gray-600">Brak boisk. Dodaj pierwsze powyżej.</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Nazwa</th>
                  <th className="py-2 pr-3">Typ</th>
                  <th className="py-2 pr-3">Lokalizacja</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f: Field) => (
                  <tr key={f.id} className="border-b">
                    <td className="py-2 pr-3">{f.name}</td>
                    <td className="py-2 pr-3">{f.type}</td>
                    <td className="py-2 pr-3">{f.location || '—'}</td>
                    <td className="py-2 pr-3">{f.isActive === false ? 'Nieaktywne' : 'Aktywne'}</td>
                    <td className="py-2 pr-3 space-x-2">
                      <button className="text-blue-600" onClick={() => startEdit(f)}>
                        Edytuj
                      </button>
                      <button className="text-yellow-700" onClick={() => toggleActive(f)} disabled={submitting}>
                        {f.isActive === false ? 'Aktywuj' : 'Wyłącz'}
                      </button>
                      <button className="text-red-600" onClick={() => remove(f)} disabled={submitting}>
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
