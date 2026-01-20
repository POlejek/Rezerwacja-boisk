import { useState } from 'react';
import { generateRandomPassword } from '../../services/user.service';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface UserPasswordResetProps {
  userEmail: string;
  userName: string;
  onClose: () => void;
}

export default function UserPasswordReset({ userEmail, userName, onClose }: UserPasswordResetProps) {
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateAndSend() {
    setLoading(true);
    setError(null);
    
    try {
      // Wygeneruj losowe hasło
      const newPassword = generateRandomPassword(12);
      setGeneratedPassword(newPassword);
      
      // Wywołaj Cloud Function
      const functions = getFunctions();
      const resetPassword = httpsCallable(functions, 'adminResetUserPassword');
      
      const result = await resetPassword({
        targetEmail: userEmail,
        newPassword: newPassword
      });
      
      console.log('Reset hasła:', result.data);
      setSent(true);
    } catch (err: any) {
      console.error('Błąd resetowania hasła:', err);
      setError(err.message || 'Błąd resetowania hasła');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Reset hasła użytkownika</h2>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600">Użytkownik: <strong>{userName}</strong></p>
          <p className="text-sm text-gray-600">Email: <strong>{userEmail}</strong></p>
        </div>

        {!sent ? (
          <>
            <p className="text-sm text-gray-700 mb-4">
              Zostanie wygenerowane nowe losowe hasło. Zapisz je i przekaż użytkownikowi.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            {generatedPassword && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm font-semibold mb-1">Wygenerowane hasło:</p>
                <p className="font-mono text-sm break-all">{generatedPassword}</p>
                <p className="text-xs text-gray-600 mt-2">
                  ⚠️ Zapisz to hasło! Przekaż je użytkownikowi bezpiecznym kanałem.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                disabled={loading}
              >
                Anuluj
              </button>
              <button
                onClick={handleGenerateAndSend}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                disabled={loading}
              >
                {loading ? 'Resetowanie...' : 'Resetuj hasło'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800">
                ✅ Hasło zostało pomyślnie zresetowane!
              </p>
            </div>

            {generatedPassword && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm font-semibold mb-1">Nowe hasło:</p>
                <p className="font-mono text-sm break-all">{generatedPassword}</p>
                <p className="text-xs text-gray-600 mt-2">
                  Przekaż to hasło użytkownikowi {userEmail}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Zamknij
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
