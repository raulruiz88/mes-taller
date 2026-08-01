'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createPurchaseOrder } from '@/lib/firebase/firestore/purchase-orders';
import { createWorkOrder } from '@/lib/firebase/firestore/work-orders';
import { createNotification } from '@/lib/firebase/firestore/notifications';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCustomers } from '@/lib/hooks/useCustomers';
import { parseLocalDate } from '@/lib/utils';
import { OTOperation } from '@/lib/types';
import { useCentrosTrabajo } from '@/lib/hooks/useCentrosTrabajo';
import { Plus, Trash2, ArrowLeft, Save, Building2, ChevronDown, ChevronUp, Settings2, Truck } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const schema = z.object({
  cliente: z.string().min(2, 'Mínimo 2 caracteres'),
  ocCliente: z.string().optional(),
  montoVenta: z.coerce.number().positive('Debe ser mayor a 0'),
  currency: z.enum(['MXN', 'USD']),
  fechaCompromiso: z.string().min(1, 'Requerido'),
  fechaCliente: z.string().optional(),
  dibujoURL: z.string().optional(),
  notas: z.string().optional(),
  workOrders: z
    .array(
      z.object({
        descripcion: z.string().min(3, 'Mínimo 3 caracteres'),
        totalPiezas: z.coerce.number().int().positive(),
        prioridad: z.enum(['normal', 'urgente', 'critica']).optional(),
        fechaEntrega: z.string().min(1, 'Requerido'),
        fechaCliente: z.string().optional(),
        material: z.string().optional(),
        planoURL: z.string().url('URL inválida').optional().or(z.literal('')),
        notas: z.string().optional(),
        esMaquilaDirecta: z.boolean().optional(),
      })
    )
    .min(1, 'Agrega al menos una OT'),
});

type FormValues = z.infer<typeof schema>;

