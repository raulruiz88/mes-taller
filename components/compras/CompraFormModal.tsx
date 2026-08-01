'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useWorkOrders } from '@/lib/hooks/useWorkOrders';
import { useSuppliers } from '@/lib/hooks/useSuppliers';
import { createDirectExpense } from '@/lib/firebase/firestore/expenses';
import { updateWorkOrderStatus, updateOTMaterialArrivalDate } from '@/lib/firebase/firestore/work-orders';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from '@/components/ui/toaster';
import { useCategoriasGastos } from '@/lib/hooks/useCategoriasGastos';
import { X, Save, ShoppingBag, Search, CheckCircle2, Building2, ChevronDown, Truck, Calendar } from 'lucide-react';

const schema = z.object({
  otId: z.string().optional(),
  categoria: z.string().min(1, 'Selecciona una categoría'),
  descripcion: z.string().min(2, 'La descripción es requerida'),
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
  proveedor: z.string().optional(),
  factura: z.string().optional(),
  facturaURL: z.string().url('URL inválida (ej: https://drive.google.com/...)').optional().or(z.literal('')),
  fecha: z.string().min(1, 'Fecha requerida'),
  recibidoInmediato: z.enum(['si', 'no']).optional(),
  fechaEstimadaLlegadaMP: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  initialOTId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function CompraFormModal({ initialOTId, onClose, onSaved }: Props) {
  const { userData } = useAuth();
  const { workOrders } = useWorkOrders();
  const { suppliers } = useSuppliers();
  const { categorias: categoriasGastos } = useCategoriasGastos();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tipoGasto, setTipoGasto] = useState<'ot' | 'general'>(initialOTId ? 'ot' : 'ot');
  const [otSearch, setOtSearch] = useState('');
  const [showOtDropdown, setShowOtDropdown] = useState(false);
  const [customSupplierMode, setCustomSupplierMode] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      otId: initialOTId || '',
      categoria: 'materia_prima',
      fecha: new Date().toISOString().slice(0, 10),
      monto: '' as any,
      descripcion: '',
      proveedor: '',
      factura: '',
      facturaURL: '',
      recibidoInmediato: 'no',
      fechaEstimadaLlegadaMP: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    },
  });

  const selectedOtId = watch('otId');
  const selectedOT = workOrders.find((o) => o.id === selectedOtId);
  const recibidoInmediato = watch('recibidoInmediato');

  // Filter OTs by search text
  const filteredOTs = useMemo(() => {
    if (!otSearch) return workOrders.slice(0, 10);
    const q = otSearch.toLowerCase();
    return workOrders.filter(
      (o) =>
        o.folio.toLowerCase().includes(q) ||
        o.descripcion.toLowerCase().includes(q) ||
        o.cliente.toLowerCase().includes(q)
    );
  }, [workOrders, otSearch]);

  async function onSubmit(data: FormValues) {
    if (!userData) return;
    if (tipoGasto === 'ot' && !data.otId) {
      setError('Selecciona una OT para compras ligadas a producción.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      // 1. Guardar el gasto directo / factura
      await createDirectExpense(
        {
          otId: tipoGasto === 'ot' ? data.otId : '',
          categoria: data.categoria,
          descripcion: data.descripcion,
          monto: data.monto,
          proveedor: data.proveedor,
          factura: data.factura,
          facturaURL: data.facturaURL,
          fecha: new Date(data.fecha),
        },
        selectedOT?.folio ?? '',
        selectedOT?.ocId ?? '',
        userData.uid
      );

      // 2. Manejar estado de entrega de Materia Prima si es ligada a OT
      if (tipoGasto === 'ot' && selectedOT?.status === 'compras_mp') {
        if (data.recibidoInmediato === 'si') {
          await updateWorkOrderStatus(
            selectedOT.id,
            'diseno',
            userData.uid,
            userData.displayName || userData.email,
            'compras_mp'
          );
          toast({ message: `Compra guardada y OT ${selectedOT.folio} avanzada a etapa Diseño`, type: 'success' });
        } else if (data.fechaEstimadaLlegadaMP) {
          await updateOTMaterialArrivalDate(
            selectedOT.id,
            new Date(data.fechaEstimadaLlegadaMP),
            userData.uid,
            userData.displayName || userData.email
          );
          toast({ message: `Compra registrada. Llegada estimada guardada`, type: 'success' });
        }
      } else {
        toast({ message: 'Gasto / Compra registrada correctamente', type: 'success' });
      }

      onSaved();
      onClose();
    } catch {
      setError('Error al guardar la compra. Revisa los datos.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full px-3.5 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';
  const labelClass = 'block text-xs font-medium text-slate-400 mb-1.5';
  const errorClass = 'text-xs text-red-400 mt-1';

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-slate-900 border border-slate-700 rounded-2xl z-50 shadow-2xl shadow-black/60 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="font-semibold text-white">Registrar Factura / Compra de Material</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto p-6 space-y-4">
          {/* Selector Tipo de Gasto */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 gap-1">
            <button
              type="button"
              onClick={() => setTipoGasto('ot')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                tipoGasto === 'ot'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📦 Gasto de OT (Materia Prima / Maquila)
            </button>
            <button
              type="button"
              onClick={() => {
                setTipoGasto('general');
                setValue('otId', '');
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                tipoGasto === 'general'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⛽ Gasto Variable del Taller (Gasolina, Herramienta...)
            </button>
          </div>

          {/* SEARCHABLE OT SELECTOR (solo si es de OT) */}
          {tipoGasto === 'ot' && (
            <div className="relative">
              <label className={labelClass}>Orden de Trabajo (OT) *</label>
              <div
                onClick={() => setShowOtDropdown(!showOtDropdown)}
                className={`${inputClass} cursor-pointer flex items-center justify-between`}
              >
              {selectedOT ? (
                <span className="font-medium text-white truncate">
                  <strong className="font-mono text-blue-400 mr-2">{selectedOT.folio}</strong>
                  {selectedOT.descripcion} ({selectedOT.cliente})
                </span>
              ) : (
                <span className="text-slate-500">-- Escribe o selecciona una OT --</span>
              )}
              <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
            </div>

            {showOtDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-2 border-b border-slate-700 flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Filtrar por folio, pieza o cliente..."
                    value={otSearch}
                    onChange={(e) => setOtSearch(e.target.value)}
                    className="w-full bg-transparent text-white text-xs placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-700/50">
                  {filteredOTs.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500 text-center">No hay OTs coincidentes</div>
                  ) : (
                    filteredOTs.map((ot) => (
                      <div
                        key={ot.id}
                        onClick={() => {
                          setValue('otId', ot.id);
                          setShowOtDropdown(false);
                          setOtSearch('');
                        }}
                        className={`p-3 hover:bg-slate-700/60 cursor-pointer transition-colors text-xs flex items-center justify-between gap-2 ${
                          selectedOtId === ot.id ? 'bg-blue-600/20 text-blue-300' : 'text-slate-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold">
                            <span className="font-mono text-blue-400">{ot.folio}</span> — {ot.descripcion}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{ot.cliente}</p>
                        </div>
                        {ot.status === 'compras_mp' && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0 font-medium">
                            Espera MP
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {errors.otId && <p className={errorClass}>{errors.otId.message}</p>}
          </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Categoría */}
            <div>
              <label className={labelClass}>Categoría de Compra / Gasto *</label>
              <select {...register('categoria')} className={inputClass}>
                {categoriasGastos.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Monto */}
            <div>
              <label className={labelClass}>Monto de la Compra ($ MXN) *</label>
              <input
                id="compra-monto-input"
                type="number"
                step="0.01"
                {...register('monto')}
                placeholder="0.00"
                className={inputClass}
              />
              {errors.monto && <p className={errorClass}>{errors.monto.message}</p>}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className={labelClass}>Descripción del Material o Insumo *</label>
            <input
              id="compra-desc-input"
              {...register('descripcion')}
              placeholder="Ej: Barra de aluminio 6061 Ø80mm x 3m"
              className={inputClass}
            />
            {errors.descripcion && <p className={errorClass}>{errors.descripcion.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Proveedor Selector desde Catálogo */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass}>Proveedor (Catálogo)</label>
                <button
                  type="button"
                  onClick={() => {
                    setCustomSupplierMode(!customSupplierMode);
                    setValue('proveedor', '');
                  }}
                  className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {customSupplierMode ? '← Catálogo' : '+ Manual'}
                </button>
              </div>

              {!customSupplierMode ? (
                <select id="compra-proveedor-select" {...register('proveedor')} className={inputClass}>
                  <option value="">-- Selecciona proveedor --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.nombre}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="compra-proveedor-manual"
                  {...register('proveedor')}
                  placeholder="Nombre de proveedor"
                  className={inputClass}
                />
              )}
            </div>

            {/* # Factura */}
            <div>
              <label className={labelClass}># Número de Factura</label>
              <input
                id="compra-factura-input"
                {...register('factura')}
                placeholder="Ej: F-99214"
                className={`${inputClass} font-mono uppercase`}
              />
            </div>
          </div>

          {/* Link / URL Factura (Google Drive) */}
          <div>
            <label className={labelClass}>Enlace a la Factura / Comprobante (Google Drive / PDF URL)</label>
            <input
              id="compra-url-input"
              type="url"
              {...register('facturaURL')}
              placeholder="https://drive.google.com/file/d/..."
              className={inputClass}
            />
            {errors.facturaURL && <p className={errorClass}>{errors.facturaURL.message}</p>}
          </div>

          {/* Fecha */}
          <div>
            <label className={labelClass}>Fecha de la Compra *</label>
            <input type="date" {...register('fecha')} className={inputClass} />
          </div>

          {/* SECCIÓN DE ENTREGA DE MATERIA PRIMA */}
          {selectedOT?.status === 'compras_mp' && (
            <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-3">
              <label className="block text-xs font-semibold text-slate-200">
                Estatus de Entrega del Material para OT <span className="font-mono text-blue-400">{selectedOT.folio}</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Opción 1: En Tránsito (Por llegar) */}
                <label
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    recibidoInmediato === 'no'
                      ? 'bg-amber-500/10 border-amber-500/50 text-white'
                      : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    value="no"
                    {...register('recibidoInmediato')}
                    className="mt-0.5 text-amber-500 focus:ring-amber-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-300">
                      <Truck className="w-3.5 h-3.5" />
                      En Tránsito (Por Llegar)
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      La OT permanece en "Compras MP" esperando entrega del proveedor.
                    </p>
                  </div>
                </label>

                {/* Opción 2: Ya Entregado (Inmediato) */}
                <label
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    recibidoInmediato === 'si'
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                      : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    value="si"
                    {...register('recibidoInmediato')}
                    className="mt-0.5 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Entregado en Taller
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Material en planta. Avanzar la OT automáticamente a "Diseño".
                    </p>
                  </div>
                </label>
              </div>

              {/* Si está en tránsito, pedir la Fecha Estimada de Llegada */}
              {recibidoInmediato === 'no' && (
                <div className="pt-2 border-t border-slate-700/60">
                  <label className="block text-xs font-medium text-amber-300 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Fecha Estimada de Llegada del Material al Taller *
                  </label>
                  <input
                    type="date"
                    {...register('fechaEstimadaLlegadaMP')}
                    className={inputClass}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Esta fecha se mostrará en el tablero para que Producción conozca cuándo estará listo el material.
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-all"
            >
              Cancelar
            </button>
            <button
              id="save-compra-btn"
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60 shadow-lg shadow-blue-500/20"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Compra'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
