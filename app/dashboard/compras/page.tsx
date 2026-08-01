'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useWorkOrders } from '@/lib/hooks/useWorkOrders';
import { getAllDirectExpenses } from '@/lib/firebase/firestore/expenses';
import { updateWorkOrderStatus } from '@/lib/firebase/firestore/work-orders';
import { DirectExpense, WorkOrder, EXPENSE_CATEGORY_LABELS } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import CompraFormModal from '@/components/compras/CompraFormModal';
import UrgencyBadge from '@/components/dashboard/UrgencyBadge';
import { toast } from '@/components/ui/toaster';
import {
  ShoppingBag,
  Plus,
  Search,
  ExternalLink,
  Package,
  CheckCircle2,
  Clock,
  FileText,
  Building2,
  DollarSign,
  AlertTriangle,
  History,
} from 'lucide-react';

export default function ComprasPage() {
  const { userData } = useAuth();
  const { workOrders, loading: loadingOTs } = useWorkOrders();

  const [expenses, setExpenses] = useState<DirectExpense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [activeTab, setActiveTab] = useState<'requerimientos' | 'historial'>('requerimientos');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOTForCompra, setSelectedOTForCompra] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    setLoadingExpenses(true);
    try {
      const data = await getAllDirectExpenses();
      setExpenses(data);
    } catch {
      // ignore
    } finally {
      setLoadingExpenses(false);
    }
  }

  // OTs en compras_mp
  const pendingMP_OTs = useMemo(
    () => workOrders.filter((ot) => ot.status === 'compras_mp'),
    [workOrders]
  );

  const totalGastadoMes = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return expenses
      .filter((e) => e.periodo === currentMonth)
      .reduce((sum, e) => sum + e.monto, 0);
  }, [expenses]);

  async function handleConfirmMaterialReceived(ot: WorkOrder) {
    if (!userData) return;
    try {
      await updateWorkOrderStatus(
        ot.id,
        'diseno',
        userData.uid,
        userData.displayName || userData.email,
        'compras_mp'
      );
      toast({ message: `Materia prima recibida. OT ${ot.folio} avanzada a etapa Diseño`, type: 'success' });
    } catch {
      toast({ message: 'Error al actualizar el estado de la OT.', type: 'error' });
    }
  }

  const filteredExpenses = expenses.filter(
    (e) =>
      !search ||
      e.descripcion.toLowerCase().includes(search.toLowerCase()) ||
      (e.otFolio && e.otFolio.toLowerCase().includes(search.toLowerCase())) ||
      (e.proveedor && e.proveedor.toLowerCase().includes(search.toLowerCase())) ||
      (e.factura && e.factura.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Compras & Registro de Insumos</h1>
            <p className="text-sm text-slate-400">
              Gestión de materias primas, facturas de proveedor y gastos por OT
            </p>
          </div>
        </div>

        <button
          id="nueva-compra-btn"
          onClick={() => {
            setSelectedOTForCompra(undefined);
            setModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Registrar Compra / Factura
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            OTs en Espera de Materia Prima
          </div>
          <p className="text-2xl font-bold font-mono text-amber-400">{pendingMP_OTs.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Órdenes detenidas por compra de material</p>
        </div>

        <div className="glass rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Compras del Mes
          </div>
          <p className="text-2xl font-bold font-mono text-white">{formatCurrency(totalGastadoMes)}</p>
          <p className="text-[11px] text-slate-500 mt-1">Insumos y materia prima adquiridos este mes</p>
        </div>

        <div className="glass rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <FileText className="w-4 h-4 text-blue-400" />
            Facturas Registradas
          </div>
          <p className="text-2xl font-bold font-mono text-blue-400">{expenses.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Comprobantes almacenados en el sistema</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex bg-slate-800/60 border border-slate-700 rounded-xl p-1 gap-1 self-start">
          <button
            id="tab-compras-requerimientos"
            onClick={() => setActiveTab('requerimientos')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'requerimientos'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Requerimientos Activos
            <span className="text-xs px-1.5 py-0.5 rounded-full font-mono bg-white/20">
              {pendingMP_OTs.length}
            </span>
          </button>

          <button
            id="tab-compras-historial"
            onClick={() => setActiveTab('historial')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'historial'
                ? 'bg-slate-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historial de Compras & Facturas
            <span className="text-xs px-1.5 py-0.5 rounded-full font-mono bg-white/20">
              {expenses.length}
            </span>
          </button>
        </div>

        {activeTab === 'historial' && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              id="compras-search"
              type="text"
              placeholder="Buscar por OT, proveedor, factura..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* ── TAB 1: REQUERIMIENTOS ACTIVOS (OTs en compras_mp) ────────────────── */}
      {activeTab === 'requerimientos' && (
        <div className="space-y-3">
          {loadingOTs ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-800/40 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : pendingMP_OTs.length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl text-slate-500 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400/40" />
              <p className="font-medium text-slate-300">¡Excelente! Sin compras de materia prima pendientes.</p>
              <p className="text-xs text-slate-500">Todas las OTs cuentan con material o han avanzado en el flujo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingMP_OTs.map((ot) => (
                <div
                  key={ot.id}
                  className="glass rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-blue-400 font-bold text-base">{ot.folio}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-sm text-slate-300 font-medium">{ot.cliente}</span>
                      <UrgencyBadge workOrder={ot} size="sm" />
                    </div>

                    <p className="text-sm font-semibold text-white">{ot.descripcion}</p>

                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap pt-1">
                      <span>Piezas: <strong className="text-slate-200">{ot.totalPiezas}</strong></span>
                      <span>Entrega OT: <strong className="text-slate-200">{formatDate(ot.fechaEntrega)}</strong></span>
                      {ot.material && (
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 font-medium">
                          Material: {ot.material}
                        </span>
                      )}
                      {ot.fechaEstimadaLlegadaMP && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                          🚚 Llega el: {formatDate(ot.fechaEstimadaLlegadaMP)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions for Compras */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => {
                        setSelectedOTForCompra(ot.id);
                        setModalOpen(true);
                      }}
                      className="px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Registrar Compra / Factura
                    </button>

                    <button
                      onClick={() => handleConfirmMaterialReceived(ot)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Marcar Material Recibido ✓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: HISTORIAL DE COMPRAS & FACTURAS ──────────────────────────── */}
      {activeTab === 'historial' && (
        <div className="space-y-3">
          {loadingExpenses ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-800/40 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl text-slate-500 space-y-2">
              <FileText className="w-10 h-10 mx-auto opacity-30" />
              <p className="font-medium text-slate-400">No hay facturas de compra registradas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="glass rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {exp.otFolio ? (
                        <span className="font-mono text-xs font-bold text-blue-400">{exp.otFolio}</span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          ⛽ Gasto Variable Taller
                        </span>
                      )}
                      <span className="text-slate-600">•</span>
                      <p className="text-sm font-semibold text-white truncate">{exp.descripcion}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-medium">
                        {EXPENSE_CATEGORY_LABELS[exp.categoria] || exp.categoria}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      {exp.proveedor && <span>Proveedor: <strong className="text-slate-300">{exp.proveedor}</strong></span>}
                      {exp.factura && (
                        <span className="font-mono text-blue-400">
                          Factura: #{exp.factura}
                        </span>
                      )}
                      <span>Fecha: {formatDate(exp.fecha)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="font-mono text-base font-bold text-white">
                      {formatCurrency(exp.monto)}
                    </span>

                    {/* Link to Invoice Document / Google Drive */}
                    {exp.facturaURL && (
                      <a
                        href={exp.facturaURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver Factura PDF / Drive
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <CompraFormModal
          initialOTId={selectedOTForCompra}
          onClose={() => setModalOpen(false)}
          onSaved={loadExpenses}
        />
      )}
    </div>
  );
}
