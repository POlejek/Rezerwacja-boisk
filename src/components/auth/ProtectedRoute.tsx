import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { Permission } from '../../services/permissions.service';

type Props = {
  children: React.ReactNode;
  requirePermission?: Permission;
  requireAnyPermission?: Permission[];
  requireAdmin?: boolean; // Legacy (deprecated)
  requireSuperAdmin?: boolean; // Legacy (deprecated)
};

export default function ProtectedRoute({ 
  children, 
  requirePermission,
  requireAnyPermission,
  requireAdmin, 
  requireSuperAdmin 
}: Props) {
  const { user, userProfile, loading, hasPermission, hasAnyPermission: checkAnyPermission, isSuperAdmin, isCoordinator } = useAuthContext();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie...</p>
        </div>
      </div>
    );
  }

  // Nie zalogowany - przekieruj do logowania
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Konto nieaktywne
  if (userProfile && !userProfile.isActive) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold text-red-600 mb-4">Konto nieaktywne</h2>
          <p className="text-gray-600">
            Twoje konto jest nieaktywne. Skontaktuj się z administratorem, aby je aktywować.
          </p>
        </div>
      </div>
    );
  }

  // Sprawdź permission-based access
  if (requirePermission && !hasPermission(requirePermission)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold text-red-600 mb-4">Brak dostępu</h2>
          <p className="text-gray-600">
            Nie masz uprawnień do tej strony.
            <br />
            <span className="text-sm text-gray-500">Wymagane: {requirePermission}</span>
          </p>
        </div>
      </div>
    );
  }

  if (requireAnyPermission && !checkAnyPermission(requireAnyPermission)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold text-red-600 mb-4">Brak dostępu</h2>
          <p className="text-gray-600">
            Nie masz uprawnień do tej strony.
            <br />
            <span className="text-sm text-gray-500">
              Wymagane jedno z: {requireAnyPermission.join(', ')}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // Legacy: Wymaga super admina
  if (requireSuperAdmin && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold text-red-600 mb-4">Brak dostępu</h2>
          <p className="text-gray-600">
            Ta strona jest dostępna tylko dla super administratorów.
          </p>
        </div>
      </div>
    );
  }

  // Legacy: Wymaga admina (super admin lub coordinator)
  if (requireAdmin && !isCoordinator && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold text-red-600 mb-4">Brak dostępu</h2>
          <p className="text-gray-600">
            Ta strona jest dostępna tylko dla administratorów.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
