import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// Automatycznie twórz dokument użytkownika w Firestore po rejestracji w Authentication
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  console.log('🔵 Tworzę dokument Firestore dla nowego użytkownika:', user.uid);
  
  try {
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      name: user.displayName || user.email,
      role: 'trainer',
      active: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log('✅ Dokument użytkownika utworzony:', user.uid);
  } catch (error) {
    console.error('❌ Błąd tworzenia dokumentu użytkownika:', error);
  }
});

export const onBookingCreated = functions.firestore
  .document('bookings/{bookingId}')
  .onCreate(async (snap, context) => {
    const booking = snap.data();
    await createNotification({
      type: 'new_booking',
      bookingId: context.params.bookingId,
      message: `Nowa rezerwacja: ${booking?.trainerName} ${booking?.date} ${booking?.startTime}-${booking?.endTime}`,
      userId: await firstAdminId(),
    });
    // TODO: Integracja email (SendGrid / Extension)
  });

export const onBookingStatusChanged = functions.firestore
  .document('bookings/{bookingId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.status !== after.status) {
      await createNotification({
        type: after.status,
        bookingId: context.params.bookingId,
        message: `Status rezerwacji: ${after.status}`,
        userId: after.trainerId,
      });
      // TODO: Email do trenera
    }
  });

export const sendDailyReminders = functions.pubsub
  .schedule('0 8 * * *')
  .timeZone('Europe/Warsaw')
  .onRun(async () => {
    const tomorrow = addDays(new Date(), 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);
    const snap = await db.collection('bookings').where('date', '==', dateStr).get();
    for (const doc of snap.docs) {
      const b = doc.data();
      await createNotification({
        type: 'reminder',
        bookingId: doc.id,
        message: `Przypomnienie o treningu jutro: ${b.trainerName} ${b.startTime}-${b.endTime}`,
        userId: b.trainerId,
      });
      // TODO: Email przypomnienie
    }
    return null;
  });

async function createNotification({ type, bookingId, message, userId }: { type: string; bookingId: string; message: string; userId: string; }) {
  await db.collection('notifications').add({
    type,
    bookingId,
    message,
    userId,
    isRead: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    metadata: {},
  });
}

async function firstAdminId(): Promise<string> {
  const snap = await db.collection('users').where('role', '==', 'admin').limit(1).get();
  return snap.docs[0]?.id || 'admin';
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
