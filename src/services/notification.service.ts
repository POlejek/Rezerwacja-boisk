import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export function subscribeNotifications(userId: string, cb: (items: any[]) => void) {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    cb(items);
  });
}
