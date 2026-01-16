# Nowe funkcje - Styczeń 2026

## 🔐 System rejestracji i zarządzania użytkownikami

### Rejestracja
- **Rejestracja przez email**: Użytkownicy mogą się zarejestrować podając email, hasło i imię
- **Rejestracja przez Google**: Integracja z Google Sign-In dla szybszej rejestracji
- **System aktywacji**: Nowe konta wymagają aktywacji przez administratora
- **Walidacja**: 
  - Hasło minimum 6 znaków
  - Weryfikacja powtórzonego hasła
  - Wymagane imię i nazwisko

### Zarządzanie użytkownikami (tylko admin/koordynator)
Nowa zakładka "Użytkownicy" z funkcjami:
- **Aktywuj konto** - zatwierdź nowego użytkownika
- **Dezaktywuj konto** - tymczasowo zablokuj dostęp
- **Usuń konto** - trwale usuń użytkownika
- **Reset hasła** - wyślij link resetujący na email użytkownika
- **Podgląd statusu** - zobacz oczekujące aktywacje (pomarańczowy badge)

## ⚽ Zarządzanie boiskami

### Nowa zakładka "Boiska" (tylko admin/koordynator)
Funkcje:
- **Dodaj boisko** - twórz nowe boiska
- **Edytuj boisko** - zmień parametry istniejącego boiska
- **Usuń boisko** - usuń boisko (tylko jeśli brak rezerwacji)

### Parametry boiska:
- **Nazwa** - np. "Boisko 1", "Orlik główny"
- **Kolor** - wybór koloru dla łatwiejszej identyfikacji w kalendarzu
- **Cena za godzinę** - indywidualna cena dla każdego boiska
- **Dostępność standardowa** - godziny otwarcia (od-do)
- **Dostępność niestandardowa** - możliwość ustawienia specjalnych godzin dla wybranych dni (przyszła funkcja)

## 🎨 Kolorowe rezerwacje

### Kalendarz
- Każde boisko ma przypisany unikalny kolor
- Własne rezerwacje wyświetlane są w kolorze boiska
- Cudze rezerwacje w zielonym
- Zewnętrzne w fioletowym
- Legenda pod kalendarzem wyjaśnia znaczenie kolorów

### Korzyści:
- Szybka identyfikacja rezerwacji na różnych boisach
- Lepsze wizualne odróżnienie w widoku timeline
- Personalizacja według preferencji klubu

## 🔁 Rezerwacje cykliczne

### Funkcje:
- **Częstotliwość**:
  - Co tydzień (weekly)
  - Co 2 tygodnie (biweekly)
  - Co miesiąc (monthly)
- **Data zakończenia** - określ do kiedy powtarzać rezerwację
- **Automatyczne tworzenie** - system tworzy wszystkie rezerwacje jednocześnie
- **Informacja o liczbie** - komunikat pokazuje ile rezerwacji zostało utworzonych

### Zastosowanie:
- Treningi regularne (np. każdy wtorek o 18:00)
- Zajęcia grupowe powtarzające się w stałym rytmie
- Oszczędność czasu - nie trzeba rezerwować ręcznie każdego tygodnia

## ⏰ Dokładny czas zakończenia

### Nowe pole "Godzina końca"
- **15-minutowe sloty** - wybieraj czas końca w odstępach 15 minut
- **Automatyczne obliczanie** - duration aktualizuje się automatycznie
- **Elastyczność** - możliwość wpisania dokładnego czasu trwania lub wyboru godziny końca
- **Step 900 sekund** - picker czasu wspiera 15-minutowe interwały

### Przykłady:
- Start: 10:00, Koniec: 11:30 → Duration: 90 minut
- Start: 14:15, Koniec: 15:45 → Duration: 90 minut
- Start: 18:00, Koniec: 18:45 → Duration: 45 minut

## 🔒 Bezpieczeństwo

### Zaktualizowane reguły Firestore:
- **Aktywni użytkownicy** - tylko aktywowani użytkownicy mogą tworzyć rezerwacje
- **Rejestracja** - pozwolenie na tworzenie dokumentów użytkowników (dla rejestracji)
- **Admin/Koordynator** - obie role mają pełne uprawnienia administracyjne
- **Własne rezerwacje** - użytkownicy mogą edytować tylko swoje rezerwacje

