import { auth, db } from './firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type Permission = 
  // Users & Auth
  | 'users.read' | 'users.write' | 'users.delete'
  | 'users.reset_password' | 'users.manage_permissions'
  
  // Clubs
  | 'clubs.read' | 'clubs.write' | 'clubs.delete'
  | 'clubs.settings'
  
  // Teams
  | 'teams.read' | 'teams.write' | 'teams.delete'
  | 'teams.assign_trainers'
  
  // Players
  | 'players.read' | 'players.write' | 'players.delete'
  | 'players.manage_parents'
  
  // Bookings
  | 'bookings.read' | 'bookings.write' | 'bookings.delete'
  | 'bookings.approve'
  
  // Fields
  | 'fields.read' | 'fields.write' | 'fields.delete'
  
  // Attendance (V2)
  | 'attendance.read' | 'attendance.write'
  
  // Payments (V2)
  | 'payments.read' | 'payments.write' | 'payments.refund'
  
  // Reports
  | 'reports.view' | 'reports.export'
  
  // Wildcard
  | '*.*' | '*.read' | '*.write'
  | 'users.*' | 'clubs.*' | 'teams.*' | 'players.*'
  | 'bookings.*' | 'fields.*' | 'attendance.*' | 'payments.*' | 'reports.*';

export type RolePreset = 'superadmin' | 'coordinator' | 'trainer' | 'parent';

export interface PermissionContext {
  clubId?: string | null;
  teamIds?: string[];
  playerIds?: string[];
}

// ============================================================================
// DEFAULT ROLE PRESETS
// ============================================================================

export const ROLE_PRESETS: Record<RolePreset, Permission[]> = {
  superadmin: [
    '*.*' // Wszystkie uprawnienia
  ],
  
  coordinator: [
    // Users
    'users.read', 'users.write', 'users.reset_password', 'users.manage_permissions',
    // Clubs
    'clubs.read', 'clubs.write', 'clubs.settings',
    // Teams
    'teams.*',
    // Players
    'players.*',
    // Bookings
    'bookings.*',
    // Fields
    'fields.*',
    // Attendance
    'attendance.*',
    // Payments
    'payments.*',
    // Reports
    'reports.view', 'reports.export'
  ],
  
  trainer: [
    'teams.read',
    'players.read',
    'bookings.read', 'bookings.write',
    'attendance.read', 'attendance.write',
    'fields.read',
    'reports.view'
  ],
  
  parent: [
    'players.read', 'players.write', // Tylko swoje dzieci
    'bookings.read',
    'attendance.read',
    'payments.read',
    'fields.read'
  ]
};

// ============================================================================
// PERMISSION CHECKING FUNCTIONS
// ============================================================================

/**
 * Sprawdza czy użytkownik ma określone uprawnienie
 */
export function hasPermission(
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean {
  // Sprawdź dokładne dopasowanie
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }
  
  // Sprawdź wildcard *.*
  if (userPermissions.includes('*.*')) {
    return true;
  }
  
  // Sprawdź wildcard dla operacji (*.read, *.write)
  const [resource, action] = requiredPermission.split('.');
  if (action && userPermissions.includes(`*.${action}` as Permission)) {
    return true;
  }
  
  // Sprawdź wildcard dla zasobu (users.*, teams.*)
  if (userPermissions.includes(`${resource}.*` as Permission)) {
    return true;
  }
  
  return false;
}

/**
 * Sprawdza czy użytkownik ma którekolwiek z wymaganych uprawnień
 */
export function hasAnyPermission(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.some(perm => hasPermission(userPermissions, perm));
}

/**
 * Sprawdza czy użytkownik ma wszystkie wymagane uprawnienia
 */
export function hasAllPermissions(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.every(perm => hasPermission(userPermissions, perm));
}

/**
 * Sprawdza czy użytkownik ma dostęp do zasobu w kontekście
 */
