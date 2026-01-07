import { useEffect, useState } from 'react';
import { getGeneralSettings, updateGeneralSettings, GeneralSettings } from '../../services/settings.service';

export default function SettingsManagement() {
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getGeneralSettings().then(setSettings);
  }, []);

  function onChange(path: string, value: any) {
    setSettings((s) => {
      const copy: any = { ...(s || {}) };
      const keys = path.split('.');
      let cur = copy;
      for (let i = 0; i < keys.length - 1; i++) {
        cur[keys[i]] = cur[keys[i]] || {};
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
      return copy;
    });
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setMsg(null);
    try {
      await updateGeneralSettings(settings);
      setMsg('Zapisano ustawienia.');
    } catch (e: any) {
      setMsg(e?.message || 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Ustawienia ogólne</h2>
      {!settings ? (
        <div>Ładowanie…</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Godziny pracy — start</label>
              <input type="time" className="border rounded p-2 w-full" value={settings.workingHours?.start || ''} onChange={(e) => onChange('workingHours.start', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Godziny pracy — koniec</label>
              <input type="time" className="border rounded p-2 w-full" value={settings.workingHours?.end || ''} onChange={(e) => onChange('workingHours.end', e.target.value)} />
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Stawki godzinowe</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Trawa (PLN/h)</label>
                <input type="number" min={0} className="border rounded p-2 w-full" value={settings.fees?.perHour?.grass || ''} onChange={(e) => onChange('fees.perHour.grass', parseFloat(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm mb-1">Sztuczna (PLN/h)</label>
                <input type="number" min={0} className="border rounded p-2 w-full" value={settings.fees?.perHour?.artificial || ''} onChange={(e) => onChange('fees.perHour.artificial', parseFloat(e.target.value))} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Inne</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Min. czas rezerwacji (minuty)</label>
                <input type="number" min={0} className="border rounded p-2 w-full" value={settings.minimumBookingDuration || 0} onChange={(e) => onChange('minimumBookingDuration', parseInt(e.target.value, 10))} />
              </div>
              <div>
                <label className="block text-sm mb-1">Maks. dni z wyprzedzeniem</label>
                <input type="number" min={0} className="border rounded p-2 w-full" value={settings.advanceBookingDays || 0} onChange={(e) => onChange('advanceBookingDays', parseInt(e.target.value, 10))} />
              </div>
            </div>
          </div>

          {msg && <p className="text-sm">{msg}</p>}
          <button onClick={save} disabled={saving} className="bg-blue-600 text-white rounded px-4 py-2">
            {saving ? 'Zapisywanie…' : 'Zapisz ustawienia'}
          </button>
        </div>
      )}
    </div>
  );
}
