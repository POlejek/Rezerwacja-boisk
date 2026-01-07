import { collection, addDoc, updateDoc, doc, deleteDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const bookingsRef = collection(db, 'bookings');

export async function createBooking(data: any) {
  const now = Timestamp.now();
  return addDoc(bookingsRef, { ...data, createdAt: now, updatedAt: now, status: 'pending' });
}

export async function updateBooking(id: string, patch: any) {
  const ref = doc(db, 'bookings', id);
  return updateDoc(ref, { ...patch, updatedAt: Timestamp.now() });
}

export async function removeBooking(id: string) {
  const ref = doc(db, 'bookings', id);
  return deleteDoc(ref);
}

export async function isSlotAvailable(
  fieldId: string,
  date: string,
  startTime: string,
  endTime: string,
  workingHours?: { start: string; end: string }
): Promise<boolean> {
  if (workingHours) {
    const ws = toMinutes(workingHours.start);
    const we = toMinutes(workingHours.end);
    const s0 = toMinutes(startTime);
    const e0 = toMinutes(endTime);
    if (!(s0 >= ws && e0 <= we && e0 > s0)) return false;
  }
  // Pobierz wszystkie rezerwacje dla boiska i dnia, sprawdź lokalnie kolizje
  const q = query(bookingsRef, where('fieldId', '==', fieldId), where('date', '==', date));
  const snap = await getDocs(q);
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  for (const d of snap.docs) {
    const b = d.data() as any;
    if (b.status === 'cancelled' || b.status === 'rejected') continue;
    const bs = toMinutes(b.startTime);
    const be = toMinutes(b.endTime);
    // Kolizja jeśli zakresy zachodzą: [start,end) vs [bs,be)
    if (start < be && bs < end) {
      return false;
    }
  }
  return true;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  return h * 60 + m;
}

export async function getBookingsForDates(dates: string[], fieldId?: string) {
  if (!dates.length) return [];
  const limited = dates.slice(0, 10); // Firestore 'in' ograniczenie do 10
  let qRef: any = query(bookingsRef, where('date', 'in', limited));
  if (fieldId) qRef = query(qRef, where('fieldId', '==', fieldId));
  const snap = await getDocs(qRef);
  return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Record<string, any>) }));
}
