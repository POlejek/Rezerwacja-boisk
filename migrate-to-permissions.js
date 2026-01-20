/**
 * Skrypt migracji danych z systemu role-based na permission-based
 * 
 * Uruchom w Node.js z Firebase Admin SDK:
 * node migrate-to-permissions.js
 */

const admin = require('firebase-admin');

// Inicjalizacja Firebase Admin (użyj własnego service account)
// admin.initializeApp({
//   credential: admin.credential.cert(require('./serviceAccountKey.json'))
// });

const db = admin.firestore();

// ============================================================================
// ROLE PRESETS - muszą być zgodne z permissions.service.ts
// ============================================================================

const ROLE_PRESETS = {
  superadmin: ['*.*'],
  
  coordinator: [
    'users.read', 'users.write', 'users.reset_password', 'users.manage_permissions',
    'clubs.read', 'clubs.write', 'clubs.settings',
    'teams.*',
    'players.*',
    'bookings.*',
    'fields.*',
    'attendance.*',
    'payments.*',
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
    'players.read', 'players.write',
    'bookings.read',
    'attendance.read',
    'payments.read',
    'fields.read'
  ]
};

// ============================================================================
// FUNKCJE MIGRACJI
// ============================================================================

/**
 * Migracja użytkowników z role-based na permission-based
 */
async function migrateUsers() {
  console.log('🚀 Rozpoczynam migrację użytkowników...');
  
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  
  if (snapshot.empty) {
    console.log('⚠️  Brak użytkowników do migracji');
    return;
  }
  
  const batch = db.batch();
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    try {
      // Sprawdź czy użytkownik już ma permissions (już zmigrowany)
      if (data.permissions && Array.isArray(data.permissions)) {
        console.log(`⏭️  Pomijam ${data.email} (już zmigrowany)`);
        skipped++;
        continue;
      }
      
      // Mapuj starą rolę na rolePreset
      const role = data.role;
      if (!role || !ROLE_PRESETS[role]) {
        console.warn(`⚠️  Nieznana rola dla ${data.email}: ${role}, ustawiam 'parent'`);
      }
      
      const rolePreset = ROLE_PRESETS[role] ? role : 'parent';
      const permissions = ROLE_PRESETS[rolePreset] || ROLE_PRESETS.parent;
      
      // Przygotuj dane do aktualizacji
      const updateData = {
        // Ustaw permissions na podstawie starej roli
        permissions: permissions,
        rolePreset: rolePreset,
        
        // Zmień teamId → teamIds (array)
        teamIds: data.teamId ? [data.teamId] : [],
        
        // Zmień playerId → playerIds (array)
        playerIds: data.playerId ? [data.playerId] : [],
        
        // Zmień active → isActive
        isActive: data.active !== false, // Domyślnie true jeśli undefined
        
        // Zachowaj pozostałe pola
        email: data.email,
        name: data.name || data.displayName || data.email,
        clubId: data.clubId || null,
        authProvider: data.authProvider || 'password',
        createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        createdBy: data.createdBy || null
      };
      
      // Usuń stare pola
      batch.update(doc.ref, {
        ...updateData,
        role: admin.firestore.FieldValue.delete(),
        teamId: admin.firestore.FieldValue.delete(),
        playerId: admin.firestore.FieldValue.delete(),
        active: admin.firestore.FieldValue.delete(),
        displayName: admin.firestore.FieldValue.delete() // Jeśli istnieje
      });
      
      console.log(`✅ Migruję ${data.email}: ${role} → ${rolePreset} (${permissions.length} uprawnień)`);
      migrated++;
      
    } catch (error) {
      console.error(`❌ Błąd migracji ${data.email}:`, error.message);
      errors++;
    }
  }
  
  if (migrated > 0) {
    await batch.commit();
    console.log(`\n✨ Migracja użytkowników zakończona:`);
    console.log(`   - Zmigrowano: ${migrated}`);
    console.log(`   - Pominięto: ${skipped}`);
    console.log(`   - Błędy: ${errors}`);
  } else {
    console.log('ℹ️  Brak użytkowników do migracji');
  }
}

/**
 * Migracja zespołów (teams)
 */
async function migrateTeams() {
  console.log('\n🚀 Rozpoczynam migrację zespołów...');
  
  const teamsRef = db.collection('teams');
  const snapshot = await teamsRef.get();
  
  if (snapshot.empty) {
    console.log('⚠️  Brak zespołów do migracji');
    return;
  }
  
  const batch = db.batch();
  let migrated = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Sprawdź czy już ma isActive
    if (data.isActive !== undefined) {
      continue;
    }
    
    const updateData = {
      isActive: data.active !== false, // Zmień active → isActive
      trainerIds: data.trainerId ? [data.trainerId] : [] // Zmień trainerId → trainerIds
    };
    
    batch.update(doc.ref, {
      ...updateData,
      active: admin.firestore.FieldValue.delete(),
      trainerId: admin.firestore.FieldValue.delete()
    });
    
    migrated++;
  }
  
  if (migrated > 0) {
    await batch.commit();
    console.log(`✅ Zmigrowano ${migrated} zespołów`);
  } else {
    console.log('ℹ️  Brak zespołów do migracji');
  }
}

