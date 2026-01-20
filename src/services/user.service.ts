import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './auth.service';
import { 
  Permission, 
  RolePreset, 
  ROLE_PRESETS,
  hasPermission,
  getUserPermissions,
  getUserContext,
  hasContextualAccess
} from './permissions.service';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Generowanie losowego hasła
export function generateRandomPassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// ============================================================================
// USER PROFILE FUNCTIONS
// ============================================================================

// Pobranie profilu użytkownika
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) {
    return null;
  }
  return { uid, ...userDoc.data() } as UserProfile;
}

// Pobranie wszystkich użytkowników klubu (dla admina klubu)
export async function getUsersByClub(clubId: string): Promise<UserProfile[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'users.read')) {
    throw new Error('No permission to read users');
  }
  
  // SuperAdmin może widzieć wszystkich, inni tylko swój klub
  const context = await getUserContext(currentUser.uid);
  if (!hasPermission(permissions, '*.*')) {
    if (context.clubId !== clubId) {
      throw new Error('Can only view users from your club');
    }
  }
  
  const q = query(collection(db, 'users'), where('clubId', '==', clubId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
}

// Pobranie wszystkich użytkowników (dla superadmina)
export async function getAllUsers(): Promise<UserProfile[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'users.read')) {
    throw new Error('No permission to read users');
  }
  
  const snapshot = await getDocs(collection(db, 'users'));
  const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
  
  // Jeśli nie jest superadmin, filtruj po clubId
  if (!hasPermission(permissions, '*.*')) {
    const context = await getUserContext(currentUser.uid);
    if (context.clubId) {
      return users.filter(u => u.clubId === context.clubId);
    }
  }
  
  return users;
}

// ============================================================================
// USER CREATION & MANAGEMENT
// ============================================================================

/**
 * Utworzenie użytkownika przez admina
 * WAŻNE: To tylko tworzy dokument w Firestore. 
 * Konto w Firebase Authentication musisz utworzyć ręcznie w konsoli Firebase!
 */
export async function createUserByAdmin(
  email: string,
  name: string,
  rolePreset: RolePreset,
  clubId: string | null,
  authProvider: 'password' | 'google.com',
  additionalPermissions: Permission[] = []
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'users.write')) {
    throw new Error('No permission to create users');
  }
  
  // Jeśli to coordinator, sprawdź czy tworzy użytkownika w swoim klubie
  if (!hasPermission(permissions, '*.*')) {
    const context = await getUserContext(currentUser.uid);
    if (clubId !== context.clubId) {
      throw new Error('Can only create users in your club');
    }
    
    // Coordinator nie może tworzyć superadminów
    if (rolePreset === 'superadmin') {
      throw new Error('Cannot create superadmin users');
    }
    
    // Sprawdź czy coordinator próbuje nadać uprawnienia których sam nie ma
    const basePermissions = ROLE_PRESETS[rolePreset];
    const allPermissions = [...basePermissions, ...additionalPermissions];
    for (const perm of allPermissions) {
      if (!hasPermission(permissions, perm)) {
        throw new Error(`Cannot grant permission you don't have: ${perm}`);
      }
    }
  }
  
  // Utwórz dokument "oczekującego" użytkownika
  const pendingUserId = `pending_${Date.now()}_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
  
  const userData = {
    email,
    name,
    rolePreset,
    permissions: [...ROLE_PRESETS[rolePreset], ...additionalPermissions],
    clubId: clubId || null,
    teamIds: [],
    playerIds: [],
    isActive: true,
    authProvider,
    createdAt: serverTimestamp(),
    createdBy: currentUser.uid,
    pending: true // Oznaczenie, że czeka na utworzenie konta w Authentication
  };
  
  await setDoc(doc(db, 'pendingUsers', pendingUserId), userData);
}

/**
 * Aktualizacja użytkownika
 */
export async function updateUser(
  targetUid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'users.write')) {
    throw new Error('No permission to update users');
  }
  
  const targetProfile = await getUserProfile(targetUid);
  if (!targetProfile) {
    throw new Error('User not found');
  }
  
  // Sprawdź context - coordinator może edytować tylko użytkowników swojego klubu
  if (!hasPermission(permissions, '*.*')) {
    const context = await getUserContext(currentUser.uid);
    if (targetProfile.clubId !== context.clubId) {
      throw new Error('Can only update users in your club');
    }
    
    // Nie pozwól coordinatorowi nadawać uprawnień których sam nie ma
    if (updates.permissions) {
      for (const perm of updates.permissions) {
        if (!hasPermission(permissions, perm)) {
          throw new Error(`Cannot grant permission you don't have: ${perm}`);
        }
      }
    }
    
    // Nie pozwól coordinatorowi zmieniać rolePreset na superadmin
    if (updates.rolePreset === 'superadmin') {
      throw new Error('Cannot grant superadmin role');
    }
  }
  
  await updateDoc(doc(db, 'users', targetUid), {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

/**
 * Aktywacja/dezaktywacja użytkownika
 */
export async function toggleUserActive(targetUid: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  const targetProfile = await getUserProfile(targetUid);
  if (!targetProfile) {
    throw new Error('User not found');
  }
  
  await updateUser(targetUid, {
    isActive: !targetProfile.isActive
  });
}

/**
 * Usunięcie użytkownika (soft delete - dezaktywacja)
 */
export async function deleteUser(targetUid: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'users.delete')) {
    throw new Error('No permission to delete users');
  }
  
  await updateUser(targetUid, {
    isActive: false
  });
}

