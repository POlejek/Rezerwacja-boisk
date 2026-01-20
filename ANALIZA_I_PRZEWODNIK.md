# Kompleksowa Analiza i Przewodnik Migracji Systemu

## 1. ANALIZA OBECNEGO SYSTEMU

### 1.1 Aktualny Stan
**Funkcjonalności:**
- Logowanie (email/hasło + Google)
- Zarządzanie użytkownikami (superadmin, admin, trainer)
- Rezerwacje boisk (kalendarz, historia)
- Zarządzanie boiskami
- Podstawowe uprawnienia

**Ograniczenia:**
- Brak hierarchii klub → zespół → zawodnik → rodzic
- Brak wieloklubow­ości w pełnym wymiarze
- Brak zarządzania zespołami
- Brak profili zawodników
- Brak modularnej struktury aplikacji
- Wszystko w jednym monolicie App.tsx (~2500 linii)

### 1.2 Docelowy Stan
**Wymagania:**
- Multi-tenant (wiele klubów w jednej instancji)
- Hierarchia: SuperAdmin → Coordinator → Trainer → Parent
- Moduły: Zarządzanie Użytkownikami + Rezerwacje
- Pełna izolacja danych między klubami
- Zarządzanie zespołami i zawodnikami
- Relacje rodzic-zawodnik-zespół

---

## 2. ANALIZA RYNKU I DOBRE PRAKTYKI

### 2.1 Porównanie z Konkurencją

#### TeamSnap (Leader w US)
**Funkcjonalności:**
- ✅ Multi-tenant z pełną izolacją
- ✅ Zarządzanie roster (składy)
- ✅ Komunikacja (wiadomości, powiadomienia)
- ✅ Harmonogramy treningów i meczów
- ✅ Obsługa nieobecności
- ✅ Płatności online
- ✅ Dokumenty (zgody, formularze)
- ✅ Statystyki zawodników
- ✅ Mobile-first (aplikacje iOS/Android)

**Lekcje:**
- Prosty onboarding (3 kroki do pierwszego zespołu)
- Dashboard per rola (różny widok dla coordinator/trainer/parent)
- Real-time notifications
- Offline mode

#### SportsEngine (Comprehensive)
**Funkcjonalności:**
- ✅ Liga/Club management
- ✅ Rejestracje online
- ✅ E-commerce (sprzedaż strojów)
- ✅ Website builder dla klubów
- ✅ Background checks (weryfikacja trenerów)
- ✅ Insurance management
- ✅ Fundraising tools

**Lekcje:**
- Pełna platforma, nie tylko rezerwacje
- Integracje z płatnościami (Stripe, PayPal)
- Compliance (GDPR, weryfikacje)

#### Mindbody (Rezerwacje)
**Funkcjonalności:**
- ✅ Multi-location (wiele lokalizacji)
- ✅ Zaawansowane rezerwacje (recurring, waitlist)
- ✅ Point of sale (POS)
- ✅ Marketing automation
- ✅ Customer CRM
- ✅ Reporting & analytics
- ✅ Staff management

**Lekcje:**
- Booking engine z konfliktami czasowymi
- Waitlist (lista oczekujących)
- Automated reminders (przypomnienia SMS/email)
- Capacity management

#### Coachlogix (Coaching)
**Funkcjonalności:**
- ✅ Session planning (plany treningów)
- ✅ Video analysis
- ✅ Performance tracking
- ✅ Progress reports
- ✅ Exercise library

**Lekcje:**
- Treningi jako "products"
- Templates dla planów
- Progress tracking

### 2.2 Kluczowe Funkcjonalności (Priority Matrix)

#### MUST HAVE (MVP):
1. **Multi-tenancy** - izolacja klubów
2. **Hierarchia ról** - superadmin/coordinator/trainer/parent
3. **Zespoły** - CRUD, przypisania
4. **Zawodnicy** - profile, przypisania do zespołów
5. **Rezerwacje** - per klub, kalendarz
6. **Boiska** - per klub
7. **Podstawowa komunikacja** - email notifications

#### SHOULD HAVE (V2):
8. **Dashboard** - różny dla każdej roli
9. **Płatności** - Stripe integration
10. **Obecności** - tracking na treningach
11. **Raporty** - podstawowe statystyki
12. **Dokumenty** - upload/przechowywanie zgód
13. **Mobile optimization** - responsive design
14. **Bulk operations** - masowe działania