### Walidacja:
- Automatyczne wylogowanie nieaktywnych użytkowników
- Sprawdzanie statusu `active` przy każdej operacji
- Fallback dla użytkowników bez pełnych danych

## 📋 Zmiany w interfejsie

### Ekran logowania/rejestracji:
- Przełącznik między trybami "Logowanie" / "Rejestracja"
- Formularz rejestracji z walidacją
- Przycisk "Zarejestruj przez Google" z ikoną
- Informacja o wymaganej aktywacji

### Nawigacja:
- Nowe zakładki "Użytkownicy" i "Boiska" dla adminów
- Liczniki oczekujących aktywacji (pomarańczowy badge)
- Ikony: Shield dla użytkowników, Settings dla boisk

### Modal rezerwacji:
- Rozbudowany o opcje cykliczne
- Pole wyboru godziny końca
- Checkbox "Rezerwacja cykliczna" z dodatkowymi opcjami
- Automatyczna cena z uwzględnieniem ceny boiska

## 🚀 Jak używać nowych funkcji

### Dla użytkowników:
1. Kliknij "Rejestracja" na ekranie logowania
2. Wypełnij formularz (imię, email, hasło)
3. Poczekaj na aktywację przez administratora
4. Po aktywacji zaloguj się i korzystaj z systemu

### Dla administratorów:
1. Przejdź do zakładki "Użytkownicy"
2. Zobacz listę oczekujących (pomarańczowy badge)
3. Kliknij "Aktywuj" przy wybranym użytkowniku
4. Użytkownik otrzyma dostęp do systemu

### Zarządzanie boiskami:
1. Przejdź do zakładki "Boiska"
2. Kliknij "+ Dodaj boisko"
3. Ustaw nazwę, kolor i cenę
4. Określ godziny dostępności
5. Zapisz - boisko pojawi się w kalendarzu

### Rezerwacje cykliczne:
1. Utwórz rezerwację normalnie
2. Zaznacz checkbox "Rezerwacja cykliczna"
3. Wybierz częstotliwość (tydzień/2 tygodnie/miesiąc)
4. Ustaw datę zakończenia
5. Kliknij "Zarezerwuj" - system utworzy serie

## 🐛 Znane ograniczenia

- Rezerwacje cykliczne nie sprawdzają kolizji dla przyszłych dat (należy upewnić się, że termin jest wolny)
- Dostępność niestandardowa boisk (specjalne godziny dla wybranych dni) będzie dodana w przyszłości
- Reset hasła wymaga skonfigurowanego SMTP w Firebase
- Usuwanie użytkownika z Firebase Authentication wymaga ręcznej akcji (tylko dokument Firestore jest usuwany)

## 📚 Struktura danych

### Użytkownik (users):
```typescript
{
  id: string
  email: string
  name: string
  role: 'trainer' | 'coordinator' | 'admin'
  active: boolean
  createdAt: string
}
```

### Boisko (fields):
```typescript
{
  id: string
  name: string
  color: string  // hex, np. '#3b82f6'
  pricePerHour: number
  availableHours: {
    start: string  // 'HH:MM'
    end: string    // 'HH:MM'
  }
  customAvailability?: Array<{
    date: string
    start: string
    end: string
  }>
}
```

### Rezerwacja (bookings):
```typescript
{
  id: string
  pitchId: string
  date: string
  startTime: string
  endTime?: string
  duration: number
  trainerId: string
  trainerName: string
  trainerEmail?: string
  price: number
  paid: boolean
  external?: boolean
  recurring?: {
    enabled: boolean
    frequency: 'weekly' | 'biweekly' | 'monthly'
    endDate: string
    parentId?: string
  }
  createdAt: Timestamp
}
```

## 🔄 Migracja istniejących danych

Istniejące dane są w pełni kompatybilne:
- Stare rezerwacje bez `endTime` działają normalnie
- Boiska bez `color` używają domyślnego niebieskiego (#3b82f6)
- Użytkownicy bez `active` są traktowani jako aktywni (backward compatibility)
- Ceny boisk fallback'ują do globalnej ceny domyślnej

## 📞 Kontakt

W razie problemów lub pytań dotyczących nowych funkcji, skontaktuj się z administratorem systemu.
