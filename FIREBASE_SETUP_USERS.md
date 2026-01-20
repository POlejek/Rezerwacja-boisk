# Instrukcje konfiguracji Firebase dla nowego systemu użytkowników

## 📋 Przegląd zmian

System został zmodyfikowany, aby:
1. ✅ Usunąć możliwość publicznej rejestracji
2. ✅ Wprowadzić system ról: **superadmin**, **admin**, **trainer**
3. ✅ Powiązać użytkowników z klubami
4. ✅ Umożliwić reset hasła przez adminów
5. ✅ Dodać zmianę hasła dla użytkowników
6. ✅ Zapisywać typ logowania (hasło/Google)

---

## 🔧 Konfiguracja w Firebase Console

### 1. Authentication

#### Krok 1.1: Włącz providery
W **Firebase Console → Authentication → Sign-in method** włącz:
- ✅ Email/Password
- ✅ Google

#### Krok 1.2: Utwórz super admina (CIEBIE)
1. Przejdź do **Authentication → Users**
2. Kliknij **Add user**
3. Wprowadź swój email i hasło
4. Skopiuj **UID** nowo utworzonego użytkownika

---

### 2. Firestore Database

#### Krok 2.1: Struktura kolekcji

Musisz utworzyć następujące kolekcje w Firestore:

##### **Kolekcja: `users`**
Przechowuje profile użytkowników.

Przykładowy dokument (Twój super admin):
```
Dokument ID: [UID z Authentication]
{
  email: "twoj@email.com",
  name: "Twoje Imię i Nazwisko",
  role: "superadmin",
  clubId: null,
  active: true,
  authProvider: "password",
  createdAt: "2026-01-20T12:00:00.000Z"
}
```

**Pola:**
- `email` (string) - adres email
- `name` (string) - imię i nazwisko
- `role` (string) - jedna z wartości: `superadmin`, `admin`, `trainer`
- `clubId` (string | null) - ID klubu (null dla superadmin)
- `active` (boolean) - czy konto jest aktywne
- `authProvider` (string) - `password` lub `google`
- `createdAt` (string lub timestamp) - data utworzenia
- `createdBy` (string, opcjonalne) - UID osoby, która utworzyła konto
- `lastLogin` (timestamp, opcjonalne) - ostatnie logowanie

##### **Kolekcja: `clubs`**
Przechowuje informacje o klubach.

Przykładowy dokument:
```
Dokument ID: [Auto ID]
{
  name: "Klub Sportowy ABC",
  address: "ul. Sportowa 1, Warszawa",
  contactEmail: "kontakt@klubabc.pl",
  contactPhone: "+48 123 456 789",
  active: true,
  createdAt: "2026-01-20T12:00:00.000Z"
}
```

##### **Kolekcja: `passwordResets`** (opcjonalna)
Przechowuje logi resetów haseł przez adminów.

```
{
  adminUid: "uid_admina",
  targetUid: "uid_użytkownika",
  targetEmail: "email@uzytkownika.pl",
  timestamp: [server timestamp]
}
```

#### Krok 2.2: Reguły bezpieczeństwa Firestore

