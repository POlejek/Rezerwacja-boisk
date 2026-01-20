import React, { useState, useEffect } from 'react';
import { Calendar, Users, DollarSign, CheckCircle, Clock, UserCheck, LogOut, Edit2, X, CalendarDays, ChevronLeft, ChevronRight, Settings, Trash2, Shield } from 'lucide-react';
import { useAuthContext } from './contexts/AuthContext';
import { login, logout, loginWithGoogle } from './services/auth.service';
import UserManagement from './components/admin/UserManagement';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp,
  getDocs,
  writeBatch,
  setDoc
} from 'firebase/firestore';
import { db } from './services/firebase';

type UserRole = 'coordinator' | 'trainer' | 'admin';

type UserData = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active?: boolean;
  createdAt?: string;
};

type Booking = {
  id: string;
  pitchId: string;
  date: string;
  startTime: string;
  endTime?: string;
  duration: number;
  trainerId: string;
  trainerName: string;
  trainerEmail?: string;
  price: number;
  paid: boolean;
  settled?: boolean; // Potwierdzenie rozliczenia przez admina
  external?: boolean;
  clientName?: string; // Dla zewnętrznych rezerwacji
  clientEmail?: string; // Dla zewnętrznych rezerwacji
  clientPhone?: string;
  customPrice?: number | null;
  recurring?: {
    enabled: boolean;
    frequency: 'weekly' | 'biweekly' | 'monthly';
    endDate: string;
    parentId?: string;
  };
};

type ExternalRequest = {
  id: string;
  pitchId: string;
  date: string;
  startTime: string;
  duration: number;
  clientName: string;
  clientPhone: string;
  status: string;
  price: number;
};

type Pitch = {
  id: string;
  name: string;
  color?: string;
  pricePerHour?: number;
  availableHours?: {
    start: string;
    end: string;
  };
  customAvailability?: Array<{
    date: string;
    start: string;
    end: string;
  }>;
};

