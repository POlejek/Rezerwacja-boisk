import { collection, addDoc, Timestamp, onSnapshot, query, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { createBooking } from './booking.service';

const requestsRef = collection(db, 'rentalRequests');

export async function createRentalRequest(data: any) {
  const now = Timestamp.now();
  return addDoc(requestsRef, { ...data, createdAt: now, status: 'new' });
}

export function subscribeRentalRequests(cb: (items: any[]) => void) {
  const q = query(requestsRef);
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function updateRentalRequestStatus(id: string, status: 'new' | 'approved' | 'rejected') {
  const ref = doc(db, 'rentalRequests', id);
  await updateDoc(ref, { status });
}

export async function approveRentalRequest(req: any) {
  // Tworzy rezerwację z danych zapytania; trenerName = req.name, trainerId = 'public'
  await createBooking({
    fieldId: req.fieldId,
    trainerId: 'public',
    trainerName: req.name || 'Gość',
    date: req.date,
    startTime: req.startTime,
    endTime: req.endTime,
    notes: req.message || '',
    feeEstimate: req.feeEstimate ?? null,
  });
  await updateRentalRequestStatus(req.id, 'approved');
}
