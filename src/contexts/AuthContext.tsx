import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserProfile, UserProfile } from '../services/user.service';
import { Permission, hasPermission, hasAnyPermission } from '../services/permissions.service';

type AuthContextValue = {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  
  // Permission helpers
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  
  // Legacy role checks (dla kompatybilności wstecznej)
  isSuperAdmin: boolean;
  isCoordinator: boolean;
  isTrainer: boolean;
  isParent: boolean;
};

const AuthContext = createContext<AuthContextValue>({ 
  user: null, 
  userProfile: null,
  loading: true,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  isSuperAdmin: false,
  isCoordinator: false,
  isTrainer: false,
  isParent: false
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        // Pobierz profil użytkownika z Firestore
        try {
          const profile = await getUserProfile(u.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error('Błąd pobierania profilu użytkownika:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Permission helpers
  const checkPermission = (permission: Permission): boolean => {
    if (!userProfile || !userProfile.permissions) return false;
    return hasPermission(userProfile.permissions, permission);
  };

  const checkAnyPermission = (permissions: Permission[]): boolean => {
    if (!userProfile || !userProfile.permissions) return false;
    return hasAnyPermission(userProfile.permissions, permissions);
  };

  // Legacy role checks (dla kompatybilności)
  const isSuperAdmin = checkPermission('*.*');
  const isCoordinator = userProfile?.rolePreset === 'coordinator' || isSuperAdmin;
  const isTrainer = userProfile?.rolePreset === 'trainer';
  const isParent = userProfile?.rolePreset === 'parent';

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      loading,
      hasPermission: checkPermission,
      hasAnyPermission: checkAnyPermission,
      isSuperAdmin,
      isCoordinator,
      isTrainer,
      isParent
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
