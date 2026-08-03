'use client';

import { useState } from 'react';
import { isOTAssignedToUser } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';
import { useWorkOrders } from '@/lib/hooks/useWorkOrders';
import { WorkOrder } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { getUrgency } from '@/lib/utils/urgency';
import OTDrawer from '@/components/dashboard/OTDrawer';
import { UserCheck, Clock, CheckCircle2, PauseCircle, AlertTriangle, Layers, ExternalLink } from 'lucide-react';

export default function MisOTsPage() {
  const { userData } = useAuth();
  const { workOrders, loading } = useWorkOrders();
  const [selectedOT, setSelectedOT] = useState<WorkOrder | null>(null);

  // Filtrar OTs asignadas al usuario actual (o pendientes de compras para el rol de Compras)
  const myWorkOrders = workOrders.filter((o) => {
    if (o.status === 'completada' || o.status === 'cancelada') return false;

    // Si el usuario es de Compras o Admin, incluir OTs que están esperando Materia Prima
    if ((userData?.role === 'compras' || userData?.role === 'admin') && o.status === 'compras_mp') {
      return true;
    }

    if (!userData) return false;
    return isOTAssignedToUser(o, userData.uid, userData.displayName);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Mis OTs Asignadas</h1>
            <p className="text-sm text-slate-400">
              Panel personal de trabajo para {userData?.displayName || 'tu usuario'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            {myWorkOrders.length} Trabajo{myWorkOrders.length !== 1 ? 's' : ''} Asignado{myWorkOrders.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-slate-800/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : myWorkOrders.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-slate-500 space-y-3 border border-slate-800">
          <UserCheck className="w-12 h-12 mx-auto opacity-30 text-emerald-400" />
          <h3 className="text-base font-semibold text-white">No tienes órdenes de trabajo asignadas</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Actualmente no tienes OTs activas asignadas a tu nombre. Cuando un Administrador o Supervisor te programe un trabajo, aparecerá automáticamente en esta sección.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myWorkOrders.map((ot) => {
            const urgency = getUrgency(ot.fechaEntrega, ot.status);
            const pct = ot.totalPiezas > 0 ? Math.round(((ot.piezasProcesadas || 0) / ot.totalPiezas) * 100) : 0;

            return (
              <div
                key={ot.id}
                onClick={() => setSelectedOT(ot)}
                className="glass-light hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 p-5 rounded-2xl cursor-pointer transition-all duration-200 space-y-3 group hover:shadow-xl shadow-black/40 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-blue-400 group-hover:text-blue-300">
                      {ot.folio}
                    </span>
                    {ot.status === 'en_pausa' ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold flex items-center gap-1">
                        <PauseCircle className="w-3 h-3 text-purple-400" /> Pausada
                      </span>
                    ) : (
                      <span className={`text-[10px] px-2.5 py-0.5 rounded font-bold ${
                        urgency === 'rojo' ? 'bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse' :
                        urgency === 'amarillo' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {urgency === 'rojo' ? 'CRÍTICA' : urgency === 'amarillo' ? 'URGENTE' : 'EN TIEMPO'}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-bold text-white line-clamp-2 group-hover:text-emerald-300 transition-colors">
                    {ot.descripcion}
                  </p>
                  <p className="text-xs text-slate-400">
                    Cliente: <strong className="text-slate-200">{ot.cliente}</strong> • OC: <span className="font-mono text-slate-300">{ot.ocFolio}</span>
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Avance de Piezas:</span>
                      <strong className="text-emerald-400">{ot.piezasProcesadas} / {ot.totalPiezas} ({pct}%)</strong>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Entrega: <strong className="text-slate-200">{formatDate(ot.fechaEntrega)}</strong></span>
                    <span className="text-blue-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Ver Detalles ↗
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer para ver / editar / actualizar la OT seleccionada */}
      {selectedOT && (
        <OTDrawer
          workOrder={selectedOT}
          onClose={() => setSelectedOT(null)}
          onUpdate={(updated) => setSelectedOT(updated)}
        />
      )}
    </div>
  );
}
