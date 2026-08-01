'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPurchaseOrder } from '@/lib/firebase/firestore/purchase-orders';
import { getWorkOrdersByOC } from '@/lib/firebase/firestore/work-orders';
import { PurchaseOrder, WorkOrder } from '@/lib/types';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatDate, formatCurrency } from '@/lib/utils';
import UrgencyBadge from '@/components/dashboard/UrgencyBadge';
import ProgressBar from '@/components/dashboard/ProgressBar';
import { OT_STATUS_LABELS } from '@/lib/types';
import { ArrowLeft, Plus, Clock, CheckCircle, Edit3, ExternalLink, FileCode } from 'lucide-react';
import EditOCModal from '@/components/ordenes/EditOCModal';
import Link from 'next/link';

export default function OCDetailPage() {
  const { ocId } = useParams<{ ocId: string }>();
  const router = useRouter();
  const { userData, isAdmin } = useAuth();
  const [oc, setOC] = useState<PurchaseOrder | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);

  async function loadData() {
    const [ocData, ots] = await Promise.all([
      getPurchaseOrder(ocId),
      getWorkOrdersByOC(ocId),
    ]);
    setOC(ocData);
    setWorkOrders(ots);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [ocId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-24 bg-slate-800/40 rounded-2xl animate-pulse" />
        <div className="h-48 bg-slate-800/40 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!oc) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p>Orden de Compra no encontrada.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Edit OC Modal */}
      {editModalOpen && (
        <EditOCModal
          oc={oc}
          onClose={() => setEditModalOpen(false)}
          onSaved={loadData}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold font-mono text-white">{oc.folio}</h1>
              {oc.ocCliente && (
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  OC Cliente: {oc.ocCliente}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-lg border ${
                oc.status === 'activa' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                oc.status === 'completada' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                'bg-slate-500/10 text-slate-400 border-slate-500/30'
              }`}>{oc.status}</span>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">{oc.cliente}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {isAdmin && (
            <button
              onClick={() => setEditModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editar OC
            </button>
          )}
          {isAdmin && (
            <div className="text-right">
              <p className="text-xl font-bold text-white">{formatCurrency(oc.montoVenta, oc.currency)}</p>
              <p className="text-xs text-slate-500">Monto de venta</p>
            </div>
          )}
        </div>
      </div>

      {/* OC Info card */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: '# OC Cliente', value: oc.ocCliente || '—' },
            { label: 'Fecha Compromiso', value: formatDate(oc.fechaCompromiso) },
            { label: 'Fecha Registro', value: formatDate(oc.fechaCreacion) },
            { label: 'Avance OTs', value: `${oc.otCompletadas}/${oc.totalOTs} completadas` },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="text-sm font-semibold text-white mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Dibujo / Plano Link */}
        {oc.dibujoURL && (
          <div className="pt-3 border-t border-slate-800">
            <a
              href={oc.dibujoURL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 w-full sm:w-auto inline-flex"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir Plano / Dibujo General de la OC (Google Drive / PDF) ↗
            </a>
          </div>
        )}

        {oc.notas && (
          <div className="pt-3 border-t border-slate-800">
            <p className="text-xs text-slate-500 mb-1">Notas</p>
            <p className="text-sm text-slate-300">{oc.notas}</p>
          </div>
        )}
      </div>

      {/* OTs */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Órdenes de Trabajo</h2>
          {isAdmin && (
            <Link
              href={`/dashboard/ordenes/${ocId}/nueva-ot`}
              id="nueva-ot-btn"
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 hover:text-white transition-all"
            >
              <Plus className="w-4 h-4" />
              Agregar OT
            </Link>
          )}
        </div>

        {workOrders.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No hay OTs en esta orden.</p>
        ) : (
          <div className="space-y-3">
            {workOrders.map((ot) => (
              <div key={ot.id} className="glass-light rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-blue-400">{ot.folio}</span>
                      <UrgencyBadge workOrder={ot} size="sm" />
                    </div>
                    <p className="text-sm text-white mt-0.5">{ot.descripcion}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {OT_STATUS_LABELS[ot.status]} • Entrega: {formatDate(ot.fechaEntrega)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-white">
                      {ot.piezasProcesadas}/{ot.totalPiezas}
                    </p>
                    <p className="text-xs text-slate-500">piezas</p>
                  </div>
                </div>
                <ProgressBar workOrder={ot} showLabel={false} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
