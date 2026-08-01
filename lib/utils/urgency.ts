import { OTStatus, UrgencyLevel, WorkOrder } from '@/lib/types';
import { differenceInHours } from 'date-fns';

const STAGE_BASE_PROGRESS: Record<OTStatus, number> = {
  pendiente: 0,
  compras_mp: 20,
  diseno: 30,
  produccion_interna: 30, // base: se suma el parcial de piezas
  maquila_externa: 80,
  calidad_envio: 90,
  completada: 100,
  cancelada: 0,
};

export function calcProgress(ot: WorkOrder): number {
  if (ot.status === 'completada') return 100;
  if (ot.status === 'cancelada') return 0;

  // Si tiene operaciones definidas, usar la fórmula de operaciones
  if (ot.operaciones && ot.operaciones.length > 0 && ot.totalPiezas > 0) {
    const totalUnidades = ot.totalPiezas * ot.operaciones.length;
    const completadas = ot.operaciones.reduce(
      (sum, op) => sum + (op.piezasCompletadas || 0),
      0
    );
    return Math.round((completadas / totalUnidades) * 100);
  }

  // Fallback al cálculo anterior por etapa
  if (ot.status === 'produccion_interna') {
    const ratio =
      ot.totalPiezas > 0 ? ot.piezasProcesadas / ot.totalPiezas : 0;
    return Math.round(30 + 50 * ratio); // 30% base + 50% por piezas
  }
  return STAGE_BASE_PROGRESS[ot.status] ?? 0;
}

export function getUrgency(
  fechaEntrega: { toDate: () => Date } | Date,
  status: OTStatus
): UrgencyLevel {
  if (status === 'completada' || status === 'cancelada') return 'gris';
  const date =
    fechaEntrega instanceof Date ? fechaEntrega : fechaEntrega.toDate();
  const horasRestantes = differenceInHours(date, new Date());
  if (horasRestantes <= 24) return 'rojo';
  if (horasRestantes <= 72) return 'amarillo';
  return 'verde';
}

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  rojo: 'bg-red-500/20 text-red-400 border-red-500/40',
  amarillo: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  verde: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  gris: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
};

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  rojo: 'CRÍTICO',
  amarillo: 'URGENTE',
  verde: 'EN TIEMPO',
  gris: 'CERRADA',
};

export const PROGRESS_COLOR = (pct: number): string => {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-blue-500';
  if (pct >= 20) return 'bg-amber-500';
  return 'bg-slate-500';
};
