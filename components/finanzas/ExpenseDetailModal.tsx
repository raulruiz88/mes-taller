'use client';

import { DirectExpense, FixedCost, EXPENSE_CATEGORY_LABELS, FIXED_COST_CATEGORY_LABELS } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { X, FileText, Calendar, User, Package, Building2, CheckCircle2, Clock } from 'lucide-react';

interface Props {
  item: DirectExpense | FixedCost | null;
  type: 'direct' | 'fixed';
  onClose: () => void;
}

export default function ExpenseDetailModal({ item, type, onClose }: Props) {
  if (!item) return null;

  const isDirect = type === 'direct';
  const direct = isDirect ? (item as DirectExpense) : null;
  const fixed = !isDirect ? (item as FixedCost) : null;

  const categoryLabel = isDirect
    ? EXPENSE_CATEGORY_LABELS[direct!.categoria]
    : FIXED_COST_CATEGORY_LABELS[fixed!.categoria];

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-slate-900 border border-slate-700 rounded-2xl z-50 shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">
                {isDirect ? 'Detalle de Gasto Directo' : 'Detalle de Costo Fijo'}
              </h3>
              <span className="text-xs text-slate-400">{categoryLabel}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-sm">
          {/* Monto & Descripción */}
          <div className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Monto Registrado</p>
              <p className="text-2xl font-bold font-mono text-white">{formatCurrency(item.monto)}</p>
            </div>
            {item.factura ? (
              <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs rounded-lg font-bold">
                Factura: {item.factura}
              </span>
            ) : (
              <span className="text-xs text-slate-500 italic">Sin Factura</span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Descripción</p>
              <p className="text-white font-medium">{item.descripcion}</p>
            </div>

            {isDirect && (
              <>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <p className="text-xs text-slate-500">OT Relacionada</p>
                    <p className="text-sm font-mono font-bold text-blue-400">{direct!.otFolio}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Proveedor</p>
                    <p className="text-sm font-medium text-slate-200">{direct!.proveedor || '—'}</p>
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <p className="text-xs text-slate-500">Fecha de Registro</p>
                <p className="text-sm font-medium text-slate-300">{formatDate(item.fecha)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Estado de Pago</p>
                {item.estaPagado !== false ? (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Pagado
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-amber-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    Pendiente
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
}