#### NICE TO HAVE (V3):
15. **Mobile apps** - iOS/Android
16. **Messaging** - in-app chat
17. **Video storage** - treningi/mecze
18. **Advanced analytics** - dashboardy BI
19. **API** - integracje zewnętrzne
20. **White-label** - branding per klub

---

## 3. ARCHITEKTURA DOCELOWA

### 3.1 Wzorce Projektowe

#### Multi-Tenancy Pattern
**Wybór: Shared Database + Tenant Discriminator (clubId)**

**Zalety:**
- Prostsza infrastruktura
- Łatwiejsze backup/restore
- Niższe koszty
- Lepsze wykorzystanie zasobów

**Wady:**
- Wymaga starannej implementacji izolacji
- Ryzyka bezpieczeństwa (query injection)
- Scaling limitations

**Alternatywa:** Database per Tenant
- Droższa
- Lepsza izolacja
- Trudniejsza w utrzymaniu

**Rekomendacja:** Zostajemy przy Shared Database, ale z bardzo ostrymi zasadami:
- Każda query MUSI filtrować po clubId (RLS-style)
- Firestore rules jako drugi layer obrony
- Audyting wszystkich operacji

#### Module Pattern (Feature-based)
```
src/
  modules/
    auth/               # Moduł autentykacji
    user-management/    # Moduł zarządzania użytkownikami
    bookings/          # Moduł rezerwacji
  shared/
    components/        # Wspólne komponenty
    services/          # Wspólne serwisy
    types/            # Wspólne typy
```

**Zalety:**
- Separation of concerns
- Łatwe testowanie
- Możliwość lazy loading
- Team ownership (różne zespoły = różne moduły)

#### RBAC (Role-Based Access Control)
**Hierarchia uprawnień:**
```
superadmin: ['*']  // Wszystko
coordinator: [
  'users:read:club',
  'users:write:club',
  'teams:*:club',
  'players:*:club',
  'bookings:*:club',
  'fields:*:club'
]
trainer: [
  'users:read:team',
  'players:*:team',
  'bookings:read:club',
  'bookings:create:team'
]
parent: [
  'players:read:own',
  'bookings:read:team'
]
```

### 3.2 Model Danych (Entity-Relationship)

```
┌──────────────┐
│   Clubs      │
│  (Kluby)     │
└──────┬───────┘
       │ 1:N
       │
┌──────▼───────┐        ┌──────────────┐
│   Teams      ├───────►│ Users        │
│  (Zespoły)   │  N:1   │(Coordinator) │
└──────┬───────┘        └──────────────┘
       │ 1:N
       │
┌──────▼───────┐        ┌──────────────┐
│   Players    ├───────►│ Users        │
│ (Zawodnicy)  │  N:1   │  (Trainer)   │
└──────┬───────┘        └──────────────┘
       │ N:M
       │
       │               ┌──────────────┐
       └──────────────►│ Users        │
                  N:M  │  (Parents)   │
                       └──────────────┘

┌──────────────┐       ┌──────────────┐
│   Fields     │       │  Bookings    │
│  (Boiska)    │◄──────┤ (Rezerwacje) │
└──────────────┘  1:N  └──────────────┘
       │ N:1                  │ N:1
       └──────────────────────┘
              Clubs
```

### 3.3 Struktura Firestore

```
clubs/                              # Kluby
  {clubId}/
    name: string
    address: string
    settings: {}
    active: boolean

teams/                              # Zespoły
  {teamId}/
    clubId: string (indexed)
    name: string
    ageGroup: string
    coordinatorId: string
    trainerId: string (nullable)
    active: boolean

players/                            # Zawodnicy
  {playerId}/
    clubId: string (indexed)
    teamId: string (indexed)
    name: string
    dateOfBirth: string
    parentIds: string[]
    active: boolean

users/                              # Użytkownicy
  {uid}/
    email: string
    name: string
    role: enum
    clubId: string (indexed, nullable dla superadmin)
    teamId: string (nullable)
    playerId: string (nullable, dla parents)
    active: boolean

fields/                             # Boiska
  {fieldId}/
    clubId: string (indexed)
    name: string
    pricePerHour: number
    active: boolean

bookings/                           # Rezerwacje
  {bookingId}/
    clubId: string (indexed)
    fieldId: string (indexed)
    teamId: string (nullable, indexed)
    date: string (indexed)
    startTime: string
    endTime: string
    trainerId: string
    price: number
    paid: boolean

attendance/                         # Obecności (V2)
  {attendanceId}/
    bookingId: string
    playerId: string
    status: 'present' | 'absent' | 'excused'

payments/                          # Płatności (V2)
  {paymentId}/
    clubId: string
    userId: string
    amount: number
    status: enum
    stripeId: string
```

