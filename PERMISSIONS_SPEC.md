# Specyfikacja Uprawnień - System Permission-Based

## 1. Users & Auth

### `users.read`
- Przeglądanie listy użytkowników
- Widzenie profili użytkowników
- Dostęp do informacji kontaktowych

**Context**: 
- SuperAdmin: wszyscy użytkownicy
- Coordinator: tylko użytkownicy w swoim klubie

### `users.write`
- Tworzenie nowych użytkowników
- Edycja profili użytkowników
- Przypisywanie do klubów/teamów
- Zmiana statusu aktywności

**Context**:
- SuperAdmin: wszyscy użytkownicy
- Coordinator: tylko użytkownicy w swoim klubie

### `users.delete`
- Usuwanie kont użytkowników (soft delete - isActive=false)
- Trwałe usunięcie danych (GDPR)

### `users.reset_password`
- Resetowanie hasła użytkownika
- Wysyłanie linku do zmiany hasła

### `users.manage_permissions`
- Nadawanie/odbieranie uprawnień innym użytkownikom
- Zmiana role preset użytkownika

**Context**:
- SuperAdmin: wszyscy użytkownicy
- Coordinator: tylko użytkownicy w swoim klubie (nie może nadać więcej uprawnień niż sam ma)

---

## 2. Clubs

### `clubs.read`
- Przeglądanie listy klubów
- Widzenie szczegółów klubu
- Dostęp do ustawień klubu

**Context**:
- SuperAdmin: wszystkie kluby
- Coordinator: tylko swój klub

### `clubs.write`
- Tworzenie nowych klubów
- Edycja informacji o klubie
- Zmiana logo/danych kontaktowych

**Context**:
- SuperAdmin: wszystkie kluby
- Coordinator: tylko swój klub

### `clubs.delete`
- Usuwanie klubów
- Tylko SuperAdmin

### `clubs.settings`
- Zarządzanie zaawansowanymi ustawieniami klubu
- Konfiguracja modułów (bookings, payments, attendance)
- Ustawienia powiadomień

---

## 3. Teams

### `teams.read`
- Przeglądanie listy teamów
- Widzenie szczegółów teamu
- Dostęp do harmonogramu treningów
- Lista graczy w teamie

**Context**:
- SuperAdmin: wszystkie teamy
- Coordinator: teamy w swoim klubie
- Trainer: teamy do których jest przypisany

### `teams.write`
- Tworzenie nowych teamów
- Edycja nazwy, opisu, harmonogramu
- Przypisywanie trenerów do teamu
- Zmiana kategorii wiekowej

**Context**:
- SuperAdmin: wszystkie teamy
- Coordinator: teamy w swoim klubie

### `teams.delete`
- Usuwanie teamów
- Tylko SuperAdmin i Coordinator

### `teams.assign_trainers`
- Przypisywanie/usuwanie trenerów z teamu
- Zmiana głównego trenera

**Context**:
- SuperAdmin: wszystkie teamy
- Coordinator: teamy w swoim klubie

---

## 4. Players

### `players.read`
- Przeglądanie listy graczy
- Widzenie profili graczy
- Dostęp do danych kontaktowych
- Historia obecności i płatności

**Context**:
- SuperAdmin: wszyscy gracze
- Coordinator: gracze w swoim klubie
- Trainer: gracze w swoich teamach
- Parent: tylko swoje dzieci

### `players.write`
- Dodawanie nowych graczy
- Edycja danych gracza
- Przypisywanie do teamu
- Zmiana statusu aktywności

**Context**:
- SuperAdmin: wszyscy gracze
- Coordinator: gracze w swoim klubie
- Trainer: gracze w swoich teamach
- Parent: podstawowe dane swoich dzieci (telefon, uwagi medyczne)

### `players.delete`
- Usuwanie graczy z systemu
- Tylko SuperAdmin i Coordinator

### `players.manage_parents`
- Przypisywanie rodziców do gracza
- Usuwanie powiązań rodzic-dziecko
- Wysyłanie zaproszeń dla rodziców

**Context**:
- SuperAdmin: wszyscy gracze
- Coordinator: gracze w swoim klubie

---

## 5. Bookings (Rezerwacje)

### `bookings.read`
- Przeglądanie kalendarza rezerwacji
- Widzenie szczegółów rezerwacji
- Lista rezerwacji teamu

**Context**:
- SuperAdmin: wszystkie rezerwacje
- Coordinator: rezerwacje w swoim klubie
- Trainer: rezerwacje swoich teamów
- Parent: rezerwacje swoich dzieci

### `bookings.write`
- Tworzenie nowych rezerwacji
- Edycja rezerwacji
- Anulowanie rezerwacji

**Context**:
- SuperAdmin: wszystkie rezerwacje
- Coordinator: rezerwacje w swoim klubie
- Trainer: rezerwacje swoich teamów

