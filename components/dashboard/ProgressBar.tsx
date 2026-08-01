'use client';

import { WorkOrder } from '@/lib/types';
import { calcProgress, PROGRESS_COLOR } from '@/lib/utils/urgency';

interface ProgressBarProps {
  workOrder: WorkOrder;
  showLabel?: boolean;
}

export default function ProgressBar({ workOrder, showLabel = true }: ProgressBarProps) {
  const pct = calcProgress(workOrder);
  const colorClass = PROGRESS_COLOR(pct);

  return (
    <div className="w-full space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs text-slate-400">
          <span>Progreso</span>
          <span className="font-semibold text-white">{pct}%</span>
        </div>
      )}
      <div className="w-full h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {workOrder.status === 'produccion_interna' && workOrder.totalPiezas > 0 && (
        <p className="text-xs text-slate-500">
          {workOrder.piezasProcesadas} / {workOrder.totalPiezas} pzas
        </p>
      )}
    </div>
  );
}
