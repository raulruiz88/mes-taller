'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createExitSlip } from '@/lib/firebase/firestore/exit-slips';
import { useAuth } from '@/lib/hooks/useAuth';
import { useWorkOrders } from '@/lib/hooks/useWorkOrders';
import { X, Save } from 'lucide-react';

const schema = z.object({
  otId: z.string().min(1, 'Selecciona una OT'),
  proveedorNombre: z.string().min(2, 'Requerido'),
  servicio: z.string().min(3, 'Requerido'),
  cantidadPiezas: z.coerce.number().int().positive(),
  fechaSalida: z.string().min(1, 'Requerido'),
  fechaRegresoEstimada: z.string().min(1, 'Requerido'),
  costoEstimado: z.coerce.number().optional(),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ExitSlipFormProps {
  onClose: () => void;
  initialOtId?: string;
}

export default function ExitSlipForm({ onClose, initialOtId }: ExitSlipFormProps) {
  const { userData } = useAuth();
  const { workOrders } = useWorkOrders();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeOTs = workOrders.filter(
    (o) => o.status !== 'completada' && o.status !== 'cancelada'
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      otId: initialOtId || '',
      cantidadPiezas: 1,
    },
  });

  const selectedOtId = watch('otId');
  const selectedOT = workOrders.find((o) => o.id === selectedOtId);

  async function onSubmit(data: FormValues) {
    if (!userData || !selectedOT) return;
    setSaving(true);
    setError('');
    try {
      await createExitSlip(
        {
          otId: data.otId,
          proveedorNombre: data.proveedorNombre,
          servicio: data.servicio,
          cantidadPiezas: data.cantidadPiezas,
          fechaSalida: new Date(data.fechaSalida),
          fechaRegresoEstimada: new Date(data.fechaRegresoEstimada),
          costoEstimado: data.costoEstimado,
          notas: data.notas,
        },
        selectedOT.folio,
        selectedOT.ocId,
        selectedOT.cliente,
        userData.uid
      );
      onClose();
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all';
  const labelClass = 'block text-xs font-medium text-slate-400 mb-1.5';
  const errorClass = 'text-xs text-red-400 mt-1';

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-slate-900 border border-slate-700 rounded-2xl z-50 shadow-2xl shadow-black/50 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="font-semibold text-white">Nueva Orden de Salida</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto">
          <div className="p-6 space-y-4">
            <div>
              <label className={labelClass}>OT Relacionada *</label>
              <select id="exit-ot-select" {...register('otId')} className={inputClass}>
                <option value="">Selecciona una OT</option>
                {activeOTs.map((ot) => (
                  <option key={ot.id} value={ot.id}>
                    {ot.folio} — {ot.descripcion}
                  </option>
                ))}
              </select>
              {errors.otId && <p className={errorClass}>{errors.otId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>Proveedor / Maquilador *</label>
                <input id="exit-proveedor" {...register('proveedorNombre')} placeholder="Nombre del proveedor" className={inputClass} />
                {errors.proveedorNombre && <p className={errorClass}>{errors.proveedorNombre.message}</p>}
              </div>

              <div className="col-span-2">
                <label className={labelClass}>Servicio Requerido *</label>
                <input id="exit-servicio" {...register('servicio')} placeholder="Ej: Tratamiento térmico, Rectificado, Galvanizado" className={inputClass} />
                {errors.servicio && <p className={errorClass}>{errors.servicio.message}</p>}
              </div>

              <div>
                <label className={labelClass}>Cantidad de Piezas *</label>
                <input id="exit-piezas" type="number" min={1} {...register('cantidadPiezas')} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Costo Estimado (MXN)</label>
                <input id="exit-costo" type="number" step="0.01" {...register('costoEstimado')} placeholder="0.00" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Fecha de Salida *</label>
                <input id="exit-fecha-salida" type="date" {...register('fechaSalida')} className={inputClass} />
                {errors.fechaSalida && <p className={errorClass}>{errors.fechaSalida.message}</p>}
              </div>

              <div>
                <label className={labelClass}>Regreso Estimado *</label>
                <input id="exit-fecha-regreso" type="date" {...register('fechaRegresoEstimada')} className={inputClass} />
                {errors.fechaRegresoEstimada && <p className={errorClass}>{errors.fechaRegresoEstimada.message}</p>}
              </div>

              <div className="col-span-2">
                <label className={labelClass}>Notas</label>
                <textarea id="exit-notas" {...register('notas')} rows={2} placeholder="Instrucciones o detalles del servicio" className={`${inputClass} resize-none`} />
              </div>
            </div>

            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</p>}
          </div>

          <div className="p-6 border-t border-slate-800 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-all">
              Cancelar
            </button>
            <button
              id="save-exit-slip-btn"
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Registrar Salida'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
