'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { usePurchaseOrders } from '@/lib/hooks/usePurchaseOrders';
import {
  getDirectExpensesByPeriod,
  getFixedCostsByPeriod,
  createFixedCost,
  deleteFixedCost,
  createDirectExpense,
  deleteDirectExpense,
  calculatePnL,
} from '@/lib/firebase/firestore/expenses';
import { registrarCobroCliente } from '@/lib/firebase/firestore/purchase-orders';
import {
  DirectExpense,
  FixedCost,
  PnLStatement,
  PurchaseOrder,
  EXPENSE_CATEGORY_LABELS,
  FIXED_COST_CATEGORY_LABELS,
} from '@/lib/types';
import { formatCurrency, getCurrentPeriod, getPeriodLabel, formatDate } from '@/lib/utils';
import ExpenseDetailModal from '@/components/finanzas/ExpenseDetailModal';
import FacturaModal from '@/components/finanzas/FacturaModal';
import { toast } from '@/components/ui/toaster';
import { exportFinancesToExcel } from '@/lib/utils/exportToExcel';
import {
  TrendingUp,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  FileText,
  DollarSign,
  Calendar,
  Eye,
  CreditCard,
  Building2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useWorkOrders } from '@/lib/hooks/useWorkOrders';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export default function FinanzasPage() {
  const { userData, isAdmin } = useAuth();
  const router = useRouter();
  const { purchaseOrders, loading: loadingOCs } = usePurchaseOrders();

  const [periodo, setPeriodo] = useState(getCurrentPeriod());
  const [pnl, setPnl] = useState<PnLStatement | null>(null);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [directExpenses, setDirectExpenses] = useState<DirectExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFixedForm, setShowFixedForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  // Detail Modals
  const [selectedDetail, setSelectedDetail] = useState<{
    item: DirectExpense | FixedCost;
    type: 'direct' | 'fixed';
  } | null>(null);

  const [facturaModalPO, setFacturaModalPO] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    loadData();
  }, [periodo, isAdmin, purchaseOrders]);

  async function loadData() {
    setLoading(true);
    const [fixed, direct] = await Promise.all([
      getFixedCostsByPeriod(periodo),
      getDirectExpensesByPeriod(periodo),
    ]);

    // Calcular ingresos del periodo
    const ingresosTotal = purchaseOrders
      .filter((oc) => {
        if (!oc.fechaCreacion) return false;
        const d = oc.fechaCreacion.toDate();
        const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return p === periodo;
      })
      .reduce((sum, oc) => sum + oc.montoVenta, 0);

    const statement = await calculatePnL(periodo, ingresosTotal);
    setFixedCosts(fixed);
    setDirectExpenses(direct);
    setPnl(statement);
    setLoading(false);
  }

  // Cuentas por Cobrar (Facturación de OCs)
  const cobrables = useMemo(() => {
    return purchaseOrders.map((oc) => {
      const isComplete = oc.totalOTs > 0 && oc.otCompletadas === oc.totalOTs;
      const estadoCobro = oc.estadoCobro || (oc.facturaVenta ? 'facturada' : 'sin_facturar');
      return { ...oc, isComplete, estadoCobro };
    });
  }, [purchaseOrders]);

  const porCobrarTotal = cobrables
    .filter((c) => c.estadoCobro === 'facturada')
    .reduce((sum, c) => sum + c.montoVenta, 0);

  const cobradasTotal = cobrables
    .filter((c) => c.estadoCobro === 'cobrada')
    .reduce((sum, c) => sum + c.montoVenta, 0);

  const ocsConDias = cobrables.filter((c) => typeof c.diasCobro === 'number' && c.diasCobro >= 0);
  const diasCobroPromedio = ocsConDias.length > 0
    ? Math.round(ocsConDias.reduce((sum, c) => sum + (c.diasCobro || 0), 0) / ocsConDias.length)
    : 0;

  async function handleRegistrarCobro(oc: PurchaseOrder) {
    if (confirm(`¿Confirmar cobro recibido de ${formatCurrency(oc.montoVenta, oc.currency)} para la OC ${oc.folio}?`)) {
      await registrarCobroCliente(oc.id, oc.fechaFacturacion);
      toast({ message: `Pago registrado correctamente para OC ${oc.folio}`, type: 'success' });
      loadData();
    }
  }

  const getPnLColor = (amount: number) =>
    amount >= 0 ? 'text-emerald-400' : 'text-red-400';

  const periods: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Finanzas & Cobranza</h1>
            <p className="text-sm text-slate-400">P&L, Cuentas por Cobrar y Gastos del Taller</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="export-finanzas-excel"
            onClick={() => {
              const invoices = cobrables.map((c) => ({
                id: c.id,
                folioFactura: c.facturaVenta || 'N/A',
                folioOC: c.folio,
                clienteNombre: c.cliente,
                fechaEmision: c.fechaCreacion,
                fechaVencimiento: c.fechaCompromiso,
                subtotal: c.montoVenta,
                iva: Math.round(c.montoVenta * 0.16),
                total: Math.round(c.montoVenta * 1.16),
                estatusPago: c.estadoCobro,
                diasCartera: c.diasCobro || 0,
              }));
              exportFinancesToExcel(invoices as any, directExpenses, fixedCosts);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-xl transition-all"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Exportar P&L a Excel
          </button>

          <select
            id="periodo-select"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {periods.map((p) => (
              <option key={p} value={p}>{getPeriodLabel(p)}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : pnl && (
        <>
          {/* ── 1. CUENTAS POR COBRAR Y FACTURACIÓN DE VENTAS ─────────────────── */}
          <div className="glass rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-400" />
                <h2 className="font-semibold text-white text-base">Cuentas por Cobrar & Facturación a Clientes</h2>
              </div>
              <span className="text-xs text-slate-400">Seguimiento de facturas de venta y tiempo de cobro</span>
            </div>

            {/* KPI Cards de Cobranza */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <p className="text-xs text-slate-400">Por Cobrar (Pendiente)</p>
                <p className="text-2xl font-bold font-mono text-amber-400 mt-1">{formatCurrency(porCobrarTotal)}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Facturas emitidas sin cobro</p>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <p className="text-xs text-slate-400">Total Cobrado</p>
                <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{formatCurrency(cobradasTotal)}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Pagos recibidos de clientes</p>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <p className="text-xs text-slate-400">Tiempo Promedio de Cobro</p>
                <p className="text-2xl font-bold font-mono text-blue-400 mt-1">
                  {diasCobroPromedio} <span className="text-sm font-normal text-slate-400">días</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Días entre facturación y pago</p>
              </div>
            </div>

            {/* Lista de OCs para Facturación y Cobro */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Órdenes de Compra del Mes — Facturación y Cobranza
              </p>

              {cobrables.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No hay órdenes de compra registradas.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {cobrables.map((oc) => (
                    <div
                      key={oc.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono text-sm font-bold text-blue-400">{oc.folio}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-sm font-medium text-white truncate">{oc.cliente}</span>
                          {oc.isComplete && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                              Operación Terminada
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          <span>Monto: <strong className="text-slate-200">{formatCurrency(oc.montoVenta, oc.currency)}</strong></span>
                          {oc.facturaVenta && (
                            <span className="text-blue-400 font-mono font-medium">
                              Factura: #{oc.facturaVenta}
                            </span>
                          )}
                          {oc.diasCobro !== undefined && oc.estadoCobro === 'cobrada' && (
                            <span className="text-emerald-400 font-medium">
                              Cobrado en {oc.diasCobro} días
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Facturación / Cobro Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {oc.estadoCobro === 'sin_facturar' && (
                          <button
                            onClick={() => setFacturaModalPO(oc)}
                            className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            + Ingresar # Factura
                          </button>
                        )}

                        {oc.estadoCobro === 'facturada' && (
                          <button
                            onClick={() => handleRegistrarCobro(oc)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-500/20"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Registrar Cobro
                          </button>
                        )}

                        {oc.estadoCobro === 'cobrada' && (
                          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Cobrado ✓
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── 2. ESTADO DE RESULTADOS P&L ──────────────────────────────────── */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-semibold text-white mb-5">Estado de Resultados — {getPeriodLabel(periodo)}</h2>

            <div className="space-y-3">
              {[
                { label: 'Ingresos Totales (Ventas)', value: pnl.ingresosTotales, bold: false, color: 'text-white' },
                { label: '(-) Costos Directos Totales', value: -pnl.costosDirectosTotales, bold: false, color: 'text-red-400', indent: true },
                { label: 'Utilidad Bruta', value: pnl.utilidadBruta, bold: true, color: getPnLColor(pnl.utilidadBruta), border: true },
                { label: '(-) Costos Fijos Mensuales', value: -pnl.costosFijosTotales, bold: false, color: 'text-red-400', indent: true },
                { label: 'Utilidad Operativa (EBITDA)', value: pnl.utilidadOperativa, bold: true, color: getPnLColor(pnl.utilidadOperativa), border: true },
              ].map((row, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between py-2 ${row.border ? 'border-t border-slate-700 pt-3' : ''}`}
                >
                  <span className={`text-sm ${row.indent ? 'pl-4 text-slate-400' : 'text-slate-300'} ${row.bold ? 'font-bold text-base' : ''}`}>
                    {row.label}
                  </span>
                  <span className={`font-mono text-sm font-semibold ${row.color} ${row.bold ? 'text-base' : ''}`}>
                    {formatCurrency(row.value)}
                  </span>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500">Margen Bruto</p>
                  <p className={`text-xl font-bold ${getPnLColor(pnl.margenBruto)}`}>
                    {pnl.margenBruto.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500">Margen Operativo</p>
                  <p className={`text-xl font-bold ${getPnLColor(pnl.margenOperativo)}`}>
                    {pnl.margenOperativo.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── 3. COSTOS FIJOS (REDISEÑO LIMPIO) ────────────────────────────── */}
          <div className="glass rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="font-semibold text-white">Costos Fijos del Mes</h2>
              <button
                id="add-fixed-cost-btn"
                onClick={() => setShowFixedForm(!showFixedForm)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-all w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                Agregar Costo Fijo
              </button>
            </div>

            {showFixedForm && (
              <FixedCostFormInline
                uid={userData?.uid || ''}
                onSaved={() => { setShowFixedForm(false); loadData(); }}
              />
            )}

            {fixedCosts.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No hay costos fijos registrados en este periodo.</p>
            ) : (
              <div className="space-y-2">
                {fixedCosts.map((fc) => (
                  <div
                    key={fc.id}
                    className="flex items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white truncate">{fc.descripcion}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                            {FIXED_COST_CATEGORY_LABELS[fc.categoria]}
                          </span>
                          {fc.factura && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30 shrink-0">
                              Factura: {fc.factura}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-sm font-bold text-red-400">
                        {formatCurrency(fc.monto)}
                      </span>

                      <button
                        onClick={() => setSelectedDetail({ item: fc, type: 'fixed' })}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                        title="Ver Detalle Completo"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => deleteFixedCost(fc.id).then(loadData)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                <p className="text-right text-sm font-bold text-white pt-2">
                  Total Costos Fijos: {formatCurrency(pnl.costosFijosTotales)}
                </p>
              </div>
            )}
          </div>

          {/* ── 4. GASTOS DIRECTOS (REDISEÑO LIMPIO) ─────────────────────────── */}
          <div className="glass rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="font-semibold text-white">Gastos Directos del Mes (Materiales / Maquilas)</h2>
              <button
                id="add-expense-btn"
                onClick={() => setShowExpenseForm(!showExpenseForm)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-all w-full sm:w-auto shrink-0"
              >
                <Plus className="w-4 h-4" />
                Agregar Gasto Directo
              </button>
            </div>

            {showExpenseForm && (
              <DirectExpenseFormInline
                uid={userData?.uid || ''}
                onSaved={() => { setShowExpenseForm(false); loadData(); }}
              />
            )}

            {directExpenses.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No hay gastos directos registrados en este periodo.</p>
            ) : (
              <div className="space-y-2">
                {directExpenses.map((de) => (
                  <div
                    key={de.id}
                    className="flex items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white truncate">{de.descripcion}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                            {EXPENSE_CATEGORY_LABELS[de.categoria]} • {de.otFolio}
                          </span>
                          {de.factura && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30 shrink-0">
                              Factura: {de.factura}
                            </span>
                          )}
                        </div>
                        {de.proveedor && (
                          <p className="text-xs text-slate-500 mt-0.5">Prov: {de.proveedor}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-sm font-bold text-red-400">
                        {formatCurrency(de.monto)}
                      </span>

                      <button
                        onClick={() => setSelectedDetail({ item: de, type: 'direct' })}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                        title="Ver Detalle Completo"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => deleteDirectExpense(de.id).then(loadData)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                <p className="text-right text-sm font-bold text-white pt-2">
                  Total Gastos Directos: {formatCurrency(pnl.costosDirectosTotales)}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {selectedDetail && (
        <ExpenseDetailModal
          item={selectedDetail.item}
          type={selectedDetail.type}
          onClose={() => setSelectedDetail(null)}
        />
      )}

      {facturaModalPO && (
        <FacturaModal
          po={facturaModalPO}
          onClose={() => setFacturaModalPO(null)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}

// ─── Inline forms ──────────────────────────────────────────────────────────

const fixedCostSchema = z.object({
  categoria: z.enum(['nomina','renta','electricidad','agua','internet','credito','mantenimiento','seguros','otro']),
  descripcion: z.string().min(2, 'Descripción requerida'),
  monto: z.coerce.number().positive('Monto debe ser mayor a 0'),
  factura: z.string().optional(),
  esRecurrente: z.boolean().optional(),
  fecha: z.string().min(1, 'Fecha requerida'),
});

function FixedCostFormInline({ uid, onSaved }: { uid: string; onSaved: () => void }) {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(fixedCostSchema),
    defaultValues: {
      esRecurrente: false,
      fecha: new Date().toISOString().slice(0, 10),
      categoria: 'nomina' as const,
      factura: '',
    },
  });
  const [saving, setSaving] = useState(false);

  async function onSubmit(data: any) {
    setSaving(true);
    await createFixedCost(
      {
        ...data,
        fecha: new Date(data.fecha),
        esRecurrente: data.esRecurrente || false,
      },
      uid
    );
    setSaving(false);
    onSaved();
  }

  const inputClass = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-3';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="glass-light rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="block text-xs text-slate-400 mb-1">Categoría</label>
        <select {...register('categoria')} className={inputClass}>
          {Object.entries(FIXED_COST_CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Descripción</label>
        <input {...register('descripcion')} placeholder="Ej: Nómina quincenal" className={inputClass} />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Monto (MXN)</label>
        <input type="number" step="0.01" {...register('monto')} placeholder="0.00" className={inputClass} />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1"># Factura (Opcional)</label>
        <input {...register('factura')} placeholder="Ej: F-10293" className={inputClass} />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Fecha de Registro</label>
        <input type="date" {...register('fecha')} className={inputClass} />
      </div>

      <div className="col-span-2">
        <button id="save-fixed-cost-btn" type="submit" disabled={saving} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60">
          {saving ? 'Guardando...' : 'Guardar Costo Fijo'}
        </button>
      </div>
    </form>
  );
}

const expenseSchema = z.object({
  otFolio: z.string().min(1),
  otId: z.string().min(1, 'Selecciona una OT'),
  categoria: z.enum(['materia_prima','maquila_externa','consumibles','flete','herramienta','otro']),
  descripcion: z.string().min(2, 'Descripción requerida'),
  monto: z.coerce.number().positive('Monto debe ser mayor a 0'),
  proveedor: z.string().optional(),
  factura: z.string().optional(),
  fecha: z.string().min(1, 'Fecha requerida'),
});

function DirectExpenseFormInline({ uid, onSaved }: { uid: string; onSaved: () => void }) {
  const { workOrders } = useWorkOrders();
  const { register, handleSubmit, setValue } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      fecha: new Date().toISOString().slice(0, 10),
      categoria: 'materia_prima' as const,
      factura: '',
      proveedor: '',
    },
  });
  const [saving, setSaving] = useState(false);

  async function onSubmit(data: any) {
    const ot = workOrders.find(o => o.id === data.otId);
    if (!ot) return;
    setSaving(true);
    await createDirectExpense(
      {
        ...data,
        fecha: new Date(data.fecha),
      },
      ot.folio,
      ot.ocId,
      uid
    );
    setSaving(false);
    onSaved();
  }

  const inputClass = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="glass-light rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="block text-xs text-slate-400 mb-1">OT Asociada *</label>
        <select
          id="expense-ot-select"
          {...register('otId')}
          onChange={e => {
            const ot = workOrders.find(o => o.id === e.target.value);
            setValue('otFolio', ot?.folio || '');
            setValue('otId', e.target.value);
          }}
          className={inputClass}
        >
          <option value="">-- Selecciona OT --</option>
          {workOrders.map(o => (
            <option key={o.id} value={o.id}>{o.folio} — {o.descripcion}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Categoría</label>
        <select {...register('categoria')} className={inputClass}>
          {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Monto (MXN)</label>
        <input type="number" step="0.01" {...register('monto')} placeholder="0.00" className={inputClass} />
      </div>

      <div className="col-span-2">
        <label className="block text-xs text-slate-400 mb-1">Descripción</label>
        <input {...register('descripcion')} placeholder="Ej: Barra de aluminio 6061" className={inputClass} />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Proveedor (Opcional)</label>
        <input {...register('proveedor')} placeholder="Nombre del proveedor" className={inputClass} />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1"># Factura (Opcional)</label>
        <input {...register('factura')} placeholder="Ej: F-9921" className={inputClass} />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Fecha de Registro</label>
        <input type="date" {...register('fecha')} className={inputClass} />
      </div>

      <div className="col-span-2">
        <button id="save-expense-btn" type="submit" disabled={saving} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60">
          {saving ? 'Guardando...' : 'Guardar Gasto Directo'}
        </button>
      </div>
    </form>
  );
}