/**
 * Migracja graczy (players)
 */
async function migratePlayers() {
  console.log('\n🚀 Rozpoczynam migrację graczy...');
  
  const playersRef = db.collection('players');
  const snapshot = await playersRef.get();
  
  if (snapshot.empty) {
    console.log('⚠️  Brak graczy do migracji');
    return;
  }
  
  const batch = db.batch();
  let migrated = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Sprawdź czy już ma isActive
    if (data.isActive !== undefined) {
      continue;
    }
    
    batch.update(doc.ref, {
      isActive: data.active !== false, // Zmień active → isActive
      active: admin.firestore.FieldValue.delete()
    });
    
    migrated++;
  }
  
  if (migrated > 0) {
    await batch.commit();
    console.log(`✅ Zmigrowano ${migrated} graczy`);
  } else {
    console.log('ℹ️  Brak graczy do migracji');
  }
}

/**
 * Migracja klubów (clubs)
 */
async function migrateClubs() {
  console.log('\n🚀 Rozpoczynam migrację klubów...');
  
  const clubsRef = db.collection('clubs');
  const snapshot = await clubsRef.get();
  
  if (snapshot.empty) {
    console.log('⚠️  Brak klubów do migracji');
    return;
  }
  
  const batch = db.batch();
  let migrated = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Sprawdź czy już ma isActive
    if (data.isActive !== undefined) {
      continue;
    }
    
    batch.update(doc.ref, {
      isActive: data.active !== false, // Zmień active → isActive
      active: admin.firestore.FieldValue.delete()
    });
    
    migrated++;
  }
  
  if (migrated > 0) {
    await batch.commit();
    console.log(`✅ Zmigrowano ${migrated} klubów`);
  } else {
    console.log('ℹ️  Brak klubów do migracji');
  }
}

/**
 * Raport podsumowujący
 */
async function generateReport() {
  console.log('\n📊 RAPORT MIGRACJI\n');
  console.log('═'.repeat(60));
  
  // Sprawdź użytkowników
  const usersSnapshot = await db.collection('users').get();
  const withPermissions = usersSnapshot.docs.filter(d => d.data().permissions).length;
  const withoutPermissions = usersSnapshot.docs.length - withPermissions;
  
  console.log(`\n👥 Użytkownicy:`);
  console.log(`   Łącznie: ${usersSnapshot.docs.length}`);
  console.log(`   Z permissions: ${withPermissions}`);
  console.log(`   Bez permissions: ${withoutPermissions}`);
  
  // Pokaż rozkład ról
  const roleCount = {};
  usersSnapshot.docs.forEach(d => {
    const role = d.data().rolePreset || d.data().role || 'unknown';
    roleCount[role] = (roleCount[role] || 0) + 1;
  });
  
  console.log(`\n   Rozkład ról:`);
  Object.entries(roleCount).forEach(([role, count]) => {
    console.log(`     ${role}: ${count}`);
  });
  
  // Sprawdź inne kolekcje
  const teamsCount = (await db.collection('teams').get()).size;
  const playersCount = (await db.collection('players').get()).size;
  const clubsCount = (await db.collection('clubs').get()).size;
  
  console.log(`\n📋 Pozostałe kolekcje:`);
  console.log(`   Zespoły: ${teamsCount}`);
  console.log(`   Gracze: ${playersCount}`);
  console.log(`   Kluby: ${clubsCount}`);
  
  console.log('\n═'.repeat(60));
}

// ============================================================================
// GŁÓWNA FUNKCJA
// ============================================================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Migracja: Role-Based → Permission-Based System         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  try {
    // Raport przed migracją
    await generateReport();
    
    console.log('\n\n🔄 Czy kontynuować migrację? (naciśnij Ctrl+C aby anulować)');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Wykonaj migracje
    await migrateUsers();
    await migrateTeams();
    await migratePlayers();
    await migrateClubs();
    
    // Raport po migracji
    console.log('\n\n');
    await generateReport();
    
    console.log('\n\n✨ Migracja zakończona pomyślnie!\n');
    console.log('📝 Następne kroki:');
    console.log('   1. Sprawdź dane w Firebase Console');
    console.log('   2. Deploy nowych Firestore rules: firebase deploy --only firestore:rules');
    console.log('   3. Przetestuj aplikację z nowymi uprawnieniami');
    console.log('   4. Usuń stary kod (legacy role checks) po upewnieniu się że wszystko działa\n');
    
  } catch (error) {
    console.error('\n❌ Błąd podczas migracji:', error);
    process.exit(1);
  }
}

// Uruchom migrację
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = {
  migrateUsers,
  migrateTeams,
  migratePlayers,
  migrateClubs,
  generateReport
};