Zaktualizuj **Firestore Rules** w pliku [`firestore.rules`](firestore.rules):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Funkcje pomocnicze
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function isSuperAdmin() {
      return isAuthenticated() && getUserData().role == 'superadmin';
    }
    
    function isAdmin() {
      return isAuthenticated() && getUserData().role in ['superadmin', 'admin'];
    }
    
    function isActiveUser() {
      return isAuthenticated() && getUserData().active == true;
    }
    
    function sameClub(clubId) {
      return getUserData().clubId == clubId;
    }

    // Kolekcja users
    match /users/{userId} {
      // Każdy zalogowany użytkownik może odczytać własny profil
      allow read: if isAuthenticated() && request.auth.uid == userId;
      
      // Super admin może wszystko
      allow read, write: if isSuperAdmin();
      
      // Admin może odczytać i edytować użytkowników swojego klubu
      allow read, update: if isAdmin() && 
        sameClub(resource.data.clubId);
      
      // Nikt nie może tworzyć kont przez Firestore (tylko przez Authentication)
      allow create: if false;
    }

    // Kolekcja clubs
    match /clubs/{clubId} {
      // Wszyscy zalogowani użytkownicy mogą czytać kluby
      allow read: if isAuthenticated();
      
      // Tylko super admin może zarządzać klubami
      allow write: if isSuperAdmin();
    }

    // Kolekcja passwordResets (logi)
    match /passwordResets/{resetId} {
      // Tylko admini mogą czytać logi
      allow read: if isAdmin();
      
      // Cloud Function może zapisywać
      allow create: if isAuthenticated();
    }

    // Kolekcja bookings (rezerwacje)
    match /bookings/{bookingId} {
      allow read: if isActiveUser();
      allow create: if isActiveUser();
      allow update: if isActiveUser() && (
        request.auth.uid == resource.data.trainerId || 
        isAdmin()
      );
      allow delete: if isAdmin();
    }

    // Kolekcja fields (boiska)
    match /fields/{fieldId} {
      allow read: if isActiveUser();
      allow write: if isAdmin();
    }

    // Kolekcja settings
    match /settings/{settingId} {
      allow read: if isActiveUser();
      allow write: if isAdmin();
    }

    // Kolekcja notifications
    match /notifications/{notificationId} {
      allow read: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      allow write: if isAuthenticated();
    }
  }
}
```

#### Krok 2.3: Indeksy Firestore

W pliku [`firestore.indexes.json`](firestore.indexes.json) dodaj:

```json
{
  "indexes": [
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clubId", "order": "ASCENDING" },
        { "fieldPath": "active", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "role", "order": "ASCENDING" },
        { "fieldPath": "active", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

### 3. Cloud Functions

#### Krok 3.1: Wdróż funkcje
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

#### Krok 3.2: Dostępne funkcje
- **`adminResetUserPassword`** - Reset hasła użytkownika przez admina
- **`onUserCreated`** - Automatyczne tworzenie dokumentu w Firestore (USUŃ TĘ FUNKCJĘ - nie jest już potrzebna)

---

## 👥 Zarządzanie użytkownikami

### Jak dodać nowego admina klubu:

1. **W Firebase Authentication:**
   - Przejdź do **Authentication → Users**
   - Kliknij **Add user**
   - Wprowadź email: `admin@klub.pl` i hasło
   - Skopiuj **UID**

2. **W Firestore:**
   - Przejdź do kolekcji **users**
   - Utwórz dokument z ID = UID z kroku 1
   - Wypełnij pola:
     ```json
     {
       "email": "admin@klub.pl",
       "name": "Jan Kowalski",
       "role": "admin",
       "clubId": "ID_KLUBU",
       "active": true,
       "authProvider": "password",
       "createdAt": "2026-01-20T12:00:00.000Z",
       "createdBy": "UID_SUPERADMINA"
     }
     ```

### Jak dodać nowego trenera (przez admina w aplikacji):

**UWAGA:** Obecnie aplikacja nie tworzy kont automatycznie. Musisz:

1. **W Firebase Authentication:**
   - Utwórz konto ręcznie (jak wyżej)

2. **W Firestore:**
   - Utwórz dokument w **users** z UID z Authentication
   - Ustaw `role: "trainer"` i odpowiedni `clubId`

**PRZYSZŁA FUNKCJONALNOŚĆ:**
Możesz rozszerzyć `user.service.ts`, aby admini mogli tworzyć konta bezpośrednio z aplikacji (wymaga Admin SDK w Cloud Functions).

---

## 🔐 Logowanie użytkowników

### Metoda 1: Hasło
1. Użytkownik wprowadza email i hasło
2. System sprawdza czy konto istnieje i jest aktywne
3. Aktualizuje `lastLogin` w Firestore

### Metoda 2: Google
1. Użytkownik klika "Zaloguj przez Google"
2. System sprawdza czy dokument w Firestore istnieje
3. Jeśli nie istnieje - wyświetla błąd (brak konta)
4. Jeśli istnieje i jest aktywne - loguje

**WAŻNE:** Logowanie przez Google wymaga **wcześniejszego utworzenia konta** w Firestore!

---

## 🔄 Zmiana hasła

### Przez użytkownika:
1. Użytkownik klika "Zmień hasło" w menu
2. Wpisuje stare hasło, nowe hasło (2x)
3. System weryfikuje i zmienia hasło w Firebase Authentication

### Przez admina (reset):
1. Admin wybiera użytkownika w panelu
2. Klika "Reset hasła"
3. System generuje losowe hasło
4. Wywołuje Cloud Function `adminResetUserPassword`
5. Admin otrzymuje hasło i przekazuje użytkownikowi

---

## 🎯 Role i uprawnienia

### **superadmin** (Ty)
- ✅ Pełny dostęp do wszystkiego
- ✅ Zarządzanie klubami
- ✅ Zarządzanie wszystkimi użytkownikami
- ✅ Reset haseł wszystkich użytkowników

### **admin** (Administrator klubu)
- ✅ Zarządzanie użytkownikami swojego klubu
- ✅ Reset haseł użytkowników swojego klubu
- ✅ Zarządzanie boiskami klubu
- ✅ Zarządzanie rezerwacjami

### **trainer** (Trener)
- ✅ Przeglądanie kalendarza
- ✅ Tworzenie swoich rezerwacji
- ✅ Zmiana własnego hasła

---

## 📝 Checklist wdrożenia

- [ ] Włącz Email/Password i Google w Authentication
- [ ] Utwórz swoje konto super admina w Authentication
- [ ] Utwórz dokument w Firestore `users/[UID]` z rolą `superadmin`
- [ ] Utwórz przynajmniej jeden klub w kolekcji `clubs`
- [ ] Zaktualizuj Firestore Rules
- [ ] Wdróż Cloud Functions
- [ ] Przetestuj logowanie hasłem
- [ ] Przetestuj logowanie Google
- [ ] Przetestuj zmianę hasła
- [ ] Przetestuj reset hasła przez admina

---

## 🆘 Rozwiązywanie problemów

### Nie mogę się zalogować
- Sprawdź czy konto istnieje w **Authentication**
- Sprawdź czy dokument istnieje w **Firestore → users**
- Sprawdź czy `active: true` w dokumencie Firestore

### "Brak uprawnień" w panelu admina
- Sprawdź czy `role` w Firestore jest poprawna
- Sprawdź czy `clubId` jest przypisane (dla adminów klubu)
- Sprawdź Firestore Rules

### Reset hasła nie działa
- Sprawdź czy Cloud Functions są wdrożone
- Sprawdź logi w Firebase Console → Functions
- Sprawdź czy admin ma uprawnienia do użytkownika

---

## 📧 Kontakt

Jeśli masz pytania lub problemy, skontaktuj się ze mną.