export default function NuevaOCPage() {
  const { userData, isAdmin } = useAuth();
  const { customers, loading: loadingCustomers } = useCustomers();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customClientMode, setCustomClientMode] = useState(false);

  // Catálogo dinámico de centros de trabajo
  const { centros: centrosTrabajo } = useCentrosTrabajo();

  // Estado de operaciones por OT (keyed by OT index)
  const [operacionesPorOT, setOperacionesPorOT] = useState<Record<number, OTOperation[]>>({ 0: [] });
  // Estado de si el panel de operaciones está expandido por OT
  const [opsOpen, setOpsOpen] = useState<Record<number, boolean>>({ 0: false });

  useEffect(() => {
    if (userData && !isAdmin) {
      router.push('/dashboard');
    }
  }, [userData, isAdmin, router]);

  const activeCustomers = customers.filter((c) => c.isActive !== false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cliente: '',
      ocCliente: '',
      currency: 'MXN',
      dibujoURL: '',
      workOrders: [
        {
          descripcion: '',
          totalPiezas: 1,
          prioridad: 'normal',
          fechaEntrega: '',
          material: '',
          planoURL: '',
          notas: '',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'workOrders',
  });

  function addOpToOT(otIndex: number) {
    const current = operacionesPorOT[otIndex] ?? [];
    const newOp: OTOperation = {
      id: uuidv4(),
      orden: current.length + 1,
      nombre: '',
      centroTrabajo: centrosTrabajo[0] ?? '',
      piezasCompletadas: 0,
    };
    setOperacionesPorOT((prev) => ({ ...prev, [otIndex]: [...current, newOp] }));
  }

  function updateOpField(otIndex: number, opId: string, field: keyof OTOperation, value: string) {
    setOperacionesPorOT((prev) => ({
      ...prev,
      [otIndex]: (prev[otIndex] ?? []).map((op) =>
        op.id === opId ? { ...op, [field]: value } : op
      ),
    }));
  }

  function removeOp(otIndex: number, opId: string) {
    setOperacionesPorOT((prev) => {
      const filtered = (prev[otIndex] ?? []).filter((op) => op.id !== opId);
      // Renumerar
      return { ...prev, [otIndex]: filtered.map((op, i) => ({ ...op, orden: i + 1 })) };
    });
  }

  async function onSubmit(data: FormValues) {
    if (!userData) return;
    setSaving(true);
    setError('');
    try {
      const ocId = await createPurchaseOrder(
        {
          cliente: data.cliente,
          ocCliente: data.ocCliente,
          montoVenta: data.montoVenta,
          currency: data.currency,
          fechaCompromiso: parseLocalDate(data.fechaCompromiso),
          fechaCliente: data.fechaCliente ? parseLocalDate(data.fechaCliente) : undefined,
          dibujoURL: data.dibujoURL,
          notas: data.notas,
        },
        userData.uid
      );

      // Get OC folio
      const { getPurchaseOrder } = await import('@/lib/firebase/firestore/purchase-orders');
      const oc = await getPurchaseOrder(ocId);
      if (!oc) throw new Error('OC no encontrada');

      await Promise.all(
        data.workOrders.map((wo, i) =>
          createWorkOrder(
            {
              descripcion: wo.descripcion,
              totalPiezas: wo.totalPiezas,
              prioridad: wo.prioridad ?? 'normal',
              fechaEntrega: parseLocalDate(wo.fechaEntrega),
              fechaCliente: wo.fechaCliente ? parseLocalDate(wo.fechaCliente) : undefined,
              material: wo.material,
              planoURL: wo.planoURL,
              notas: wo.notas,
              operaciones: operacionesPorOT[i] ?? [],
              esMaquilaDirecta: wo.esMaquilaDirecta ?? false,
            },
            ocId,
            oc.folio,
            data.cliente,
            userData.uid
          )
        )
      );

      // Crear notificación in-app para todos los usuarios
      try {
        await createNotification({
          tipo: 'nueva_oc',
          titulo: 'Nueva Orden de Compra Registrada',
          mensaje: `${oc.folio} — ${data.cliente} ($${data.montoVenta.toLocaleString('es-MX', { minimumFractionDigits: 2 })} ${data.currency})`,
          ocId: ocId,
          creadoPorNombre: userData.displayName || userData.email,
        });
      } catch {
        // ignora si falla notif
      }

      router.push(`/dashboard/ordenes/${ocId}`);
    } catch (e) {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';
  const labelClass = 'block text-xs font-medium text-slate-400 mb-1.5';
  const errorClass = 'text-xs text-red-400 mt-1';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Nueva Orden de Compra</h1>
          <p className="text-sm text-slate-400">Registra la OC y sus OTs asociadas</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* OC Section */}
        <div className="glass rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold text-white">Datos de la Orden de Compra</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="oc-cliente" className={labelClass}>
                  Cliente (Catálogo) *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setCustomClientMode(!customClientMode);
                    setValue('cliente', '');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {customClientMode ? '← Seleccionar del Catálogo' : '+ Ingresar cliente manual'}
                </button>
              </div>

              {!customClientMode ? (
                <div className="relative">
                  <select
                    id="oc-cliente-select"
                    {...register('cliente')}
                    className={inputClass}
                  >
                    <option value="">-- Selecciona un cliente registrado --</option>
                    {activeCustomers.map((c) => (
                      <option key={c.id} value={c.nombreComercial}>
                        {c.nombreComercial} ({c.razonSocial}) — {c.rfc}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <input
                  id="oc-cliente-input"
                  {...register('cliente')}
                  placeholder="Nombre del cliente o razón social"
                  className={inputClass}
                />
              )}
              {errors.cliente && <p className={errorClass}>{errors.cliente.message}</p>}
            </div>

            <div>
              <label htmlFor="oc-cliente-num" className={labelClass}># OC del Cliente (Folio de Pedido)</label>
              <input
                id="oc-cliente-num"
                {...register('ocCliente')}
                placeholder="Ej: PO-CLIENTE-9942"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="oc-monto" className={labelClass}>Monto de Venta *</label>
              <input
                id="oc-monto"
                type="number"
                step="0.01"
                {...register('montoVenta')}
                placeholder="0.00"
                className={inputClass}
              />
              {errors.montoVenta && <p className={errorClass}>{errors.montoVenta.message}</p>}
            </div>

            <div>
              <label htmlFor="oc-currency" className={labelClass}>Moneda</label>
              <select id="oc-currency" {...register('currency')} className={inputClass}>
                <option value="MXN">MXN — Peso Mexicano</option>
                <option value="USD">USD — Dólar Americano</option>
              </select>
            </div>

            <div>
              <label htmlFor="oc-fecha" className={labelClass}>Fecha Compromiso Interno (Taller) *</label>
              <input
                id="oc-fecha"
                type="date"
                {...register('fechaCompromiso')}
                className={inputClass}
              />
              {errors.fechaCompromiso && <p className={errorClass}>{errors.fechaCompromiso.message}</p>}
            </div>

            {isAdmin && (
              <div className="p-3 bg-violet-950/30 border border-violet-500/30 rounded-xl space-y-1">
                <label htmlFor="oc-fecha-cliente" className="block text-xs font-semibold text-violet-300">
                  🔒 Fecha Real del Cliente (Solo Admin)
                </label>
                <input
                  id="oc-fecha-cliente"
                  type="date"
                  {...register('fechaCliente')}
                  className={inputClass}
                />
                <p className="text-[11px] text-slate-400">Esta fecha es confidencial y solo la verás tú.</p>
              </div>
            )}

            <div>
              <label htmlFor="oc-dibujo-url" className={labelClass}>Link al Dibujo / Plano Técnico (URL)</label>
              <input
                id="oc-dibujo-url"
                {...register('dibujoURL')}
                placeholder="https://drive.google.com/..."
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="oc-notas" className={labelClass}>Notas</label>
              <input
                id="oc-notas"
                {...register('notas')}
                placeholder="Observaciones opcionales"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* OTs Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Órdenes de Trabajo</h2>
            <button
              type="button"
              id="add-ot-btn"
              onClick={() =>
                append({
                  descripcion: '',
                  totalPiezas: 1,
                  prioridad: 'normal',
                  fechaEntrega: '',
                  material: '',
                  planoURL: '',
                  notas: '',
                })
              }
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 hover:text-white transition-all"
            >
              <Plus className="w-4 h-4" />
              Agregar OT
            </button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-blue-400">OT #{index + 1}</h3>
                {fields.length > 1 && (
                  <button
                    type="button"
                    id={`remove-ot-${index}-btn`}
                    onClick={() => remove(index)}
                    className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor={`ot-desc-${index}`} className={labelClass}>Descripción / Pieza *</label>
                  <input
                    id={`ot-desc-${index}`}
                    {...register(`workOrders.${index}.descripcion`)}
                    placeholder="Descripción del trabajo o pieza"
                    className={inputClass}
                  />
                  {errors.workOrders?.[index]?.descripcion && (
                    <p className={errorClass}>{errors.workOrders[index]?.descripcion?.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor={`ot-piezas-${index}`} className={labelClass}>Total de Piezas *</label>
                  <input
                    id={`ot-piezas-${index}`}
                    type="number"
                    min={1}
                    {...register(`workOrders.${index}.totalPiezas`)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor={`ot-fecha-${index}`} className={labelClass}>Fecha Compromiso Interno *</label>
                  <input
                    id={`ot-fecha-${index}`}
                    type="date"
                    {...register(`workOrders.${index}.fechaEntrega`)}
                    className={inputClass}
                  />
                </div>

                {isAdmin && (
                  <div className="p-3 bg-violet-950/30 border border-violet-500/30 rounded-xl space-y-1">
                    <label htmlFor={`ot-fecha-cliente-${index}`} className="block text-xs font-semibold text-violet-300">
                      🔒 Fecha Real Cliente (Solo Admin)
                    </label>
                    <input
                      id={`ot-fecha-cliente-${index}`}
                      type="date"
                      {...register(`workOrders.${index}.fechaCliente`)}
                      className={inputClass}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor={`ot-material-${index}`} className={labelClass}>Material</label>
                  <input
                    id={`ot-material-${index}`}
                    {...register(`workOrders.${index}.material`)}
                    placeholder="Ej: Acero 1018, Aluminio 6061"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2 bg-slate-900/50 border border-slate-700/60 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <label htmlFor={`ot-maquila-${index}`} className="text-xs font-semibold text-white cursor-pointer">
                        100% Maquila Externa / Servicio Directo
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Marca esta casilla si el trabajo NO pasa por el taller y se envía directamente a un proveedor externo.
                      </p>
                    </div>
                  </div>
                  <input
                    id={`ot-maquila-${index}`}
                    type="checkbox"
                    {...register(`workOrders.${index}.esMaquilaDirecta`)}
                    className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor={`ot-plano-${index}`} className={labelClass}>
                    Enlace a Plano (Google Drive) — Opcional
                  </label>
                  <input
                    id={`ot-plano-${index}`}
                    type="url"
                    {...register(`workOrders.${index}.planoURL`)}
                    placeholder="https://drive.google.com/..."
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor={`ot-notas-${index}`} className={labelClass}>Notas</label>
                  <textarea
                    id={`ot-notas-${index}`}
                    {...register(`workOrders.${index}.notas`)}
                    rows={2}
                    placeholder="Instrucciones especiales, tolerancias, acabados..."
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>

              {/* Operaciones de Manufactura */}
              <div className="border-t border-slate-700/60 pt-4">
                <button
                  type="button"
                  onClick={() => setOpsOpen((prev) => ({ ...prev, [index]: !prev[index] }))}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <Settings2 className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-white">
                    Operaciones de Manufactura
                  </span>
                  <span className="ml-2 text-[11px] font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                    {(operacionesPorOT[index] ?? []).length} op{(operacionesPorOT[index] ?? []).length !== 1 ? 's' : ''}
                  </span>
                  <span className="ml-auto text-slate-500">
                    {opsOpen[index] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>

                {opsOpen[index] && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-slate-500">
                      Define las operaciones que requiere cada pieza (ej: Fresado Op1, Vuelta, Fresado Op2). El progreso total considerará el avance por operación.
                    </p>

                    {(operacionesPorOT[index] ?? []).map((op) => (
                      <div key={op.id} className="flex items-center gap-2 bg-slate-900/60 border border-slate-700/60 rounded-xl p-3">
                        <span className="text-xs font-mono text-blue-400 w-6 shrink-0">{op.orden}</span>
                        <input
                          type="text"
                          value={op.nombre}
                          onChange={(e) => updateOpField(index, op.id, 'nombre', e.target.value)}
                          placeholder="Ej: Fresado – Agujero Frontal"
                          className="flex-1 min-w-0 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <select
                          value={op.centroTrabajo}
                          onChange={(e) => updateOpField(index, op.id, 'centroTrabajo', e.target.value)}
                          className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0"
                        >
                          {centrosTrabajo.map((ct) => (
                            <option key={ct} value={ct}>{ct}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeOp(index, op.id)}
                          className="w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/25 flex items-center justify-center text-red-400 shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => addOpToOT(index)}
                      className="flex items-center gap-2 px-3 py-2 w-full border border-dashed border-slate-700 hover:border-blue-500/50 rounded-xl text-xs text-slate-400 hover:text-blue-400 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar Operación
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {/* Submit */}
        <div className="flex gap-3 pb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            id="save-oc-btn"
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-60"
          >
            {saving ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Guardando...' : 'Guardar OC + OTs'}
          </button>
        </div>
      </form>
    </div>
  );
}
