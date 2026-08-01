'use client';

import { useState } from 'react';
import { useExitSlips } from '@/lib/hooks/useExitSlips';
import { closeExitSlip } from '@/lib/firebase/firestore/exit-slips';
import { ExitSlipStatus } from '@/lib/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Package, Plus, CheckCheck, Clock, X } from 'lucide-react';
import ExitSlipForm from '@/components/maquilas/ExitSlipForm';

export default function MaquilasPage() {
  const [filter, setFilter] = useState<ExitSlipStatus | 'all'>('activa');
  const { exitSlips, loading } = useExitSlips(filter);
  const [showForm, setShowForm] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [costoReal, setCostoReal] = useState<number>(0);

  async function handleClose(id: string) {
    await closeExitSlip(id, costoReal);
    setClosingId(null);
    setCostoReal(0);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Maquilas / Salidas</h1>
            <p className="text-sm text-slate-400">Control de material fuera del taller</p>
          </div>
        </div>
        <button
          id="nueva-salida-btn"
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/20 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Nueva Salida
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
        {([
          { value: 'activa', label: 'Activas', icon: Clock },
          { value: 'cerrada', label: 'Cerradas', icon: CheckCheck },
          { value: 'all', label: 'Todas', icon: Package },
        ] as { value: ExitSlipStatus | 'all'; label: string; icon: React.ElementType }[]).map((tab) => (
          <button
            key={tab.value}
            id={`filter-${tab.value}-btn`}
            onClick={() => setFilter(tab.value)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all border shrink-0 ${
              filter === tab.value
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : exitSlips.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No hay órdenes de salida en esta categoría.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exitSlips.map((slip) => (
            <div key={slip.id} className="glass-light rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                  slip.status === 'activa' ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-sm font-bold text-amber-400">{slip.folio}</span>
                    <span className="text-slate-500 text-xs">→</span>
                    <span className="text-sm text-slate-300">{slip.otFolio}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-lg border ${
                      slip.status === 'activa'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-slate-500/10 text-slate-400 border-slate-600'
                    }`}>
                      {slip.status === 'activa' ? 'FUERA' : 'DEVUELTO'}
                    </span>
                  </div>
                  <p className="text-sm text-white font-medium">{slip.proveedorNombre}</p>
                  <p className="text-xs text-slate-400">{slip.servicio} • {slip.cantidadPiezas} pzas</p>
                  <div className="flex gap-4 mt-2">
                    <span className="text-xs text-slate-500">Salida: {formatDate(slip.fechaSalida)}</span>
                    <span className="text-xs text-slate-500">
                      Regreso estimado: {formatDate(slip.fechaRegresoEstimada)}
                    </span>
                  </div>
                  {slip.costoEstimado && slip.costoEstimado > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      Costo estimado: {formatCurrency(slip.costoEstimado)}
                    </p>
                  )}
                </div>

                {slip.status === 'activa' && (
                  <div className="shrink-0">
                    {closingId === slip.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Costo real"
                          value={costoReal || ''}
                          onChange={(e) => setCostoReal(Number(e.target.value))}
                          className="w-28 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          id={`confirm-close-${slip.id}-btn`}
                          onClick={() => handleClose(slip.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-all"
                        >
                          ✓ Cerrar
                        </button>
                        <button
                          onClick={() => setClosingId(null)}
                          className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        id={`close-slip-${slip.id}-btn`}
                        onClick={() => setClosingId(slip.id)}
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-xl transition-all"
                      >
                        Material Devuelto
                      </button>
                    )}
                  </div>
                )}

                {slip.status === 'cerrada' && slip.costoReal && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">Costo real</p>
                    <p className="text-sm font-bold text-white">{formatCurrency(slip.costoReal)}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Exit Slip Modal */}
      {showForm && <ExitSlipForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
