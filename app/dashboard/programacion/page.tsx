'use client';

import { useState, useEffect } from 'react';
import { useWorkOrders } from '@/lib/hooks/useWorkOrders';
import { usePurchaseOrders } from '@/lib/hooks/usePurchaseOrders';
import { getAllUsers } from '@/lib/firebase/firestore/users';
import { AppUser, WorkOrder } from '@/lib/types';
import WorkloadCards from '@/components/programacion/WorkloadCards';
import GanttChart from '@/components/programacion/GanttChart';
import OTDrawer from '@/components/dashboard/OTDrawer';
import { Calendar, User, ShoppingBag } from 'lucide-react';

export default function ProgramacionPage() {
  const { workOrders, loading: loadingOTs } = useWorkOrders();
  const { purchaseOrders, loading: loadingOCs } = usePurchaseOrders();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState<'gantt' | 'carga'>('gantt');
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
        <div className="flex bg-slate-800/60 border border-slate-700 rounded-xl p-1 gap-1 self-start sm:self-auto">
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
            Carga de Trabajo (Técnicos & Compras)
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
