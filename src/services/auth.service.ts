import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  UserCredential
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
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
  
  // TEST: Sprawdź czy Firestore w ogóle działa
  console.log('🔵 TEST: Próbuję odczytać settings...');
  try {
    const testDoc = await getDoc(doc(db, 'settings', 'general'));
    console.log('✅ TEST: Firestore odpowiada, settings exists:', testDoc.exists());
  } catch (testError) {
    console.error('❌ TEST: Firestore NIE ODPOWIADA:', testError);
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('✅ Konto utworzone w Authentication, UID:', userCredential.user.uid);
    
    // Twórz dokument w Firestore
    const userData = {
      email: email,
      name: name,
      role: 'trainer',
      active: false,
      createdAt: new Date().toISOString()
    };
    
    console.log('🔵 Tworzę dokument w Firestore...');
    
    try {
      // Timeout 15 sekund
      const setDocPromise = setDoc(doc(db, 'users', userCredential.user.uid), userData);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore timeout - prawdopodobnie problem z regułami')), 15000)
      );
      
      await Promise.race([setDocPromise, timeoutPromise]);
      console.log('✅ Dokument utworzony!');
      
    } catch (firestoreError: any) {
      console.error('❌ BŁĄD Firestore:', firestoreError);
      console.error('❌ Kod:', firestoreError.code);
      console.error('❌ Message:', firestoreError.message);
      
      // Nie usuwaj konta - pozostaw w Authentication
      throw new Error('Dokument nie został utworzony w Firestore. Skontaktuj się z administratorem.');
    }
    
    // Wyloguj użytkownika do czasu aktywacji
    console.log('🔵 Wylogowuję użytkownika...');
    await signOut(auth);
    console.log('✅ Rejestracja zakończona!');
    
    return userCredential;
  } catch (error: any) {
    console.error('❌ BŁĄD rejestracji:', error);
    throw error;
  }
}

export async function registerWithGoogle() {
  console.log('🔵 Rozpoczynam rejestrację przez Google');
  let userCredential: UserCredential;
  
  try {
    userCredential = await signInWithPopup(auth, googleProvider);
    console.log('✅ Uwierzytelniono przez Google, UID:', userCredential.user.uid);
  } catch (authError: any) {
    console.error('❌ BŁĄD podczas uwierzytelniania:', authError);
    throw authError;
  }
  
  // Sprawdź czy użytkownik już istnieje
  console.log('🔵 Sprawdzam czy dokument istnieje w Firestore...');
  const userRef = doc(db, 'users', userCredential.user.uid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    console.log('🔵 Dokument nie istnieje, tworzę nowy...');
    
    const userData = {
      email: userCredential.user.email,
      name: userCredential.user.displayName || userCredential.user.email,
      role: 'trainer',
      active: false, // Wymaga aktywacji przez admina
      createdAt: new Date().toISOString()
    };
    console.log('🔵 Dane użytkownika:', userData);
    
    try {
      // Zapisz dokument
      await setDoc(userRef, userData);
      console.log('✅ Dokument zapisany w Firestore!');
      
      // Zweryfikuj, czy dokument został zapisany
      const savedDoc = await getDoc(userRef);
      if (savedDoc.exists()) {
        console.log('✅ Weryfikacja: Dokument istnieje w Firestore:', savedDoc.data());
      } else {
        console.error('❌ KRYTYCZNY BŁĄD: Dokument NIE ISTNIEJE po zapisie!');
        throw new Error('Dokument nie został zapisany w Firestore');
      }
      
    } catch (firestoreError: any) {
      console.error('❌ BŁĄD podczas tworzenia dokumentu w Firestore:', firestoreError);
      console.error('❌ Kod błędu:', firestoreError.code);
      console.error('❌ Szczegóły:', firestoreError);
      
      // Wyloguj użytkownika jeśli Firestore zawiódł
      await signOut(auth);
      throw new Error(`Błąd zapisu do bazy danych: ${firestoreError.message}`);
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
