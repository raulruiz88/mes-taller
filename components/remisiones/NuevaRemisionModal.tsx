'use client';

import { useState, useMemo } from 'react';
import { PurchaseOrder, WorkOrder } from '@/lib/types';
import { createRemision } from '@/lib/firebase/firestore/remisiones';
import { useAuth } from '@/lib/hooks/useAuth';
import { X, Truck, CheckCircle2, AlertCircle, Calendar, User, Package, FileText } from 'lucide-react';

interface NuevaRemisionModalProps {
  onClose: () => void;
  purchaseOrders: PurchaseOrder[];
  workOrders: WorkOrder[];
}

interface SelectedOTItem {
  otId: string;
  otFolio: string;
  descripcion: string;
  piezasEntregadas: number;
  totalPiezas: number;
  prevEntregadas: number;
}

export default function NuevaRemisionModal({
  onClose,
  purchaseOrders,
  workOrders,
}: NuevaRemisionModalProps) {
  const { userData } = useAuth();
  const [selectedOcId, setSelectedOcId] = useState<string>('');
  const [fechaEntrega, setFechaEntrega] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [recibioPor, setRecibioPor] = useState<string>('');
  const [notas, setNotas] = useState<string>('');

  // Mapa de OTs seleccionadas: { [otId]: piezasAEntregar }
  const [selectedItemsMap, setSelectedItemsMap] = useState<Record<string, number>>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aviso de OTs completadas automáticamente
  const [completedNotice, setCompletedNotice] = useState<{
    remisionFolio: string;
    ots: string[];
  } | null>(null);

  // OCs activas disponibles
  const activeOCs = useMemo(
    () => purchaseOrders.filter((oc) => oc.status !== 'cancelada'),
    [purchaseOrders]
  );

  // OC elegida
  const selectedOC = useMemo(
    () => activeOCs.find((oc) => oc.id === selectedOcId),
    [activeOCs, selectedOcId]
  );

  // OTs pertenecientes a la OC elegida (que no estén canceladas)
  const otsForSelectedOC = useMemo(() => {
    if (!selectedOcId) return [];
    return workOrders.filter(
      (o) => o.ocId === selectedOcId && o.status !== 'cancelada'
    );
  }, [workOrders, selectedOcId]);

  // Manejar cambio de OC
  const handleOCChange = (ocId: string) => {
    setSelectedOcId(ocId);
    setSelectedItemsMap({});
  };

  // Toggle selección de OT
  const handleToggleOT = (ot: WorkOrder) => {
    const prevCount = ot.piezasEntregadas || 0;
    const pendingCount = Math.max(0, ot.totalPiezas - prevCount);

    if (selectedItemsMap[ot.id] !== undefined) {
      const copy = { ...selectedItemsMap };
      delete copy[ot.id];
      setSelectedItemsMap(copy);
    } else {
      setSelectedItemsMap({
        ...selectedItemsMap,
        [ot.id]: pendingCount > 0 ? pendingCount : ot.totalPiezas,
      });
    }
  };

  // Cambiar cantidad de piezas a entregar para una OT
  const handlePieceCountChange = (otId: string, count: number, maxAllowed: number) => {
    const val = Math.max(1, Math.min(count, maxAllowed));
    setSelectedItemsMap({
      ...selectedItemsMap,
      [otId]: val,
    });
  };

  // Guardar Remisión
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedOcId || !selectedOC) {
      setError('Por favor selecciona una Orden de Compra (OC).');
      return;
    }

    if (!recibioPor.trim()) {
      setError('Por favor indica el nombre de la persona que recibió en el cliente.');
      return;
    }

    const selectedOtIds = Object.keys(selectedItemsMap);
    if (selectedOtIds.length === 0) {
      setError('Debes seleccionar al menos una OT para incluir en esta remisión.');
      return;
    }

    const itemsToSubmit = selectedOtIds.map((otId) => {
      const ot = workOrders.find((o) => o.id === otId)!;
      return {
        otId: ot.id,
        otFolio: ot.folio,
        descripcion: ot.descripcion,
        piezasEntregadas: selectedItemsMap[otId] || 1,
        totalPiezas: ot.totalPiezas,
      };
    });

    try {
      setSubmitting(true);
      const res = await createRemision(
        {
          ocId: selectedOcId,
          fechaEntrega: new Date(fechaEntrega + 'T12:00:00'),
          recibioPor,
          notas,
          items: itemsToSubmit,
        },
        selectedOC.folio,
        selectedOC.cliente,
        userData?.uid || '',
        userData?.displayName || 'Usuario'
      );

      if (res.otsCompletadas && res.otsCompletadas.length > 0) {
        setCompletedNotice({
          remisionFolio: res.folio,
          ots: res.otsCompletadas,
        });
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la remisión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-blue-500/30 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">Nueva Remisión de Entrega</h2>
              <p className="text-xs text-slate-400">Registra envíos o entregas parciales al cliente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal de Aviso: OTs Completadas */}
        {completedNotice ? (
          <div className="space-y-4 py-4 my-auto text-center">
            <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">¡Remisión Registrada Exitosamente!</h3>
              <p className="text-xs font-mono text-emerald-400 font-bold mt-1">
                Folio: {completedNotice.remisionFolio}
              </p>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                Aviso Automático de Estado de Órdenes:
              </p>
              <p className="text-xs text-slate-300">
                Las siguientes Órdenes de Trabajo han alcanzado el <strong>100% de sus piezas entregadas</strong> y fueron actualizadas automáticamente al estado <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">Completada</span>:
              </p>
              <ul className="list-disc list-inside text-xs text-emerald-300 font-mono font-semibold space-y-0.5 pl-2">
                {completedNotice.ots.map((folio) => (
                  <li key={folio}>{folio}</li>
                ))}
              </ul>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
            >
              Entendido y Cerrar
            </button>
          </div>
        ) : (
          /* Formulario */
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Paso 1: Selección de OC */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                1. Selecciona la Orden de Compra (OC):
              </label>
              <select
                value={selectedOcId}
                onChange={(e) => handleOCChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Selecciona una OC --</option>
                {activeOCs.map((oc) => (
                  <option key={oc.id} value={oc.id}>
                    {oc.folio} — {oc.cliente} ({oc.ocCliente ? `PO: ${oc.ocCliente}` : 'Sin OC Cliente'})
                  </option>
                ))}
              </select>
            </div>

            {/* Paso 2: OTs pertenecientes a la OC elegida */}
            {selectedOcId && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  2. Selecciona las OTs e indica las piezas a entregar:
                </label>

                {otsForSelectedOC.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-800/40 rounded-xl">
                    Esta OC no tiene órdenes de trabajo activas registradas.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {otsForSelectedOC.map((ot) => {
                      const isSelected = selectedItemsMap[ot.id] !== undefined;
                      const prevCount = ot.piezasEntregadas || 0;
                      const pendingCount = Math.max(0, ot.totalPiezas - prevCount);
                      const pieceCount = selectedItemsMap[ot.id] || 0;
                      const is100WillComplete =
                        isSelected && prevCount + pieceCount >= ot.totalPiezas;

                      return (
                        <div
                          key={ot.id}
                          className={`p-3 rounded-xl border transition-all space-y-2 ${
                            isSelected
                              ? 'bg-blue-950/40 border-blue-500/50'
                              : 'bg-slate-800/40 border-slate-700/60 opacity-80'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleOT(ot)}
                              className="mt-1 w-4 h-4 accent-blue-500 rounded cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-xs font-bold text-blue-400">
                                  {ot.folio}
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  Entregadas previo: <strong className="text-emerald-400">{prevCount}</strong> / {ot.totalPiezas}
                                </span>
                              </div>
                              <p className="text-xs text-slate-200 font-semibold truncate">
                                {ot.descripcion}
                              </p>
                            </div>
                          </div>

                          {/* Campo de cantidad de piezas cuando está seleccionada */}
                          {isSelected && (
                            <div className="pl-7 flex items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
                              <div className="flex items-center gap-2">
                                <label className="text-[11px] text-slate-300 font-semibold">
                                  Piezas en esta remesa:
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={ot.totalPiezas}
                                  value={pieceCount}
                                  onChange={(e) =>
                                    handlePieceCountChange(
                                      ot.id,
                                      parseInt(e.target.value, 10) || 1,
                                      ot.totalPiezas
                                    )
                                  }
                                  className="w-20 px-2.5 py-1 bg-slate-900 border border-blue-500/40 rounded-lg text-xs font-bold text-white text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>

                              {is100WillComplete && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                                  ✨ Llagará al 100% (Completada)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Paso 3: Datos de entrega */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  Fecha de Entrega:
                </label>
                <input
                  type="date"
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  Quién Recibió en Cliente:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Ing. Juan Pérez / Almacén"
                  value={recibioPor}
                  onChange={(e) => setRecibioPor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Notas libres */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                Notas de Entrega / Transporte (Opcional):
              </label>
              <textarea
                rows={2}
                placeholder="Ej: Entregadas en caja de madera, transporte propio del cliente, firma en físico adjunta..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedOcId}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 disabled:opacity-40 flex items-center gap-1.5"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    Generar Remisión y Registrar Entrega
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
