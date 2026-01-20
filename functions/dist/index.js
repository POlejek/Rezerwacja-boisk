"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCreateUser = exports.adminResetUserPassword = exports.sendDailyReminders = exports.onBookingStatusChanged = exports.onBookingCreated = exports.onUserCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
// Automatycznie twórz dokument użytkownika w Firestore po rejestracji w Authentication
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
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
    }
    catch (error) {
        console.error('❌ Błąd tworzenia dokumentu użytkownika:', error);
    }
});
exports.onBookingCreated = functions.firestore
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
exports.onBookingStatusChanged = functions.firestore
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
exports.sendDailyReminders = functions.pubsub
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
async function createNotification({ type, bookingId, message, userId }) {
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
async function firstAdminId() {
    const snap = await db.collection('users').where('role', '==', 'admin').limit(1).get();
    return snap.docs[0]?.id || 'admin';
}
function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
// Funkcja do resetu hasła przez admina
exports.adminResetUserPassword = functions.https.onCall(async (data, context) => {
    // Sprawdź czy użytkownik jest zalogowany
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Musisz być zalogowany');
    }
    const { targetEmail, newPassword } = data;
    if (!targetEmail || !newPassword) {
        throw new functions.https.HttpsError('invalid-argument', 'Brak wymaganych parametrów');
    }
    try {
        // Sprawdź uprawnienia admina
        const adminDoc = await db.collection('users').doc(context.auth.uid).get();
        const adminData = adminDoc.data();
        if (!adminData || (adminData.role !== 'admin' && adminData.role !== 'superadmin')) {
            throw new functions.https.HttpsError('permission-denied', 'Brak uprawnień');
        }
        // Znajdź użytkownika po emailu
        const targetUser = await admin.auth().getUserByEmail(targetEmail);
        // Jeśli to admin klubu, sprawdź czy użytkownik należy do tego samego klubu
        if (adminData.role === 'admin') {
            const targetUserDoc = await db.collection('users').doc(targetUser.uid).get();
            const targetUserData = targetUserDoc.data();
            if (!targetUserData || targetUserData.clubId !== adminData.clubId) {
                throw new functions.https.HttpsError('permission-denied', 'Możesz resetować hasła tylko użytkownikom swojego klubu');
            }
        }
        // Zresetuj hasło
        await admin.auth().updateUser(targetUser.uid, {
            password: newPassword
        });
        // Zapisz log o resecie hasła
        await db.collection('passwordResets').add({
            adminUid: context.auth.uid,
            targetUid: targetUser.uid,
            targetEmail: targetEmail,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        // TODO: Wyślij email z nowym hasłem do użytkownika
        // Możesz użyć SendGrid, nodemailer, lub Firebase Extension
        return { success: true, message: 'Hasło zostało zresetowane' };
    }
    catch (error) {
        console.error('Błąd resetu hasła:', error);
        if (error.code === 'auth/user-not-found') {
            throw new functions.https.HttpsError('not-found', 'Użytkownik nie znaleziony');
        }
        throw new functions.https.HttpsError('internal', error.message || 'Błąd resetu hasła');
    }
});
// Funkcja do tworzenia nowego użytkownika przez admina
exports.adminCreateUser = functions.https.onCall(async (data, context) => {
    // Sprawdź czy użytkownik jest zalogowany
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Musisz być zalogowany');
    }
    const { email, name, password, role, clubId, authProvider } = data;
    if (!email || !name || !role || !authProvider) {
        throw new functions.https.HttpsError('invalid-argument', 'Brak wymaganych parametrów');
    }
    if (authProvider === 'password' && !password) {
        throw new functions.https.HttpsError('invalid-argument', 'Hasło jest wymagane dla logowania hasłem');
    }
    try {
        // Sprawdź uprawnienia admina
        const adminDoc = await db.collection('users').doc(context.auth.uid).get();
        const adminData = adminDoc.data();
        if (!adminData || (adminData.role !== 'admin' && adminData.role !== 'superadmin')) {
            throw new functions.https.HttpsError('permission-denied', 'Brak uprawnień');
        }
        // Jeśli to admin klubu, sprawdź czy tworzy użytkownika w swoim klubie
        if (adminData.role === 'admin') {
            if (adminData.clubId !== clubId) {
                throw new functions.https.HttpsError('permission-denied', 'Możesz tworzyć użytkowników tylko w swoim klubie');
            }
            // Admin klubu nie może tworzyć innych adminów ani superadminów
            if (role === 'admin' || role === 'superadmin') {
                throw new functions.https.HttpsError('permission-denied', 'Brak uprawnień do tworzenia adminów');
            }
        }
        // Superadmin może tworzyć admina, ale admin musi mieć przypisany klub
        if (role === 'admin' && !clubId) {
            throw new functions.https.HttpsError('invalid-argument', 'Administrator musi być przypisany do klubu');
        }
        // Utwórz użytkownika w Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            password: authProvider === 'password' ? password : undefined,
            displayName: name,
            emailVerified: false
        });
        // Utwórz dokument w Firestore
        await db.collection('users').doc(userRecord.uid).set({
            email: email,
            name: name,
            role: role,
            clubId: clubId || null,
            active: true,
            authProvider: authProvider,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: context.auth.uid
        });
        // TODO: Wyślij email powitalny z danymi logowania
        return {
            success: true,
            message: 'Użytkownik został utworzony',
            uid: userRecord.uid,
            temporaryPassword: authProvider === 'password' ? password : null
        };
    }
    catch (error) {
        console.error('Błąd tworzenia użytkownika:', error);
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'Użytkownik z tym adresem email już istnieje');
        }
        if (error.code === 'auth/invalid-email') {
            throw new functions.https.HttpsError('invalid-argument', 'Nieprawidłowy adres email');
        }
        if (error.code === 'auth/weak-password') {
            throw new functions.https.HttpsError('invalid-argument', 'Hasło jest za słabe (min. 6 znaków)');
        }
        throw new functions.https.HttpsError('internal', error.message || 'Błąd tworzenia użytkownika');
    }
});
