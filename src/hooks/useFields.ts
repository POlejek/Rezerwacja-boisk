import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export function useFields() {
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'fields'), (snap: any) => {
      setFields(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Record<string, any>) })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { fields, loading };
}