### `bookings.delete`
- Trwałe usunięcie rezerwacji z historii
- Tylko SuperAdmin i Coordinator

### `bookings.approve`
- Zatwierdzanie oczekujących rezerwacji
- Odrzucanie rezerwacji
- Zmiana statusu rezerwacji

**Context**:
- SuperAdmin: wszystkie rezerwacje
- Coordinator: rezerwacje w swoim klubie

---

## 6. Fields (Boiska)

### `fields.read`
- Przeglądanie listy boisk
- Widzenie dostępności boisk
- Cennik i zasady rezerwacji

**Context**:
- SuperAdmin: wszystkie boiska
- Coordinator: boiska w swoim klubie
- Trainer/Parent: boiska dostępne dla ich teamów

### `fields.write`
- Dodawanie nowych boisk
- Edycja parametrów boiska
- Zmiana cennika
- Blokowanie terminów

**Context**:
- SuperAdmin: wszystkie boiska
- Coordinator: boiska w swoim klubie

### `fields.delete`
- Usuwanie boisk
- Tylko SuperAdmin i Coordinator

---

## 7. Attendance (Obecności) - V2

### `attendance.read`
- Przeglądanie listy obecności
- Historia obecności gracza
- Statystyki frekwencji

**Context**:
- SuperAdmin: wszystkie obecności
- Coordinator: obecności w swoim klubie
- Trainer: obecności w swoich teamach
- Parent: obecności swoich dzieci

### `attendance.write`
- Oznaczanie obecności/nieobecności
- Dodawanie usprawiedliwień
- Edycja historii obecności

**Context**:
- SuperAdmin: wszystkie obecności
- Coordinator: obecności w swoim klubie
- Trainer: obecności w swoich teamach

---

## 8. Payments (Płatności) - V2

### `payments.read`
- Przeglądanie listy płatności
- Historia płatności gracza
- Zaległości i należności

**Context**:
- SuperAdmin: wszystkie płatności
- Coordinator: płatności w swoim klubie
- Trainer: płatności w swoich teamach (tylko odczyt)
- Parent: płatności swoich dzieci

### `payments.write`
- Rejestrowanie nowych płatności
- Generowanie faktur/rachunków
- Wysyłanie przypomnień o płatnościach
- Edycja kwot i terminów

**Context**:
- SuperAdmin: wszystkie płatności
- Coordinator: płatności w swoim klubie

### `payments.refund`
- Zwracanie płatności
- Anulowanie transakcji
- Korekty księgowe

**Context**:
- Tylko SuperAdmin i Coordinator

---

## 9. Reports (Raporty)

### `reports.view`
- Przeglądanie raportów
- Statystyki i wykresy
- Zestawienia frekwencji/płatności

**Context**:
- SuperAdmin: wszystkie dane
- Coordinator: dane z swojego klubu
- Trainer: dane z swoich teamów

### `reports.export`
- Eksport raportów do PDF/Excel
- Generowanie zbiorczych zestawień
- Dostęp do danych surowych

**Context**:
- SuperAdmin: wszystkie dane
- Coordinator: dane z swojego klubu

---

## 10. Wildcard Permissions (Grupowanie)

### `*.read` = wszystkie uprawnienia odczytu
### `users.*` = wszystkie uprawnienia dla users (read, write, delete, reset_password, manage_permissions)
### `teams.*` = wszystkie uprawnienia dla teams (read, write, delete, assign_trainers)
### `*.*` lub `admin` = wszystkie uprawnienia w systemie (SuperAdmin)

---

## Default Role Presets

### SuperAdmin
```typescript
['*.*'] // Wszystkie uprawnienia
```

### Coordinator
```typescript
[
  'users.read', 'users.write', 'users.reset_password', 'users.manage_permissions',
  'clubs.read', 'clubs.write', 'clubs.settings',
  'teams.*',
  'players.*',
  'bookings.*',
  'fields.*',
  'attendance.*',
  'payments.*',
  'reports.view', 'reports.export'
]
```

### Trainer
```typescript
[
  'teams.read',
  'players.read',
  'bookings.read', 'bookings.write',
  'attendance.read', 'attendance.write',
  'fields.read',
  'reports.view'
]
```

### Parent
```typescript
[
  'players.read', 'players.write', // Tylko swoje dzieci
  'bookings.read',
  'attendance.read',
  'payments.read',
  'fields.read'
]
```

---

## Context-Aware Permissions

Uprawnienia są zawsze weryfikowane w kontekście:
- **clubId** - użytkownik ma dostęp tylko do zasobów swojego klubu
- **teamIds** - trener ma dostęp tylko do swoich teamów
- **playerIds** - parent ma dostęp tylko do swoich dzieci

Wyjątek: **SuperAdmin** (`*.*`) ma dostęp do wszystkiego bez ograniczeń kontekstu.
