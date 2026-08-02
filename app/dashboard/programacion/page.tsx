'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useWorkOrders } from '@/lib/hooks/useWorkOrders';
import { usePurchaseOrders } from '@/lib/hooks/usePurchaseOrders';
import { getAllUsers } from '@/lib/firebase/firestore/users';
import { AppUser, WorkOrder } from '@/lib/types';
import WorkloadCards from '@/components/programacion/WorkloadCards';
import GanttChart from '@/components/programacion/GanttChart';
import OTDrawer from '@/components/dashboard/OTDrawer';
import { Calendar, User, ShoppingBag } from 'lucide-react';

export default function ProgramacionPage() {
  const { userData } = useAuth();
  const { workOrders, loading: loadingOTs } = useWorkOrders();
  const { purchaseOrders, loading: loadingOCs } = usePurchaseOrders();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState<'gantt' | 'carga' | 'mis_trabajos'>('gantt');
  const [selectedOT, setSelectedOT] = useState<WorkOrder | null>(null);

  useEffect(() => {
    getAllUsers()
      .then((res) => {
        setUsers(res.filter((u) => u.isActive !== false));
      })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, []);

  const loading = loadingOTs || loadingOCs || loadingUsers;

  // Mis OTs Asignadas
  const myAssignedOTs = workOrders.filter((o) => {
    if (o.status === 'completada' || o.status === 'cancelada') return false;
    return (
      (userData?.uid && o.asignadoA === userData.uid) ||
      (userData?.displayName && o.asignadoNombre?.toLowerCase() === userData.displayName.toLowerCase())
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header & Sub-Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Programación & Carga de Trabajo</h1>
            <p className="text-sm text-slate-400">
              Control de capacidad por técnico, seguimiento de compras y Diagrama de Gantt
            </p>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="flex bg-slate-800/60 border border-slate-700 rounded-xl p-1 gap-1 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setActiveTab('mis_trabajos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'mis_trabajos'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4 text-emerald-400" />
            Mis Trabajos Asignados ({myAssignedOTs.length})
          </button>

          <button
            onClick={() => setActiveTab('gantt')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'gantt'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Diagrama de Gantt
          </button>

          <button
            onClick={() => setActiveTab('carga')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'carga'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            Carga de Trabajo
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'mis_trabajos' && (
            <div className="glass rounded-2xl p-6 space-y-4 border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-400" />
                    Mis Trabajos y Actividades Asignadas
                  </h2>
                  <p className="text-xs text-slate-400">
                    Órdenes de trabajo asignadas a {userData?.displayName || 'tu usuario'}
                  </p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-xl">
                  {myAssignedOTs.length} OT{myAssignedOTs.length !== 1 ? 's' : ''} activas
                </span>
              </div>

              {myAssignedOTs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <User className="w-10 h-10 mx-auto opacity-40" />
                  <p className="text-sm font-medium">No tienes órdenes asignadas actualmente.</p>
                  <p className="text-xs text-slate-600">Cuando un Administrador te asigne una OT, aparecerá listada aquí de inmediato.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myAssignedOTs.map((ot) => (
                    <div
                      key={ot.id}
                      onClick={() => setSelectedOT(ot)}
                      className="bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 p-5 rounded-2xl cursor-pointer transition-all space-y-3 group hover:border-emerald-500/50 hover:shadow-xl shadow-black/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-blue-400">{ot.folio}</span>
                        <span className="text-xs text-slate-400 font-mono">{ot.ocFolio}</span>
                      </div>

                      <div>
                        <p className="text-sm text-white font-bold group-hover:text-emerald-300 transition-colors">{ot.descripcion}</p>
                        <p className="text-xs text-slate-400 mt-1">Cliente: <strong className="text-slate-200">{ot.cliente}</strong></p>
                      </div>

                      <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs text-slate-400">
                        <div className="flex justify-between">
                          <span>Piezas Avance:</span>
                          <strong className="text-emerald-400">{ot.piezasProcesadas} de {ot.totalPiezas}</strong>
                        </div>
                        {ot.material && (
                          <div className="flex justify-between">
                            <span>Material:</span>
                            <span className="text-slate-300 truncate max-w-[150px]">{ot.material}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium">
                          <span>Entrega:</span>
                          <span className="text-white">{'fechaEntrega' in ot && ot.fechaEntrega ? String(ot.fechaEntrega.toDate ? ot.fechaEntrega.toDate().toLocaleDateString('es-MX') : ot.fechaEntrega) : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'gantt' && (
            <GanttChart
              workOrders={workOrders}
              users={users}
              onSelectOT={(ot) => setSelectedOT(ot)}
            />
          )}

          {activeTab === 'carga' && (
            <WorkloadCards
              workOrders={workOrders}
              purchaseOrders={purchaseOrders}
              users={users}
              onSelectOT={(ot) => setSelectedOT(ot)}
            />
          )}
        </>
      )}

      {/* Drawer para ver / editar / asignar la OT seleccionada */}
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
