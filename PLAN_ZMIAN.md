# Plan Reorganizacji Systemu

## Aktualny stan vs. Docelowy

### Role użytkowników
**Obecnie:**
- superadmin
- admin (koordynator)
- trainer

**Docelowo:**
- superadmin
- coordinator (koordynator klubu)
- trainer (trener zespołu)
- parent (rodzic zawodnika)

## Struktura danych

### Collections w Firestore:

1. **users** (aktualizacja)
   - uid
   - email
   - name
   - role: 'superadmin' | 'coordinator' | 'trainer' | 'parent'
   - clubId: string | null (null tylko dla superadmin)
   - teamId: string | null (wymagane dla trainer i parent)
   - playerId: string | null (wymagane dla parent)
   - active: boolean
   - authProvider: 'password' | 'google'
   - createdAt, createdBy

2. **clubs** (istniejąca)
   - id
   - name
   - address
   - contactEmail
   - contactPhone
   - active
   - createdAt

3. **teams** (nowa)
   - id
   - name
   - clubId
   - coordinatorId (opcjonalnie)
   - trainerId (opcjonalnie)
   - ageGroup (np. "U12", "U15")
   - active
   - createdAt

4. **players** (nowa)
   - id
   - name
   - dateOfBirth
   - teamId
   - clubId
   - parentIds: string[] (lista rodziców)
   - active
   - createdAt

5. **fields** (aktualizacja - dodać clubId)
   - id
   - name
   - clubId
   - color
   - pricePerHour
   - availableHours
   - active

6. **bookings** (aktualizacja - dodać clubId, teamId)
   - id
   - fieldId
   - clubId
   - teamId (opcjonalnie)
   - date
   - startTime
   - endTime
   - trainerId
   - trainerName
   - price
   - paid
   - settled

## Hierarchia dostępu

### SuperAdmin
- Zarządzanie klubami (CRUD)
- Tworzenie koordynatorów i przypisywanie do klubów
- Dostęp do wszystkich modułów wszystkich klubów
- Zarządzanie wszystkimi użytkownikami

### Coordinator (Koordynator klubu)
- Zarządzanie zespołami w swoim klubie (CRUD)
- Tworzenie trenerów i przypisywanie do zespołów
- Tworzenie rodziców i przypisywanie do zespołów
- Zarządzanie boiskami w swoim klubie
- Zarządzanie rezerwacjami w swoim klubie
- Widzi tylko dane swojego klubu

### Trainer (Trener zespołu)
- Zarządzanie zawodnikami w swoim zespole (CRUD)
- Tworzenie rodziców i przypisywanie do zawodników
- Rezerwacje boisk dla swojego zespołu
- Widzi tylko dane swojego klubu i zespołu

### Parent (Rodzic zawodnika)
- Przeglądanie informacji o swoim zawodniku
- Przeglądanie rezerwacji swojego zespołu
- Tylko odczyt

## Moduły aplikacji

### Moduł 1: Zarządzanie użytkownikami
Dostępny dla: SuperAdmin, Coordinator, Trainer

Funkcje:
- Lista użytkowników (z filtrowaniem według roli i klubu)
- Tworzenie użytkowników
- Edycja użytkowników
- Aktywacja/dezaktywacja
- Reset hasła
- Zarządzanie klubami (tylko SuperAdmin)
- Zarządzanie zespołami (SuperAdmin, Coordinator)
- Zarządzanie zawodnikami (SuperAdmin, Coordinator, Trainer)

### Moduł 2: Rezerwacja boisk
Dostępny dla: wszyscy (z różnymi uprawnieniami)

Funkcje:
- Kalendarz rezerwacji (filtrowany po klubie)
- Tworzenie rezerwacji (Coordinator, Trainer)
- Zarządzanie boiskami (SuperAdmin, Coordinator)
- Historia rezerwacji
- Rozliczenia (Coordinator)

## Kolejność implementacji

1. ✅ Aktualizacja typów i interfejsów (UserProfile, nowe typy)
2. ✅ Utworzenie serwisów: team.service.ts, player.service.ts
3. ✅ Aktualizacja user.service.ts (nowe role, walidacje)
4. ✅ Aktualizacja AuthContext (nowe helpery ról)
5. ✅ Komponenty zarządzania zespołami: TeamManagement.tsx
6. ✅ Komponenty zarządzania zawodnikami: PlayerManagement.tsx
7. ✅ Aktualizacja UserManagement.tsx (nowe role, zespoły)
8. ✅ Aktualizacja firestore.rules
9. ✅ Reorganizacja App.tsx na moduły
10. ✅ Aktualizacja komponentu rezerwacji (clubId, teamId)
11. ✅ Aktualizacja FieldManagement (clubId)
12. ✅ Testy i walidacja

## Uwagi techniczne

- Wszystkie zmiany zachowują kompatybilność wsteczną tam gdzie to możliwe
- Stary admin → coordinator (kompatybilność nazw)
- Migracja danych będzie wymagana dla istniejących użytkowników
- Firestore rules muszą być zaktualizowane dla nowych kolekcji
