import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log('🔧 Inicjalizacja Firebase...');
console.log('🔧 Project ID:', firebaseConfig.projectId);
console.log('🔧 Auth Domain:', firebaseConfig.authDomain);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Wyłącz offline persistence - może powodować problemy
// enableIndexedDbPersistence(db).catch((err) => {
//   console.warn('⚠️ Nie można włączyć offline persistence:', err);
// });

console.log('✅ Firebase zainicjalizowany');
console.log('✅ Firestore DB App:', db.app.name);
console.log('✅ Firestore type:', db.type);
