# Informacje o migracji do nowego interfejsu

## Co zostało zmienione?

### 1. Usunięto routing (React Router)
- Aplikacja działa teraz w trybie single-page z zakładkami
- Wszystkie widoki są dostępne przez system zakładek w górnej części aplikacji
- Nie ma już osobnych tras URL - wszystko dzieje się w jednym komponencie

### 2. Nowy interfejs użytkownika
- Nowoczesny, responsywny design z Tailwind CSS
- Ikony z biblioteki lucide-react
- Intuicyjny kalendarz z widokiem 14 dni
- Kolorowe karty ze statystykami
- Modalne okna do tworzenia i edycji rezerwacji

### 3. Zachowana integracja z Firebase
- **Authentication**: System logowania przez Firebase Auth (email/hasło)
- **Firestore**: 
  - Kolekcja `users` - dane użytkowników (id, email, name, role)
  - Kolekcja `fields` - boiska (id, name)
  - Kolekcja `bookings` - rezerwacje
  - Kolekcja `rentalRequests` - zgłoszenia zewnętrzne
  - Kolekcja `settings` - ustawienia cennika
- **Real-time updates**: Wszystkie dane są synchronizowane w czasie rzeczywistym

### 4. Role użytkowników
- **admin** / **coordinator** - pełny dostęp:
  - Kalendarz z możliwością dodawania zgłoszeń zewnętrznych
  - Zarządzanie zgłoszeniami zewnętrznymi
  - Rozliczenia wszystkich trenerów
  - Ustawienia cennika
  - Edycja wszystkich rezerwacji
  
- **trainer** - ograniczony dostęp:
  - Kalendarz z możliwością rezerwacji
  - Własne rezerwacje z rozliczeniami
  - Edycja i usuwanie własnych rezerwacji
  - Ustawienia cennika (odczyt)

**Uwaga**: Role `admin` i `coordinator` są traktowane identycznie - obie dają pełne uprawnienia.

## Wymagana struktura danych w Firestore

### Kolekcja `users` (wymagane dla każdego użytkownika)
```javascript
{
  email: "trener@example.com",
  name: "Jan Kowalski",
  role: "trainer" // lub "coordinator" lub "admin"
}
```
**Ważne**: 
- Dokument w `users` musi mieć ID równe UID użytkownika z Firebase Auth!
- Role `admin` i `coordinator` są traktowane identycznie

### Kolekcja `fields` (boiska)
```javascript
{
  name: "Boisko 1",
  type: "outdoor", // opcjonalne
  isActive: true // opcjonalne
}
```

### Kolekcja `bookings` (rezerwacje)
```javascript
{
  pitchId: "field_id",
  date: "2026-01-15",
  startTime: "14:00",
  duration: 60, // minuty
  trainerId: "user_id",
  trainerName: "Jan Kowalski",
  price: 100,
  paid: false,
  createdAt: Timestamp
}
```

### Kolekcja `rentalRequests` (zgłoszenia zewnętrzne)
```javascript
{
  pitchId: "field_id",
  date: "2026-01-15",
  startTime: "14:00",
  duration: 60,
  clientName: "Firma XYZ",
  clientPhone: "+48 123 456 789",
  status: "new", // new / approved / rejected
  price: 100,
  createdAt: Timestamp
}
```

### Kolekcja `settings`
```javascript
{
  fees: {
    perHour: {
      default: 100
    }
  }
}
```

## Jak uruchomić?

1. Upewnij się, że masz skonfigurowany Firebase:
   - Plik `.env` z VITE_FIREBASE_* zmiennymi
   - Włączone Firebase Authentication (Email/Password)
   - Utworzone kolekcje w Firestore

2. Zainstaluj zależności:
```bash
npm install
```

3. Uruchom aplikację:
```bash
npm run dev
```

4. Otwórz http://localhost:5173

## Pierwsze kroki po uruchomieniu

1. **Utwórz użytkownika w Firebase Authentication**
   - W konsoli Firebase → Authentication → Users
   - Dodaj użytkownika z emailem i hasłem

