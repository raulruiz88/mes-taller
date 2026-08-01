'use client';

import { useState, useMemo } from 'react';
import { usePurchaseOrders } from '@/lib/hooks/usePurchaseOrders';
import { useWorkOrders } from '@/lib/hooks/useWorkOrders';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatDate, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { exportWorkOrdersToExcel } from '@/lib/utils/exportToExcel';
import { PurchaseOrder } from '@/lib/types';
import EditOCModal from '@/components/ordenes/EditOCModal';
import {
  Plus, ClipboardList, ChevronRight, CheckCircle,
  Clock, XCircle, Search, Zap, History, Download, Edit3,
} from 'lucide-react';

const STATUS_ICONS = {
  activa:     { icon: Clock,        color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
  completada: { icon: CheckCircle,  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  cancelada:  { icon: XCircle,      color: 'text-slate-500',   bg: 'bg-slate-500/10'   },
};

export default function OrdenesPage() {
  const { userData, isAdmin } = useAuth();
  const { purchaseOrders, loading } = usePurchaseOrders();
  const { workOrders } = useWorkOrders();
  const [search, setSearch] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const activeOCs = useMemo(
    () => purchaseOrders.filter((o) => o.status === 'activa'),
    [purchaseOrders]
  );
  const historicalOCs = useMemo(
    () => purchaseOrders.filter((o) => o.status !== 'activa'),
    [purchaseOrders]
  );

  const baseList = showHistory ? historicalOCs : activeOCs;

  const filtered = baseList.filter(
    (o) =>
      !search ||
      o.folio.toLowerCase().includes(search.toLowerCase()) ||
      o.cliente.toLowerCase().includes(search.toLowerCase())
  );

  const [editingOC, setEditingOC] = useState<PurchaseOrder | null>(null);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Edit OC Modal */}
      {editingOC && (
        <EditOCModal
          oc={editingOC}
          onClose={() => setEditingOC(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Órdenes de Compra</h1>
            <p className="text-sm text-slate-400">
              {activeOCs.length} activas · {historicalOCs.length} en historial
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="export-ordenes-excel"
            onClick={() => exportWorkOrdersToExcel(workOrders, isAdmin)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-xl transition-all"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Exportar Excel
          </button>
          {isAdmin && (
            <Link
              id="nueva-oc-btn"
              href="/dashboard/ordenes/nueva"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              Nueva OC
            </Link>
          )}
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex bg-slate-800/60 border border-slate-700 rounded-xl p-1 gap-1 self-start sm:self-auto">
          <button
            id="oc-tab-activas"
            onClick={() => { setShowHistory(false); setSearch(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              !showHistory
                ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Activas
            <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-mono ${
              !showHistory ? 'bg-white/20' : 'bg-slate-700'
            }`}>
              {activeOCs.length}
            </span>
          </button>
          <button
            id="oc-tab-historial"
            onClick={() => { setShowHistory(true); setSearch(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              showHistory
                ? 'bg-slate-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historial
            <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-mono ${
              showHistory ? 'bg-white/20' : 'bg-slate-700'
            }`}>
              {historicalOCs.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            id="oc-search"
            type="text"
            placeholder="Buscar por folio, OC cliente o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
          />
        </div>
      </div>

      {/* Label de historial */}
      {showHistory && (
        <div className="flex items-center gap-2 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          <p className="text-xs text-slate-500">
            Mostrando {filtered.length} OC{filtered.length !== 1 ? 's' : ''} completadas o canceladas
          </p>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-800/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          {showHistory ? (
            <>
              <History className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No hay OCs en el historial.</p>
            </>
          ) : (
            <>
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No hay órdenes activas.</p>
              <Link href="/dashboard/ordenes/nueva" className="text-sm text-violet-400 hover:underline mt-2 inline-block">
                Crear nueva OC →
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((oc) => {
            const { icon: Icon, color, bg } = STATUS_ICONS[oc.status];
            const progress = oc.totalOTs > 0
              ? Math.round((oc.otCompletadas / oc.totalOTs) * 100)
              : 0;
            return (
              <div
                key={oc.id}
                className={`flex items-center gap-3 sm:gap-4 glass-light rounded-xl p-3.5 sm:p-4 hover:border-slate-600 transition-all group ${
                  oc.status !== 'activa' ? 'opacity-70' : ''
                }`}
              >
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>

                <Link href={`/dashboard/ordenes/${oc.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-white">{oc.folio}</span>
                    {oc.ocCliente && (
                      <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30 shrink-0">
                        OC Cliente: {oc.ocCliente}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 hidden sm:inline">•</span>
                    <span className="text-sm text-slate-300 truncate">{oc.cliente}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-xs text-slate-500">
                      Entrega: {formatDate(oc.fechaCompromiso)}
                    </span>
                    {/* Mini progress bar OTs */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            progress === 100
                              ? 'bg-emerald-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {oc.otCompletadas}/{oc.totalOTs} OTs
                      </span>
                    </div>
                  </div>
                </Link>

                {isAdmin && (
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-white">{formatCurrency(oc.montoVenta, oc.currency)}</p>
                    <p className="text-xs text-slate-500">{oc.currency}</p>
                  </div>
                )}

                {isAdmin && (
                  <button
                    onClick={() => setEditingOC(oc)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 transition-all shrink-0"
                    title="Editar Orden de Compra"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}

                <Link href={`/dashboard/ordenes/${oc.id}`} className="shrink-0 text-slate-600 hover:text-slate-300 p-1">
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