export function hasContextualAccess(
  userPermissions: Permission[],
  userContext: PermissionContext,
  requiredPermission: Permission,
  resourceContext: {
    clubId?: string;
    teamId?: string;
    playerId?: string;
  }
): boolean {
  // Najpierw sprawdź czy ma uprawnienie
  if (!hasPermission(userPermissions, requiredPermission)) {
    return false;
  }
  
  // SuperAdmin ma dostęp do wszystkiego
  if (hasPermission(userPermissions, '*.*')) {
    return true;
  }
  
  // Sprawdź kontekst klubu
  if (resourceContext.clubId && userContext.clubId) {
    if (resourceContext.clubId !== userContext.clubId) {
      return false;
    }
  }
  
  // Sprawdź kontekst teamu
  if (resourceContext.teamId && userContext.teamIds) {
    if (!userContext.teamIds.includes(resourceContext.teamId)) {
      return false;
    }
  }
  
  // Sprawdź kontekst gracza
  if (resourceContext.playerId && userContext.playerIds) {
    if (!userContext.playerIds.includes(resourceContext.playerId)) {
      return false;
    }
  }
  
  return true;
}

// ============================================================================
// PERMISSION MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Pobiera uprawnienia użytkownika z bazy danych
 */
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) {
    throw new Error('User not found');
  }
  
  const userData = userDoc.data();
  return userData.permissions || [];
}

/**
 * Pobiera kontekst użytkownika (clubId, teamIds, playerIds)
 */
export async function getUserContext(userId: string): Promise<PermissionContext> {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) {
    throw new Error('User not found');
  }
  
  const userData = userDoc.data();
  return {
    clubId: userData.clubId || null,
    teamIds: userData.teamIds || [],
    playerIds: userData.playerIds || []
  };
}

/**
 * Nadaje uprawnienia użytkownikowi
 * Może wykonać tylko użytkownik z uprawnieniem 'users.manage_permissions'
 */
export async function grantPermissions(
  targetUserId: string,
  permissionsToGrant: Permission[]
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź czy current user ma uprawnienie do zarządzania uprawnieniami
  const currentUserPermissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(currentUserPermissions, 'users.manage_permissions')) {
    throw new Error('No permission to manage user permissions');
  }
  
  // Sprawdź kontekst - coordinator może nadawać uprawnienia tylko w swoim klubie
  if (!hasPermission(currentUserPermissions, '*.*')) {
    const currentUserContext = await getUserContext(currentUser.uid);
    const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
    const targetUserData = targetUserDoc.data();
    
    if (targetUserData?.clubId !== currentUserContext.clubId) {
      throw new Error('Can only manage permissions for users in your club');
    }
    
    // Coordinator nie może nadać więcej uprawnień niż sam ma
    for (const perm of permissionsToGrant) {
      if (!hasPermission(currentUserPermissions, perm)) {
        throw new Error(`Cannot grant permission you don't have: ${perm}`);
      }
    }
  }
  
  // Nadaj uprawnienia
  const userRef = doc(db, 'users', targetUserId);
  await updateDoc(userRef, {
    permissions: arrayUnion(...permissionsToGrant)
  });
}

/**
 * Odbiera uprawnienia użytkownikowi
 */
export async function revokePermissions(
  targetUserId: string,
  permissionsToRevoke: Permission[]
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź czy current user ma uprawnienie do zarządzania uprawnieniami
  const currentUserPermissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(currentUserPermissions, 'users.manage_permissions')) {
    throw new Error('No permission to manage user permissions');
  }
  
  // Sprawdź kontekst - coordinator może odbierać uprawnienia tylko w swoim klubie
  if (!hasPermission(currentUserPermissions, '*.*')) {
    const currentUserContext = await getUserContext(currentUser.uid);
    const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
    const targetUserData = targetUserDoc.data();
    
    if (targetUserData?.clubId !== currentUserContext.clubId) {
      throw new Error('Can only manage permissions for users in your club');
    }
  }
  
  // Odbierz uprawnienia
  const userRef = doc(db, 'users', targetUserId);
  await updateDoc(userRef, {
    permissions: arrayRemove(...permissionsToRevoke)
  });
}