export default function App() {
  const { user, loading: authLoading } = useAuthContext();
  const [currentUserData, setCurrentUserData] = useState<UserData | null>(null);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [editingUserRole, setEditingUserRole] = useState<{[key: string]: string}>({});
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [externalRequests, setExternalRequests] = useState<ExternalRequest[]>([]);
  const [defaultPricePerHour, setDefaultPricePerHour] = useState(100);
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date()); // Dla widoku miesięcznego
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [editingPitch, setEditingPitch] = useState<Pitch | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  
  const [bookingForm, setBookingForm] = useState({
    pitchId: '',
    date: '',
    startTime: '',
    endTime: '',
    duration: 60,
    customPrice: null as number | null,
    isExternal: false,
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    recurring: {
      enabled: false,
      frequency: 'weekly' as 'weekly' | 'biweekly' | 'monthly',
      endDate: ''
    }
  });

  const [pitchForm, setPitchForm] = useState({
    name: '',
    color: '#3b82f6',
    pricePerHour: 100,
    availableStart: '08:00',
    availableEnd: '22:00'
  });

  const [externalForm, setExternalForm] = useState({
    pitchId: '',
    date: '',
    startTime: '',
    duration: 60,
    clientName: '',
    clientPhone: '',
    customPrice: null as number | null
  });

  // Fetch user data from Firestore
  useEffect(() => {
    if (!user) {
      setCurrentUserData(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const userData = {
          id: snapshot.id,
          email: data.email || user.email || '',
          name: data.name || user.displayName || user.email || 'Użytkownik',
          role: data.role || 'trainer',
          active: data.active !== false // Domyślnie true dla starych kont
        } as UserData;
        setCurrentUserData(userData);
        
        // Wyloguj jeśli konto nieaktywne
        if (userData.active === false) {
          alert('Twoje konto oczekuje na aktywację przez administratora.');
          logout();
        }
      } else {
        // Dokument nie istnieje - utwórz go automatycznie
        console.warn('Dokument użytkownika nie istnieje w Firestore. Tworzę nowy dokument...');
        try {
          await setDoc(doc(db, 'users', user.uid), {
            email: user.email || '',
            name: user.displayName || user.email || 'Użytkownik',
            role: 'trainer',
            active: false, // Nowi użytkownicy wymagają aktywacji
            createdAt: new Date().toISOString()
          });
          
          alert('Konto zostało utworzone! Poczekaj na aktywację przez administratora.');
          await logout();
        } catch (error) {
          console.error('Błąd podczas tworzenia dokumentu użytkownika:', error);
          // Fallback - pozwól użytkownikowi pracować z danymi z Authentication
          setCurrentUserData({
            id: user.uid,
            email: user.email || '',
            name: user.displayName || user.email || 'Użytkownik',
            role: 'trainer',
            active: false
          } as UserData);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch all users (tylko dla adminów)
  useEffect(() => {
    if (!currentUserData || !isCoordinator()) return;

    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserData));
      setAllUsers(usersData);
    });

    return () => unsubscribe();
  }, [currentUserData]);

  // Fetch pitches
  useEffect(() => {
    const q = query(collection(db, 'fields'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pitchesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Pitch));
      setPitches(pitchesData);
    });

    return () => unsubscribe();
  }, []);

  // Fetch bookings
  useEffect(() => {
    const q = query(collection(db, 'bookings'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Booking));
      setBookings(bookingsData);
    });

    return () => unsubscribe();
  }, []);

  // Fetch external requests
  useEffect(() => {
    const q = query(collection(db, 'rentalRequests'), where('status', '==', 'new'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ExternalRequest));
      setExternalRequests(requestsData);
    });

    return () => unsubscribe();
  }, []);

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      const settingsDoc = await getDocs(query(collection(db, 'settings')));
      if (!settingsDoc.empty) {
        const settings = settingsDoc.docs[0].data();
        if (settings.fees?.perHour?.default) {
          setDefaultPricePerHour(settings.fees.perHour.default);
        }
      }
    };
    fetchSettings();
  }, []);

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const getNext14Days = () => {
    const days = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  // Funkcje dla widoku miesięcznego
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    const days = [];
    
    // Dodaj puste dni przed pierwszym dniem miesiąca
    const adjustedStart = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1; // Poniedziałek = 0
    for (let i = 0; i < adjustedStart; i++) {
      days.push(null);
    }
    
    // Dodaj wszystkie dni miesiąca
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Dodaj puste dni aby wypełnić ostatni tydzień
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 0; i < remainingDays; i++) {
        days.push(null);
      }
    }
    
    return days;
  };

  const changeMonth = (offset: number) => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };

  const getBookingsForDay = (date: Date | null) => {
    if (!date) return [];
    const dateString = date.toISOString().split('T')[0];
    return bookings.filter(b => b.date === dateString);
  };

  const handleLogin = async () => {
    try {
      await login(loginForm.email, loginForm.password);
      setLoginForm({ email: '', password: '' });
    } catch (error: any) {
      console.error('Błąd logowania:', error);
      
      if (error.message === 'ACCOUNT_NOT_FOUND') {
        alert('Konto nie istnieje w systemie. Skontaktuj się z administratorem.');
      } else if (error.message === 'ACCOUNT_NOT_ACTIVE') {
        alert('Twoje konto jest nieaktywne. Skontaktuj się z administratorem, aby je aktywować.');
      } else if (error.code === 'auth/wrong-password') {
        alert('Nieprawidłowy email lub hasło');
      } else if (error.code === 'auth/user-not-found') {
        alert('Nieprawidłowy email lub hasło');
      } else if (error.code === 'auth/invalid-email') {
        alert('Nieprawidłowy format email');
      } else if (error.code === 'auth/too-many-requests') {
        alert('Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.');
      } else {
        alert('Błąd logowania: ' + (error.message || 'Nieznany błąd'));
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error: any) {
      console.error('Błąd logowania przez Google:', error);
      
      if (error.message === 'ACCOUNT_NOT_FOUND') {
        alert('Konto nie istnieje w systemie. Skontaktuj się z administratorem, aby utworzył Twoje konto.');
      } else if (error.message === 'ACCOUNT_NEEDS_ACTIVATION') {
        alert('Konto utworzone! Poczekaj na aktywację przez administratora.');
      } else if (error.message === 'ACCOUNT_NOT_ACTIVE') {
        alert('Twoje konto oczekuje na aktywację przez administratora.');
      } else {
        alert('Błąd logowania przez Google: ' + (error.message || 'Nieznany błąd'));
      }
    }
  };



  const handleLogout = async () => {
    await logout();
    setActiveTab('calendar');
  };

  // Zarządzanie użytkownikami (admin)
  const handleActivateUser = async (userId: string, role?: string) => {
    try {
      const updateData: any = { active: true };
      if (role) {
        updateData.role = role;
      }
      await updateDoc(doc(db, 'users', userId), updateData);
      alert('Użytkownik aktywowany');
    } catch (error) {
      alert('Błąd aktywacji użytkownika');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      alert('Rola użytkownika zaktualizowana');
    } catch (error) {
      alert('Błąd aktualizacji roli użytkownika');
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { active: false });
      alert('Użytkownik dezaktywowany');
    } catch (error) {
      alert('Błąd dezaktywacji użytkownika');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tego użytkownika?')) return;
    
    try {
      await deleteDoc(doc(db, 'users', userId));
      alert('Użytkownik usunięty');
    } catch (error) {
      alert('Błąd usuwania użytkownika');
    }
  };

  const handleResetUserPassword = async (email: string) => {
    try {
      await resetPassword(email);
      alert('Link do resetowania hasła został wysłany na adres: ' + email);
    } catch (error) {
      alert('Błąd wysyłania emaila resetującego');
    }
  };

  const handleSyncMissingUsers = async () => {
    if (!confirm('Czy chcesz zsynchronizować użytkowników z Firebase Authentication do Firestore? To utworzy dokumenty dla użytkowników, którzy istnieją w Authentication, ale nie w Database.')) return;
    
    try {
      // Import funkcji listUsers z Firebase Admin nie jest dostępny w kliencie
      // Zamiast tego, poprosimy użytkownika aby się ponownie zalogował
      alert('⚠️ Uwaga: Ze względów bezpieczeństwa, Firebase nie pozwala aplikacjom klienckim na listowanie wszystkich użytkowników.\n\nAby zsynchronizować użytkownika olejniczak@gmail.com:\n1. Poproś go aby się wylogował\n2. Następnie zalogował ponownie\n\nSystem automatycznie utworzy jego dokument w Firestore.');
    } catch (error) {
      alert('Błąd synchronizacji');
    }
  };

  // Zarządzanie boiskami (admin)
  const handleSavePitch = async () => {
    if (!pitchForm.name.trim()) {
      alert('Podaj nazwę boiska');
      return;
    }

    try {
      if (editingPitch) {
        await updateDoc(doc(db, 'fields', editingPitch.id), {
          name: pitchForm.name,
          color: pitchForm.color,
          pricePerHour: pitchForm.pricePerHour,
          availableHours: {
            start: pitchForm.availableStart,
            end: pitchForm.availableEnd
          }
        });
        alert('Boisko zaktualizowane');
      } else {
        await addDoc(collection(db, 'fields'), {
          name: pitchForm.name,
          color: pitchForm.color,
          pricePerHour: pitchForm.pricePerHour,
          availableHours: {
            start: pitchForm.availableStart,
            end: pitchForm.availableEnd
          }
        });
        alert('Boisko dodane');
      }
      setShowPitchModal(false);
      setPitchForm({
        name: '',
        color: '#3b82f6',
        pricePerHour: 100,
        availableStart: '08:00',
        availableEnd: '22:00'
      });
      setEditingPitch(null);
    } catch (error) {
      alert('Błąd zapisywania boiska');
    }
  };

  const handleDeletePitch = async (pitchId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć to boisko?')) return;
    
    try {
      await deleteDoc(doc(db, 'fields', pitchId));
      alert('Boisko usunięte');
    } catch (error) {
      alert('Błąd usuwania boiska');
    }
  };

  const openPitchModal = (pitch?: Pitch) => {
    if (pitch) {
      setEditingPitch(pitch);
      setPitchForm({
        name: pitch.name,
        color: pitch.color || '#3b82f6',
        pricePerHour: pitch.pricePerHour || 100,
        availableStart: pitch.availableHours?.start || '08:00',
        availableEnd: pitch.availableHours?.end || '22:00'
      });
    } else {
      setEditingPitch(null);
      setPitchForm({
        name: '',
        color: '#3b82f6',
        pricePerHour: 100,
        availableStart: '08:00',
        availableEnd: '22:00'
      });
    }
    setShowPitchModal(true);
  };

  const checkOverlap = (pitchId: string, date: string, startTime: string, duration: number, excludeBookingId: string | null = null) => {
    const newStart = timeToMinutes(startTime);
    const newEnd = newStart + duration;

    return bookings.some(booking => {
      if (booking.id === excludeBookingId) return false;
      if (booking.pitchId !== pitchId || booking.date !== date) return false;

      const bookingStart = timeToMinutes(booking.startTime);
      const bookingEnd = bookingStart + booking.duration;

      return (newStart < bookingEnd && newEnd > bookingStart);
    });
  };

  const openBookingModal = (pitchId: string, time: string) => {
    setBookingForm({
      pitchId,
      date: selectedDate,
      startTime: time,
      endTime: '',
      duration: 60,
      customPrice: null,
      isExternal: false,
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      recurring: {
        enabled: false,
        frequency: 'weekly',
        endDate: ''
      }
    });
    setShowBookingModal(true);
  };

  const openExternalModal = (pitchId: string, time: string) => {
    setExternalForm({
      pitchId,
      date: selectedDate,
      startTime: time,
      duration: 60,
      clientName: '',
      clientPhone: '',
      customPrice: null
    });
    setShowExternalModal(true);
  };

  const handleCreateBooking = async () => {
    if (!bookingForm.startTime) {
      alert('Wybierz godzinę rozpoczęcia');
      return;
    }

    if (!currentUserData) {
      alert('Błąd: Brak danych użytkownika. Zaloguj się ponownie.');
      return;
    }

    if (!currentUserData.name) {
      alert('Błąd: Brak nazwy użytkownika. Sprawdź swoje dane w bazie.');
      console.error('currentUserData:', currentUserData);
      return;
    }

    // Walidacja dla rezerwacji zewnętrznych
    if (bookingForm.isExternal) {
      if (!bookingForm.clientName.trim()) {
        alert('Podaj imię i nazwisko klienta dla rezerwacji zewnętrznej');
        return;
      }
      if (!bookingForm.clientPhone.trim()) {
        alert('Podaj telefon klienta dla rezerwacji zewnętrznej');
        return;
      }
    }

    // Oblicz duration z endTime jeśli jest podany
    let finalDuration = bookingForm.duration;
    let finalEndTime = bookingForm.endTime;
    
    if (bookingForm.endTime) {
      const startMinutes = timeToMinutes(bookingForm.startTime);
      const endMinutes = timeToMinutes(bookingForm.endTime);
      if (endMinutes <= startMinutes) {
        alert('Godzina końca musi być później niż godzina rozpoczęcia');
        return;
      }
      finalDuration = endMinutes - startMinutes;
    } else if (finalDuration) {
      // Oblicz endTime z duration
      const startMinutes = timeToMinutes(bookingForm.startTime);
      const endMinutes = startMinutes + finalDuration;
      finalEndTime = minutesToTime(endMinutes);
    }

    if (checkOverlap(bookingForm.pitchId, bookingForm.date, bookingForm.startTime, finalDuration)) {
      alert('Ten termin koliduje z inną rezerwacją');
      return;
    }

    try {
      const hoursUsed = finalDuration / 60;
      const pitch = pitches.find(p => p.id === bookingForm.pitchId);
      const pricePerHour = pitch?.pricePerHour || defaultPricePerHour;
      const price = bookingForm.customPrice || (pricePerHour * hoursUsed);

      const bookingData: any = {
        pitchId: bookingForm.pitchId,
        date: bookingForm.date,
        startTime: bookingForm.startTime,
        endTime: finalEndTime,
        duration: finalDuration,
        trainerId: currentUserData.id,
        trainerName: currentUserData.name || currentUserData.email || 'Użytkownik',
        trainerEmail: currentUserData.email,
        price: price,
        paid: false,
        external: bookingForm.isExternal,
        createdAt: Timestamp.now()
      };

      // Dodaj dane kontaktowe jeśli to rezerwacja zewnętrzna
      if (bookingForm.isExternal) {
        bookingData.clientName = bookingForm.clientName;
        bookingData.clientEmail = bookingForm.clientEmail;
        bookingData.clientPhone = bookingForm.clientPhone;
      }

      // Utwórz pierwszą rezerwację
      const docRef = await addDoc(collection(db, 'bookings'), bookingData);

      // Jeśli cykliczna, utwórz następne
      if (bookingForm.recurring.enabled && bookingForm.recurring.endDate) {
        const datesToCreate = calculateRecurringDates(
          bookingForm.date,
          bookingForm.recurring.endDate,
          bookingForm.recurring.frequency
        );

        const batch = writeBatch(db);
        datesToCreate.forEach(date => {
          const recurringData = {
            ...bookingData,
            date,
            recurring: {
              enabled: true,
              frequency: bookingForm.recurring.frequency,
              endDate: bookingForm.recurring.endDate,
              parentId: docRef.id
            }
          };
          const newDocRef = doc(collection(db, 'bookings'));
          batch.set(newDocRef, recurringData);
        });

        await batch.commit();
        alert(`Utworzono rezerwację + ${datesToCreate.length} powtórzeń`);
      } else {
        alert('Rezerwacja została utworzona!');
      }

      setShowBookingModal(false);
      setBookingForm({ 
        pitchId: '', 
        date: '', 
        startTime: '', 
        endTime: '',
        duration: 60, 
        customPrice: null,
        isExternal: false,
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        recurring: {
          enabled: false,
          frequency: 'weekly',
          endDate: ''
        }
      });
    } catch (error) {
      console.error('Błąd podczas tworzenia rezerwacji:', error);
      alert('Błąd podczas tworzenia rezerwacji: ' + (error as Error).message);
    }
  };

  // Funkcja obliczająca daty dla rezerwacji cyklicznych
  const calculateRecurringDates = (startDate: string, endDate: string, frequency: 'weekly' | 'biweekly' | 'monthly'): string[] => {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let current = new Date(start);
    
    while (current <= end) {
      // Dodaj dni zgodnie z częstotliwością
      if (frequency === 'weekly') {
        current.setDate(current.getDate() + 7);
      } else if (frequency === 'biweekly') {
        current.setDate(current.getDate() + 14);
      } else if (frequency === 'monthly') {
        current.setMonth(current.getMonth() + 1);
      }
      
      if (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
      }
    }
    
    return dates;
  };

  const handleEditBooking = async () => {
    if (!editingBooking) return;

    if (checkOverlap(editingBooking.pitchId, editingBooking.date, editingBooking.startTime, editingBooking.duration, editingBooking.id)) {
      alert('Ten termin koliduje z inną rezerwacją');
      return;
    }

    try {
      const hoursUsed = editingBooking.duration / 60;
      const price = editingBooking.customPrice !== null ? editingBooking.customPrice : (defaultPricePerHour * hoursUsed);

      await updateDoc(doc(db, 'bookings', editingBooking.id), {
        date: editingBooking.date,
        startTime: editingBooking.startTime,
        duration: editingBooking.duration,
        price: price,
        updatedAt: Timestamp.now()
      });

      setShowEditModal(false);
      setEditingBooking(null);
      alert('Rezerwacja została zaktualizowana!');
    } catch (error) {
      console.error('Błąd podczas edycji rezerwacji:', error);
      alert('Błąd podczas edycji rezerwacji: ' + (error as Error).message);
    }
  };

  const openEditModal = (booking: Booking) => {
    setEditingBooking({ ...booking, customPrice: booking.price });
    setShowEditModal(true);
  };

  const handleCreateExternalRequest = async () => {
    if (!externalForm.clientName || !externalForm.clientPhone || !externalForm.startTime) {
      alert('Wypełnij wszystkie pola');
      return;
    }

    try {
      const hoursUsed = externalForm.duration / 60;
      const price = externalForm.customPrice || (defaultPricePerHour * hoursUsed);

      await addDoc(collection(db, 'rentalRequests'), {
        pitchId: externalForm.pitchId,
        date: externalForm.date,
        startTime: externalForm.startTime,
        duration: externalForm.duration,
        clientName: externalForm.clientName,
        clientPhone: externalForm.clientPhone,
        status: 'new',
        price: price,
        createdAt: Timestamp.now()
      });

      setShowExternalModal(false);
      setExternalForm({ pitchId: '', date: '', startTime: '', duration: 60, clientName: '', clientPhone: '', customPrice: null });
      alert('Zgłoszenie zostało wysłane!');
    } catch (error) {
      console.error('Błąd podczas tworzenia zgłoszenia:', error);
      alert('Błąd podczas tworzenia zgłoszenia: ' + (error as Error).message);
    }
  };

  const approveRequest = async (requestId: string) => {
    const request = externalRequests.find(r => r.id === requestId);
    if (request) {
      if (checkOverlap(request.pitchId, request.date, request.startTime, request.duration)) {
        alert('Ten termin koliduje z inną rezerwacją');
        return;
      }

      try {
        await addDoc(collection(db, 'bookings'), {
          pitchId: request.pitchId,
          date: request.date,
          startTime: request.startTime,
          duration: request.duration,
          trainerId: 'external',
          trainerName: `Zewnętrzny: ${request.clientName}`,
          price: request.price,
          paid: false,
          external: true,
          clientPhone: request.clientPhone,
          createdAt: Timestamp.now()
        });

        await updateDoc(doc(db, 'rentalRequests', requestId), {
          status: 'approved'
        });
        
        alert('Zgłoszenie zostało zaakceptowane!');
      } catch (error) {
        console.error('Błąd podczas zatwierdzania zgłoszenia:', error);
        alert('Błąd podczas zatwierdzania zgłoszenia: ' + (error as Error).message);
      }
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'rentalRequests', requestId), {
        status: 'rejected'
      });
      alert('Zgłoszenie zostało odrzucone!');
    } catch (error) {
      console.error('Błąd podczas odrzucania zgłoszenia:', error);
      alert('Błąd podczas odrzucania zgłoszenia: ' + (error as Error).message);
    }
  };

  const removeBooking = async (bookingId: string) => {
    try {
      await deleteDoc(doc(db, 'bookings', bookingId));
      alert('Rezerwacja została usunięta!');
    } catch (error) {
      console.error('Błąd podczas usuwania rezerwacji:', error);
      alert('Błąd podczas usuwania rezerwacji: ' + (error as Error).message);
    }
  };

  const togglePaid = async (bookingId: string, currentPaidStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        paid: !currentPaidStatus
      });
      alert(currentPaidStatus ? 'Oznaczenie jako zapłacone zostało odwołane' : 'Rezerwacja została oznaczona jako zapłacona!');
    } catch (error) {
      console.error('Błąd podczas zmiany statusu płatności:', error);
      alert('Błąd podczas zmiany statusu płatności: ' + (error as Error).message);
    }
  };

  const markAsSettled = async (bookingId: string, currentSettledStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        settled: !currentSettledStatus
      });
      alert(currentSettledStatus ? 'Potwierdzenie rozliczenia zostało odwołane' : 'Rozliczenie zostało potwierdzone!');
    } catch (error) {
      console.error('Błąd podczas potwierdzania rozliczenia:', error);
      alert('Błąd podczas potwierdzania rozliczenia: ' + (error as Error).message);
    }
  };

  const getTrainerStats = (trainerId: string) => {
    const trainerBookings = bookings.filter(b => b.trainerId === trainerId);
    const totalSlots = trainerBookings.length;
    const totalHours = trainerBookings.reduce((sum, b) => sum + (b.duration / 60), 0);
    const totalCost = trainerBookings.reduce((sum, b) => sum + b.price, 0);
    const paidAmount = trainerBookings.filter(b => b.paid).reduce((sum, b) => sum + b.price, 0);
    
    return { totalSlots, totalHours, totalCost, paidAmount };
  };

  const getBookingsForSlot = (pitchId: string, date: string, hour: string) => {
    const slotStart = timeToMinutes(hour);
    const slotEnd = slotStart + 60;

    return bookings.filter(booking => {
      if (booking.pitchId !== pitchId || booking.date !== date) return false;
      
      const bookingStart = timeToMinutes(booking.startTime);
      const bookingEnd = bookingStart + booking.duration;

      return (bookingStart < slotEnd && bookingEnd > slotStart);
    });
  };

  // Get all trainers from bookings
  const getAllTrainers = () => {
    const trainersMap = new Map<string, { id: string; name: string }>();
    bookings.forEach(booking => {
      if (!booking.external && !trainersMap.has(booking.trainerId)) {
        trainersMap.set(booking.trainerId, {
          id: booking.trainerId,
          name: booking.trainerName
        });
      }
    });
    return Array.from(trainersMap.values());
  };

  // Sprawdza czy użytkownik ma uprawnienia koordynatora/admina
  const isCoordinator = () => {
    return currentUserData?.role === 'coordinator' || currentUserData?.role === 'admin';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (!user || !currentUserData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-green-100 rounded-full mb-4">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">System Rezerwacji Boisk</h1>
            <p className="text-gray-600 mt-2">Akademia Piłkarska</p>
          </div>

          {/* Formularz logowania */}
          <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Wpisz email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hasło
                </label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Wpisz hasło"
                />
              </div>
              
              <button
                onClick={handleLogin}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium"
              >
                Zaloguj się
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">lub</span>
                </div>
              </div>

              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Zaloguj przez Google
              </button>
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                <p className="font-semibold mb-1">ℹ️ Nie możesz się zalogować?</p>
                <p>Konta są tworzone przez administratorów. Skontaktuj się z administratorem swojego klubu.</p>
              </div>
            </div>
        </div>
      </div>
    );
  }

  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">System Rezerwacji Boisk</h1>
              <p className="text-sm text-gray-600">
                Zalogowany jako: <span className="font-medium">{currentUserData.name}</span>
                {isCoordinator() && <span className="ml-2 text-green-600">(Koordynator/Admin)</span>}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Wyloguj
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition ${
                activeTab === 'calendar'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Kalendarz
            </button>
            
            {isCoordinator() && (
              <>
                <button
                  onClick={() => setActiveTab('monthlyCalendar')}
                  className={`flex items-center gap-2 px-6 py-3 font-medium transition ${
                    activeTab === 'monthlyCalendar'
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                  Kalendarz miesięczny
                </button>
                
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`flex items-center gap-2 px-6 py-3 font-medium transition ${
                    activeTab === 'requests'
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  Zgłoszenia zewnętrzne
                  {externalRequests.length > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {externalRequests.length}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => setActiveTab('settlements')}
                  className={`flex items-center gap-2 px-6 py-3 font-medium transition ${
                    activeTab === 'settlements'
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  Rozliczenia
                </button>

                <button
                  onClick={() => setActiveTab('users')}
                  className={`flex items-center gap-2 px-6 py-3 font-medium transition ${
                    activeTab === 'users'
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Użytkownicy
                  {allUsers.filter(u => u.active === false).length > 0 && (
                    <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {allUsers.filter(u => u.active === false).length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('pitches')}
                  className={`flex items-center gap-2 px-6 py-3 font-medium transition ${
                    activeTab === 'pitches'
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Boiska
                </button>
              </>
            )}
            
            {(currentUserData.role === 'trainer' || isCoordinator()) && (
              <button
                onClick={() => setActiveTab('myBookings')}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition ${
                  activeTab === 'myBookings'
                    ? 'text-green-600 border-b-2 border-green-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                Moje rezerwacje
              </button>
            )}
            
            {(isCoordinator() || currentUserData.role === 'trainer') && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition ${
                  activeTab === 'settings'
                    ? 'text-green-600 border-b-2 border-green-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                Cennik
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Wybierz datę</h2>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {getNext14Days().map(date => {
                  const dateObj = new Date(date);
                  const dayName = dateObj.toLocaleDateString('pl-PL', { weekday: 'short' });
                  const dayNum = dateObj.getDate();
                  const month = dateObj.toLocaleDateString('pl-PL', { month: 'short' });
                  
                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`flex-shrink-0 px-4 py-3 rounded-lg border-2 transition ${
                        selectedDate === date
                          ? 'border-green-600 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium">{dayName}</div>
                      <div className="text-lg font-bold">{dayNum}</div>
                      <div className="text-xs">{month}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {pitches.map(pitch => {
              // Pobierz wszystkie rezerwacje dla tego boiska i wybranej daty
              const dayBookings = bookings.filter(b => b.pitchId === pitch.id && b.date === selectedDate);
              
              return (
                <div key={pitch.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-green-600 text-white px-6 py-3">
                    <h3 className="text-lg font-bold">{pitch.name}</h3>
                  </div>
                  <div className="p-6">
                    {/* Główny grid - dwie kolumny: Przyciski rezerwacji (2/3) + Timeline Calendar (1/3) */}
                    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                      
                      {/* LEWA KOLUMNA - Przyciski godzinowe do szybkiej rezerwacji */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-700 mb-3">Szybka rezerwacja</h4>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {timeSlots.map(time => {
                            const bookingsInSlot = getBookingsForSlot(pitch.id, selectedDate, time);
                            const myBooking = bookingsInSlot.find(b => b.trainerId === currentUserData.id);
                            const pitchColor = pitch.color || '#3b82f6';
                            
                            return (
                              <button
                                key={time}
                                onClick={() => {
                                  if (myBooking) {
                                    // Edycja własnej rezerwacji (trener lub admin)
                                    openEditModal(myBooking);
                                  } else if (bookingsInSlot.length === 0) {
                                    // Puste - rezerwacja dla trenera lub admina
                                    openBookingModal(pitch.id, time);
                                  } else if (bookingsInSlot.length > 0 && isCoordinator()) {
                                    // Admin może edytować cudze rezerwacje
                                    openEditModal(bookingsInSlot[0]);
                                  }
                                }}
                                disabled={bookingsInSlot.length > 0 && !myBooking && !isCoordinator()}
                                style={bookingsInSlot.length > 0 && myBooking ? {
                                  borderColor: pitchColor,
                                  backgroundColor: pitchColor + '20',
                                  color: pitchColor
                                } : {}}
                                className={`p-2 rounded-lg border-2 text-xs font-medium transition ${
                                  bookingsInSlot.length > 0
                                    ? myBooking
                                      ? 'hover:opacity-80 cursor-pointer'
                                      : isCoordinator()
                                      ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 cursor-pointer'
                                      : 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed'
                                    : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
                                }`}
                              >
                                <div className="font-bold">{time}</div>
                                {bookingsInSlot.map(booking => (
                                  <div key={booking.id} className="text-[10px] mt-1 truncate">
                                    {booking.duration}min
                                  </div>
                                ))}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* PRAWA KOLUMNA - Widok timeline Google Calendar (Kompaktowy) */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-700 mb-2">Przegląd</h4>
                        <div className="grid grid-cols-[40px_1fr] gap-0 border-l border-t border-gray-200 rounded-lg overflow-hidden">
                          {/* Kolumna z godzinami */}
                          <div className="border-r border-gray-200 bg-gray-50">
                            {timeSlots.map(time => (
                              <div key={time} className="h-10 border-b border-gray-200 flex items-center justify-end pr-1">
                                <span className="text-[8px] font-medium text-gray-600">{time}</span>
                              </div>
                            ))}
                          </div>
                          
                          {/* Obszar rezerwacji - styl Google Calendar */}
                          <div className="relative border-r border-gray-200 bg-white">
                            {/* Poziome linie dla każdej godziny */}
                            {timeSlots.map(time => (
                              <div 
                                key={time} 
                                className="h-10 border-b border-gray-200 hover:bg-green-50 transition cursor-pointer"
                                onClick={() => {
                                  // Wszyscy mogą rezerwować normalnie (trenerzy i admin)
                                  openBookingModal(pitch.id, time);
                                }}
                              ></div>
                            ))}
                            
                            {/* Rezerwacje jako bloki */}
                            {dayBookings.map(booking => {
                              const startMinutes = timeToMinutes(booking.startTime);
                              const startOfDay = timeToMinutes('08:00');
                              const topPosition = ((startMinutes - startOfDay) / 60) * 40; // 40px per hour (zmniejszone)
                              const height = (booking.duration / 60) * 40;
                              const isMyBooking = booking.trainerId === currentUserData.id;
                              const endTime = minutesToTime(startMinutes + booking.duration);
                              const pitchColor = pitch.color || '#3b82f6';
                              
                              return (
                                <div
                                  key={booking.id}
                                  className="absolute left-0.5 right-0.5 rounded p-1 shadow-sm cursor-pointer transition-all hover:shadow-md text-white"
                                  style={{
                                    top: `${topPosition}px`,
                                    height: `${height}px`,
                                    minHeight: '20px',
                                    zIndex: 10,
                                    backgroundColor: isMyBooking ? pitchColor : (booking.external ? '#9333ea' : '#22c55e'),
                                    borderColor: isMyBooking ? pitchColor : (booking.external ? '#7e22ce' : '#16a34a'),
                                    borderWidth: '1px',
                                    borderStyle: 'solid'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isMyBooking || isCoordinator()) {
                                      openEditModal(booking);
                                    }
                                  }}
                                >
                                  <div className="text-[8px] font-bold truncate leading-tight">{booking.startTime} - {endTime}</div>
                                  <div className="text-[7px] truncate leading-tight">{booking.trainerName}</div>
                                  {height > 30 && (
                                    <>
                                      <div className="text-[7px] truncate leading-tight">{booking.duration}min • {booking.price}zł</div>
                                      {booking.paid && height > 40 && (
                                        <div className="text-[7px] flex items-center gap-0.5">
                                          <CheckCircle className="w-2 h-2" />
                                          <span>✓</span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Legenda */}
                    <div className="mt-4 flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border-2" style={{ backgroundColor: pitch.color || '#3b82f6', borderColor: pitch.color || '#3b82f6' }}></div>
                        <span>Moje rezerwacje ({pitch.name})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded border-2 border-green-600"></div>
                        <span>Inne rezerwacje</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-purple-500 rounded border-2 border-purple-600"></div>
                        <span>Zewnętrzne</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'monthlyCalendar' && isCoordinator() && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Kalendarz miesięczny</h2>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => changeMonth(-1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-lg font-semibold min-w-[200px] text-center">
                    {selectedMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => changeMonth(1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* Kalendarz miesięczny */}
              <div className="grid grid-cols-7 gap-1">
                {/* Nagłówki dni tygodnia */}
                {['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'].map(day => (
                  <div key={day} className="text-center font-bold text-gray-700 py-2 text-sm">
                    {day}
                  </div>
                ))}
                
                {/* Dni miesiąca */}
                {getDaysInMonth(selectedMonth).map((day, index) => {
                  const dayBookings = getBookingsForDay(day);
                  const isToday = day && day.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[100px] border rounded-lg p-1 ${
                        day 
                          ? isToday
                            ? 'bg-green-50 border-green-500 border-2'
                            : 'bg-white hover:bg-gray-50'
                          : 'bg-gray-50'
                      } transition`}
                    >
                      {day && (
                        <>
                          <div className="text-xs font-semibold text-gray-700 mb-1">
                            {day.getDate()}
                          </div>
                          
                          {/* Mini rezerwacje */}
                          <div className="space-y-0.5 overflow-y-auto max-h-[75px]">
                            {dayBookings.slice(0, 4).map(booking => {
                              const pitch = pitches.find(p => p.id === booking.pitchId);
                              const isMyBooking = booking.trainerId === currentUserData?.id;
                              
                              return (
                                <div
                                  key={booking.id}
                                  className={`text-[8px] px-1 py-0.5 rounded truncate cursor-pointer ${
                                    isMyBooking
                                      ? 'bg-blue-500 text-white'
                                      : booking.external
                                      ? 'bg-purple-500 text-white'
                                      : 'bg-green-500 text-white'
                                  }`}
                                  onClick={() => openEditModal(booking)}
                                  title={`${pitch?.name} - ${booking.startTime} - ${booking.trainerName}`}
                                >
                                  {booking.startTime} {pitch?.name}
                                </div>
                              );
                            })}
                            {dayBookings.length > 4 && (
                              <div className="text-[8px] text-gray-500 px-1">
                                +{dayBookings.length - 4} więcej
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Legenda */}
              <div className="mt-4 flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>Moje rezerwacje</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>Inne rezerwacje</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span>Zewnętrzne</span>
                </div>
              </div>
              
              {/* Statystyki miesiąca */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {(() => {
                  const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
                  const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
                  const monthBookings = bookings.filter(b => {
                    const bookingDate = new Date(b.date);
                    return bookingDate >= monthStart && bookingDate <= monthEnd;
                  });
                  
                  const totalBookings = monthBookings.length;
                  const totalRevenue = monthBookings.reduce((sum, b) => sum + b.price, 0);
                  const paidAmount = monthBookings.filter(b => b.paid).reduce((sum, b) => sum + b.price, 0);
                  const externalAmount = monthBookings.filter(b => b.external).reduce((sum, b) => sum + b.price, 0);
                  const internalAmount = monthBookings.filter(b => !b.external).reduce((sum, b) => sum + b.price, 0);
                  const internalCount = monthBookings.filter(b => !b.external).length;
                  const externalCount = monthBookings.filter(b => b.external).length;
                  
                  return (
                    <>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Suma rezerwacji</div>
                        <div className="text-2xl font-bold text-blue-600">{totalBookings}</div>
                        <div className="text-xs text-gray-500 mt-1">{totalRevenue} zł</div>
                      </div>
                      <div className="bg-indigo-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Wewnętrzne</div>
                        <div className="text-2xl font-bold text-indigo-600">{internalCount}</div>
                        <div className="text-xs text-gray-500 mt-1">{internalAmount} zł</div>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Zewnętrzne</div>
                        <div className="text-2xl font-bold text-orange-600">{externalCount}</div>
                        <div className="text-xs text-gray-500 mt-1">{externalAmount} zł</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Przychód</div>
                        <div className="text-2xl font-bold text-green-600">{totalRevenue} zł</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Zapłacone</div>
                        <div className="text-2xl font-bold text-purple-600">{paidAmount} zł</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'requests' && isCoordinator() && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Zgłoszenia zewnętrzne</h2>
            </div>
            <div className="p-6">
              {externalRequests.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Brak zgłoszeń do rozpatrzenia</p>
              ) : (
                <div className="space-y-4">
                  {externalRequests.map(request => {
                    const pitch = pitches.find(p => p.id === request.pitchId);
                    const endTime = minutesToTime(timeToMinutes(request.startTime) + request.duration);
                    return (
                      <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-gray-800">{request.clientName}</h3>
                            <p className="text-sm text-gray-600">Tel: {request.clientPhone}</p>
                            <p className="text-sm text-gray-600 mt-2">
                              {pitch?.name} • {request.date} • {request.startTime} - {endTime} ({request.duration} min)
                            </p>
                            <p className="text-sm font-medium text-green-600 mt-1">
                              Cena: {request.price} zł
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => approveRequest(request.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                            >
                              Zaakceptuj
                            </button>
                            <button
                              onClick={() => rejectRequest(request.id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                            >
                              Odrzuć
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settlements' && isCoordinator() && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Rozliczenia trenerów</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {getAllTrainers().map(trainer => {
                  const stats = getTrainerStats(trainer.id);
                  const unpaid = stats.totalCost - stats.paidAmount;
                  
                  return (
                    <div key={trainer.id} className="border rounded-lg p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">{trainer.name}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600">Rezerwacji</div>
                          <div className="text-2xl font-bold text-blue-600">{stats.totalSlots}</div>
                        </div>
                        <div className="bg-indigo-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600">Godzin</div>
                          <div className="text-2xl font-bold text-indigo-600">{stats.totalHours.toFixed(1)}</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600">Do zapłaty</div>
                          <div className="text-2xl font-bold text-purple-600">{stats.totalCost} zł</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600">Zapłacono</div>
                          <div className="text-2xl font-bold text-green-600">{stats.paidAmount} zł</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600">Pozostało</div>
                          <div className="text-2xl font-bold text-red-600">{unpaid} zł</div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-700 mb-2">Szczegóły rezerwacji:</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {bookings.filter(b => b.trainerId === trainer.id).map(booking => {
                            const pitch = pitches.find(p => p.id === booking.pitchId);
                            const endTime = minutesToTime(timeToMinutes(booking.startTime) + booking.duration);
                            return (
                              <div key={booking.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                                <div className="flex-1">
                                  <div>
                                    {pitch?.name} • {booking.date} • {booking.startTime}-{endTime} ({booking.duration}min)
                                    {booking.external && <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">Zewn.</span>}
                                  </div>
                                  {booking.external && booking.clientName && (
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      Klient: {booking.clientName} {booking.clientPhone && `• ${booking.clientPhone}`}
                                    </div>
                                  )}
                                </div>
                                <span className="flex items-center gap-2">
                                  <span className="font-medium">{booking.price} zł</span>
                                  {booking.paid && (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  )}
                                  {booking.settled && (
                                    <CheckCircle className="w-4 h-4 text-purple-600" />
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'myBookings' && (currentUserData.role === 'trainer' || isCoordinator()) && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Moje rezerwacje i rozliczenia</h2>
            </div>
            <div className="p-6">
              <div className="mb-6">
                {(() => {
                  const stats = getTrainerStats(currentUserData.id);
                  const unpaid = stats.totalCost - stats.paidAmount;
                  
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Rezerwacji</div>
                        <div className="text-2xl font-bold text-blue-600">{stats.totalSlots}</div>
                      </div>
                      <div className="bg-indigo-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Godzin</div>
                        <div className="text-2xl font-bold text-indigo-600">{stats.totalHours.toFixed(1)}</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Do zapłaty</div>
                        <div className="text-2xl font-bold text-purple-600">{stats.totalCost} zł</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Zapłacono</div>
                        <div className="text-2xl font-bold text-green-600">{stats.paidAmount} zł</div>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Pozostało</div>
                        <div className="text-2xl font-bold text-red-600">{unpaid} zł</div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <h3 className="font-bold text-gray-800 mb-3">Lista rezerwacji</h3>
              <div className="space-y-2">
                {bookings.filter(b => b.trainerId === currentUserData.id).length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nie masz jeszcze żadnych rezerwacji</p>
                ) : (
                  bookings.filter(b => b.trainerId === currentUserData.id).map(booking => {
                    const pitch = pitches.find(p => p.id === booking.pitchId);
                    const endTime = minutesToTime(timeToMinutes(booking.startTime) + booking.duration);
                    return (
                      <div key={booking.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                        <div>
                          <p className="font-medium text-gray-800">
                            {pitch?.name} • {booking.date} • {booking.startTime}-{endTime}
                            {booking.external && <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">Zewnętrzna</span>}
                          </p>
                          <p className="text-sm text-gray-600">Czas trwania: {booking.duration} min • Cena: {booking.price} zł</p>
                          {booking.external && booking.clientName && (
                            <p className="text-sm text-gray-600 mt-1">
                              Klient: {booking.clientName}
                              {booking.clientPhone && ` • Tel: ${booking.clientPhone}`}
                              {booking.clientEmail && ` • ${booking.clientEmail}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openEditModal(booking)}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm flex items-center gap-1"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edytuj
                          </button>
                          
                          {/* Przycisk zapłacone - dla użytkownika */}
                          {booking.paid ? (
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-2 text-green-600 font-medium">
                                <CheckCircle className="w-5 h-5" />
                                Zapłacone
                              </span>
                              <button
                                onClick={() => togglePaid(booking.id, booking.paid)}
                                className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm"
                                title="Odwołaj oznaczenie jako zapłacone"
                              >
                                Odwołaj
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => togglePaid(booking.id, booking.paid)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                            >
                              Oznacz jako zapłacone
                            </button>
                          )}

                          {/* Przycisk rozliczenia - tylko dla admina */}
                          {isCoordinator() && booking.paid && (
                            booking.settled ? (
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-2 text-purple-600 font-medium text-sm">
                                  <CheckCircle className="w-4 h-4" />
                                  Rozliczone
                                </span>
                                <button
                                  onClick={() => markAsSettled(booking.id, booking.settled || false)}
                                  className="px-3 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition text-xs"
                                  title="Odwołaj potwierdzenie rozliczenia"
                                >
                                  Cofnij
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => markAsSettled(booking.id, booking.settled || false)}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
                                title="Potwierdź rozliczenie z trenerem"
                              >
                                Potwierdź rozliczenie
                              </button>
                            )
                          )}
                          
                          <button
                            onClick={() => {
                              if (confirm('Czy na pewno chcesz usunąć tę rezerwację?')) {
                                removeBooking(booking.id);
                              }
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                          >
                            Usuń
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Ustawienia cennika</h2>
            </div>
            <div className="p-6">
              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domyślna cena za godzinę (zł)
                </label>
                <input
                  type="number"
                  value={defaultPricePerHour}
                  onChange={(e) => setDefaultPricePerHour(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="0"
                />
                <p className="text-sm text-gray-600 mt-2">
                  Aktualna cena: <span className="font-bold text-green-600">{defaultPricePerHour} zł/godz</span>
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Ta cena będzie używana domyślnie. Możesz ją zmienić dla każdej rezerwacji osobno.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Zarządzanie użytkownikami */}
        {activeTab === 'users' && isCoordinator() && (
          <UserManagement />
        )}

        {/* Zarządzanie boiskami */}
        {activeTab === 'pitches' && isCoordinator() && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Zarządzanie boiskami</h2>
              <button
                onClick={() => openPitchModal()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
              >
                + Dodaj boisko
              </button>
            </div>
            <div className="p-6">
              <div className="grid gap-4">
                {pitches.map(pitch => (
                  <div key={pitch.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded"
                            style={{ backgroundColor: pitch.color || '#3b82f6' }}
                          ></div>
                          <div>
                            <h3 className="font-bold text-gray-800">{pitch.name}</h3>
                            <p className="text-sm text-gray-600">
                              Cena: <span className="font-medium">{pitch.pricePerHour || defaultPricePerHour} zł/godz</span>
                            </p>
                            {pitch.availableHours && (
                              <p className="text-xs text-gray-500">
                                Dostępność: {pitch.availableHours.start} - {pitch.availableHours.end}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openPitchModal(pitch)}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePitch(pitch.id)}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Nowa rezerwacja</h3>
              <button onClick={() => setShowBookingModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Boisko</label>
                <p className="text-gray-900">{pitches.find(p => p.id === bookingForm.pitchId)?.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <p className="text-gray-900">{bookingForm.date}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Godzina rozpoczęcia</label>
                <input
                  type="time"
                  value={bookingForm.startTime}
                  onChange={(e) => setBookingForm({...bookingForm, startTime: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  step="900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Godzina końca (opcjonalnie)</label>
                <input
                  type="time"
                  value={bookingForm.endTime}
                  onChange={(e) => {
                    const newEndTime = e.target.value;
                    setBookingForm({...bookingForm, endTime: newEndTime});
                    // Automatycznie oblicz duration
                    if (bookingForm.startTime && newEndTime) {
                      const start = timeToMinutes(bookingForm.startTime);
                      const end = timeToMinutes(newEndTime);
                      if (end > start) {
                        setBookingForm(prev => ({...prev, duration: end - start, endTime: newEndTime}));
                      }
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  step="900"
                />
                <p className="text-xs text-gray-500 mt-1">Wybierz godzinę końca w 15-minutowych slotach</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Czas trwania (minuty)</label>
                <input
                  type="number"
                  value={bookingForm.duration}
                  onChange={(e) => setBookingForm({...bookingForm, duration: Number(e.target.value), endTime: ''})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  min="15"
                  step="15"
                />
                <p className="text-xs text-gray-500 mt-1">Lub wpisz czas trwania ręcznie</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cena (opcjonalnie)</label>
                <input
                  type="number"
                  value={bookingForm.customPrice || ''}
                  onChange={(e) => setBookingForm({...bookingForm, customPrice: e.target.value ? Number(e.target.value) : null})}
                  placeholder={`Domyślnie: ${((pitches.find(p => p.id === bookingForm.pitchId)?.pricePerHour || defaultPricePerHour) * bookingForm.duration / 60).toFixed(2)} zł`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Zostaw puste, aby użyć domyślnej ceny</p>
              </div>

              {/* Rezerwacja zewnętrzna - tylko dla admina */}
              {isCoordinator() && (
                <div className="border-t pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bookingForm.isExternal}
                      onChange={(e) => setBookingForm({
                        ...bookingForm,
                        isExternal: e.target.checked
                      })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">Rezerwacja zewnętrzna</span>
                  </label>

                  {bookingForm.isExternal && (
                    <div className="mt-3 space-y-3 pl-6 border-l-2 border-orange-300">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Imię i nazwisko klienta *</label>
                        <input
                          type="text"
                          value={bookingForm.clientName}
                          onChange={(e) => setBookingForm({...bookingForm, clientName: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          placeholder="Jan Kowalski"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email klienta</label>
                        <input
                          type="email"
                          value={bookingForm.clientEmail}
                          onChange={(e) => setBookingForm({...bookingForm, clientEmail: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          placeholder="jan.kowalski@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefon klienta *</label>
                        <input
                          type="tel"
                          value={bookingForm.clientPhone}
                          onChange={(e) => setBookingForm({...bookingForm, clientPhone: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          placeholder="+48 123 456 789"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rezerwacje cykliczne */}
              <div className="border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bookingForm.recurring.enabled}
                    onChange={(e) => setBookingForm({
                      ...bookingForm,
                      recurring: { ...bookingForm.recurring, enabled: e.target.checked }
                    })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Rezerwacja cykliczna</span>
                </label>

                {bookingForm.recurring.enabled && (
                  <div className="mt-3 space-y-3 pl-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Częstotliwość</label>
                      <select
                        value={bookingForm.recurring.frequency}
                        onChange={(e) => setBookingForm({
                          ...bookingForm,
                          recurring: { ...bookingForm.recurring, frequency: e.target.value as 'weekly' | 'biweekly' | 'monthly' }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      >
                        <option value="weekly">Co tydzień</option>
                        <option value="biweekly">Co 2 tygodnie</option>
                        <option value="monthly">Co miesiąc</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data zakończenia</label>
                      <input
                        type="date"
                        value={bookingForm.recurring.endDate}
                        onChange={(e) => setBookingForm({
                          ...bookingForm,
                          recurring: { ...bookingForm.recurring, endDate: e.target.value }
                        })}
                        min={bookingForm.date}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Do kiedy powtarzać rezerwację</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreateBooking}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Zarezerwuj
                </button>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Edytuj rezerwację</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Boisko</label>
                <p className="text-gray-900">{pitches.find(p => p.id === editingBooking.pitchId)?.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  value={editingBooking.date}
                  onChange={(e) => setEditingBooking({...editingBooking, date: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Godzina rozpoczęcia</label>
                <input
                  type="time"
                  value={editingBooking.startTime}
                  onChange={(e) => setEditingBooking({...editingBooking, startTime: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Czas trwania (minuty)</label>
                <input
                  type="number"
                  value={editingBooking.duration}
                  onChange={(e) => setEditingBooking({...editingBooking, duration: Number(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  min="15"
                  step="15"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cena (zł)</label>
                <input
                  type="number"
                  value={editingBooking.customPrice ?? ''}
                  onChange={(e) => setEditingBooking({...editingBooking, customPrice: Number(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  min="0"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleEditBooking}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Zapisz zmiany
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* External Request Modal */}
      {showExternalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Zgłoszenie zewnętrzne</h3>
              <button onClick={() => setShowExternalModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Boisko</label>
                <p className="text-gray-900">{pitches.find(p => p.id === externalForm.pitchId)?.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <p className="text-gray-900">{externalForm.date}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Godzina rozpoczęcia</label>
                <input
                  type="time"
                  value={externalForm.startTime}
                  onChange={(e) => setExternalForm({...externalForm, startTime: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Czas trwania</label>
                <select
                  value={externalForm.duration}
                  onChange={(e) => setExternalForm({...externalForm, duration: Number(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value={60}>60 minut</option>
                  <option value={90}>90 minut</option>
                  <option value={120}>120 minut</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Imię i nazwisko klienta</label>
                <input
                  type="text"
                  value={externalForm.clientName}
                  onChange={(e) => setExternalForm({...externalForm, clientName: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Jan Kowalski"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numer telefonu</label>
                <input
                  type="tel"
                  value={externalForm.clientPhone}
                  onChange={(e) => setExternalForm({...externalForm, clientPhone: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="+48 123 456 789"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cena (opcjonalnie)</label>
                <input
                  type="number"
                  value={externalForm.customPrice || ''}
                  onChange={(e) => setExternalForm({...externalForm, customPrice: e.target.value ? Number(e.target.value) : null})}
                  placeholder={`Domyślnie: ${(defaultPricePerHour * externalForm.duration / 60).toFixed(2)} zł`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  min="0"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreateExternalRequest}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Wyślij zgłoszenie
                </button>
                <button
                  onClick={() => setShowExternalModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pitch Modal */}
      {showPitchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                {editingPitch ? 'Edytuj boisko' : 'Dodaj boisko'}
              </h3>
              <button onClick={() => setShowPitchModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa boiska</label>
                <input
                  type="text"
                  value={pitchForm.name}
                  onChange={(e) => setPitchForm({...pitchForm, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Boisko 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kolor (dla kalendarza)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={pitchForm.color}
                    onChange={(e) => setPitchForm({...pitchForm, color: e.target.value})}
                    className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={pitchForm.color}
                    onChange={(e) => setPitchForm({...pitchForm, color: e.target.value})}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cena za godzinę (zł)</label>
                <input
                  type="number"
                  value={pitchForm.pricePerHour}
                  onChange={(e) => setPitchForm({...pitchForm, pricePerHour: Number(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dostępność standardowa</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Od</label>
                    <input
                      type="time"
                      value={pitchForm.availableStart}
                      onChange={(e) => setPitchForm({...pitchForm, availableStart: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Do</label>
                    <input
                      type="time"
                      value={pitchForm.availableEnd}
                      onChange={(e) => setPitchForm({...pitchForm, availableEnd: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Standardowe godziny otwarcia</p>
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSavePitch}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium"
                >
                  {editingPitch ? 'Zapisz zmiany' : 'Dodaj boisko'}
                </button>
                <button
                  onClick={() => {
                    setShowPitchModal(false);
                    setEditingPitch(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
