'use client';

import { WorkOrder, UrgencyLevel } from '@/lib/types';
import { URGENCY_COLORS, URGENCY_LABELS, getUrgency } from '@/lib/utils/urgency';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';

interface UrgencyBadgeProps {
  workOrder: WorkOrder;
  size?: 'sm' | 'md';
}

const ICONS: Record<UrgencyLevel, React.ElementType> = {
  rojo: AlertTriangle,
  amarillo: Clock,
  verde: CheckCircle,
  gris: CheckCircle,
};

export default function UrgencyBadge({ workOrder, size = 'md' }: UrgencyBadgeProps) {
  const level = getUrgency(workOrder.fechaEntrega, workOrder.status);
  const Icon = ICONS[level];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border font-semibold ${URGENCY_COLORS[level]} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      } ${level === 'rojo' ? 'animate-pulse-slow' : ''}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {URGENCY_LABELS[level]}
    </span>
  );
}