**Indexy Composite (Firestore):**
```
users: clubId + role
teams: clubId + active
players: clubId + active
players: teamId + active
bookings: clubId + date
bookings: fieldId + date
```

### 3.4 Firestore Security Rules (Nowe)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function isSuperAdmin() {
      return isAuthenticated() && getUserData().role == 'superadmin';
    }
    
    function isCoordinator() {
      return isAuthenticated() && getUserData().role == 'coordinator';
    }
    
    function isTrainer() {
      return isAuthenticated() && getUserData().role == 'trainer';
    }
    
    function belongsToClub(clubId) {
      return getUserData().clubId == clubId;
    }
    
    function belongsToTeam(teamId) {
      return getUserData().teamId == teamId;
    }
    
    // Clubs - tylko superadmin
    match /clubs/{clubId} {
      allow read: if isAuthenticated();
      allow write: if isSuperAdmin();
    }
    
    // Teams
    match /teams/{teamId} {
      allow read: if isAuthenticated() && 
        (isSuperAdmin() || belongsToClub(resource.data.clubId));
      allow create: if isAuthenticated() && 
        (isSuperAdmin() || (isCoordinator() && belongsToClub(request.resource.data.clubId)));
      allow update, delete: if isAuthenticated() && 
        (isSuperAdmin() || (isCoordinator() && belongsToClub(resource.data.clubId)));
    }
    
    // Players
    match /players/{playerId} {
      allow read: if isAuthenticated() && 
        (isSuperAdmin() || 
         belongsToClub(resource.data.clubId) ||
         belongsToTeam(resource.data.teamId) ||
         request.auth.uid in resource.data.parentIds);
      allow create: if isAuthenticated() && 
        (isSuperAdmin() || 
         (isCoordinator() && belongsToClub(request.resource.data.clubId)) ||
         (isTrainer() && belongsToTeam(request.resource.data.teamId)));
      allow update, delete: if isAuthenticated() && 
        (isSuperAdmin() || 
         (isCoordinator() && belongsToClub(resource.data.clubId)) ||
         (isTrainer() && belongsToTeam(resource.data.teamId)));
    }
    
    // Users
    match /users/{userId} {
      allow read: if isAuthenticated() && 
        (isSuperAdmin() || 
         belongsToClub(resource.data.clubId) ||
         request.auth.uid == userId);
      allow create: if isAuthenticated() && 
        (isSuperAdmin() || isCoordinator() || isTrainer());
      allow update: if isAuthenticated() && 
        (isSuperAdmin() || 
         (isCoordinator() && belongsToClub(resource.data.clubId)) ||
         request.auth.uid == userId);
      allow delete: if isSuperAdmin();
    }
    
    // Fields
    match /fields/{fieldId} {
      allow read: if isAuthenticated() && 
        (isSuperAdmin() || belongsToClub(resource.data.clubId));
      allow write: if isAuthenticated() && 
        (isSuperAdmin() || (isCoordinator() && belongsToClub(resource.data.clubId)));
    }
    
    // Bookings
    match /bookings/{bookingId} {
      allow read: if isAuthenticated() && 
        (isSuperAdmin() || 
         belongsToClub(resource.data.clubId) ||
         belongsToTeam(resource.data.teamId));
      allow create: if isAuthenticated() && 
        (isSuperAdmin() || isCoordinator() || isTrainer());
      allow update: if isAuthenticated() && 
        (isSuperAdmin() || 
         (isCoordinator() && belongsToClub(resource.data.clubId)));
      allow delete: if isAuthenticated() && 
        (isSuperAdmin() || isCoordinator());
    }
  }
}
```

---

## 4. PLAN MIGRACJI (PHASED APPROACH)

### FAZA 0: PRZYGOTOWANIE (1-2 dni)
**Zadania:**
- [x] Stworzenie dokumentacji (ten plik)
- [ ] Code freeze (nie wprowadzać nowych funkcji do App.tsx)
- [ ] Backup bazy danych
- [ ] Utworzenie gałęzi `feature/multi-tenant-refactor`
- [ ] Setup środowiska testowego

### FAZA 1: FUNDAMENTY (3-5 dni)

#### 1.1 Typy i Interfejsy
**Pliki:**
- `src/types/index.ts` (nowy, centralne typy)
- Aktualizacja `UserProfile` w `auth.service.ts`

**Zadania:**
```typescript
// src/types/index.ts
export type Role = 'superadmin' | 'coordinator' | 'trainer' | 'parent';

