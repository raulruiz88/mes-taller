'use client';

import { useMemo } from 'react';
import { WorkOrder, AppUser, PurchaseOrder } from '@/lib/types';
import { User, ShoppingBag, Package, Clock, AlertTriangle, CheckCircle, PauseCircle, ArrowRight } from 'lucide-react';

import { isOTAssignedToUser, isOTUnassigned } from '@/lib/utils';

interface WorkloadCardsProps {
  workOrders: WorkOrder[];
  purchaseOrders: PurchaseOrder[];
  users: AppUser[];
  onSelectOT: (ot: WorkOrder) => void;
}

export default function WorkloadCards({
  workOrders,
  purchaseOrders,
  users,
  onSelectOT,
}: WorkloadCardsProps) {
  // Filtrar todos los usuarios activos
  const allActiveUsers = useMemo(
    () => users.filter((u) => u.isActive !== false),
    [users]
  );

  // Filtrar OTs activas (no completadas ni canceladas)
  const activeOTs = useMemo(
    () => workOrders.filter((o) => o.status !== 'completada' && o.status !== 'cancelada'),
    [workOrders]
  );

  // Agrupar OTs por técnico / usuario asignado
  const workloadByTech = useMemo(() => {
    const map: Record<
      string,
      { user: AppUser; ots: WorkOrder[]; totalPiezas: number; piezasProcesadas: number }
    > = {};

    allActiveUsers.forEach((u) => {
      map[u.uid] = {
        user: u,
        ots: [],
        totalPiezas: 0,
        piezasProcesadas: 0,
      };
    });

    // OTs sin asignar
    const unassigned: WorkOrder[] = [];

    activeOTs.forEach((ot) => {
      if (isOTUnassigned(ot)) {
        unassigned.push(ot);
      } else {
        let assignedCount = 0;
        allActiveUsers.forEach((u) => {
          if (isOTAssignedToUser(ot, u.uid, u.displayName)) {
            map[u.uid].ots.push(ot);
            map[u.uid].totalPiezas += ot.totalPiezas;
            map[u.uid].piezasProcesadas += ot.piezasProcesadas;
            assignedCount++;
          }
        });
        if (assignedCount === 0) {
          unassigned.push(ot);
        }
      }
    });

    // Mostrar ÚNICAMENTE usuarios que tienen OTs asignadas actualmente
    const relevantUsers = allActiveUsers.filter((u) => map[u.uid]?.ots.length > 0);

    return { map, unassigned, relevantUsers };
  }, [allActiveUsers, activeOTs]);

  // Carga de Compras (OCs activas y OTs en compras_mp)
  const comprasData = useMemo(() => {
    const otsComprasMP = activeOTs.filter((o) => o.status === 'compras_mp');
    const ocsPendientes = purchaseOrders.filter((oc) => oc.status === 'activa');
    return {
      otsComprasMP,
      ocsPendientes,
    };
  }, [activeOTs, purchaseOrders]);

  return (
    <div className="space-y-8">
      {/* ── SECCIÓN 1: CARGA DE TRABAJO POR TÉCNICO / OPERADOR ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Carga de Trabajo por Técnico / Operador</h2>
          </div>
          <span className="text-xs text-slate-400">
            {allActiveUsers.length} usuarios registrados • {activeOTs.length} OTs en proceso
          </span>
        </div>

        {/* Alerta de OTs sin asignar */}
        {workloadByTech.unassigned.length > 0 && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                {workloadByTech.unassigned.length} OTs Pendientes de Asignar a un Técnico
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {workloadByTech.unassigned.map((ot) => (
                <button
                  key={ot.id}
                  onClick={() => onSelectOT(ot)}
                  className="text-left bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 p-2.5 rounded-xl transition-all flex items-center justify-between group"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-mono text-xs font-bold text-blue-400">{ot.folio}</p>
                    <p className="text-xs text-white truncate">{ot.descripcion}</p>
                    <p className="text-[10px] text-slate-400">{ot.cliente}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/20 px-2 py-1 rounded-lg shrink-0">
                    Asignar ↗
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tarjetas de Técnicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workloadByTech.relevantUsers.map((u) => {
            const data = workloadByTech.map[u.uid];
            const otCount = data.ots.length;
            const pendientes = data.totalPiezas - data.piezasProcesadas;

            // Determinar nivel de carga
            let loadColor = 'border-slate-800 bg-slate-900/50';
            let loadBadge = 'bg-slate-800 text-slate-400';
            let loadText = 'Disponible';

            if (otCount >= 5) {
              loadColor = 'border-red-500/30 bg-red-950/10';
              loadBadge = 'bg-red-500/20 text-red-300 border border-red-500/30';
              loadText = 'Carga Alta ⚠️';
            } else if (otCount >= 3) {
              loadColor = 'border-amber-500/30 bg-amber-950/10';
              loadBadge = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
              loadText = 'Carga Media ⚡';
            } else if (otCount >= 1) {
              loadColor = 'border-emerald-500/30 bg-emerald-950/10';
              loadBadge = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
              loadText = 'Carga Normal ✓';
            }

            return (
              <div
                key={u.uid}
                className={`glass rounded-2xl p-5 border ${loadColor} space-y-4 shadow-xl transition-all`}
              >
                {/* Header Técnico */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {u.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{u.displayName}</h3>
                      <p className="text-[11px] text-slate-400 capitalize">{u.role}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${loadBadge}`}>
                    {loadText}
                  </span>
                </div>

                {/* Métricas rápidas */}
                <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div>
                    <p className="text-[11px] text-slate-400">OTs Asignadas</p>
                    <p className="text-lg font-bold text-white">{otCount}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Piezas Pendientes</p>
                    <p className="text-lg font-bold text-emerald-400">{pendientes} <span className="text-xs font-normal text-slate-500">/ {data.totalPiezas}</span></p>
                  </div>
                </div>

                {/* Lista de OTs de este técnico */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-400">Trabajos en proceso:</p>
                  {data.ots.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">Sin OTs asignadas actualmente.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {data.ots.map((ot) => (
                        <button
                          key={ot.id}
                          onClick={() => onSelectOT(ot)}
                          className="w-full text-left bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 p-2 rounded-xl transition-all flex items-center justify-between text-xs group"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="font-mono font-bold text-blue-400 text-[11px]">{ot.folio}</span>
                            <p className="text-white truncate font-medium">{ot.descripcion}</p>
                          </div>
                          {ot.status === 'en_pausa' ? (
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 font-medium shrink-0">
                              ⏸️ Pausa
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {ot.piezasProcesadas}/{ot.totalPiezas} pzas
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECCIÓN 2: CARGA DEL ÁREA DE COMPRAS ── */}
      <div className="glass rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Carga del Área de Compras & Materia Prima</h2>
          </div>
          <span className="text-xs text-slate-400">
            {comprasData.otsComprasMP.length} OTs esperando materia prima
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
            <p className="text-xs text-slate-400 font-semibold">OTs en Estado "Compras MP"</p>
            <p className="text-2xl font-bold text-amber-400">{comprasData.otsComprasMP.length}</p>
            <p className="text-[11px] text-slate-500">Órdenes de trabajo que requieren compra de material o insumos antes de pasar al taller.</p>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
            <p className="text-xs text-slate-400 font-semibold">Ordenes de Compra (OCs) Activas</p>
            <p className="text-2xl font-bold text-blue-400">{comprasData.ocsPendientes.length}</p>
            <p className="text-[11px] text-slate-500">Pedidos de clientes que se están surtiendo o procesando actualmente.</p>
          </div>
        </div>

        {/* Lista de OTs en Compras MP */}
        {comprasData.otsComprasMP.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-slate-300">Detalle de OTs esperando Materia Prima:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {comprasData.otsComprasMP.map((ot) => (
                <button
                  key={ot.id}
                  onClick={() => onSelectOT(ot)}
                  className="text-left bg-amber-950/20 hover:bg-amber-950/40 border border-amber-500/30 p-3 rounded-xl transition-all flex items-center justify-between group"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="font-mono text-xs font-bold text-amber-400">{ot.folio}</span>
                    <p className="text-xs text-white truncate font-medium">{ot.descripcion}</p>
                    <p className="text-[11px] text-slate-400">{ot.material || 'Material no especificado'}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
