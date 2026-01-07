import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export type Field = {
  id?: string;
  name: string;
  type: string;
  location?: string;
  isActive?: boolean;
  notes?: string;
};

const fieldsCol = collection(db, 'fields');

export async function createField(data: Field) {
  const payload = {
    name: data.name,
    type: data.type,
    location: data.location || '',
    isActive: data.isActive !== false,
    notes: data.notes || '',
    createdAt: serverTimestamp(),
  };
  await addDoc(fieldsCol, payload);
}

export async function updateField(id: string, data: Partial<Field>) {
  const ref = doc(db, 'fields', id);
  await updateDoc(ref, {
    ...data,
  });
}

export async function deleteField(id: string) {
  const ref = doc(db, 'fields', id);
  await deleteDoc(ref);
}