export interface Club {
  id: string;
  name: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  settings?: ClubSettings;
  active: boolean;
  createdAt: string;
}

export interface ClubSettings {
  bookingAdvanceDays: number; // Ile dni wcześniej można rezerwować
  bookingMinDuration: number; // Min czas rezerwacji (min)
  bookingMaxDuration: number; // Max czas rezerwacji (min)
  currency: string;
  timezone: string;
}

export interface Team {
  id: string;
  name: string;
  clubId: string;
  coordinatorId?: string;
  trainerId?: string;
  ageGroup?: string;
  description?: string;
  active: boolean;
  createdAt: string;
}

export interface Player {
  id: string;
  name: string;
  dateOfBirth?: string;
  teamId: string;
  clubId: string;
  parentIds: string[];
  jerseyNumber?: number;
  position?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: Role;
  clubId: string | null;
  teamId?: string | null;
  playerId?: string | null;
  active: boolean;
  authProvider: 'password' | 'google';
  createdAt: string;
  lastLogin?: any;
}
```

#### 1.2 Serwisy Podstawowe
**Pliki:**
- [x] `src/services/team.service.ts` (nowy)
- [x] `src/services/player.service.ts` (nowy)
- [ ] `src/services/club.service.ts` (nowy)
- [ ] Aktualizacja `user.service.ts`

**Zadania:**
- Implementacja CRUD dla teams
- Implementacja CRUD dla players
- Implementacja CRUD dla clubs
- Aktualizacja createUser z nowymi rolami

#### 1.3 Context i Helpery
**Pliki:**
- Aktualizacja `src/contexts/AuthContext.tsx`

**Zadania:**
```typescript
// Nowe helpery w AuthContext
const isSuperAdmin = () => userProfile?.role === 'superadmin';
const isCoordinator = () => userProfile?.role === 'coordinator';
const isTrainer = () => userProfile?.role === 'trainer';
const isParent = () => userProfile?.role === 'parent';

const canManageClub = () => isSuperAdmin();
const canManageTeams = () => isSuperAdmin() || isCoordinator();
const canManagePlayers = () => isSuperAdmin() || isCoordinator() || isTrainer();
const canManageBookings = () => isSuperAdmin() || isCoordinator() || isTrainer();
```

### FAZA 2: NOWE KOMPONENTY (5-7 dni)

#### 2.1 Struktura Modułów
```
src/
  modules/
    auth/
      components/
        LoginForm.tsx
        ChangePassword.tsx
      LoginPage.tsx
      
    user-management/
      components/
        UserList.tsx
        UserForm.tsx
        UserPasswordReset.tsx
        ClubList.tsx (nowy)
        ClubForm.tsx (nowy)
        TeamList.tsx (nowy)
        TeamForm.tsx (nowy)
        PlayerList.tsx (nowy)
        PlayerForm.tsx (nowy)
      UserManagementModule.tsx
      
    bookings/
      components/
        CalendarView.tsx
        BookingForm.tsx
        BookingList.tsx
        FieldManagement.tsx
      BookingsModule.tsx
      
  App.tsx (główny router)
```

#### 2.2 Komponenty do Stworzenia

**ClubManagement.tsx** (tylko SuperAdmin)
- Lista klubów
- Formularz dodawania/edycji klubu
- Aktywacja/dezaktywacja klubów
- Statystyki klubu (liczba zespołów, użytkowników)

**TeamManagement.tsx** (SuperAdmin, Coordinator)
- Lista zespołów (filtrowana po klubie dla coordinator)
- Formularz dodawania/edycji zespołu
- Przypisywanie trenera do zespołu
- Lista zawodników zespołu (podgląd)

**PlayerManagement.tsx** (SuperAdmin, Coordinator, Trainer)
- Lista zawodników (filtrowana po klubie/zespole)
- Formularz dodawania/edycji zawodnika
- Przypisywanie rodziców do zawodnika
- Import CSV (bulk add)

**Dashboard.tsx** (różny per rola)
```
SuperAdmin Dashboard:
- Liczba klubów
- Łączna liczba użytkowników
- Aktywne rezerwacje dzisiaj
- Przychody (jeśli płatności)

Coordinator Dashboard:
- Statystyki klubu
- Zespoły i liczba zawodników
- Nadchodzące rezerwacje
- Nierozliczone rezerwacje

Trainer Dashboard:
- Mój zespół (zawodnicy)
- Moje rezerwacje
- Kalendarz treningów

