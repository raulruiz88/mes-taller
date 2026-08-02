'use client';

import { WorkOrder } from '@/lib/types';
import { useWorkOrders } from '@/lib/hooks/useWorkOrders';
import { useAuth } from '@/lib/hooks/useAuth';
import { getUrgency } from '@/lib/utils/urgency';
import { AlertTriangle, Clock, CheckCircle, Package, PauseCircle, User } from 'lucide-react';

interface KPICardsProps {
  activeFilter?: string | null;
  onSelectFilter?: (filterId: string | null) => void;
}

export default function KPICards({ activeFilter, onSelectFilter }: KPICardsProps) {
  const { workOrders } = useWorkOrders();
  const { userData } = useAuth();

  const active = workOrders.filter(
    (o) => o.status !== 'completada' && o.status !== 'cancelada'
  );

  const misOTsCount = active.filter(
    (o) =>
      (userData?.uid && o.asignadoA === userData.uid) ||
      (userData?.displayName && o.asignadoNombre?.toLowerCase() === userData.displayName.toLowerCase())
  ).length;

  const criticas = active.filter(
    (o) => o.status !== 'en_pausa' && getUrgency(o.fechaEntrega, o.status) === 'rojo'
  ).length;

  const urgentes = active.filter(
    (o) => o.status !== 'en_pausa' && getUrgency(o.fechaEntrega, o.status) === 'amarillo'
  ).length;

  const enPausas = active.filter(
    (o) => o.status === 'en_pausa' || o.esPausada
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
      id: 'criticas',
      label: 'OTs Críticas',
      value: criticas,
      icon: AlertTriangle,
      color: 'from-red-500/20 to-red-600/10 border-red-500/30',
      iconColor: 'text-red-400',
      valueColor: 'text-red-400',
      pulse: criticas > 0,
    },
    {
      id: 'urgentes',
      label: 'OTs Urgentes',
      value: urgentes,
      icon: Clock,
      color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
      iconColor: 'text-amber-400',
      valueColor: 'text-amber-400',
      pulse: false,
    },
    {
      id: 'pausa',
      label: 'En Pausa ⏸️',
      value: enPausas,
      icon: PauseCircle,
      color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
      iconColor: 'text-purple-400',
      valueColor: 'text-purple-400',
      pulse: false,
    },
    {
      id: 'maquila',
      label: 'Proceso Externo',
      value: enMaquila,
      icon: Package,
      color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
      iconColor: 'text-blue-400',
      valueColor: 'text-blue-400',
      pulse: false,
    },
    {
      id: 'envio',
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => {
        const isSelected = activeFilter === card.id;
        return (
          <div
            key={card.id}
            id={`kpi-card-${card.id}`}
            onClick={() => {
              if (onSelectFilter) {
                onSelectFilter(isSelected ? null : card.id);
              }
            }}
            className={`bg-gradient-to-br ${card.color} border rounded-2xl p-4 cursor-pointer transition-all duration-200 select-none ${
              isSelected
                ? 'ring-2 ring-blue-400 scale-[1.02] shadow-xl shadow-blue-500/20'
                : 'hover:scale-[1.01] hover:border-slate-600'
            } ${card.pulse ? 'animate-pulse-slow' : ''}`}
          >
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-semibold text-slate-300 truncate">{card.label}</p>
              <card.icon className={`w-4 h-4 shrink-0 ${card.iconColor}`} />
            </div>
            <div className="flex items-baseline justify-between">
              <p className={`text-2xl font-bold ${card.valueColor}`}>{card.value}</p>
              {isSelected && (
                <span className="text-[10px] text-blue-300 font-medium bg-blue-500/20 px-1.5 py-0.5 rounded">
                  Filtrado ✓
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
