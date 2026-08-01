import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config';
import { AppUser, UserRole } from '@/lib/types';

const COLLECTION_NAME = 'users';

export async function getAllUsers(): Promise<AppUser[]> {
  const q = query(collection(db, COLLECTION_NAME), orderBy('displayName', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  })) as AppUser[];
}

export async function createUserDocument(
  uid: string,
  data: { displayName: string; email: string; role: UserRole }
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, uid);
  await setDoc(docRef, {
    displayName: data.displayName,
    email: data.email,
    role: data.role,
    createdAt: serverTimestamp(),
  });
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, uid);
  await updateDoc(docRef, { role, updatedAt: serverTimestamp() });
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<AppUser, 'displayName' | 'role'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, uid);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteUserDocument(uid: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, uid);
  await deleteDoc(docRef);
}