Parent Dashboard:
- Moje dzieci
- Harmonogram zespołu
- Obecności dziecka (future)
```

### FAZA 3: MIGRACJA ISTNIEJĄCYCH (3-4 dni)

#### 3.1 Aktualizacja Komponentów Rezerwacji
**Pliki:**
- `src/modules/bookings/components/BookingForm.tsx`
- `src/modules/bookings/components/CalendarView.tsx`

**Zmiany:**
- Dodać pole `teamId` (opcjonalne, dropdown z zespołami)
- Filtrowanie boisk po `clubId`
- Walidacja uprawnień (trainer może rezerwować tylko dla swojego zespołu)

#### 3.2 Aktualizacja Field Management
**Pliki:**
- `src/modules/bookings/components/FieldManagement.tsx`

**Zmiany:**
- Dodać pole `clubId` (wymagane)
- Dla coordinator - automatycznie ustawić jego clubId
- Filtrowanie boisk po clubId

#### 3.3 Routing i Nawigacja
**App.tsx:**
```typescript
<Routes>
  <Route path="/login" element={<LoginPage />} />
  
  <Route path="/" element={<ProtectedRoute />}>
    <Route index element={<Dashboard />} />
    
    {/* Moduł zarządzania użytkownikami */}
    <Route path="users" element={<UserManagementModule />}>
      <Route index element={<UserList />} />
      <Route path="clubs" element={<ClubList />} />  {/* tylko superadmin */}
      <Route path="teams" element={<TeamList />} />
      <Route path="players" element={<PlayerList />} />
    </Route>
    
    {/* Moduł rezerwacji */}
    <Route path="bookings" element={<BookingsModule />}>
      <Route index element={<CalendarView />} />
      <Route path="fields" element={<FieldManagement />} />
      <Route path="history" element={<BookingHistory />} />
    </Route>
  </Route>
