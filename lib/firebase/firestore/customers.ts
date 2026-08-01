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
import { Customer, CustomerFormValues } from '@/lib/types';

const COLLECTION_NAME = 'customers';

export async function createCustomer(
  data: CustomerFormValues,
  uid: string
): Promise<string> {
  const docRef = doc(collection(db, COLLECTION_NAME));
  await setDoc(docRef, {
    ...data,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    creadoPor: uid,
  });
  return docRef.id;
}

export async function updateCustomer(
  id: string,
  data: Partial<CustomerFormValues>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleCustomerStatus(
  id: string,
  isActive: boolean
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    isActive,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCustomerPermanent(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

export async function getCustomers(): Promise<Customer[]> {
  const q = query(collection(db, COLLECTION_NAME), orderBy('nombreComercial', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Customer[];
}