2. **Utwórz dokument użytkownika w Firestore**
   - Kolekcja: `users`
   - ID dokumentu: UID użytkownika z Authentication
   - Pola: `email`, `name`, `role` (admin / coordinator / trainer)

3. **Dodaj boiska**
   - Kolekcja: `fields`
   - Dokumenty z polem `name`

4. **(Opcjonalnie) Dodaj ustawienia cennika**
   - Kolekcja: `settings`
   - Dowolny dokument z obiektem `fees.perHour.default`

## Główne funkcje

### Kalendarz - hybrydowy widok (przyciski + timeline)
- Wybór daty z następnych 14 dni
- **Podwójny interfejs dla każdego boiska**:

#### Lewa strona - Przyciski rezerwacji:
  - Siatka przycisków godzinowych (08:00 - 20:00)
  - Kolorowe przyciski:
    - Biały: wolny termin (kliknij → rezerwuj)
    - Niebieski: Twoja rezerwacja (kliknij → edytuj)
    - Fioletowy: inna rezerwacja (tylko admin może kliknąć)
    - Szary: zajęte (zablokowane)
  - Szybka rezerwacja jednym kliknięciem

#### Prawa strona - Timeline Google Calendar:
  - **Wizualne bloki rezerwacji** proporcjonalne do czasu
  - Kolory bloków:
    - Niebieski: Twoje rezerwacje
    - Zielony: Rezerwacje innych trenerów
    - Fioletowy: Rezerwacje zewnętrzne
  - Każdy blok pokazuje:
    - Godzinę rozpoczęcia i zakończenia
    - Nazwę trenera/klienta
    - Czas trwania i cenę
    - Status płatności (jeśli zapłacone)
  - Kliknięcie w pusty slot → nowa rezerwacja
  - Kliknięcie w blok → edycja (jeśli masz uprawnienia)

### Rezerwacje (trainer)
- Kliknięcie wolnego slotu → formularz rezerwacji
- Możliwość ustawienia czasu trwania (15, 30, 60, 90, 120 min)
- Możliwość zmiany ceny
- Edycja własnych rezerwacji
- Oznaczanie jako zapłacone

### Zgłoszenia zewnętrzne (coordinator)
- Kliknięcie wolnego slotu → formularz zgłoszenia
- Dane klienta (imię, telefon)
- Zatwierdzenie/odrzucenie zgłoszeń w zakładce "Zgłoszenia zewnętrzne"

### Rozliczenia (coordinator)
- Statystyki dla każdego trenera
- Lista wszystkich rezerwacji
- Oznaczanie płatności

## Rozwiązywanie problemów

### Nie mogę się zalogować
- Sprawdź czy użytkownik istnieje w Firebase Authentication
- Sprawdź czy dokument użytkownika istnieje w Firestore `users/{uid}`
- Sprawdź poprawność zmiennych środowiskowych Firebase

### Nie widzę boisk
- Dodaj dokumenty do kolekcji `fields` z polem `name`

### Błędy w konsoli
- Sprawdź czy wszystkie wymagane pola są wypełnione w dokumentach Firestore
- Sprawdź reguły bezpieczeństwa Firestore

## Różnice względem poprzedniej wersji

| Poprzednia wersja | Nowa wersja |
|-------------------|-------------|
| Routing z React Router | Zakładki w jednym widoku |
| Wiele komponentów | Jeden monolityczny komponent |
| Sidebar + Header | Zintegrowana nawigacja w header |
| Separate pages | Wszystko w App.tsx |
| Login jako osobna strona | Modal logowania |

## Zalety nowego rozwiązania

✅ Prostszy w utrzymaniu (jeden plik)
✅ Szybsze przełączanie między widokami (bez przeładowań)
✅ Bardziej intuicyjny interfejs
✅ Lepsze UX z modalami
✅ Responsywny design out of the box
✅ Zachowana integracja z Firebase
✅ Real-time updates dla wszystkich danych
