'use client';

import { useWorkOrders } from '@/lib/hooks/useWorkOrders';
import KPICards from '@/components/dashboard/KPICards';
import OTTable from '@/components/dashboard/OTTable';
import { LayoutDashboard } from 'lucide-react';

export default function DashboardPage() {
  const { workOrders, loading } = useWorkOrders();

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

      {/* KPI Cards */}
      <KPICards />

      {/* OT Table */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">
          Órdenes de Trabajo
        </h2>
        <OTTable workOrders={workOrders} loading={loading} />
      </div>
    </div>
  );
}
