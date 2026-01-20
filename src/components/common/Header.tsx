import { useState } from 'react';
import { LogOut, Settings, KeyRound } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { logout } from '../../services/auth.service';
import ChangePassword from '../auth/ChangePassword';

interface HeaderProps {
  onChangePasswordClick?: () => void;
}

export default function Header({ onChangePasswordClick }: HeaderProps) {
  const { userProfile } = useAuthContext();
  const [showMenu, setShowMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  async function handleLogout() {
    await logout();
  }

  function handleChangePassword() {
    setShowMenu(false);
    if (onChangePasswordClick) {
      onChangePasswordClick();
    } else {
      setShowChangePassword(true);
    }
  }

  if (!userProfile) {
    return (
      <header className="w-full bg-white border-b p-4">
        <h1 className="text-lg font-semibold">System Rezerwacji Boisk</h1>
      </header>
    );
  }

  return (
    <>
      <header className="w-full bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">System Rezerwacji Boisk</h1>
              <p className="text-sm text-gray-600">
                Zalogowany jako: <span className="font-medium">{userProfile.name}</span>
                {userProfile.role === 'superadmin' && (
                  <span className="ml-2 text-purple-600 font-semibold">(Super Admin)</span>
                )}
                {userProfile.role === 'admin' && (
                  <span className="ml-2 text-green-600 font-semibold">(Administrator)</span>
                )}
                {userProfile.role === 'trainer' && (
                  <span className="ml-2 text-blue-600">(Trener)</span>
                )}
              </p>
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <Settings className="w-5 h-5" />
                Menu
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20">
                    {/* Zmiana hasła tylko dla użytkowników logujących się hasłem */}
                    {userProfile.authProvider === 'password' && (
                      <button
                        onClick={handleChangePassword}
                        className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-t-lg"
                      >
                        <KeyRound className="w-4 h-4" />
                        Zmień hasło
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-b-lg"
                    >
                      <LogOut className="w-4 h-4" />
                      Wyloguj
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modal zmiany hasła */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-lg max-w-md w-full">
            <button
              onClick={() => setShowChangePassword(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            <div className="p-6">
              <ChangePassword />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
