import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  serverTimestamp,
  runTransaction,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config';
import { Remision, RemisionFormValues, RemisionItem, WorkOrder } from '@/lib/types';

const COL = 'remisiones';

async function getNextRemisionFolio(): Promise<string> {
  const settingsRef = doc(db, 'app_settings', 'global');
  let nextNum = 1;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(settingsRef);
    nextNum = ((snap.exists() ? snap.data().contadorRemision : 0) ?? 0) + 1;
    tx.set(settingsRef, { contadorRemision: nextNum }, { merge: true });
  });
  const year = new Date().getFullYear();
  return `REM-${year}-${String(nextNum).padStart(3, '0')}`;
}

export interface CreateRemisionResult {
  id: string;
  folio: string;
  otsCompletadas: string[]; // Folios de OTs que se completaron al 100%
}

export async function createRemision(
  data: RemisionFormValues,
  ocFolio: string,
  cliente: string,
  uid: string,
  userName: string
): Promise<CreateRemisionResult> {
  const folio = await getNextRemisionFolio();
  const otsCompletadas: string[] = [];

  const itemsClean: RemisionItem[] = data.items.map((it) => ({
    otId: it.otId,
    otFolio: it.otFolio,
    descripcion: it.descripcion,
    piezasEntregadas: Number(it.piezasEntregadas) || 0,
    totalPiezas: Number(it.totalPiezas) || 0,
  }));

  const remisionDoc = {
    folio,
    ocId: data.ocId,
    ocFolio,
    cliente,
    fechaEntrega: Timestamp.fromDate(data.fechaEntrega),
    recibioPor: data.recibioPor.trim(),
    notas: data.notas?.trim() || '',
    creadoPor: uid,
    creadoPorNombre: userName,
    createdAt: serverTimestamp(),
    items: itemsClean,
  };

  const docRef = await addDoc(collection(db, COL), remisionDoc);

  // Actualizar cada OT involucrada
  for (const item of itemsClean) {
    if (!item.otId || item.piezasEntregadas <= 0) continue;

    const otRef = doc(db, 'work_orders', item.otId);
    const otSnap = await getDoc(otRef);
    if (!otSnap.exists()) continue;

    const otData = otSnap.data() as WorkOrder;
    const previousEntregadas = otData.piezasEntregadas || 0;
    const newPiezasEntregadas = previousEntregadas + item.piezasEntregadas;
    const totalPiezas = otData.totalPiezas || item.totalPiezas || 1;

    const is100Percent = newPiezasEntregadas >= totalPiezas;
    const updates: Record<string, unknown> = {
      piezasEntregadas: newPiezasEntregadas,
      updatedAt: serverTimestamp(),
    };

    if (is100Percent && otData.status !== 'completada') {
      updates.status = 'completada';
      updates.fechaCompletada = serverTimestamp();
      otsCompletadas.push(otData.folio || item.otFolio);
    }

    await updateDoc(otRef, updates);

    // Registro en la bitácora de la OT
    if (is100Percent && otData.status !== 'completada') {
      await addDoc(collection(db, 'work_orders', item.otId, 'changelog'), {
        timestamp: serverTimestamp(),
        usuarioUid: uid,
        usuarioNombre: userName,
        campo: 'status',
        valorAnterior: otData.status,
        valorNuevo: 'completada',
        accion: 'status_change',
        motivo: `100% de piezas entregadas al cliente mediante Remisión ${folio}`,
      });
    }

    await addDoc(collection(db, 'work_orders', item.otId, 'changelog'), {
      timestamp: serverTimestamp(),
      usuarioUid: uid,
      usuarioNombre: userName,
      campo: 'piezasEntregadas',
      valorAnterior: previousEntregadas,
      valorNuevo: newPiezasEntregadas,
      accion: 'nota',
      motivo: `Entrega parcial de ${item.piezasEntregadas} pieza(s) registrada en Remisión ${folio}. Recibió: ${data.recibioPor}`,
    });
  }

  // Actualizar contador de OTs completadas en la OC si corresponde
  if (data.ocId) {
    try {
      const ocRef = doc(db, 'purchase_orders', data.ocId);
      const otsQuery = query(collection(db, 'work_orders'), where('ocId', '==', data.ocId));
      const otsSnap = await getDocs(otsQuery);
      const allOTs = otsSnap.docs.map((d) => d.data());
      const completadasCount = allOTs.filter((o) => o.status === 'completada').length;
      const totalCount = allOTs.length;

      const ocUpdates: Record<string, unknown> = {
        otCompletadas: completadasCount,
      };

      if (totalCount > 0 && completadasCount === totalCount) {
        ocUpdates.status = 'completada';
      }

      await updateDoc(ocRef, ocUpdates);
    } catch {
      // Ignorar errores menores al recalcular la OC
    }
  }

  return {
    id: docRef.id,
    folio,
    otsCompletadas,
  };
}

