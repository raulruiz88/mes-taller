'use client';

import { useState } from 'react';
import { PurchaseOrder } from '@/lib/types';
import { updatePurchaseOrder } from '@/lib/firebase/firestore/purchase-orders';
import { Timestamp } from 'firebase/firestore';
import { X, Save, Edit3, Link2, DollarSign, Calendar, FileText, User } from 'lucide-react';

interface EditOCModalProps {
  oc: PurchaseOrder;
  onClose: () => void;
  onSaved?: () => void;
}

export default function EditOCModal({ oc, onClose, onSaved }: EditOCModalProps) {
  const [cliente, setCliente] = useState(oc.cliente || '');
  const [ocCliente, setOcCliente] = useState(oc.ocCliente || '');
  const [montoVenta, setMontoVenta] = useState(oc.montoVenta || 0);
  const [currency, setCurrency] = useState<'MXN' | 'USD'>(oc.currency || 'MXN');

  const defaultDate = oc.fechaCompromiso
    ? oc.fechaCompromiso.toDate().toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const [fechaCompromiso, setFechaCompromiso] = useState(defaultDate);
  const [dibujoURL, setDibujoURL] = useState(oc.dibujoURL || '');
  const [notas, setNotas] = useState(oc.notas || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cliente.trim()) {
      setError('El cliente es obligatorio.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      await updatePurchaseOrder(oc.id, {
        cliente: cliente.trim(),
        ocCliente: ocCliente.trim(),
        montoVenta: Number(montoVenta) || 0,
        currency,
        fechaCompromiso: Timestamp.fromDate(new Date(fechaCompromiso)),
        dibujoURL: dibujoURL.trim(),
        notas: notas.trim(),
      });

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Error al actualizar OC:', err);
      setError('No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';
  const labelClass = 'block text-xs font-semibold text-slate-400 mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Editar Orden de Compra</h2>
              <p className="text-xs text-slate-400 font-mono">{oc.folio}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Cliente *</label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nombre del Cliente"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={labelClass}># OC del Cliente (Folio Cliente)</label>
              <input
                type="text"
                value={ocCliente}
                onChange={(e) => setOcCliente(e.target.value)}
                placeholder="Ej: PO-CLIENTE-9942"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Monto de Venta</label>
              <input
                type="number"
                step="0.01"
                value={montoVenta}
                onChange={(e) => setMontoVenta(Number(e.target.value))}
                placeholder="0.00"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Moneda</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'MXN' | 'USD')}
                className={inputClass}
              >
                <option value="MXN">MXN — Peso Mexicano</option>
                <option value="USD">USD — Dólar Americano</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Fecha de Compromiso</label>
              <input
                type="date"
                value={fechaCompromiso}
                onChange={(e) => setFechaCompromiso(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Link al Dibujo / Plano (URL)</label>
              <input
                type="url"
                value={dibujoURL}
                onChange={(e) => setDibujoURL(e.target.value)}
                placeholder="https://drive.google.com/..."
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notas / Observaciones</label>
            <textarea
              rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones especiales..."
              className={inputClass}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
