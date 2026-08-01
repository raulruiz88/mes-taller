import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config';
import { Supplier } from '@/lib/types';

const COLLECTION_NAME = 'suppliers';

export interface SupplierFormValues {
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  servicios: string; // Comma separated or string
  notas?: string;
}

export async function createSupplier(
  data: SupplierFormValues,
): Promise<string> {
  const docRef = doc(collection(db, COLLECTION_NAME));
  const serviciosArray = data.servicios
    ? data.servicios.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  await setDoc(docRef, {
    nombre: data.nombre,
    contacto: data.contacto ?? '',
    telefono: data.telefono ?? '',
    email: data.email ?? '',
    servicios: serviciosArray,
    notas: data.notas ?? '',
    isActive: true,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateSupplier(
  id: string,
  data: Partial<SupplierFormValues>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const updates: Record<string, any> = { ...data };
  if (typeof data.servicios === 'string') {
    updates.servicios = data.servicios.split(',').map((s) => s.trim()).filter(Boolean);
  }
  await updateDoc(docRef, updates);
}

export async function deleteSupplier(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

export async function getSuppliers(): Promise<Supplier[]> {
  const q = query(collection(db, COLLECTION_NAME), orderBy('nombre', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Supplier[];
}
