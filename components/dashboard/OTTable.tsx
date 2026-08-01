'use client';

import { useState, useMemo } from 'react';
import { WorkOrder, OTStatus, OT_STATUS_LABELS, OT_STATUS_ORDER } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import UrgencyBadge from './UrgencyBadge';
import ProgressBar from './ProgressBar';
import OTDrawer from './OTDrawer';
import { ChevronRight, Filter, Search, History, Zap } from 'lucide-react';

import { useAuth } from '@/lib/hooks/useAuth';

interface OTTableProps {
  workOrders: WorkOrder[];
  loading: boolean;
}

const ACTIVE_STATUSES: OTStatus[] = [
  'pendiente', 'compras_mp', 'diseno', 'produccion_interna', 'maquila_externa', 'calidad_envio',
];

const CLOSED_STATUSES: OTStatus[] = ['completada', 'cancelada'];

const STATUS_FILTER_OPTIONS: { value: OTStatus | 'todas'; label: string }[] = [
  { value: 'todas', label: 'Todos los estados' },
  ...OT_STATUS_ORDER.map((s) => ({ value: s, label: OT_STATUS_LABELS[s] })),
];

export default function OTTable({ workOrders, loading }: OTTableProps) {
  const { isAdmin } = useAuth();
  const [selectedOT, setSelectedOT] = useState<WorkOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<OTStatus | 'todas'>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Separar activas vs historial
  const activeOrders = useMemo(
    () => workOrders.filter((o) => ACTIVE_STATUSES.includes(o.status as OTStatus)),
    [workOrders]
  );
  const historicalOrders = useMemo(
    () => workOrders.filter((o) => CLOSED_STATUSES.includes(o.status as OTStatus)),
    [workOrders]
  );

  const baseList = showHistory ? historicalOrders : activeOrders;

  const filtered = baseList
    .filter((o) => statusFilter === 'todas' || o.status === statusFilter)
    .filter(
      (o) =>
        !searchQuery ||
        o.folio.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.descripcion.toLowerCase().includes(searchQuery.toLowerCase())
    );

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-800/40 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* ── Vista: Activas / Historial ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex bg-slate-800/60 border border-slate-700 rounded-xl p-1 gap-1 self-start sm:self-auto">
          <button
            id="ot-tab-activas"
            onClick={() => { setShowHistory(false); setStatusFilter('todas'); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              !showHistory
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Activas
            <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-mono ${
              !showHistory ? 'bg-white/20' : 'bg-slate-700'
            }`}>
              {activeOrders.length}
            </span>
          </button>
          <button
            id="ot-tab-historial"
            onClick={() => { setShowHistory(true); setStatusFilter('todas'); }}
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
              {historicalOrders.length}
            </span>
          </button>
        </div>

        {/* Search + Status filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="ot-search-input"
              type="text"
              placeholder="Buscar OT, cliente, descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700 rounded-xl px-2 py-1 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              id="ot-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OTStatus | 'todas')}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer max-w-[130px] truncate"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Label de vista activa */}
      {showHistory && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          <p className="text-xs text-slate-500">
            Mostrando {filtered.length} OT{filtered.length !== 1 ? 's' : ''} completadas/canceladas
          </p>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          {showHistory ? (
            <>
              <History className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No hay órdenes en el historial.</p>
            </>
          ) : (
            <>
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No hay órdenes activas.</p>
              <p className="text-xs mt-1 text-slate-600">Cambia al Historial para ver las completadas.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ot) => (
            <button
              key={ot.id}
              id={`ot-row-${ot.id}`}
              onClick={() => setSelectedOT(ot)}
              className={`w-full text-left glass-light rounded-xl p-4 hover:border-slate-600 hover:bg-slate-800/60 transition-all duration-150 group ${
                CLOSED_STATUSES.includes(ot.status as OTStatus) ? 'opacity-70' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Folio & Cliente */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-blue-400">
                      {ot.folio}
                    </span>
                    <span className="text-slate-500 text-xs">•</span>
                    <span className="text-xs text-slate-400">{ot.ocFolio}</span>
                    <UrgencyBadge workOrder={ot} size="sm" />
                  </div>
                  <p className="text-sm text-white font-medium truncate">{ot.descripcion}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{ot.cliente}</p>
                </div>

                {/* Status */}
                <div className="hidden sm:block shrink-0 w-36">
                  <span className={`text-xs ${
                    CLOSED_STATUSES.includes(ot.status as OTStatus)
                      ? 'text-slate-500'
                      : 'text-slate-300'
                  }`}>
                    {OT_STATUS_LABELS[ot.status]}
                  </span>
                </div>

                {/* Date */}
                <div className="hidden md:block shrink-0 text-right">
                  <p className="text-xs text-slate-400">
                    {CLOSED_STATUSES.includes(ot.status as OTStatus) ? 'Cerrada' : 'Entrega Interna'}
                  </p>
                  <p className="text-sm font-medium text-slate-200">
                    {formatDate(ot.fechaEntrega)}
                  </p>
                  {isAdmin && ot.fechaCliente && (
                    <p className="text-[10px] text-violet-400 font-semibold mt-0.5">
                      🔒 Real: {formatDate(ot.fechaCliente)}
                    </p>
                  )}
                </div>

                {/* Progress */}
                <div className="hidden lg:block shrink-0 w-36">
                  <ProgressBar workOrder={ot} showLabel={false} />
                </div>

                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Drawer */}
      {selectedOT && (
        <OTDrawer
          workOrder={selectedOT}
          onClose={() => setSelectedOT(null)}
          onUpdate={(updated) => setSelectedOT(updated)}
        />
      )}
    </>
  );
}
