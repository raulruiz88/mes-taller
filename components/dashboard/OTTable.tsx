'use client';

import { useState, useMemo } from 'react';
import { WorkOrder, OTStatus, OT_STATUS_LABELS, OT_STATUS_ORDER } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { getUrgency } from '@/lib/utils/urgency';
import UrgencyBadge from './UrgencyBadge';
import ProgressBar from './ProgressBar';
import OTDrawer from './OTDrawer';
import { ChevronRight, Filter, Search, History, Zap, PauseCircle, User } from 'lucide-react';

import { useAuth } from '@/lib/hooks/useAuth';

interface OTTableProps {
  workOrders: WorkOrder[];
  loading: boolean;
  cardFilter?: string | null;
  onClearCardFilter?: () => void;
}

const ACTIVE_STATUSES: OTStatus[] = [
  'pendiente', 'compras_mp', 'diseno', 'produccion_interna', 'maquila_externa', 'calidad_envio', 'en_pausa',
];

const CLOSED_STATUSES: OTStatus[] = ['completada', 'cancelada'];

const STATUS_FILTER_OPTIONS: { value: OTStatus | 'todas'; label: string }[] = [
  { value: 'todas', label: 'Todos los estados' },
  ...OT_STATUS_ORDER.map((s) => ({ value: s, label: OT_STATUS_LABELS[s] })),
  { value: 'en_pausa', label: 'En Pausa ⏸️' },
];

export default function OTTable({ workOrders, loading, cardFilter, onClearCardFilter }: OTTableProps) {
  const { isAdmin, userData } = useAuth();
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
    .filter((o) => {
      if (!cardFilter || showHistory) return true;
      if (cardFilter === 'mis_ots') {
        return (
          (userData?.uid && o.asignadoA === userData.uid) ||
          (userData?.displayName && o.asignadoNombre?.toLowerCase() === userData.displayName.toLowerCase())
        );
      }
      if (cardFilter === 'criticas') return o.status !== 'en_pausa' && getUrgency(o.fechaEntrega, o.status) === 'rojo';
      if (cardFilter === 'urgentes') return o.status !== 'en_pausa' && getUrgency(o.fechaEntrega, o.status) === 'amarillo';
      if (cardFilter === 'pausa') return o.status === 'en_pausa' || Boolean(o.esPausada);
      if (cardFilter === 'maquila') return o.status === 'maquila_externa' || Boolean(o.esMaquilaDirecta) || o.operaciones?.some((op) => op.centroTrabajo?.toLowerCase().includes('maquila'));
      if (cardFilter === 'envio') return o.status === 'calidad_envio';
      return true;
    })
    .filter((o) => statusFilter === 'todas' || o.status === statusFilter)
    .filter(
      (o) =>
        !searchQuery ||
        o.folio.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.asignadoNombre && o.asignadoNombre.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.motivoPausa && o.motivoPausa.toLowerCase().includes(searchQuery.toLowerCase()))
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
                    {ot.asignadoNombre ? (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                        <User className="w-3 h-3 text-emerald-400" />
                        {ot.asignadoNombre}
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-500 font-medium">
                        Sin Asignar
                      </span>
                    )}
                    {(ot.status === 'en_pausa' || ot.esPausada) && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium flex items-center gap-1">
                        <PauseCircle className="w-3 h-3 text-purple-400" />
                        EN PAUSA
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white font-medium truncate">{ot.descripcion}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 truncate">
                    <span>{ot.cliente}</span>
                    {ot.motivoPausa && (ot.status === 'en_pausa' || ot.esPausada) && (
                      <span className="text-purple-300 font-medium truncate bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-500/30">
                        ⏸️ {ot.motivoPausa}
                      </span>
                    )}
                  </div>
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
