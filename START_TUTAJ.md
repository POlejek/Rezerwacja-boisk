# 🚀 SZYBKI START - System użytkowników

## ✅ Co zostało zrobione:

1. **Usunięto rejestrację** - użytkownicy nie mogą się już samodzielnie rejestrować
2. **Wprowadzono role**: superadmin, admin, trainer
3. **Dodano kluby** - każdy użytkownik (oprócz superadmin) jest przypisany do klubu
4. **Reset hasła przez admina** - admin może zresetować hasło użytkownika
5. **Zmiana hasła przez użytkownika** - w menu użytkownika
6. **Typ logowania** - zapisuje się czy użytkownik loguje się hasłem czy Google

---

## 🔥 CO MUSISZ ZROBIĆ TERAZ:

### 1️⃣ Wdróż Cloud Functions
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### 2️⃣ Zaktualizuj Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 3️⃣ Utwórz swoje konto Super Admina

**W Firebase Console → Authentication:**
1. Kliknij "Add user"
2. Wprowadź swój email i hasło
3. **Skopiuj UID** (np. `abc123xyz`)

**W Firebase Console → Firestore:**
1. Otwórz kolekcję `users` (utwórz jeśli nie istnieje)
2. Kliknij "Add document"
3. Document ID: **wklej UID z poprzedniego kroku**
4. Pola:
   ```
   email: "twoj@email.com"
   name: "Twoje Imię"
   role: "superadmin"
   clubId: null
   active: true
   authProvider: "password"
   createdAt: "2026-01-20T12:00:00.000Z"
   ```

### 4️⃣ Utwórz pierwszy klub

**W Firestore → Nowa kolekcja `clubs`:**
1. Kliknij "Start collection"
2. Collection ID: `clubs`
3. Auto ID dla dokumentu
4. Pola:
   ```
   name: "Nazwa Klubu"
   address: "Adres"
   contactEmail: "email@klub.pl"
   contactPhone: "+48 123 456 789"
   active: true
   createdAt: "2026-01-20T12:00:00.000Z"
   ```
5. **Skopiuj ID dokumentu** (będzie potrzebny do dodawania adminów)

### 5️⃣ Dodaj admina klubu

**Krok A - W Authentication:**
1. "Add user"
2. Email admina + hasło
3. Skopiuj UID

**Krok B - W Firestore → users:**
1. Nowy dokument, ID = UID z kroku A
2. Pola:
   ```
   email: "admin@klub.pl"
   name: "Jan Kowalski"
   role: "admin"
   clubId: "ID_KLUBU_Z_KROKU_4"
   active: true
   authProvider: "password"
   createdAt: "2026-01-20T12:00:00.000Z"
   createdBy: "TWOJ_UID"
   ```

---

## 🎯 Teraz możesz:

✅ Zalogować się jako super admin  
✅ Zarządzać użytkownikami w panelu admina  
✅ Resetować hasła użytkowników  
✅ Zmieniać swoje hasło  

---

## 📚 Dokumentacja:

- [FIREBASE_SETUP_USERS.md](FIREBASE_SETUP_USERS.md) - szczegółowe instrukcje
- [ZMIANY_SYSTEM_UZYTKOWNIKOW.md](ZMIANY_SYSTEM_UZYTKOWNIKOW.md) - co zostało zmienione

---

## 🆘 Problemy?

**Nie mogę się zalogować:**
- Sprawdź czy UID w Authentication = ID dokumentu w Firestore
- Sprawdź czy `active: true`

**"Brak uprawnień":**
- Sprawdź `role` w Firestore
- Sprawdź czy Firestore Rules są wdrożone

**Reset hasła nie działa:**
- Sprawdź czy Cloud Functions są wdrożone
- Sprawdź logi: Firebase Console → Functions → Logs

---

Powodzenia! 🎉
