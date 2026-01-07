import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Field } from '../services/field.service';

export function useFields() {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'fields'), (snap: any) => {
      setFields(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Record<string, any>) })) as Field[]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { fields, loading };
}
