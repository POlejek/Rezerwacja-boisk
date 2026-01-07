import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

type Booking = any;

export function useBookings(date?: string) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let qRef: any = collection(db, 'bookings');
    if (date) {
      qRef = query(qRef, where('date', '==', date));
    }
    const unsubscribe = onSnapshot(qRef, (snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as Record<string, any>) }));
      setBookings(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [date]);

  return { bookings, loading };
}
