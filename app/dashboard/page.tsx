'use client';

import { useState } from 'react';
import { useWorkOrders } from '@/lib/hooks/useWorkOrders';
import KPICards from '@/components/dashboard/KPICards';
import OTTable from '@/components/dashboard/OTTable';
import { LayoutDashboard } from 'lucide-react';

const CARD_FILTER_LABELS: Record<string, string> = {
  criticas: 'OTs Críticas',
  urgentes: 'OTs Urgentes',
  produccion: 'En Producción ⚙️',
  pausa: 'En Pausa ⏸️',
  maquila: 'Proceso Externo',
  envio: 'Listas p/ Entregar',
};

export default function DashboardPage() {
  const { workOrders, loading } = useWorkOrders();
  const [cardFilter, setCardFilter] = useState<string | null>(null);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <LayoutDashboard className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard de Producción</h1>
          <p className="text-sm text-slate-400">
            {workOrders.filter(o => o.status !== 'completada' && o.status !== 'cancelada').length} órdenes activas • Ordenadas por fecha de entrega
          </p>
        </div>
      </div>

      {/* KPI Cards (Hacer clic en una tarjeta filtra la tabla abajo) */}
      <KPICards activeFilter={cardFilter} onSelectFilter={setCardFilter} />

      {/* OT Table */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-base font-semibold text-white">
            Órdenes de Trabajo
          </h2>
          {cardFilter && (
            <button
              onClick={() => setCardFilter(null)}
              className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium hover:bg-blue-500/30 transition-all flex items-center gap-1.5"
            >
              <span>Filtro activo: <strong>{CARD_FILTER_LABELS[cardFilter] || cardFilter}</strong></span>
              <span className="font-bold text-slate-400 hover:text-white">✕ Borrar</span>
            </button>
          )}
        </div>
        <OTTable
          workOrders={workOrders}
          loading={loading}
          cardFilter={cardFilter}
          onClearCardFilter={() => setCardFilter(null)}
        />
      </div>
    </div>
  );
}
