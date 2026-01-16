# Nowe funkcje - Styczeń 2026

## 🎨 Hybrydowy widok kalendarza

### Podwójny interfejs - najlepsze z obu światów!

Dla każdego boiska masz teraz **dwa komplementarne widoki obok siebie**:

#### 📱 LEWA STRONA - Szybka rezerwacja (Przyciski)
- **Siatka przycisków** z godzinami 08:00 - 20:00
- Szybkie klikanie do rezerwacji
- Kolory pokazują status:
  - 🔵 **Niebieski** - Twoje rezerwacje (kliknij → edytuj)
  - 🟣 **Fioletowy** - Inne rezerwacje (tylko admin może kliknąć)
  - ⚪ **Biały** - Wolne (kliknij → rezerwuj)
  - ⚫ **Szary** - Zajęte (zablokowane dla trenerów)
- Responsywna siatka 3-4 kolumny
- Idealny do szybkiego dodawania rezerwacji

#### 📊 PRAWA STRONA - Przegląd rezerwacji (Timeline)
- **Wizualny kalendarz** w stylu Google Calendar
- Kolumna czasu po lewej (08:00 - 20:00)
- **Bloki rezerwacji** proporcjonalne do czasu trwania
- Każdy blok pokazuje:
  - ⏰ Godzina rozpoczęcia i zakończenia
  - 👤 Nazwa trenera/klienta
  - ⏱️ Czas i cena (dla dłuższych bloków)
  - ✅ Status płatności
- Idealny do przeglądu i planowania

### Kolorowanie bloków
- 🔵 **Niebieski** - Twoje rezerwacje (możesz edytować)
- 🟢 **Zielony** - Rezerwacje innych trenerów
- 🟣 **Fioletowy** - Rezerwacje zewnętrzne (klienci)

## 🔐 Rola ADMIN

### Nowa rola w systemie
Dodano wsparcie dla roli `admin` w bazie Firebase:
- **Admin = Koordynator** - identyczne uprawnienia
- Jeden system obsługuje obie role
- W interfejsie wyświetla się: "(Koordynator/Admin)"

### Jak ustawić?
W Firestore, w kolekcji `users`, dokument użytkownika:
```json
{
  "email": "admin@example.com",
  "name": "Administrator",
  "role": "admin"
}
```

Albo:
```json
{
  "role": "coordinator"
}
```

Obie role działają tak samo!

## 🎯 Zalety hybrydowego widoku

### Dla użytkowników preferujących przyciski:
- ✅ Szybka rezerwacja jednym kliknięciem
- ✅ Przejrzysty układ przycisków
- ✅ Łatwe skanowanie wolnych terminów
- ✅ Nie trzeba scrollować - wszystko widać

### Dla użytkowników preferujących timeline:
- ✅ Wizualne rozmiary bloków = czas trwania
- ✅ Łatwe sprawdzenie długości rezerwacji
- ✅ Widzisz nakładające się terminy
- ✅ Estetyczny, profesjonalny wygląd

### Najlepsze z obu światów:
- 📱 **Rezerwuj** klikając w przyciski po lewej
- 👀 **Przeglądaj** timeline po prawej
- 🖱️ **Edytuj** klikając w bloki lub przyciski
- 📊 **Planuj** patrząc na wizualny harmonogram

### Responsywność
- **Desktop**: Dwie kolumny obok siebie
- **Mobile/Tablet**: Kolumny ułożone pionowo
- Dostosowuje się automatycznie do rozmiaru ekranu

## 📱 Legenda

Pod każdym boiskiem znajduje się legenda:
- 🔵 Moje rezerwacje
- 🟢 Inne rezerwacje  
- 🟣 Zewnętrzne

## 🚀 Jak to działa?

### Dla trenerów:

#### Szybka rezerwacja (lewa strona):
1. Wybierz datę z górnego paska
2. Zobacz białe przyciski = wolne terminy
3. Kliknij biały przycisk → Formularz rezerwacji
4. Kliknij niebieski przycisk (twoje) → Edycja

#### Timeline (prawa strona):
1. Zobacz wszystkie rezerwacje jako kolorowe bloki
2. Kliknij w pusty slot → Nowa rezerwacja
3. Kliknij w niebieski blok → Edycja swojej rezerwacji
4. Szare tło do klikania między blokami

### Dla koordynatorów/adminów:

#### Pełna kontrola:
1. **Lewa strona**: Klikaj dowolny przycisk (nawet zajęty)
2. **Prawa strona**: Klikaj dowolny blok
3. Wolne sloty → Nowe zgłoszenie zewnętrzne
4. Zajęte sloty → Edycja cudzej rezerwacji
5. Pełny dostęp do wszystkiego

## 🔧 Techniczne

### Lewa kolumna (Przyciski):
- Grid responsywny: 3 kolumny (mobile) → 4 kolumny (desktop)
- Małe przyciski z minimalnym tekstem
- Sprawdzanie `getBookingsForSlot()` dla każdej godziny
- Warunkowe kolorowanie i disabled states

### Prawa kolumna (Timeline):
- Grid dwukolumnowy: [60px czas | reszta bloki]
- Pozycjonowanie absolutne bloków na osi czasu
- Wysokość proporcjonalna do czasu (64px = 1 godzina)
- Z-index dla prawidłowego nakładania
- Hover i shadow dla lepszego feedbacku
- Smooth transitions dla animacji
- Warunkowe pokazywanie detali (dla wyższych bloków)

### Layout:
- CSS Grid: `grid-cols-1 lg:grid-cols-2`
- Responsywny breakpoint na `lg` (1024px)
- Gap 6 (1.5rem) między kolumnami
- Padding i marginesy zoptymalizowane
