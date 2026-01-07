# Rezerwacja Boisk — Wersja Webowa z Firebase

Kompletny plan uruchomienia aplikacji do rezerwacji boisk oparty o React + TypeScript + Tailwind oraz Firebase (Authentication, Firestore, Hosting, Functions, Messaging). Poniżej: architektura, struktura folderów, zasady bezpieczeństwa, szkielety funkcji chmurowych, harmonogram wdrożenia oraz instrukcja szybkiego startu.

## Architektura
- Frontend: React + TypeScript + Tailwind CSS
- Backend: Firebase (BaaS)
- Authentication: Firebase Authentication (email/hasło)
- Database: Cloud Firestore
- Storage: Cloud Storage (opcjonalnie zdjęcia boisk)
- Hosting: Firebase Hosting
- Functions: Cloud Functions (powiadomienia, logika biznesowa)
- Messaging: Firebase Cloud Messaging (powiadomienia push)

### Zalety Firebase
- Szybkie wdrożenie bez własnego backendu
- Automatyczne skalowanie
- Realtime updates (kalendarz aktualizuje się natychmiast)
- Niskie koszty na start (darmowy tier Spark)
- Wbudowane bezpieczeństwo i uwierzytelnianie

## Struktura danych w Firestore
`users/{userId}`: email, displayName, phone, role, createdAt, isActive

`fields/{fieldId}`: name, type, isActive, description, imageUrl

`bookings/{bookingId}`: fieldId, trainerId, trainerName, date, startTime, endTime, status, notes, createdAt, updatedAt, notificationSent

`notifications/{notificationId}`: userId, type, bookingId, message, isRead, createdAt, metadata

`settings/general`: adminEmails, workingHours, minimumBookingDuration, advanceBookingDays, autoApprove

## Zasady bezpieczeństwa (Firestore Rules)
Plik: [firestore.rules](firestore.rules)

## Cloud Functions (Node.js)
- `onBookingCreated`: email do admina + notification
- `onBookingStatusChanged`: email do trenera przy zmianie statusu
- `sendDailyReminders`: codzienne przypomnienia (cron, 08:00 Europe/Warsaw)

## Struktura aplikacji (frontend)
`src/`
- `components/`
	- `auth/` (Login, ProtectedRoute)
	- `calendar/` (CalendarView, DayView, WeekView)
	- `booking/` (BookingForm, BookingCard, BookingList)
	- `admin/` (Dashboard, PendingBookings, FieldManagement, UserManagement)
	- `notifications/` (NotificationBell, NotificationList)
	- `common/` (Header, Sidebar, Loading)
- `hooks/` (useAuth, useBookings, useFields, useNotifications)
- `services/` (firebase.ts, auth.service.ts, booking.service.ts, notification.service.ts)
- `utils/` (dateHelpers.ts, validation.ts)
- `contexts/` (AuthContext.tsx)
- `App.tsx`, `main.tsx`

## System powiadomień
- Email: SendGrid lub Firebase Extension (Trigger Email from Firestore)
- In-app: realtime przez Firestore (onSnapshot), dzwonek + licznik
- Browser Push: Firebase Cloud Messaging (po zgodzie użytkownika)

## Przepływ danych (Real-time)
1) Trener tworzy rezerwację → Firestore (bookings)
2) Trigger Cloud Function → Email do admina + Notification
3) Admin widzi zmiany realtime (onSnapshot) i zatwierdza
4) Trigger Cloud Function → Email do trenera + Notification
5) Trener widzi aktualizację natychmiast

## Harmonogram wdrożenia (6–7 tyg.)
- Sprint 1 (Setup): Firebase projekt, React+TS+Tailwind, Auth, UI
- Sprint 2 (Core): Struktura Firestore, kalendarz, formularz rezerwacji, lista własnych rezerwacji
- Sprint 3 (Admin): Dashboard, zatwierdzanie/odrzucanie, zarządzanie boiskami i użytkownikami
- Sprint 4 (Notifications): Functions, Email, in-app, przypomnienia
- Sprint 5 (Polish & Testing): Responsywność, testy, optymalizacje, deploy Hosting

## Koszty Firebase (szacunki)
- Spark (Free): Firestore 50k reads/20k writes dziennie, Functions 125k/mies., Hosting 10GB/mies.
- Blaze (Pay-as-you-go): po przekroczeniu limitów, 50–200 PLN/mies. dla średniego klubu
- Dodatki: SendGrid (100 maili/dzień free lub $15/mies.), domena ~50 PLN/rok

## Bezpieczeństwo i backup
- Rules, App Check, rate limiting w Functions, logowanie operacji
- Codzienny eksport/backup do Cloud Storage (cron)

## Quick Start
Poniższe kroki wykorzystują Vite zamiast CRA (szybszy, nowocześniejszy):

### 1) Zależności i uruchomienie (frontend)
```
npm create vite@latest web -- --template react-ts
cd web
npm install
npm install firebase react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm run dev
```

### 2) Konfiguracja Tailwind
- Zaktualizuj `tailwind.config.js` → `content: ["./index.html", "./src/**/*.{ts,tsx}"]`
- Dodaj do `src/index.css`: `@tailwind base; @tailwind components; @tailwind utilities;`

### 3) Firebase SDK (ENV)
- Utwórz `.env.local` z kluczami: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`

### 4) Inicjalizacja Firebase w kodzie
- Plik: `src/services/firebase.ts`

### 5) Backend (Functions, Hosting, Firestore)
```
npm install -g firebase-tools
firebase login
firebase init
# Wybierz: Firestore, Functions, Hosting, Emulators (opcjonalnie)
```

## Monitoring i Analytics
- Performance Monitoring, Google Analytics, Crashlytics
- Śledzenie: liczba rezerwacji, popularność boisk, czas zatwierdzania, aktywność użytkowników
