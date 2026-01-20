import { useState } from 'react';
import { login, loginWithGoogle } from '../../services/auth.service';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      await login(email, password);
    } catch (err: any) {
      if (err.message === 'ACCOUNT_NOT_FOUND') {
        setError('Konto nie istnieje. Skontaktuj się z administratorem.');
      } else if (err.message === 'ACCOUNT_NOT_ACTIVE') {
        setError('Twoje konto jest nieaktywne. Skontaktuj się z administratorem.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Nieprawidłowy email lub hasło');
      } else if (err.code === 'auth/user-not-found') {
        setError('Nieprawidłowy email lub hasło');
      } else {
        setError(err?.message || 'Błąd logowania');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setLoading(true);
    
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err.message === 'ACCOUNT_NOT_FOUND') {
        setError('Konto nie istnieje. Skontaktuj się z administratorem, aby utworzył Twoje konto.');
      } else if (err.message === 'ACCOUNT_NOT_ACTIVE') {
        setError('Twoje konto jest nieaktywne. Skontaktuj się z administratorem.');
      } else {
        setError(err?.message || 'Błąd logowania przez Google');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-xl font-semibold mb-4">Logowanie</h1>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="w-full border rounded p-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <input
          className="w-full border rounded p-2"
          type="password"
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button 
          className="w-full bg-blue-600 text-white rounded p-2 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? 'Logowanie...' : 'Zaloguj'}
        </button>
      </form>

      <div className="my-4 flex items-center">
        <div className="flex-1 border-t border-gray-300"></div>
        <span className="px-3 text-sm text-gray-500">lub</span>
        <div className="flex-1 border-t border-gray-300"></div>
      </div>

      <button
        onClick={handleGoogleLogin}
        className="w-full bg-white border border-gray-300 text-gray-700 rounded p-2 flex items-center justify-center hover:bg-gray-50 disabled:bg-gray-100"
        disabled={loading}
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {loading ? 'Logowanie...' : 'Zaloguj przez Google'}
      </button>

      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
        <p className="font-semibold mb-1">ℹ️ Nie możesz się zalogować?</p>
        <p>Konta są tworzone przez administratorów. Skontaktuj się z administratorem swojego klubu.</p>
      </div>
    </div>
  );
}