</Routes>
```

### FAZA 4: FIRESTORE RULES (1 dzień)
- Deploy nowych rules (patrz sekcja 3.4)
- Testy uprawnień dla każdej roli
- Audit log setup (opcjonalnie)

### FAZA 5: MIGRACJA DANYCH (1-2 dni)

#### Script Migracyjny
```javascript
// migrate-data.js
// 1. Zmiana 'admin' → 'coordinator' w users
// 2. Dodanie clubId do fields
// 3. Dodanie clubId do bookings
// 4. Utworzenie przykładowych teams i players dla testów
```

### FAZA 6: TESTOWANIE (2-3 dni)
- Testy jednostkowe (services)
- Testy integracyjne (components)
- Testy E2E (Playwright/Cypress)
- Manual QA per rola

### FAZA 7: DEPLOYMENT (1 dzień)
- Merge do main
- Deploy na production
- Monitoring

---

## 5. DODATKOWE FUNKCJONALNOŚCI (ROADMAP)

### V2 (Kolejne 2-3 miesiące)

#### 5.1 Komunikacja
**Notifications System:**
- Email notifications (SendGrid/Firebase Extensions)
- SMS notifications (Twilio)
- Push notifications (FCM)

**Typy notyfikacji:**
- Nowa rezerwacja (→ coordinator, trainer)
- Zmiana rezerwacji (→ wszyscy zainteresowani)
- Przypomnienie o treningu (→ parent, trainer)
- Płatność (→ parent)

#### 5.2 Obecności
**Attendance Tracking:**
- Rejestracja obecności na treningu (trainer)
- Historia obecności zawodnika
- Raporty obecności (coordinator)
- Automated reminders dla nieobecnych

**Implementation:**
```typescript
interface Attendance {
  id: string;
  bookingId: string;
  playerId: string;
  status: 'present' | 'absent' | 'excused' | 'late';
  notes?: string;
  markedBy: string; // uid trenera
  markedAt: string;
}
```

#### 5.3 Płatności
**Payment Integration (Stripe):**
- Opłaty za rezerwacje
- Składki klubowe
- Historia płatności
- Faktury automatyczne

**Subscription Model:**
- Free tier (1 klub, 2 zespoły, 50 zawodników)
- Pro tier ($49/month - unlimited)
- Enterprise tier (custom pricing)

#### 5.4 Dokumenty
**Document Management:**
- Upload zgód rodziców
- Certyfikaty trenerów
- Polisy ubezpieczeniowe
- Automatyczne przypomnienia o wygasających dokumentach

**Storage:**
- Firebase Storage
- Folder structure: `/clubs/{clubId}/documents/{type}/{filename}`
- Encryption at rest

#### 5.5 Raporty i Analityka
**Reports:**
- Wykorzystanie boisk (heatmap)
- Przychody per boisko/zespół
- Obecności per zespół
- Top trainers (by bookings)

**Analytics Dashboard:**
- Google Analytics integration
- Custom events tracking
- Conversion funnels

### V3 (Długoterminowo)

#### 5.6 Mobile Apps
**React Native:**
- Shared codebase z web (React)
- Native features (push, camera, geolocation)
- Offline mode (local storage + sync)

**Features:**
- QR code check-in (attendance)
- Live scores (dla meczów)
- Photo/video upload

#### 5.7 Advanced Features
**AI/ML:**
- Predykcja obłożenia boisk
- Smart scheduling (suggest optimal times)
- Player performance analytics

**Integrations:**
- Calendar sync (Google Calendar, Outlook)
- Accounting (QuickBooks, Xero)
- Marketing (Mailchimp)

**API:**
- REST API dla integracji
- Webhooks
- Developer portal

---

## 6. KOSZTY I ZASOBY

### 6.1 Szacowany Czas

| Faza | Zadania | Czas |
|------|---------|------|
| 0 | Przygotowanie | 1-2 dni |
| 1 | Fundamenty | 3-5 dni |
| 2 | Nowe komponenty | 5-7 dni |
| 3 | Migracja istniejących | 3-4 dni |
| 4 | Firestore rules | 1 dzień |
| 5 | Migracja danych | 1-2 dni |
| 6 | Testowanie | 2-3 dni |
| 7 | Deployment | 1 dzień |
| **TOTAL** | **MVP** | **17-25 dni** |

**Założenia:**
- 1 developer full-time
- Doświadczenie z React + Firebase
- Bez blockerów

### 6.2 Infrastruktura (Firebase)

**Spark Plan (Free):**
- ❌ Za mało - brak Cloud Functions
- ❌ Limit 50K reads/day

**Blaze Plan (Pay-as-you-go):**
- ✅ Cloud Functions
- ✅ Unlimited operations
- **Szacowane koszty (100 users, 1000 bookings/month):**
  - Firestore: ~$10-20/month
  - Cloud Functions: ~$5-10/month
  - Storage: ~$5/month
  - Hosting: ~$0 (w ramach free tier)
  - **Total: ~$20-35/month**

**Scaling (1000 users, 10K bookings/month):**
- Firestore: ~$100-150/month
- Cloud Functions: ~$30-50/month
- Storage: ~$20-30/month
- **Total: ~$150-230/month**

### 6.3 Zespół

**Minimalna konfiguracja:**
- 1x Full-stack Developer (React + Firebase)

**Optymalna konfiguracja:**
- 1x Frontend Developer (React)
- 1x Backend Developer (Firebase + Cloud Functions)
- 0.5x UX/UI Designer
- 0.5x QA Tester

---

## 7. RYZYKA I MITYGACJA

### 7.1 Ryzyka Techniczne

| Ryzyko | Prawdopodobieństwo | Wpływ | Mitygacja |
|--------|-------------------|-------|-----------|
| Problemy z migracją danych | Średnie | Wysoki | Backup + dry run + rollback plan |
| Performance issues (large clubs) | Niskie | Średni | Pagination + caching + indexy |
| Security breach (data leak) | Niskie | Krytyczny | Firestore rules + auditing + penetration testing |
| Breaking changes w API | Niskie | Średni | Versioning + deprecated warnings |

### 7.2 Ryzyka Biznesowe

| Ryzyko | Prawdopodobieństwo | Wpływ | Mitygacja |
|--------|-------------------|-------|-----------|
| User adoption (resistance to change) | Średnie | Wysoki | Training + documentation + onboarding |
| Competition | Wysokie | Średni | Unique features + better UX + pricing |
| Scaling costs | Średnie | Średni | Monitoring + optimization + pricing tiers |

---

## 8. METRYKI SUKCESU (KPIs)

### 8.1 Technical KPIs
- **Page load time:** < 2s (p95)
- **API response time:** < 500ms (p95)
- **Error rate:** < 0.1%
- **Uptime:** > 99.5%

### 8.2 Business KPIs
- **User onboarding:** < 5 min (first booking)
- **Active users:** > 70% weekly active
- **Booking completion rate:** > 90%
- **Support tickets:** < 5% of users

### 8.3 User Satisfaction
- **NPS Score:** > 50
- **CSAT:** > 4.5/5
- **Feature adoption:** > 60% (new features)

---

## 9. CHECKLIST GOTOWOŚCI

### Pre-Development
- [ ] Plan zatwierdzony
- [ ] Zespół skompletowany
- [ ] Środowisko testowe gotowe
- [ ] Backup production database
- [ ] Feature flag system setup

### Development
- [ ] Wszystkie typy zdefiniowane
- [ ] Serwisy zaimplementowane
- [ ] Komponenty UI gotowe
- [ ] Firestore rules zaktualizowane
- [ ] Testy napisane (min. 80% coverage)

### Pre-Launch
- [ ] Manual QA completed
- [ ] Performance testing passed
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Training materials prepared
- [ ] Rollback plan ready

### Post-Launch
- [ ] Monitoring setup
- [ ] Error tracking (Sentry)
- [ ] User feedback channel
- [ ] Analytics tracking
- [ ] Support plan

---

## 10. NASTĘPNE KROKI

### Natychmiast (Dzisiaj):
1. ✅ Review tego dokumentu
2. Decyzja: GO / NO-GO / MODIFY
3. Utworzenie feature branch
4. Kick-off meeting

### Tydzień 1:
- Faza 0 + Faza 1 (Fundamenty)
- Daily standups
- Code reviews

### Tydzień 2:
- Faza 2 (Nowe komponenty)
- Progress demo

### Tydzień 3:
- Faza 3 + 4 (Migracja + Rules)
- Integration testing

### Tydzień 4:
- Faza 5 + 6 + 7 (Migracja danych + Testing + Deploy)
- Launch readiness review
- GO-LIVE 🚀

---

## APPENDIX A: Przykładowe User Stories

### US-001: Jako SuperAdmin chcę utworzyć nowy klub
**Kryteria akceptacji:**
- Mogę wprowadzić nazwę, adres, kontakt
- Mogę ustawić podstawowe ustawienia (waluta, timezone)
- Klub pojawia się na liście klubów
- Mogę przypisać koordynatora do klubu

### US-002: Jako Coordinator chcę utworzyć zespół
**Kryteria akceptacji:**
- Widzę formularz tylko dla mojego klubu
- Mogę wprowadzić nazwę, grupę wiekową
- Mogę przypisać trenera z listy (tylko z mojego klubu)
- Zespół pojawia się na liście zespołów

### US-003: Jako Trainer chcę dodać zawodnika do zespołu
**Kryteria akceptacji:**
- Widzę formularz tylko dla mojego zespołu
- Mogę wprowadzić dane zawodnika
- Mogę przypisać rodziców (z listy lub utworzyć nowych)
- Zawodnik pojawia się na liście

### US-004: Jako Parent chcę zobaczyć harmonogram zespołu
**Kryteria akceptacji:**
- Widzę kalendarz rezerwacji mojego zespołu
- Widzę szczegóły treningu (czas, boisko, trener)
- Otrzymuję powiadomienie o zmianach

### US-005: Jako Coordinator chcę zarezerwować boisko
**Kryteria akceptacji:**
- Widzę tylko boiska mojego klubu
- Widzę dostępne sloty czasowe
- Mogę wybrać zespół (opcjonalnie)
- Rezerwacja zapisuje się w kalendarzu

---

## APPENDIX B: Przykładowe Queries Firestore

```typescript
// 1. Pobranie zespołów klubu (dla coordinator)
const teamsQuery = query(
  collection(db, 'teams'),
  where('clubId', '==', userProfile.clubId),
  where('active', '==', true),
  orderBy('name')
);