/**
 * Ustawia role preset użytkownikowi (nadpisuje wszystkie uprawnienia)
 */
export async function setRolePreset(
  targetUserId: string,
  rolePreset: RolePreset
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź czy current user ma uprawnienie do zarządzania uprawnieniami
  const currentUserPermissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(currentUserPermissions, 'users.manage_permissions')) {
    throw new Error('No permission to manage user permissions');
  }
  
  // Sprawdź kontekst - coordinator może ustawiać role tylko w swoim klubie
  if (!hasPermission(currentUserPermissions, '*.*')) {
    const currentUserContext = await getUserContext(currentUser.uid);
    const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
    const targetUserData = targetUserDoc.data();
    
    if (targetUserData?.clubId !== currentUserContext.clubId) {
      throw new Error('Can only manage roles for users in your club');
    }
    
    // Coordinator nie może nadać roli superadmin
    if (rolePreset === 'superadmin') {
      throw new Error('Cannot grant superadmin role');
    }
  }
  
  // Ustaw role preset i uprawnienia
  const userRef = doc(db, 'users', targetUserId);
  await updateDoc(userRef, {
    rolePreset: rolePreset,
    permissions: ROLE_PRESETS[rolePreset]
  });
}

/**
 * Dodaje dodatkowe uprawnienia do roli użytkownika (nie nadpisuje)
 */
export async function addPermissionsToRole(
  targetUserId: string,
  additionalPermissions: Permission[]
): Promise<void> {
  await grantPermissions(targetUserId, additionalPermissions);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Zwraca listę wszystkich dostępnych uprawnień
 */
export function getAllPermissions(): Permission[] {
  return [
    // Users
    'users.read', 'users.write', 'users.delete',
    'users.reset_password', 'users.manage_permissions',
    // Clubs
    'clubs.read', 'clubs.write', 'clubs.delete', 'clubs.settings',
    // Teams
    'teams.read', 'teams.write', 'teams.delete', 'teams.assign_trainers',
    // Players
    'players.read', 'players.write', 'players.delete', 'players.manage_parents',
    // Bookings
    'bookings.read', 'bookings.write', 'bookings.delete', 'bookings.approve',
    // Fields
    'fields.read', 'fields.write', 'fields.delete',
    // Attendance
    'attendance.read', 'attendance.write',
    // Payments
    'payments.read', 'payments.write', 'payments.refund',
    // Reports
    'reports.view', 'reports.export'
  ];
}

/**
 * Grupuje uprawnienia według zasobu dla czytelności w UI
 */
export function groupPermissionsByResource(permissions: Permission[]): Record<string, Permission[]> {
  const grouped: Record<string, Permission[]> = {};
  
  for (const perm of permissions) {
    if (perm === '*.*') {
      grouped['admin'] = ['*.*'];
      continue;
    }
    
    const [resource] = perm.split('.');
    if (!grouped[resource]) {
      grouped[resource] = [];
    }
    grouped[resource].push(perm);
  }
  
  return grouped;
}

/**
 * Rozszerza wildcardy do pełnej listy uprawnień (dla UI)
 */
export function expandWildcards(permissions: Permission[]): Permission[] {
  const expanded = new Set<Permission>();
  
  for (const perm of permissions) {
    if (perm === '*.*') {
      // Dodaj wszystkie uprawnienia
      getAllPermissions().forEach(p => expanded.add(p));
    } else if (perm.endsWith('.*')) {
      // Dodaj wszystkie uprawnienia dla zasobu
      const resource = perm.split('.')[0];
      getAllPermissions()
        .filter(p => p.startsWith(`${resource}.`))
        .forEach(p => expanded.add(p));
    } else if (perm.startsWith('*.')) {
      // Dodaj wszystkie uprawnienia z daną akcją
      const action = perm.split('.')[1];
      getAllPermissions()
        .filter(p => p.endsWith(`.${action}`))
        .forEach(p => expanded.add(p));
    } else {
      expanded.add(perm);
    }
  }
  
  return Array.from(expanded);
}
