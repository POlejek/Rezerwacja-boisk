import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  UserCredential
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function loginWithGoogle() {
  const userCredential = await signInWithPopup(auth, googleProvider);
  
  // Sprawdź czy użytkownik istnieje w Firestore
  const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
  
  if (!userDoc.exists()) {
    // Jeśli nie istnieje, utwórz dokument z statusem nieaktywnym
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: userCredential.user.email,
      name: userCredential.user.displayName || userCredential.user.email,
      role: 'trainer',
      active: false,
      createdAt: new Date().toISOString()
    });
    
    // Wyloguj - użytkownik musi poczekać na aktywację
    await signOut(auth);
    throw new Error('ACCOUNT_NEEDS_ACTIVATION');
  }
  
  // Sprawdź czy konto jest aktywne
  const userData = userDoc.data();
  if (userData.active === false) {
    await signOut(auth);
    throw new Error('ACCOUNT_NOT_ACTIVE');
  }
  
  return userCredential;
}

export async function logout() {
  return signOut(auth);
}

export async function registerWithEmail(email: string, password: string, name: string) {
  console.log('🔵 Rozpoczynam rejestrację dla:', email);
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  console.log('✅ Konto utworzone w Authentication, UID:', userCredential.user.uid);
  
  // Utwórz dokument użytkownika w Firestore z statusem nieaktywnym
  const userData = {
    email: email,
    name: name,
    role: 'trainer',
    active: false, // Wymaga aktywacji przez admina
    createdAt: new Date().toISOString()
  };
  console.log('🔵 Tworzę dokument w Firestore:', userData);
  
  try {
    await setDoc(doc(db, 'users', userCredential.user.uid), userData);
    console.log('✅ Dokument utworzony w Firestore!');
  } catch (firestoreError: any) {
    console.error('❌ BŁĄD podczas tworzenia dokumentu w Firestore:', firestoreError);
    console.error('❌ Kod błędu:', firestoreError.code);
    console.error('❌ Wiadomość:', firestoreError.message);
    console.error('❌ Pełny błąd:', JSON.stringify(firestoreError, null, 2));
    alert('BŁĄD: Nie udało się utworzyć dokumentu w Firestore: ' + firestoreError.message);
    throw firestoreError;
  }
  
  // Wyloguj użytkownika do czasu aktywacji
  console.log('🔵 Wylogowuję użytkownika do czasu aktywacji...');
  await signOut(auth);
  console.log('✅ Rejestracja zakończona!');
  
  return userCredential;
}

export async function registerWithGoogle() {
  console.log('🔵 Rozpoczynam rejestrację przez Google');
  const userCredential = await signInWithPopup(auth, googleProvider);
  console.log('✅ Uwierzytelniono przez Google, UID:', userCredential.user.uid);
  
  // Sprawdź czy użytkownik już istnieje
  console.log('🔵 Sprawdzam czy dokument istnieje w Firestore...');
  const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
  
  if (!userDoc.exists()) {
    console.log('🔵 Dokument nie istnieje, tworzę nowy...');
    try {
      // Utwórz nowy dokument z statusem nieaktywnym
      const userData = {
        email: userCredential.user.email,
        name: userCredential.user.displayName || userCredential.user.email,
        role: 'trainer',
        active: false, // Wymaga aktywacji przez admina
        createdAt: new Date().toISOString()
      };
      console.log('🔵 Dane użytkownika:', userData);
      await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      console.log('✅ Dokument utworzony w Firestore!');
    } catch (firestoreError) {
      console.error('❌ BŁĄD podczas tworzenia dokumentu w Firestore:', firestoreError);
      throw firestoreError;
    }
    
    // Wyloguj do czasu aktywacji
    console.log('🔵 Wylogowuję użytkownika do czasu aktywacji...');
    await signOut(auth);
  } else {
    console.log('ℹ️ Dokument już istnieje w Firestore');
  }
  
  return userCredential;
}

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}
