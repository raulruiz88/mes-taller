'use client';

import { WorkOrder } from '@/lib/types';
import { useWorkOrders } from '@/lib/hooks/useWorkOrders';
import { getUrgency } from '@/lib/utils/urgency';
import { AlertTriangle, Clock, CheckCircle, Package } from 'lucide-react';

export default function KPICards() {
  const { workOrders } = useWorkOrders();

  const active = workOrders.filter(
    (o) => o.status !== 'completada' && o.status !== 'cancelada'
  );

  const criticas = active.filter(
    (o) => getUrgency(o.fechaEntrega, o.status) === 'rojo'
  ).length;

  const urgentes = active.filter(
    (o) => getUrgency(o.fechaEntrega, o.status) === 'amarillo'
  ).length;

  // OTs que tienen Maquila Externa (por estado, por servicio directo o por operaciones de maquila)
  const enMaquila = active.filter(
    (o) =>
      o.status === 'maquila_externa' ||
      Boolean(o.esMaquilaDirecta) ||
      o.operaciones?.some((op) => op.centroTrabajo?.toLowerCase().includes('maquila'))
  ).length;

  // OTs en Calidad / Envío (listas para entregarse al cliente)
  const listasParaEntrega = active.filter((o) => o.status === 'calidad_envio').length;

  const cards = [
    {
      id: 'kpi-criticas',
      label: 'OTs Críticas',
      value: criticas,
      icon: AlertTriangle,
      color: 'from-red-500/20 to-red-600/10 border-red-500/30',
      iconColor: 'text-red-400',
      valueColor: 'text-red-400',
      pulse: criticas > 0,
    },
    {
      id: 'kpi-urgentes',
      label: 'OTs Urgentes',
      value: urgentes,
      icon: Clock,
      color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
      iconColor: 'text-amber-400',
      valueColor: 'text-amber-400',
      pulse: false,
    },
    {
      id: 'kpi-maquila',
      label: 'Proceso Externo / Maquila',
      value: enMaquila,
      icon: Package,
      color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
      iconColor: 'text-blue-400',
      valueColor: 'text-blue-400',
      pulse: false,
    },
    {
      id: 'kpi-envio',
      label: 'Listas p/ Entregar',
      value: listasParaEntrega,
      icon: CheckCircle,
      color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
      iconColor: 'text-emerald-400',
      valueColor: 'text-emerald-400',
      pulse: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.id}
          id={card.id}
          className={`bg-gradient-to-br ${card.color} border rounded-2xl p-5 ${card.pulse ? 'animate-pulse-slow' : ''}`}
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-slate-400">{card.label}</p>
            <card.icon className={`w-5 h-5 ${card.iconColor}`} />
          </div>
          <p className={`text-3xl font-bold ${card.valueColor}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
