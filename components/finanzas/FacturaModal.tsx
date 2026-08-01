'use client';

import { useState } from 'react';
import { PurchaseOrder } from '@/lib/types';
import { registrarFacturaVenta } from '@/lib/firebase/firestore/purchase-orders';
import { toast } from '@/components/ui/toaster';
import { X, FileText, Save } from 'lucide-react';

interface Props {
  po: PurchaseOrder | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function FacturaModal({ po, onClose, onSaved }: Props) {
  const [facturaNum, setFacturaNum] = useState(po?.facturaVenta || '');
  const [saving, setSaving] = useState(false);

  if (!po) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!facturaNum.trim()) return;
    setSaving(true);

    try {
      await registrarFacturaVenta(po!.id, facturaNum.trim());
      toast({ message: `Factura ${facturaNum} registrada para OC ${po!.folio}`, type: 'success' });
      onSaved();
      onClose();
    } catch {
      toast({ message: 'Error al registrar la factura.', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-slate-900 border border-slate-700 rounded-2xl z-50 shadow-2xl shadow-black/60 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Registrar Factura de Venta</h3>
              <p className="text-xs text-slate-400">{po.folio} • {po.cliente}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Número de Factura Emitida al Cliente *
            </label>
            <input
              id="factura-venta-input"
              type="text"
              required
              value={facturaNum}
              onChange={(e) => setFacturaNum(e.target.value)}
              placeholder="Ej: F-10492 ó FAC-2026-08"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Al guardar, la OC cambiará automáticamente a estado "Facturada (Pendiente de Pago)".
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !facturaNum.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Factura'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
