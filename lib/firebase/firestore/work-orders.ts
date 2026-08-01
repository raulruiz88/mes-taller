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
  increment,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../config';
import {
  WorkOrder,
  OTFormValues,
  OTStatus,
  OTChangeLog,
  OTOperation,
} from '@/lib/types';

const COL = 'work_orders';

async function getNextOTFolio(ocFolio: string, ocId: string): Promise<string> {
  const settingsRef = doc(db, 'app_settings', 'global');
  let nextNum = 1;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(settingsRef);
    nextNum = ((snap.exists() ? snap.data().contadorOT : 0) ?? 0) + 1;
    tx.set(settingsRef, { contadorOT: nextNum }, { merge: true });
  });
  const year = new Date().getFullYear();
  return `OT-${year}-${String(nextNum).padStart(3, '0')}`;
}

export async function createWorkOrder(
  data: OTFormValues,
  ocId: string,
  ocFolio: string,
  cliente: string,
  uid: string
): Promise<string> {
  const folio = await getNextOTFolio(ocFolio, ocId);
  const now = serverTimestamp();
  const docRef = await addDoc(collection(db, COL), {
    folio,
    ocId,
    ocFolio,
    cliente,
    descripcion: data.descripcion,
    totalPiezas: data.totalPiezas,
    piezasProcesadas: 0,
    status: 'pendiente' as OTStatus,
    prioridad: data.prioridad ?? 'normal',
    fechaInicio: now,
    fechaEntrega: Timestamp.fromDate(data.fechaEntrega),
    fechaCliente: data.fechaCliente ? Timestamp.fromDate(data.fechaCliente) : null,
    material: data.material ?? '',
    planoURL: data.planoURL ?? '',
    notas: data.notas ?? '',
    operaciones: data.operaciones ?? [],
    esMaquilaDirecta: data.esMaquilaDirecta ?? false,
    creadoPor: uid,
    updatedAt: now,
  });

  // Incrementar totalOTs en la OC
  await updateDoc(doc(db, 'purchase_orders', ocId), {
    totalOTs: increment(1),
  });

  return docRef.id;
}

export async function updateWorkOrderStatus(
  otId: string,
  newStatus: OTStatus,
  uid: string,
  userName: string,
  currentStatus: OTStatus
): Promise<void> {
  const otRef = doc(db, COL, otId);
  const changeRef = doc(collection(db, COL, otId, 'changelog'));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(otRef);
    if (!snap.exists()) throw new Error('OT no encontrada');

    const updates: Record<string, unknown> = {
      status: newStatus,
      updatedAt: serverTimestamp(),
    };

    if (newStatus === 'completada') {
      updates.fechaCompletada = serverTimestamp();
      // Actualizar otCompletadas en OC
      const ocId = snap.data().ocId;
      const ocRef = doc(db, 'purchase_orders', ocId);
      tx.update(ocRef, { otCompletadas: increment(1) });
    }

    tx.update(otRef, updates);
    tx.set(changeRef, {
      timestamp: serverTimestamp(),
      usuarioUid: uid,
      usuarioNombre: userName,
      campo: 'status',
      valorAnterior: currentStatus,
      valorNuevo: newStatus,
      accion: 'status_change',
    } as Omit<OTChangeLog, 'id'>);
  });
}

export async function incrementPiezas(
  otId: string,
  cantidad: number,
  uid: string,
  userName: string,
  currentPiezas: number
): Promise<void> {
  const otRef = doc(db, COL, otId);
  const changeRef = doc(collection(db, COL, otId, 'changelog'));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(otRef);
    if (!snap.exists()) throw new Error('OT no encontrada');
    const data = snap.data();
    const newPiezas = Math.min(currentPiezas + cantidad, data.totalPiezas);

    tx.update(otRef, {
      piezasProcesadas: newPiezas,
      updatedAt: serverTimestamp(),
    });
    tx.set(changeRef, {
      timestamp: serverTimestamp(),
      usuarioUid: uid,
      usuarioNombre: userName,
      campo: 'piezasProcesadas',
      valorAnterior: currentPiezas,
      valorNuevo: newPiezas,
      accion: 'piezas_update',
    } as Omit<OTChangeLog, 'id'>);
  });
}

export async function updateWorkOrder(
  id: string,
  data: Partial<WorkOrder>
): Promise<void> {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function getWorkOrder(id: string): Promise<WorkOrder | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as WorkOrder;
}

export async function getWorkOrdersByOC(ocId: string): Promise<WorkOrder[]> {
  const q = query(collection(db, COL), where('ocId', '==', ocId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkOrder));
}

export function subscribeWorkOrders(callback: (orders: WorkOrder[]) => void) {
  const q = query(collection(db, COL), orderBy('fechaEntrega', 'asc'));
  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkOrder)));
  });
}

export async function getChangelog(otId: string): Promise<OTChangeLog[]> {
  const q = query(
    collection(db, COL, otId, 'changelog'),
    orderBy('timestamp', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as OTChangeLog));
}