// 2. Pobranie zawodników zespołu (dla trainer)
const playersQuery = query(
  collection(db, 'players'),
  where('teamId', '==', userProfile.teamId),
  where('active', '==', true),
  orderBy('name')
);

// 3. Pobranie rezerwacji klubu na dzisiaj (dla coordinator)
const today = new Date().toISOString().split('T')[0];
const bookingsQuery = query(
  collection(db, 'bookings'),
  where('clubId', '==', userProfile.clubId),
  where('date', '==', today),
  orderBy('startTime')
);

// 4. Pobranie dzieci rodzica (dla parent)
const childrenQuery = query(
  collection(db, 'players'),
  where('parentIds', 'array-contains', userProfile.uid),
  where('active', '==', true)
);

// 5. Stats: Liczba użytkowników per rola w klubie
const usersStatsQuery = query(
  collection(db, 'users'),
  where('clubId', '==', clubId),
  where('active', '==', true)
);
// Client-side grouping by role
```

---

## APPENDIX C: Migracja Danych (Script)

```javascript
// migrate-to-v2.js
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function migrateUsers() {
  console.log('Migracja użytkowników: admin → coordinator');
  
  const usersSnapshot = await db.collection('users')
    .where('role', '==', 'admin').get();
  
  const batch = db.batch();
  usersSnapshot.docs.forEach(doc => {
    batch.update(doc.ref, { role: 'coordinator' });
  });
  
  await batch.commit();
  console.log(`✅ Zaktualizowano ${usersSnapshot.size} użytkowników`);
}

