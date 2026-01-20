import { useState } from 'react';
import { changePassword } from '../../services/auth.service';

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Walidacja
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Wszystkie pola są wymagane');
      return;
    }

    if (newPassword.length < 6) {
      setError('Nowe hasło musi mieć co najmniej 6 znaków');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Nowe hasła nie są identyczne');
      return;
    }

    if (oldPassword === newPassword) {
      setError('Nowe hasło musi być inne niż stare');
      return;
    }

    setLoading(true);

    try {
      await changePassword(oldPassword, newPassword);
      setSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      if (err.code === 'auth/wrong-password') {
        setError('Nieprawidłowe stare hasło');
      } else if (err.code === 'auth/weak-password') {
        setError('Nowe hasło jest zbyt słabe');
      } else if (err.code === 'auth/requires-recent-login') {
        setError('Ze względów bezpieczeństwa musisz się wylogować i zalogować ponownie przed zmianą hasła');
      } else {
        setError(err.message || 'Błąd zmiany hasła');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Zmiana hasła</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stare hasło
          </label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="Wprowadź stare hasło"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nowe hasło
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="Wprowadź nowe hasło (min. 6 znaków)"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Powtórz nowe hasło
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="Wprowadź ponownie nowe hasło"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            ✅ Hasło zostało pomyślnie zmienione!
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded py-2 hover:bg-blue-700 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? 'Zmieniam hasło...' : 'Zmień hasło'}
        </button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded text-sm">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Wymagania dotyczące hasła:</h3>
        <ul className="list-disc list-inside space-y-1 text-blue-800">
          <li>Minimum 6 znaków</li>
          <li>Zalecane: użycie dużych i małych liter</li>
          <li>Zalecane: użycie cyfr i znaków specjalnych</li>
        </ul>
      </div>
    </div>
  );
}
