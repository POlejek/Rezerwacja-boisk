const admin = require('firebase-admin');
const serviceAccount = require('./rezerwacja-boisk-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAdam() {
  const usersSnapshot = await db.collection('users').get();
  console.log('\n=== Wszyscy użytkownicy ===\n');
  usersSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`UID: ${doc.id}`);
    console.log(`Email: ${data.email}`);
    console.log(`Name: ${data.name}`);
    console.log(`Role: ${data.role}`);
    console.log(`ClubId: ${data.clubId || 'BRAK'}`);
    console.log(`Active: ${data.active}`);
    console.log('---');
  });
  
  const clubsSnapshot = await db.collection('clubs').get();
  console.log('\n=== Wszystkie kluby ===\n');
  clubsSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`Name: ${data.name}`);
    console.log('---');
  });
  
  process.exit(0);
}

checkAdam().catch(console.error);
