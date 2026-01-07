import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export type Booking = {
  id: string;
  fieldId: string;
  trainerId: string;
  trainerName?: string;
  date: string;
  startTime: string;
  endTime: string;
  status?: string;
  feeEstimate?: number;
  notes?: string;
};

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qRef = collection(db, 'bookings');
    const unsubscribe = onSnapshot(qRef, (snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as Record<string, any>) })) as Booking[];
      setBookings(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { bookings, loading };
}