// ============================================================================
// CLUB MANAGEMENT
// ============================================================================

export interface Club {
  id: string;
  name: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: any;
}

export async function getAllClubs(): Promise<Club[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'clubs.read')) {
    throw new Error('No permission to read clubs');
  }
  
  const snapshot = await getDocs(collection(db, 'clubs'));
  const clubs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
  
  // Jeśli nie jest superadmin, zwróć tylko swój klub
  if (!hasPermission(permissions, '*.*')) {
    const context = await getUserContext(currentUser.uid);
    if (context.clubId) {
      return clubs.filter(c => c.id === context.clubId);
    }
  }
  
  return clubs;
}

export async function getClub(clubId: string): Promise<Club | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'clubs.read')) {
    throw new Error('No permission to read clubs');
  }
  
  // Sprawdź context
  if (!hasPermission(permissions, '*.*')) {
    const context = await getUserContext(currentUser.uid);
    if (context.clubId !== clubId) {
      throw new Error('Can only view your own club');
    }
  }
  
  const clubDoc = await getDoc(doc(db, 'clubs', clubId));
  if (!clubDoc.exists()) {
    return null;
  }
  return { id: clubDoc.id, ...clubDoc.data() } as Club;
}

export async function createClub(
  clubData: Omit<Club, 'id' | 'createdAt'>
): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Tylko superadmin może tworzyć kluby
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, '*.*')) {
    throw new Error('Only superadmin can create clubs');
  }
  
  const clubRef = doc(collection(db, 'clubs'));
  await setDoc(clubRef, {
    ...clubData,
    createdAt: serverTimestamp()
  });
  
  return clubRef.id;
}

export async function updateClub(
  clubId: string,
  updates: Partial<Club>
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'clubs.write')) {
    throw new Error('No permission to update clubs');
  }
  
  // Sprawdź context - coordinator może edytować tylko swój klub
  if (!hasPermission(permissions, '*.*')) {
    const context = await getUserContext(currentUser.uid);
    if (context.clubId !== clubId) {
      throw new Error('Can only update your own club');
    }
  }
  
  await updateDoc(doc(db, 'clubs', clubId), {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

export async function deleteClub(clubId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Tylko superadmin może usuwać kluby
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, '*.*')) {
    throw new Error('Only superadmin can delete clubs');
  }
  
  await updateDoc(doc(db, 'clubs', clubId), {
    isActive: false,
    deletedAt: serverTimestamp()
  });
}
