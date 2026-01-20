# Migracja: Role-Based → Permission-Based System

## Status: W TRAKCIE

## Pliki zaktualizowane:

### ✅ Nowe pliki utworzone:
1. **src/services/permissions.service.ts** - Kompletny system uprawnień
   - Typy: Permission, RolePreset, PermissionContext
   - Role presets z default uprawnieniami
   - Funkcje: hasPermission, hasAnyPermission, hasAllPermissions, hasContextualAccess
   - Zarządzanie: grantPermissions, revokePermissions, setRolePreset
   - Helpery: getAllPermissions, groupPermissionsByResource, expandWildcards

2. **PERMISSIONS_SPEC.md** - Pełna dokumentacja uprawnień

### ✅ Zaktualizowane:
1. **src/services/auth.service.ts**
   - UserProfile interface zmieniony na permission-based
   - Dodany import Permission, RolePreset
   - permissions: Permission[] zamiast role
   - rolePreset?: RolePreset (opcjonalne)
   - clubId?: string | null
   - teamIds?: string[] (zamiast teamId)
   - playerIds?: string[] (zamiast playerId)
   - **isActive** zamiast **active**

### 🔄 Do aktualizacji:
1. **src/services/auth.service.ts** - Zmiana active → isActive w funkcjach
2. **src/services/user.service.ts** - Pełna adaptacja do permission-based
3. **src/services/team.service.ts** - Zmiana sprawdzania uprawnień
4. **src/services/player.service.ts** - Zmiana sprawdzania uprawnień
5. **src/components/admin/UserManagement.tsx** - UI dla permissions
6. **src/components/auth/ProtectedRoute.tsx** - Sprawdzanie permissions
7. **src/App.tsx** - Migracja logiki uprawnień
8. **src/contexts/AuthContext.tsx** - Dodanie funkcji permissions
9. **firestore.rules** - Nowe reguły permission-based
10. **functions/src/index.ts** - Cloud Functions z permissions

## Zmiany w bazie danych:

### Struktura użytkownika (users collection):
```typescript
// PRZED (role-based)
{
  uid: string;
  email: string;
  name: string;
  role: 'superadmin' | 'coordinator' | 'trainer' | 'parent';
  clubId: string | null;
  teamId?: string | null;
  playerId?: string | null;
  active: boolean;
  authProvider: 'password' | 'google';
  createdAt: Timestamp;
  createdBy?: string;
  lastLogin?: Timestamp;
}

// PO (permission-based)
{
  uid: string;
  email: string;
  name: string;
  permissions: string[]; // Array of Permission strings
  rolePreset?: 'superadmin' | 'coordinator' | 'trainer' | 'parent';
  clubId?: string | null;
  teamIds?: string[]; // Zmiana z teamId
  playerIds?: string[]; // Zmiana z playerId
  isActive: boolean; // Zmiana nazwy
  authProvider: 'password' | 'google.com';
  createdAt: Timestamp;
  createdBy?: string;
  lastLogin?: Timestamp;
}
```

## Skrypt migracji danych:

```javascript
// Migracja istniejących użytkowników
const db = admin.firestore();
const usersRef = db.collection('users');

const ROLE_PRESETS = {
  superadmin: ['*.*'],
  coordinator: [
    'users.read', 'users.write', 'users.reset_password', 'users.manage_permissions',
    'clubs.read', 'clubs.write', 'clubs.settings',
    'teams.*', 'players.*', 'bookings.*', 'fields.*',
    'attendance.*', 'payments.*',
    'reports.view', 'reports.export'
  ],
  trainer: [
    'teams.read', 'players.read',
    'bookings.read', 'bookings.write',
    'attendance.read', 'attendance.write',
    'fields.read', 'reports.view'
  ],
  parent: [
    'players.read', 'players.write',
    'bookings.read', 'attendance.read',
    'payments.read', 'fields.read'
  ]
};

async function migrateUsers() {
  const snapshot = await usersRef.get();
  const batch = db.batch();
  let count = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    const updateData = {
      // Ustaw permissions na podstawie starej roli
      permissions: ROLE_PRESETS[data.role] || ROLE_PRESETS.parent,
      rolePreset: data.role,
      
      // Zmień teamId → teamIds (array)
      teamIds: data.teamId ? [data.teamId] : [],
      
      // Zmień playerId → playerIds (array)
      playerIds: data.playerId ? [data.playerId] : [],
      
      // Zmień active → isActive
      isActive: data.active !== false
    };
    
    // Usuń stare pola
    batch.update(doc.ref, {
      ...updateData,
      role: admin.firestore.FieldValue.delete(),
      teamId: admin.firestore.FieldValue.delete(),
      playerId: admin.firestore.FieldValue.delete(),
      active: admin.firestore.FieldValue.delete()
    });
    
    count++;
  });

  await batch.commit();
  console.log(`Migrowano ${count} użytkowników`);
}
```

## Kolejne kroki:

1. ✅ Utworzenie permissions.service.ts
2. ✅ Aktualizacja UserProfile interface
3. 🔄 Aktualizacja wszystkich serwisów (auth, user, team, player)
4. 🔄 Aktualizacja komponentów UI
5. 🔄 Aktualizacja Firestore rules
6. 🔄 Aktualizacja AuthContext
7. 🔄 Testy migracji na dev environment
8. 🔄 Uruchomienie skryptu migracji danych
9. 🔄 Deploy do produkcji

## Notatki:

- **Backward compatibility**: Przez pierwsze 30 dni wspieramy zarówno `active` jak i `isActive`
- **Coordinator może nadawać uprawnienia**: Tylko w swoim klubie i nie więcej niż sam ma
- **Wildcard permissions**: `*.*`, `teams.*`, `*.read` są wspierane
- **Context-aware**: Permissions są zawsze sprawdzane w kontekście clubId/teamIds/playerIds
