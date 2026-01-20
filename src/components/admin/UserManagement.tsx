import { useEffect, useState } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { UserProfile } from '../../services/auth.service';
import {
  getAllUsers,
  getUsersByClub,
  toggleUserActive,
  updateUser,
  getAllClubs,
  Club
} from '../../services/user.service';
import UserPasswordReset from './UserPasswordReset';

interface NewUserForm {
  email: string;
  name: string;
  password: string;
  role: 'admin' | 'trainer';
  clubId: string;
  authProvider: 'password' | 'google';
}

export default function UserManagement() {
  const { userProfile, isSuperAdmin, isAdmin } = useAuthContext();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [resettingUser, setResettingUser] = useState<UserProfile | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>({
    email: '',
    name: '',
    password: '',
    role: 'trainer',
    clubId: '',
    authProvider: 'password'
  });

  useEffect(() => {
    loadUsers();
    loadClubs();
  }, [userProfile]);

  useEffect(() => {
    // Ustaw domyślny klub dla admina
    if (isAdmin && userProfile?.clubId && !newUser.clubId) {
      setNewUser(prev => ({ ...prev, clubId: userProfile.clubId! }));
    }
  }, [isAdmin, userProfile, newUser.clubId]);

  async function loadUsers() {
    if (!userProfile) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let loadedUsers: UserProfile[];
      
      if (isSuperAdmin) {
        loadedUsers = await getAllUsers();
      } else if (userProfile.clubId) {
        loadedUsers = await getUsersByClub(userProfile.clubId);
      } else {
        setError('Brak przypisanego klubu');
        return;
      }
      
      setUsers(loadedUsers);
    } catch (err: any) {
      setError(err.message || 'Błąd wczytywania użytkowników');
    } finally {
      setLoading(false);
    }
  }

  async function loadClubs() {
    if (!isSuperAdmin) return;
    
    try {
      const loadedClubs = await getAllClubs();
      setClubs(loadedClubs);
    } catch (err) {
      console.error('Błąd wczytywania klubów:', err);
    }
  }

  function generateRandomPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  function handleOpenCreateModal() {
    setNewUser({
      email: '',
      name: '',
      password: generateRandomPassword(),
      role: 'trainer',
      clubId: isAdmin && userProfile?.clubId ? userProfile.clubId : '',
      authProvider: 'password'
    });
    setShowCreateModal(true);
  }

  function getFirestoreJsonForUser() {
    return JSON.stringify({
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      clubId: newUser.clubId || null,
      active: true,
      authProvider: newUser.authProvider,
      createdAt: new Date().toISOString(),
      createdBy: userProfile?.uid || 'manual'
    }, null, 2);
  }

  async function handleToggleActive(user: UserProfile) {
    if (!userProfile) return;
    
    if (!confirm(`Czy na pewno chcesz ${user.active ? 'dezaktywować' : 'aktywować'} użytkownika ${user.name}?`)) {
      return;
    }
    
    try {
      await toggleUserActive(userProfile.uid, user.uid);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Błąd zmiany statusu użytkownika');
    }
  }

  async function handleSaveEdit() {
    if (!userProfile || !editingUser) return;
    
    // Walidacja - admin musi mieć przypisany klub
    if (editingUser.role === 'admin' && !editingUser.clubId) {
      alert('Administrator musi być przypisany do klubu');
      return;
    }
    
    try {
      await updateUser(userProfile.uid, editingUser.uid, {
        name: editingUser.name,
        role: editingUser.role,
        clubId: editingUser.clubId
      });
      
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Błąd aktualizacji użytkownika');
    }
  }

  function getClubName(clubId: string | null): string {
    if (!clubId) return 'Brak klubu';
    const club = clubs.find(c => c.id === clubId);
    return club ? club.name : clubId;
  }

  function getRoleLabel(role: string): string {
    switch (role) {
      case 'superadmin': return 'Super Admin';
      case 'admin': return 'Administrator';
      case 'trainer': return 'Trener';
      default: return role;
    }
  }

  if (loading) {
    return <div className="p-6">Wczytywanie...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Błąd: {error}</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Zarządzanie użytkownikami</h1>
        <div className="flex gap-3">
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            + Dodaj użytkownika
          </button>
          <button
            onClick={loadUsers}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Odśwież
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Imię i nazwisko
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Rola
              </th>
              {isSuperAdmin && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Klub
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Logowanie
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Akcje
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.uid}>
                <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRoleLabel(user.role)}
                </td>
                {isSuperAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getClubName(user.clubId)}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.authProvider === 'google' ? '🔐 Google' : '🔑 Hasło'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      user.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.active ? 'Aktywny' : 'Nieaktywny'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => setEditingUser(user)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Edytuj
                  </button>
                  {user.authProvider === 'password' && (
                    <button
                      onClick={() => setResettingUser(user)}
                      className="text-purple-600 hover:text-purple-900 mr-3"
                    >
                      Reset hasła
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleActive(user)}
                    className="text-orange-600 hover:text-orange-900"
                  >
                    {user.active ? 'Dezaktywuj' : 'Aktywuj'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            Brak użytkowników do wyświetlenia
          </div>
        )}
      </div>

      {/* Modal edycji */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edycja użytkownika</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imię i nazwisko
                </label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (tylko odczyt)
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rola
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      role: e.target.value as 'admin' | 'trainer'
                    })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  disabled={!isSuperAdmin && editingUser.role === 'superadmin'}
                >
                  {isSuperAdmin && (
                    <option value="superadmin">Super Admin</option>
                  )}
                  <option value="admin">Administrator</option>
                  <option value="trainer">Trener</option>
                </select>
              </div>

              {isSuperAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Klub {editingUser.role === 'admin' && <span className="text-red-600">*</span>}
                  </label>
                  <select
                    value={editingUser.clubId || ''}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        clubId: e.target.value || null
                      })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">Brak klubu</option>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>
                        {club.name}
                      </option>
                    ))}
                  </select>
                  {editingUser.role === 'admin' && !editingUser.clubId && (
                    <p className="text-xs text-red-600 mt-1">
                      Administrator musi być przypisany do klubu
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Anuluj
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal resetu hasła */}
      {resettingUser && (
        <UserPasswordReset
          userEmail={resettingUser.email}
          userName={resettingUser.name}
          onClose={() => setResettingUser(null)}
        />
      )}

      {/* Modal tworzenia użytkownika */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Instrukcja dodawania użytkownika</h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              <p className="text-sm text-yellow-800">
                ⚠️ Cloud Functions nie są włączone. Wykonaj poniższe kroki ręcznie w konsoli Firebase.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="uzytkownik@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imię i nazwisko *
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Jan Kowalski"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sposób logowania
                </label>
                <select
                  value={newUser.authProvider}
                  onChange={(e) => setNewUser({ 
                    ...newUser, 
                    authProvider: e.target.value as 'password' | 'google' 
                  })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="password">🔑 Hasło</option>
                  <option value="google">🔐 Google</option>
                </select>
              </div>

              {newUser.authProvider === 'password' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hasło tymczasowe *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="flex-1 border border-gray-300 rounded px-3 py-2 font-mono text-sm"
                    />
                    <button
                      onClick={() => setNewUser({ ...newUser, password: generateRandomPassword() })}
                      className="px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                      Losuj
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Użytkownik będzie mógł zmienić hasło po zalogowaniu
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rola
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ 
                    ...newUser, 
                    role: e.target.value as 'admin' | 'trainer' 
                  })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  disabled={isAdmin}
                >
                  {isSuperAdmin && <option value="admin">Administrator</option>}
                  <option value="trainer">Trener</option>
                </select>
                {isAdmin && (
                  <p className="text-xs text-gray-500 mt-1">
                    Jako administrator klubu możesz tworzyć tylko trenerów
                  </p>
                )}
              </div>

              {isSuperAdmin ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Klub {newUser.role === 'admin' && '*'}
                  </label>
                  <select
                    value={newUser.clubId}
                    onChange={(e) => setNewUser({ ...newUser, clubId: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required={newUser.role === 'admin'}
                  >
                    <option value="">Wybierz klub</option>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>
                        {club.name}
                      </option>
                    ))}
                  </select>
                  {newUser.role === 'admin' && (
                    <p className="text-xs text-red-600 mt-1">
                      Administrator musi być przypisany do klubu
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Klub
                  </label>
                  <input
                    type="text"
                    value={clubs.find(c => c.id === newUser.clubId)?.name || 'Twój klub'}
                    disabled
                    className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Użytkownik zostanie przypisany do Twojego klubu
                  </p>
                </div>
              )}
            </div>

            {/* Instrukcje krok po kroku */}
            {newUser.email && newUser.name && (
              <div className="mt-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <h3 className="font-bold text-blue-900 mb-3">📋 Instrukcja krok po kroku:</h3>
                  
                  <div className="space-y-4">
                    {/* Krok 1 */}
                    <div>
                      <p className="font-semibold text-gray-800 mb-2">1️⃣ Utwórz konto w Firebase Authentication:</p>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-4">
                        <li>Otwórz <a href="https://console.firebase.google.com/project/rezerwacja-boisk/authentication/users" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Firebase Authentication</a></li>
                        <li>Kliknij "Add user"</li>
                        <li>Email: <code className="bg-gray-200 px-2 py-1 rounded text-xs">{newUser.email}</code></li>
                        {newUser.authProvider === 'password' && (
                          <li>Password: <code className="bg-gray-200 px-2 py-1 rounded text-xs font-mono">{newUser.password}</code></li>
                        )}
                        <li>Kliknij "Add user"</li>
                        <li><strong>Skopiuj UID nowo utworzonego użytkownika</strong> (np. "abc123xyz...")</li>
                      </ul>
                    </div>

                    {/* Krok 2 */}
                    <div>
                      <p className="font-semibold text-gray-800 mb-2">2️⃣ Utwórz dokument w Firestore:</p>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-4">
                        <li>Otwórz <a href="https://console.firebase.google.com/project/rezerwacja-boisk/firestore/data" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Firestore Database</a></li>
                        <li>Wybierz kolekcję <code className="bg-gray-200 px-2 py-1 rounded text-xs">users</code></li>
                        <li>Kliknij "Add document"</li>
                        <li>Document ID: <strong>wklej skopiowany UID z kroku 1</strong></li>
                        <li>Skopiuj i wklej poniższe dane:</li>
                      </ul>
                      
                      <div className="mt-2 bg-gray-800 text-gray-100 p-3 rounded text-xs font-mono overflow-x-auto">
                        <pre>{getFirestoreJsonForUser()}</pre>
                      </div>
                      
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(getFirestoreJsonForUser());
                          alert('JSON skopiowany do schowka!');
                        }}
                        className="mt-2 text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        📋 Kopiuj JSON
                      </button>
                    </div>

                    {/* Krok 3 */}
                    {newUser.authProvider === 'password' && (
                      <div>
                        <p className="font-semibold text-gray-800 mb-2">3️⃣ Przekaż dane użytkownikowi:</p>
                        <div className="bg-green-50 border border-green-200 rounded p-3">
                          <p className="text-sm text-gray-700 mb-2">Wyślij te dane użytkownikowi:</p>
                          <div className="bg-white p-2 rounded border text-sm">
                            <p><strong>Email:</strong> {newUser.email}</p>
                            <p><strong>Hasło tymczasowe:</strong> <code className="bg-gray-200 px-2 py-1 rounded font-mono">{newUser.password}</code></p>
                            <p className="text-xs text-gray-600 mt-2">Użytkownik może zmienić hasło po zalogowaniu w sekcji Ustawienia.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Informacja o dodawaniu użytkowników */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-4">
        <h3 className="font-semibold text-blue-900 mb-2">
          ℹ️ Informacja o tworzeniu użytkowników
        </h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li>Kliknij "Dodaj użytkownika" aby wyświetlić instrukcję tworzenia konta</li>
          <li>Postępuj zgodnie z instrukcjami krok po kroku</li>
          <li>Musisz ręcznie utworzyć konto w Firebase Authentication i dokument w Firestore</li>
          <li>Zapisz wygenerowane hasło tymczasowe i przekaż użytkownikowi</li>
          {isAdmin && <li>Jako administrator klubu możesz tworzyć tylko trenerów w swoim klubie</li>}
        </ul>
      </div>
    </div>
  );
}
