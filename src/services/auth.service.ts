import { 
  signInWithEmailAndPassword, 
  signOut, 
  signInWithPopup,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  UserCredential
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Permission, RolePreset } from './permissions.service';

// Typy dla użytkowników
export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  
  // Permission-based system
  permissions: Permission[];
  rolePreset?: RolePreset; // Opcjonalne, dla UI i łatwiejszego zarządzania
  
  // Context
  clubId?: string | null; // null tylko dla superadmin
  teamIds?: string[]; // Może należeć do wielu teamów (jako trener)
  playerIds?: string[]; // Parent może mieć wielu dzieci
  
  // Status
  isActive: boolean; // Zmiana nazwy z 'active' dla spójności
  
  // Auth info
  authProvider: 'password' | 'google.com'; // Jak się użytkownik loguje
  
  // Metadata
  createdAt: any;
  createdBy?: string; // UID osoby, która utworzyła konto
  lastLogin?: any;
}

export async function login(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  
  // Sprawdź czy użytkownik istnieje w Firestore i jest aktywny
  const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
  
  if (!userDoc.exists()) {
    await signOut(auth);
    throw new Error('ACCOUNT_NOT_FOUND');
  }
  
  const userData = userDoc.data();
  if (userData.isActive === false) {
    await signOut(auth);
    throw new Error('ACCOUNT_NOT_ACTIVE');
  }
  
  // Zaktualizuj lastLogin
  await updateDoc(doc(db, 'users', userCredential.user.uid), {
    lastLogin: serverTimestamp()
  });
  
  return userCredential;
}

export async function loginWithGoogle() {
  const userCredential = await signInWithPopup(auth, googleProvider);
  
  // Sprawdź czy użytkownik istnieje w Firestore
  const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
  
  if (!userDoc.exists()) {
    // Użytkownik nie istnieje - wyloguj
    await signOut(auth);
    throw new Error('ACCOUNT_NOT_FOUND');
  }
  
  // Sprawdź czy konto jest aktywne
  const userData = userDoc.data();
  if (userData.isActive === false) {
    await signOut(auth);
    throw new Error('ACCOUNT_NOT_ACTIVE');
  }
  
  // Zaktualizuj lastLogin
  await updateDoc(doc(db, 'users', userCredential.user.uid), {
    lastLogin: serverTimestamp()
  });
  
  return userCredential;
}

export async function logout() {
  return signOut(auth);
}

// Zmiana hasła przez użytkownika
export async function changePassword(oldPassword: string, newPassword: string) {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('Nie jesteś zalogowany');
  }
  
  // Reautoryzacja użytkownika
  const credential = EmailAuthProvider.credential(user.email, oldPassword);
  await reauthenticateWithCredential(user, credential);
  
  // Zmiana hasła
  await updatePassword(user, newPassword);
}

// Reset hasła przez użytkownika (wysyła link na email)
export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}