export async function updateOTMaterialArrivalDate(
  otId: string,
  fechaEstimadaLlegadaMP: Date | null,
  uid: string,
  userName: string
): Promise<void> {
  const otRef = doc(db, COL, otId);
  const changeRef = doc(collection(db, COL, otId, 'changelog'));

  await runTransaction(db, async (tx) => {
    tx.update(otRef, {
      fechaEstimadaLlegadaMP: fechaEstimadaLlegadaMP ? Timestamp.fromDate(fechaEstimadaLlegadaMP) : null,
      updatedAt: serverTimestamp(),
    });
    tx.set(changeRef, {
      timestamp: serverTimestamp(),
      usuarioUid: uid,
      usuarioNombre: userName,
      campo: 'fechaEstimadaLlegadaMP',
      valorAnterior: null,
      valorNuevo: fechaEstimadaLlegadaMP ? fechaEstimadaLlegadaMP.toISOString() : null,
      accion: 'edit',
    } as Omit<OTChangeLog, 'id'>);
  });
}

export async function editWorkOrder(
  otId: string,
  data: Partial<WorkOrder>
): Promise<void> {
  const otRef = doc(db, COL, otId);
  await updateDoc(otRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Actualiza el campo piezasCompletadas de una operación específica dentro del array operaciones.
 * Reescribe el array completo garantizando consistencia.
 */
export async function updateOperacion(
  otId: string,
  operacionId: string,
  nuevasPiezas: number,
  uid: string,
  userName: string
): Promise<void> {
  const otRef = doc(db, COL, otId);
  const changeRef = doc(collection(db, COL, otId, 'changelog'));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(otRef);
    if (!snap.exists()) throw new Error('OT no encontrada');
    const data = snap.data();
    const operaciones: OTOperation[] = data.operaciones ?? [];
    const totalPiezas: number = data.totalPiezas ?? 0;

    const updatedOps = operaciones.map((op) =>
      op.id === operacionId
        ? { ...op, piezasCompletadas: Math.max(0, Math.min(nuevasPiezas, totalPiezas)) }
        : op
    );

    tx.update(otRef, {
      operaciones: updatedOps,
      updatedAt: serverTimestamp(),
    });

    tx.set(changeRef, {
      timestamp: serverTimestamp(),
      usuarioUid: uid,
      usuarioNombre: userName,
      campo: `operacion_${operacionId}`,
      valorAnterior: operaciones.find((o) => o.id === operacionId)?.piezasCompletadas ?? 0,
      valorNuevo: nuevasPiezas,
      accion: 'piezas_update',
    } as Omit<OTChangeLog, 'id'>);
  });
}

/**
 * Agrega una nueva operación al array operaciones de una OT.
 */
export async function addOperacion(
  otId: string,
  operacion: OTOperation
): Promise<void> {
  const otRef = doc(db, COL, otId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(otRef);
    if (!snap.exists()) throw new Error('OT no encontrada');
    const ops: OTOperation[] = snap.data().operaciones ?? [];
    tx.update(otRef, {
      operaciones: [...ops, operacion],
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Elimina una operación del array operaciones de una OT.
 */
export async function deleteOperacion(
  otId: string,
  operacionId: string
): Promise<void> {
  const otRef = doc(db, COL, otId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(otRef);
    if (!snap.exists()) throw new Error('OT no encontrada');
    const ops: OTOperation[] = snap.data().operaciones ?? [];
    tx.update(otRef, {
      operaciones: ops.filter((o) => o.id !== operacionId),
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Registra una nota o comentario libre en la bitácora (changelog) de una OT.
 */
export async function addOTComment(
  otId: string,
  comentario: string,
  uid: string,
  userName: string
): Promise<void> {
  await addDoc(collection(db, COL, otId, 'changelog'), {
    timestamp: serverTimestamp(),
    usuarioUid: uid,
    usuarioNombre: userName,
    campo: 'comentario',
    valorAnterior: null,
    valorNuevo: comentario,
    accion: 'nota',
  });
}

export async function updateWorkOrderFields(
  otId: string,
  data: Partial<{
    descripcion: string;
    totalPiezas: number;
    fechaEntrega: Date;
    fechaCliente?: Date | null;
    material?: string;
    planoURL?: string;
    notas?: string;
  }>
): Promise<void> {
  const otRef = doc(db, COL, otId);
  const updates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (data.descripcion !== undefined) updates.descripcion = data.descripcion;
  if (data.totalPiezas !== undefined) updates.totalPiezas = data.totalPiezas;
  if (data.fechaEntrega !== undefined) updates.fechaEntrega = Timestamp.fromDate(data.fechaEntrega);
  if (data.fechaCliente !== undefined) {
    updates.fechaCliente = data.fechaCliente ? Timestamp.fromDate(data.fechaCliente) : null;
  }
  if (data.material !== undefined) updates.material = data.material;
  if (data.planoURL !== undefined) updates.planoURL = data.planoURL;
  if (data.notas !== undefined) updates.notas = data.notas;

  await updateDoc(otRef, updates);
}