async function addClubIdToFields() {
  console.log('Dodawanie clubId do boisk');
  
  // Zakładamy że wszystkie boiska należą do pierwszego klubu
  const clubs = await db.collection('clubs').limit(1).get();
  const defaultClubId = clubs.docs[0].id;
  
  const fieldsSnapshot = await db.collection('fields').get();
  
  const batch = db.batch();
  fieldsSnapshot.docs.forEach(doc => {
    if (!doc.data().clubId) {
      batch.update(doc.ref, { clubId: defaultClubId });
    }
  });
  
  await batch.commit();
  console.log(`✅ Zaktualizowano ${fieldsSnapshot.size} boisk`);
}

async function addClubIdToBookings() {
  console.log('Dodawanie clubId do rezerwacji');
  
  // Pobierz mapę fieldId → clubId
  const fieldsSnapshot = await db.collection('fields').get();
  const fieldClubMap = {};
  fieldsSnapshot.docs.forEach(doc => {
    fieldClubMap[doc.id] = doc.data().clubId;
  });
  
  // Aktualizuj rezerwacje
  const bookingsSnapshot = await db.collection('bookings')
    .where('clubId', '==', null).get();
  
  const batch = db.batch();
  bookingsSnapshot.docs.forEach(doc => {
    const clubId = fieldClubMap[doc.data().fieldId];
    if (clubId) {
      batch.update(doc.ref, { clubId });
    }
  });
  
  await batch.commit();
  console.log(`✅ Zaktualizowano ${bookingsSnapshot.size} rezerwacji`);
}

async function createSampleTeamsAndPlayers() {
  console.log('Tworzenie przykładowych zespołów i zawodników');
  
  const clubs = await db.collection('clubs').get();
  
  for (const clubDoc of clubs.docs) {
    const clubId = clubDoc.id;
    
    // Stwórz 2 przykładowe zespoły
    const team1Ref = await db.collection('teams').add({
      name: 'Juniorzy U12',
      clubId: clubId,
      ageGroup: 'U12',
      active: true,
      createdAt: new Date().toISOString()
    });
    
    const team2Ref = await db.collection('teams').add({
      name: 'Seniorzy',
      clubId: clubId,
      ageGroup: 'Senior',
      active: true,
      createdAt: new Date().toISOString()
    });
    
    // Stwórz przykładowych zawodników
    await db.collection('players').add({
      name: 'Jan Kowalski',
      dateOfBirth: '2012-05-15',
      teamId: team1Ref.id,
      clubId: clubId,
      parentIds: [],
      active: true,
      createdAt: new Date().toISOString()
    });
    
    console.log(`✅ Utworzono zespoły i zawodników dla klubu ${clubId}`);
  }
}

// Main migration
async function main() {
  try {
    await migrateUsers();
    await addClubIdToFields();
    await addClubIdToBookings();
    await createSampleTeamsAndPlayers();
    
    console.log('\n🎉 Migracja zakończona pomyślnie!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Błąd migracji:', error);
    process.exit(1);
  }
}

main();
```

**Użycie:**
```bash
# Backup first!
firebase firestore:export gs://your-bucket/backups/pre-migration

# Dry run (testowe środowisko)
node migrate-to-v2.js

# Production
# ... review, then run on production
```

---

## ZAKOŃCZENIE

Ten dokument zawiera kompletny plan refaktoryzacji systemu do architektury multi-tenant z pełną hierarchią ról. 

**Kluczowe zalecenia:**
1. **Stopniowe wdrażanie** - nie wszystko naraz
2. **Testy na każdym kroku** - automatyczne + manualne
3. **Dokumentacja** - dla użytkowników i developerów
4. **Monitoring** - od pierwszego dnia w production
5. **Feedback loop** - zbieraj opinie użytkowników

**Gotowość do startu:**
- Plan jest kompletny ✅
- Architektura zaprojektowana ✅
- Ryzyka zidentyfikowane ✅
- Timeline realistyczny ✅

**Decyzja:** Zaczynamy? 🚀
