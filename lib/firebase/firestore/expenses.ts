import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../config';
import {
  DirectExpense,
  DirectExpenseFormValues,
  FixedCost,
  FixedCostFormValues,
  PnLStatement,
} from '@/lib/types';
import { format } from 'date-fns';

// ─── Direct Expenses ────────────────────────────────────────────────────────

export async function createDirectExpense(
  data: DirectExpenseFormValues & { estaPagado?: boolean; fechaPago?: Date },
  otFolio?: string,
  ocId?: string,
  uid?: string
): Promise<string> {
  const periodo = format(data.fecha, 'yyyy-MM');
  const estaPagado = data.estaPagado ?? true;
  const docRef = await addDoc(collection(db, 'direct_expenses'), {
    otId: data.otId ?? '',
    otFolio: otFolio ?? '',
    ocId: ocId ?? '',
    periodo,
    categoria: data.categoria,
    descripcion: data.descripcion,
    monto: data.monto,
    proveedor: data.proveedor ?? '',
    factura: data.factura ?? '',
    facturaURL: data.facturaURL ?? '',
    esGastoGeneral: !data.otId,
    estaPagado,
    fechaPago: estaPagado ? Timestamp.fromDate(data.fechaPago || data.fecha) : null,
    fecha: Timestamp.fromDate(data.fecha),
    creadoPor: uid ?? '',
  });
  return docRef.id;
}

export async function getAllDirectExpenses(): Promise<DirectExpense[]> {
  const q = query(collection(db, 'direct_expenses'), orderBy('fecha', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DirectExpense));
}

export async function toggleDirectExpensePayment(
  id: string,
  estaPagado: boolean
): Promise<void> {
  const docRef = doc(db, 'direct_expenses', id);
  await updateDoc(docRef, {
    estaPagado,
    fechaPago: estaPagado ? serverTimestamp() : null,
  });
}

export async function deleteDirectExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, 'direct_expenses', id));
}

export async function getDirectExpensesByOT(otId: string): Promise<DirectExpense[]> {
  const q = query(
    collection(db, 'direct_expenses'),
    where('otId', '==', otId),
    orderBy('fecha', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DirectExpense));
}

export async function getDirectExpensesByPeriod(
  periodo: string
): Promise<DirectExpense[]> {
  const q = query(
    collection(db, 'direct_expenses'),
    where('periodo', '==', periodo)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DirectExpense));
}

// ─── Fixed Costs ────────────────────────────────────────────────────────────

export async function createFixedCost(
  data: FixedCostFormValues & { estaPagado?: boolean; fechaPago?: Date },
  uid: string
): Promise<string> {
  const periodo = format(data.fecha, 'yyyy-MM');
  const estaPagado = data.estaPagado ?? true;
  const docRef = await addDoc(collection(db, 'fixed_costs'), {
    periodo,
    categoria: data.categoria,
    descripcion: data.descripcion,
    monto: data.monto,
    esRecurrente: data.esRecurrente,
    factura: data.factura ?? '',
    estaPagado,
    fechaPago: estaPagado ? Timestamp.fromDate(data.fechaPago || data.fecha) : null,
    fecha: Timestamp.fromDate(data.fecha),
    creadoPor: uid,
  });
  return docRef.id;
}

export async function toggleFixedCostPayment(
  id: string,
  estaPagado: boolean
): Promise<void> {
  const docRef = doc(db, 'fixed_costs', id);
  await updateDoc(docRef, {
    estaPagado,
    fechaPago: estaPagado ? serverTimestamp() : null,
  });
}

export async function updateFixedCost(
  id: string,
  data: Partial<FixedCost>
): Promise<void> {
  await updateDoc(doc(db, 'fixed_costs', id), data);
}

export async function deleteFixedCost(id: string): Promise<void> {
  await deleteDoc(doc(db, 'fixed_costs', id));
}

export async function getFixedCostsByPeriod(
  periodo: string
): Promise<FixedCost[]> {
  const q = query(
    collection(db, 'fixed_costs'),
    where('periodo', '==', periodo)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FixedCost));
}

export function subscribeFixedCosts(
  periodo: string,
  callback: (costs: FixedCost[]) => void
) {
  const q = query(
    collection(db, 'fixed_costs'),
    where('periodo', '==', periodo)
  );
  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FixedCost)));
  });
}

// ─── P&L Calculator ─────────────────────────────────────────────────────────

export async function calculatePnL(
  periodo: string,
  ingresosTotales: number
): Promise<PnLStatement> {
  const [gastos, fijos] = await Promise.all([
    getDirectExpensesByPeriod(periodo),
    getFixedCostsByPeriod(periodo),
  ]);

  const costosDirectosTotales = gastos.reduce((s, e) => s + e.monto, 0);
  const costosFijosTotales = fijos.reduce((s, f) => s + f.monto, 0);
  const utilidadBruta = ingresosTotales - costosDirectosTotales;
  const utilidadOperativa = utilidadBruta - costosFijosTotales;

  const detalleGastos = gastos.reduce(
    (acc, e) => {
      const found = acc.find((a) => a.categoria === e.categoria);
      if (found) found.total += e.monto;
      else acc.push({ categoria: e.categoria, total: e.monto });
      return acc;
    },
    [] as PnLStatement['detalleGastos']
  );

  const detalleCostosFijos = fijos.reduce(
    (acc, f) => {
      const found = acc.find((a) => a.categoria === f.categoria);
      if (found) found.total += f.monto;
      else acc.push({ categoria: f.categoria, total: f.monto });
      return acc;
    },
    [] as PnLStatement['detalleCostosFijos']
  );

  return {
    periodo,
    ingresosTotales,
    costosDirectosTotales,
    utilidadBruta,
    costosFijosTotales,
    utilidadOperativa,
    margenBruto: ingresosTotales > 0 ? (utilidadBruta / ingresosTotales) * 100 : 0,
    margenOperativo:
      ingresosTotales > 0 ? (utilidadOperativa / ingresosTotales) * 100 : 0,
    detalleGastos,
    detalleCostosFijos,
  };
}
