import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  where,
  serverTimestamp,
  runTransaction,
  Timestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../config';
import { ExitSlip, ExitSlipFormValues, ExitSlipStatus } from '@/lib/types';

const COL = 'exit_slips';

async function getNextOSFolio(): Promise<string> {
  const settingsRef = doc(db, 'app_settings', 'global');
  let nextNum = 1;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(settingsRef);
    nextNum = ((snap.exists() ? snap.data().contadorOS : 0) ?? 0) + 1;
    tx.set(settingsRef, { contadorOS: nextNum }, { merge: true });
  });
  const year = new Date().getFullYear();
  return `OS-${year}-${String(nextNum).padStart(3, '0')}`;
}

export async function createExitSlip(
  data: ExitSlipFormValues,
  otFolio: string,
  ocId: string,
  cliente: string,
  uid: string
): Promise<string> {
  const folio = await getNextOSFolio();
  const docRef = await addDoc(collection(db, COL), {
    folio,
    otId: data.otId,
    otFolio,
    ocId,
    cliente,
    proveedorId: data.proveedorId ?? '',
    proveedorNombre: data.proveedorNombre,
    servicio: data.servicio,
    cantidadPiezas: data.cantidadPiezas,
    fechaSalida: Timestamp.fromDate(data.fechaSalida),
    fechaRegresoEstimada: Timestamp.fromDate(data.fechaRegresoEstimada),
    status: 'activa' as ExitSlipStatus,
    costoEstimado: data.costoEstimado ?? 0,
    notas: data.notas ?? '',
    creadoPor: uid,
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function closeExitSlip(
  id: string,
  costoReal: number
): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    status: 'cerrada' as ExitSlipStatus,
    fechaRegresoReal: serverTimestamp(),
    costoReal,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeExitSlips(
  status: ExitSlipStatus | 'all',
  callback: (slips: ExitSlip[]) => void
) {
  let q;
  if (status === 'all') {
    q = query(collection(db, COL), orderBy('fechaSalida', 'desc'));
  } else {
    q = query(
      collection(db, COL),
      where('status', '==', status),
      orderBy('fechaSalida', 'desc')
    );
  }
  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExitSlip)));
  });
}

export async function getExitSlipsByOT(otId: string): Promise<ExitSlip[]> {
  const q = query(collection(db, COL), where('otId', '==', otId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExitSlip));
}
