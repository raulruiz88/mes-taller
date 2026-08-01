import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
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
import { PurchaseOrder, OCFormValues, OCStatus } from '@/lib/types';

const COL = 'purchase_orders';

async function getNextFolio(prefix: string, counter: 'contadorOC'): Promise<string> {
  const settingsRef = doc(db, 'app_settings', 'global');
  let nextNum = 1;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(settingsRef);
    if (snap.exists()) {
      nextNum = (snap.data()[counter] ?? 0) + 1;
    } else {
      nextNum = 1;
    }
    tx.set(settingsRef, { [counter]: nextNum }, { merge: true });
  });
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(nextNum).padStart(3, '0')}`;
}

export async function createPurchaseOrder(
  data: OCFormValues,
  uid: string
): Promise<string> {
  const folio = await getNextFolio('OC', 'contadorOC');
  const docRef = await addDoc(collection(db, COL), {
    folio,
    ocCliente: data.ocCliente ?? '',
    cliente: data.cliente,
    montoVenta: data.montoVenta,
    currency: data.currency,
    fechaCompromiso: Timestamp.fromDate(data.fechaCompromiso),
    fechaCliente: data.fechaCliente ? Timestamp.fromDate(data.fechaCliente) : null,
    fechaCreacion: serverTimestamp(),
    creadoPor: uid,
    status: 'activa' as OCStatus,
    dibujoURL: data.dibujoURL ?? '',
    notas: data.notas ?? '',
    totalOTs: 0,
    otCompletadas: 0,
  });
  return docRef.id;
}

export async function updatePurchaseOrder(
  id: string,
  data: Partial<PurchaseOrder>
): Promise<void> {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function registrarFacturaVenta(
  id: string,
  facturaVenta: string
): Promise<void> {
  const docRef = doc(db, COL, id);
  await updateDoc(docRef, {
    facturaVenta,
    fechaFacturacion: serverTimestamp(),
    estadoCobro: 'facturada',
    updatedAt: serverTimestamp(),
  });
}

export async function registrarCobroCliente(
  id: string,
  fechaFacturacion?: Timestamp | null
): Promise<void> {
  const docRef = doc(db, COL, id);
  const now = new Date();

  let diasCobro = 0;
  if (fechaFacturacion) {
    const fFact = fechaFacturacion.toDate();
    const diffMs = now.getTime() - fFact.getTime();
    diasCobro = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  await updateDoc(docRef, {
    estadoCobro: 'cobrada',
    fechaCobro: serverTimestamp(),
    diasCobro,
    updatedAt: serverTimestamp(),
  });
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as PurchaseOrder;
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const q = query(collection(db, COL), orderBy('fechaCreacion', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PurchaseOrder));
}

export function subscribePurchaseOrders(
  callback: (orders: PurchaseOrder[]) => void
) {
  const q = query(collection(db, COL), orderBy('fechaCreacion', 'desc'));
  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PurchaseOrder)));
  });
}