export function subscribeRemisiones(callback: (remisiones: Remision[]) => void) {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: Remision[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Remision, 'id'>),
    }));
    callback(list);
  });
}

export async function deleteRemision(
  remisionId: string,
  uid?: string,
  userName?: string
): Promise<void> {
  const remisionRef = doc(db, COL, remisionId);
  const remSnap = await getDoc(remisionRef);
  if (!remSnap.exists()) return;

  const remData = remSnap.data() as Remision;

  // Revertir piezas en las OTs involucradas
  for (const item of remData.items || []) {
    if (!item.otId || item.piezasEntregadas <= 0) continue;

    const otRef = doc(db, 'work_orders', item.otId);
    const otSnap = await getDoc(otRef);
    if (!otSnap.exists()) continue;

    const otData = otSnap.data() as WorkOrder;
    const previousEntregadas = otData.piezasEntregadas || 0;
    const restoredEntregadas = Math.max(0, previousEntregadas - item.piezasEntregadas);

    const updates: Record<string, unknown> = {
      piezasEntregadas: restoredEntregadas,
      updatedAt: serverTimestamp(),
    };

    // Si estaba completada y ahora baja del total, regresar a produccion_interna
    if (otData.status === 'completada' && restoredEntregadas < otData.totalPiezas) {
      updates.status = 'produccion_interna';

      await addDoc(collection(db, 'work_orders', item.otId, 'changelog'), {
        timestamp: serverTimestamp(),
        usuarioUid: uid || '',
        usuarioNombre: userName || 'Sistema',
        campo: 'status',
        valorAnterior: 'completada',
        valorNuevo: 'produccion_interna',
        accion: 'status_change',
        motivo: `Reversión por eliminación de Remisión ${remData.folio}`,
      });
    }

    await updateDoc(otRef, updates);

    await addDoc(collection(db, 'work_orders', item.otId, 'changelog'), {
      timestamp: serverTimestamp(),
      usuarioUid: uid || '',
      usuarioNombre: userName || 'Sistema',
      campo: 'piezasEntregadas',
      valorAnterior: previousEntregadas,
      valorNuevo: restoredEntregadas,
      accion: 'nota',
      motivo: `Se restaron ${item.piezasEntregadas} pieza(s) debido a la eliminación de la Remisión ${remData.folio}`,
    });
  }

  // Recalcular contador de OTs en la OC
  if (remData.ocId) {
    try {
      const ocRef = doc(db, 'purchase_orders', remData.ocId);
      const otsQuery = query(collection(db, 'work_orders'), where('ocId', '==', remData.ocId));
      const otsSnap = await getDocs(otsQuery);
      const allOTs = otsSnap.docs.map((d) => d.data());
      const completadasCount = allOTs.filter((o) => o.status === 'completada').length;
      const totalCount = allOTs.length;

      const ocUpdates: Record<string, unknown> = {
        otCompletadas: completadasCount,
      };

      if (totalCount > 0 && completadasCount < totalCount) {
        ocUpdates.status = 'activa';
      }

      await updateDoc(ocRef, ocUpdates);
    } catch {
      // Ignorar errores menores
    }
  }

  // Finalmente eliminar documento de la remisión
  await deleteDoc(remisionRef);
}
