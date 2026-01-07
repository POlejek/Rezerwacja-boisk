import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { subscribeNotifications } from '../services/notification.service';

export function useNotifications() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    const authUnsub = onAuthStateChanged(auth, (u) => {
      if (unsub) unsub();
      if (u) unsub = subscribeNotifications(u.uid, setItems);
    });
    return () => {
      if (unsub) unsub();
      authUnsub();
    };
  }, []);

  return items;
}
