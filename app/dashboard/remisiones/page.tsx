'use client';

import { useState, useMemo } from 'react';
import { useRemisiones } from '@/lib/hooks/useRemisiones';
import { usePurchaseOrders } from '@/lib/hooks/usePurchaseOrders';
import { useWorkOrders } from '@/lib/hooks/useWorkOrders';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatDate } from '@/lib/utils';
import { deleteRemision } from '@/lib/firebase/firestore/remisiones';
import NuevaRemisionModal from '@/components/remisiones/NuevaRemisionModal';
import {
  Truck,
  Plus,
  Search,
  Building2,
  Calendar,
  User,
  Package,
  FileText,
  Trash2,
  ChevronRight,
} from 'lucide-react';

export default function RemisionesPage() {
  const { remisiones, loading } = useRemisiones();
  const { purchaseOrders } = usePurchaseOrders();
  const { workOrders } = useWorkOrders();
  const { userData, isAdmin } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('todos');

  // Modal de confirmación de eliminación
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Lista dinámica de clientes ordenados alfabéticamente
  const clientOptions = useMemo(() => {
    const clientsSet = new Set<string>();
    remisiones.forEach((r) => {
      if (r.cliente && r.cliente.trim() !== '') {
        clientsSet.add(r.cliente.trim());
      }
    });
    return Array.from(clientsSet).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );
  }, [remisiones]);

  // Lista filtrada
  const filteredRemisiones = useMemo(() => {
    return remisiones
      .filter(
        (r) => clientFilter === 'todos' || r.cliente?.toLowerCase() === clientFilter.toLowerCase()
      )
      .filter((r) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          r.folio.toLowerCase().includes(q) ||
          r.cliente.toLowerCase().includes(q) ||
          r.ocFolio.toLowerCase().includes(q) ||
          r.recibioPor.toLowerCase().includes(q) ||
          r.notas?.toLowerCase().includes(q) ||
          r.items.some(
            (it) => it.otFolio.toLowerCase().includes(q) || it.descripcion.toLowerCase().includes(q)
          )
        );
      });
  }, [remisiones, clientFilter, searchQuery]);

  // Totales para KPIs
  const totalPiezasEntregadas = useMemo(() => {
    return remisiones.reduce((sum, r) => {
      const pzasRemision = r.items.reduce((s, it) => s + (it.piezasEntregadas || 0), 0);
      return sum + pzasRemision;
    }, 0);
  }, [remisiones]);

  const handleDelete = async (id: string) => {
    try {
      await deleteRemision(id, userData?.uid, userData?.displayName || 'Usuario');
      setDeletingId(null);
    } catch {
      alert('Error al eliminar la remisión.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Truck className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Remisiones &amp; Entregas Parciales</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Historial y registro de entregas de piezas a clientes
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nueva Remisión
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-light rounded-2xl p-4 border border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total de Remisiones</p>
            <p className="text-2xl font-bold text-white">{remisiones.length}</p>
          </div>
        </div>

        <div className="glass-light rounded-2xl p-4 border border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Piezas Entregadas Totales</p>
            <p className="text-2xl font-bold text-emerald-400">{totalPiezasEntregadas}</p>
          </div>
        </div>

        <div className="glass-light rounded-2xl p-4 border border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Clientes Atendidos</p>
            <p className="text-2xl font-bold text-purple-300">{clientOptions.length}</p>
          </div>
        </div>
      </div>

      {/* Control Bar: Search + Client Filter */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-white">Historial de Remisiones</h2>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {/* Buscador */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por folio, cliente, OT, recibió..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Selector por Cliente */}
            <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700 rounded-xl px-2 py-1 shrink-0">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="todos" className="bg-slate-900 text-white">
                  Todos los Clientes
                </option>
                {clientOptions.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabla / Lista de Remisiones */}
        {loading ? (
          <div className="space-y-3 py-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-800/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredRemisiones.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs space-y-2">
            <Truck className="w-8 h-8 mx-auto text-slate-600 opacity-50" />
            <p>No se encontraron remisiones de entrega registradas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRemisiones.map((rem) => {
              const piezasSum = rem.items.reduce(
                (sum, it) => sum + (it.piezasEntregadas || 0),
                0
              );

              return (
                <div
                  key={rem.id}
                  className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                        {rem.folio}
                      </span>
                      <div>
                        <h3 className="font-bold text-white text-sm">{rem.cliente}</h3>
                        <p className="text-xs text-slate-400">
                          Orden de Compra: <strong className="text-slate-200">{rem.ocFolio}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        {formatDate(rem.fechaEntrega)}
                      </span>
                      <span className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Recibió: <strong className="text-white">{rem.recibioPor}</strong>
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => setDeletingId(rem.id)}
                          className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-colors"
                          title="Eliminar remisión"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items / OTs incluidas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                    {rem.items.map((it, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-400">{it.otFolio}</span>
                          <span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            + {it.piezasEntregadas} pzas
                          </span>
                        </div>
                        <p className="text-slate-300 font-medium line-clamp-1">{it.descripcion}</p>
                      </div>
                    ))}
                  </div>

                  {/* Notas */}
                  {rem.notas && (
                    <div className="text-xs text-slate-400 bg-slate-950/40 p-2 rounded-lg flex items-start gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      <p>{rem.notas}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Nueva Remisión */}
      {showModal && (
        <NuevaRemisionModal
          onClose={() => setShowModal(false)}
          purchaseOrders={purchaseOrders}
          workOrders={workOrders}
        />
      )}

      {/* Modal de confirmación de eliminación */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">¿Eliminar Remisión?</h3>
            <p className="text-xs text-slate-300">
              Esta acción eliminará el registro de la remisión. Ten en cuenta que esto no revertirá automáticamente las piezas entregadas en las OTs.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
