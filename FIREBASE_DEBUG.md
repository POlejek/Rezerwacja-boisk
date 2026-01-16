# Rozwiązywanie problemów z zapisem do Firebase

## Problem: Rezerwacje nie zapisują się do Firestore

### Możliwe przyczyny i rozwiązania:

#### 1. **Reguły Firestore są zbyt restrykcyjne**

Upewnij się, że reguły w Firebase Console są zgodne z plikiem `firestore.rules`:

```bash
# Deploy reguł do Firebase
firebase deploy --only firestore:rules
```

**Lub** ręcznie w Firebase Console:
1. Otwórz [Firebase Console](https://console.firebase.google.com)
2. Firestore Database → Rules
3. Skopiuj zawartość z `firestore.rules`
4. Kliknij "Publikuj"

#### 2. **Sprawdź błędy w konsoli przeglądarki**

Po dodaniu try-catch, aplikacja pokaże dokładny błąd:

1. Otwórz DevTools (F12)
2. Przejdź do zakładki "Console"
3. Spróbuj utworzyć rezerwację
4. Sprawdź czy pojawia się błąd

**Typowe błędy:**

- `permission-denied` → Problem z regułami Firestore
- `invalid-argument` → Nieprawidłowe dane w dokumencie
- `unauthenticated` → Użytkownik niezalogowany

#### 3. **Sprawdź strukturę danych użytkownika**

Dokument w kolekcji `users` musi istnieć:

```javascript
// Firestore → users → {uid}
{
  email: "user@example.com",
  name: "Jan Kowalski",
  role: "trainer" // lub "admin" lub "coordinator"
}
```

**Ważne**: ID dokumentu = UID z Firebase Authentication!

#### 4. **Sprawdź czy istnieje kolekcja boisk**

```javascript
// Firestore → fields → {fieldId}
{
  name: "Boisko 1",
  type: "outdoor",
  isActive: true
}
```

#### 5. **Testowanie zapisu ręcznie**

W konsoli przeglądarki (F12 → Console):

```javascript
// Import potrzebnych funkcji
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './services/firebase';

// Próba zapisu testowego
await addDoc(collection(db, 'bookings'), {
  pitchId: 'test-pitch-id',
  date: '2026-01-16',
  startTime: '10:00',
  duration: 60,
  trainerId: 'test-user-id',
  trainerName: 'Test User',
  price: 100,
  paid: false,
  external: false,
  createdAt: Timestamp.now()
});
```

## Co zostało dodane do kodu?

### Obsługa błędów we wszystkich funkcjach:

1. **handleCreateBooking** - tworzenie rezerwacji
2. **handleEditBooking** - edycja rezerwacji
3. **handleCreateExternalRequest** - zgłoszenia zewnętrzne
4. **approveRequest** - zatwierdzanie zgłoszeń
5. **rejectRequest** - odrzucanie zgłoszeń
6. **removeBooking** - usuwanie rezerwacji
7. **markAsPaid** - oznaczanie jako zapłacone

### Komunikaty:

- ✅ **Sukces**: "Rezerwacja została utworzona!"
- ❌ **Błąd**: "Błąd podczas tworzenia rezerwacji: [szczegóły]"
- 📝 **Konsola**: Pełny błąd w console.log()

## Testowanie krok po kroku:

### 1. Sprawdź czy jesteś zalogowany
```
W prawym górnym rogu powinno być: "Zalogowany jako: [nazwa]"
```

### 2. Spróbuj utworzyć rezerwację
- Wybierz datę
- Kliknij biały przycisk (wolny termin)
- Wypełnij formularz
- Kliknij "Zarezerwuj"

### 3. Sprawdź czy pojawił się alert
- ✅ "Rezerwacja została utworzona!" → Działa!
- ❌ "Błąd podczas..." → Sprawdź szczegóły błędu

### 4. Sprawdź Firebase Console
- Otwórz [Firebase Console](https://console.firebase.com)
- Firestore Database → Data
- Sprawdź kolekcję `bookings`
- Powinien pojawić się nowy dokument

## Najczęstsze problemy:

### Problem 1: "Missing or insufficient permissions"
**Rozwiązanie**: Deploy reguł Firestore:
```bash
firebase deploy --only firestore:rules
```

### Problem 2: "Document doesn't exist" (users/{uid})
**Rozwiązanie**: Utwórz dokument użytkownika w Firestore:
1. Firestore → users → Add document
2. Document ID: (skopiuj UID z Authentication)
3. Fields: email, name, role

### Problem 3: Rezerwacja znika po odświeżeniu
**Rozwiązanie**: Problem z real-time listenerem - sprawdź czy `onSnapshot` działa

### Problem 4: Nie widać żadnego alertu
**Rozwiązanie**: Sprawdź console.log() w DevTools - może być błąd JavaScript

## Deploy do produkcji:

```bash
# 1. Zbuduj aplikację
npm run build

# 2. Deploy wszystkiego
firebase deploy

# Lub osobno:
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only functions
```

## Kontakt z supportem Firebase:

Jeśli problem nie znika:
1. Sprawdź [Firebase Status](https://status.firebase.google.com/)
2. Zobacz [Stack Overflow - Firebase](https://stackoverflow.com/questions/tagged/firebase)
3. [Firebase Support](https://firebase.google.com/support)
