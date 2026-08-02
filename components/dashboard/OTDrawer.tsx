'use client';

import { useState, useEffect } from 'react';
import {
  WorkOrder,
  OTStatus,
  OT_STATUS_LABELS,
  OT_STATUS_ORDER,
  OTChangeLog,
  OTOperation,
} from '@/lib/types';
import { useCentrosTrabajo } from '@/lib/hooks/useCentrosTrabajo';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  updateWorkOrderStatus,
  incrementPiezas,
  getChangelog,
  updateWorkOrderFields,
  updateOperacion,
  addOperacion,
  deleteOperacion,
  addOTComment,
  pausarWorkOrder,
  reanudarWorkOrder,
  asignarWorkOrder,
  asignarWorkOrderMultiple,
  deleteWorkOrder,
} from '@/lib/firebase/firestore/work-orders';
import { getAllUsers } from '@/lib/firebase/firestore/users';
import { parseLocalDate } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';
import UrgencyBadge from './UrgencyBadge';
import ProgressBar from './ProgressBar';
import { v4 as uuidv4 } from 'uuid';
import {
  X,
  ChevronRight,
  Plus,
  Minus,
  ArrowRight,
  ExternalLink,
  Clock,
  User,
  Package,
  FileText,
  Hash,
  History,
  Activity,
  Edit3,
  Save,
  Link2,
  FileCode,
  Settings2,
  ChevronDown,
  ChevronUp,
  Trash2,
  Factory,
  MessageSquare,
  Send,
  Truck,
  PauseCircle,
  Play,
} from 'lucide-react';

interface OTDrawerProps {
  workOrder: WorkOrder;
  onClose: () => void;
  onUpdate: (updated: WorkOrder) => void;
}

const NEXT_STATUS: Partial<Record<OTStatus, OTStatus>> = {
  pendiente: 'compras_mp',
  compras_mp: 'diseno',
  diseno: 'produccion_interna',
  produccion_interna: 'maquila_externa',
  maquila_externa: 'calidad_envio',
  calidad_envio: 'completada',
};

const NEXT_STATUS_MAQUILA_DIRECTA: Partial<Record<OTStatus, OTStatus>> = {
  pendiente: 'maquila_externa',
  maquila_externa: 'calidad_envio',
  calidad_envio: 'completada',
};

export default function OTDrawer({ workOrder, onClose, onUpdate }: OTDrawerProps) {
  const { userData } = useAuth();
  const { centros: centrosTrabajo } = useCentrosTrabajo();
  const [piezasInput, setPiezasInput] = useState(1);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingPiezas, setLoadingPiezas] = useState(false);
  const [changelog, setChangelog] = useState<OTChangeLog[]>([]);
  const [loadingLog, setLoadingLog] = useState(true);
  const [error, setError] = useState('');

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editDescripcion, setEditDescripcion] = useState(workOrder.descripcion || '');
  const [editTotalPiezas, setEditTotalPiezas] = useState(workOrder.totalPiezas || 1);
  const [editFechaEntrega, setEditFechaEntrega] = useState('');
  const [editFechaCliente, setEditFechaCliente] = useState('');
  const [editMaterial, setEditMaterial] = useState(workOrder.material || '');
  const [editPlanoURL, setEditPlanoURL] = useState(workOrder.planoURL || '');
  const [savingEdit, setSavingEdit] = useState(false);

  // Pause state
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [motivoPausaInput, setMotivoPausaInput] = useState('');
  const [pausing, setPausing] = useState(false);

  // Technicians state
  const [technicians, setTechnicians] = useState<any[]>([]);

  // Operaciones state
  const [localOps, setLocalOps] = useState<OTOperation[]>(workOrder.operaciones ?? []);
  const [loadingOpId, setLoadingOpId] = useState<string | null>(null);
  const [addingOp, setAddingOp] = useState(false);
  const [newOpNombre, setNewOpNombre] = useState('');
  const [newOpCentro, setNewOpCentro] = useState<string>(centrosTrabajo[0] ?? '');
  const [opsExpanded, setOpsExpanded] = useState(true);

  // Bitácora comentario libre state
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const canEdit =
    userData?.role === 'admin' || userData?.role === 'produccion';
  const nextStatus = workOrder.esMaquilaDirecta
    ? NEXT_STATUS_MAQUILA_DIRECTA[workOrder.status]
    : NEXT_STATUS[workOrder.status];
  const hasOps = localOps.length > 0;

  useEffect(() => {
    setLocalOps(workOrder.operaciones ?? []);
    setEditDescripcion(workOrder.descripcion || '');
    setEditTotalPiezas(workOrder.totalPiezas || 1);
    setEditMaterial(workOrder.material || '');
    setEditPlanoURL(workOrder.planoURL || '');

    const fEntrega = workOrder.fechaEntrega
      ? ('toDate' in workOrder.fechaEntrega ? workOrder.fechaEntrega.toDate() : new Date(workOrder.fechaEntrega))
      : new Date();
    setEditFechaEntrega(fEntrega.toISOString().slice(0, 10));

    if (workOrder.fechaCliente) {
      const fCliente = 'toDate' in workOrder.fechaCliente ? workOrder.fechaCliente.toDate() : new Date(workOrder.fechaCliente);
      setEditFechaCliente(fCliente.toISOString().slice(0, 10));
    } else {
      setEditFechaCliente('');
    }
  }, [workOrder]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getAllUsers().then((users) => {
      setTechnicians(users.filter((u) => u.isActive !== false));
    }).catch(() => {});
  }, []);

  async function handleDeleteOT() {
    setDeleting(true);
    try {
      await deleteWorkOrder(workOrder.id);
      onClose();
    } catch {
      setError('Error al eliminar la OT.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleTechnician(tech: { uid: string; displayName: string }) {
    const currentUids = workOrder.asignadosA || (workOrder.asignadoA ? [workOrder.asignadoA] : []);
    
    let newTechs: { uid: string; displayName: string }[] = [];
    const isSelected = currentUids.includes(tech.uid);

    if (isSelected) {
      newTechs = technicians
        .filter((t) => currentUids.includes(t.uid) && t.uid !== tech.uid)
        .map((t) => ({ uid: t.uid, displayName: t.displayName }));
    } else {
      const already = technicians
        .filter((t) => currentUids.includes(t.uid))
        .map((t) => ({ uid: t.uid, displayName: t.displayName }));
      newTechs = [...already, { uid: tech.uid, displayName: tech.displayName }];
    }

    const uids = newTechs.map((t) => t.uid);
    const nombres = newTechs.map((t) => t.displayName);
    const primaryUid = uids[0] || '';
    const primaryNombre = nombres.join(', ') || 'Sin Asignar';

    try {
      await asignarWorkOrderMultiple(
        workOrder.id,
        newTechs,
        userData?.uid || '',
        userData?.displayName || 'Usuario'
      );
      onUpdate({
        ...workOrder,
        asignadoA: primaryUid,
        asignadoNombre: primaryNombre,
        asignadosA: uids,
        asignadosNombres: nombres,
      });
      await loadLogs();
    } catch {
      setError('Error al actualizar asignaciones.');
    }
  }

  async function handleOpPiezas(op: OTOperation, delta: number) {
    if (!userData) return;
    const nuevas = Math.max(0, Math.min(op.piezasCompletadas + delta, workOrder.totalPiezas));
    setLoadingOpId(op.id);
    try {
      await updateOperacion(workOrder.id, op.id, nuevas, userData.uid, userData.displayName || userData.email);
      const updatedOps = localOps.map((o) => o.id === op.id ? { ...o, piezasCompletadas: nuevas } : o);
      setLocalOps(updatedOps);
      onUpdate({ ...workOrder, operaciones: updatedOps });
      await loadLogs();
    } catch {
      setError('Error al actualizar la operación.');
    } finally {
      setLoadingOpId(null);
    }
  }

  async function handleAddOp() {
    if (!newOpNombre.trim()) return;
    const newOp: OTOperation = {
      id: uuidv4(),
      orden: localOps.length + 1,
      nombre: newOpNombre.trim(),
      centroTrabajo: newOpCentro,
      piezasCompletadas: 0,
    };
    try {
      await addOperacion(workOrder.id, newOp);
      const updatedOps = [...localOps, newOp];
      setLocalOps(updatedOps);
      onUpdate({ ...workOrder, operaciones: updatedOps });
      setNewOpNombre('');
      setNewOpCentro(centrosTrabajo[0] ?? '');
      setAddingOp(false);
    } catch {
      setError('Error al agregar la operación.');
    }
  }

  async function handleDeleteOp(opId: string) {
    try {
      await deleteOperacion(workOrder.id, opId);
      const updatedOps = localOps
        .filter((o) => o.id !== opId)
        .map((o, i) => ({ ...o, orden: i + 1 }));
      setLocalOps(updatedOps);
      onUpdate({ ...workOrder, operaciones: updatedOps });
    } catch {
      setError('Error al eliminar la operación.');
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !userData) return;
    setSubmittingComment(true);
    try {
      await addOTComment(
        workOrder.id,
        newComment.trim(),
        userData.uid,
        userData.displayName || userData.email
      );
      setNewComment('');
      await loadLogs();
    } catch {
      setError('Error al registrar el comentario.');
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handlePausar() {
    if (!motivoPausaInput.trim()) return;
    setPausing(true);
    try {
      await pausarWorkOrder(
        workOrder.id,
        motivoPausaInput.trim(),
        userData?.uid || '',
        userData?.displayName || userData?.email || 'Usuario'
      );
      const updated = {
        ...workOrder,
        status: 'en_pausa' as OTStatus,
        esPausada: true,
        motivoPausa: motivoPausaInput.trim(),
        statusAnterior: workOrder.status,
      };
      onUpdate(updated);
      setShowPauseModal(false);
      setMotivoPausaInput('');
      await loadLogs();
    } catch (err) {
      setError('Error al pausar la OT');
    } finally {
      setPausing(false);
    }
  }

  async function handleReanudar() {
    setPausing(true);
    try {
      await reanudarWorkOrder(
        workOrder.id,
        userData?.uid || '',
        userData?.displayName || userData?.email || 'Usuario'
      );
      const restored = workOrder.statusAnterior || 'produccion_interna';
      const updated = {
        ...workOrder,
        status: restored,
        esPausada: false,
      };
      onUpdate(updated);
      await loadLogs();
    } catch (err) {
      setError('Error al reanudar la OT');
    } finally {
      setPausing(false);
    }
  }

  async function handleSaveEdit() {
    setSavingEdit(true);
    try {
      const fEntrega = parseLocalDate(editFechaEntrega);
      const fCliente = editFechaCliente ? parseLocalDate(editFechaCliente) : null;

      await updateWorkOrderFields(workOrder.id, {
        descripcion: editDescripcion,
        totalPiezas: Number(editTotalPiezas),
        fechaEntrega: fEntrega,
        fechaCliente: fCliente,
        material: editMaterial,
        planoURL: editPlanoURL,
      });

      onUpdate({
        ...workOrder,
        descripcion: editDescripcion,
        totalPiezas: Number(editTotalPiezas),
        fechaEntrega: fEntrega as any,
        fechaCliente: fCliente as any,
        material: editMaterial,
        planoURL: editPlanoURL,
      });
      setIsEditing(false);
    } catch (err) {
      setError('Error al guardar cambios de la OT.');
    } finally {
      setSavingEdit(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [workOrder.id]);

  async function loadLogs() {
    setLoadingLog(true);
    try {
      const logs = await getChangelog(workOrder.id);
      setChangelog(logs);
    } catch {
      // Ignorar si no hay permisos
    } finally {
      setLoadingLog(false);
    }
  }

  async function handleStatusChange() {
    if (!nextStatus || !userData) return;
    setLoadingStatus(true);
    setError('');
    try {
      await updateWorkOrderStatus(
        workOrder.id,
        nextStatus,
        userData.uid,
        userData.displayName || userData.email,
        workOrder.status
      );
      onUpdate({ ...workOrder, status: nextStatus });
      await loadLogs();
    } catch (e) {
      setError('Error al actualizar el estado. Intenta de nuevo.');
    } finally {
      setLoadingStatus(false);
    }
  }

  async function handleAddPiezas() {
    if (!userData || piezasInput <= 0) return;
    setLoadingPiezas(true);
    setError('');
    try {
      await incrementPiezas(
        workOrder.id,
        piezasInput,
        userData.uid,
        userData.displayName || userData.email,
        workOrder.piezasProcesadas
      );
      const newTotal = Math.min(
        workOrder.piezasProcesadas + piezasInput,
        workOrder.totalPiezas
      );
      onUpdate({
        ...workOrder,
        piezasProcesadas: newTotal,
      });
      setPiezasInput(1);
      await loadLogs();
    } catch {
      setError('Error al registrar piezas.');
    } finally {
      setLoadingPiezas(false);
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        id="ot-drawer"
        className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-slate-900 border-l border-slate-800 z-50 flex flex-col shadow-2xl shadow-black/50 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-blue-400 font-bold text-base">{workOrder.folio}</span>
              <UrgencyBadge workOrder={workOrder} size="sm" />
            </div>
            <p className="text-xs text-slate-400 font-mono">{workOrder.ocFolio} • {workOrder.cliente}</p>
            {userData?.role === 'admin' && workOrder.fechaCliente && (
              <p className="text-[11px] text-violet-400 font-semibold mt-0.5 flex items-center gap-1">
                🔒 Fecha Real Cliente: {formatDate(workOrder.fechaCliente)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {workOrder.status === 'en_pausa' || workOrder.esPausada ? (
              <button
                onClick={handleReanudar}
                disabled={pausing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-emerald-600/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Reanudar
              </button>
            ) : (
              <button
                onClick={() => setShowPauseModal(!showPauseModal)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-semibold transition-all"
              >
                <PauseCircle className="w-3.5 h-3.5 text-purple-400" />
                Pausar
              </button>
            )}

            {canEdit && (
              <>
                <button
                  id="edit-ot-toggle-btn"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    isEditing
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {isEditing ? 'Cancelar' : 'Editar OT'}
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  title="Eliminar OT"
                  className="w-8 h-8 rounded-xl bg-red-950/40 hover:bg-red-900 border border-red-500/30 flex items-center justify-center text-red-400 hover:text-white transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button
              id="drawer-close-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Confirmación de Eliminación de OT */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl shadow-red-950/50 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 text-red-400">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">¿Eliminar Orden de Trabajo?</h3>
                  <p className="font-mono text-xs text-red-400 font-semibold">{workOrder.folio}</p>
                </div>
              </div>
              <p className="text-xs text-slate-300">
                Esta acción eliminará de forma permanente la orden <strong>{workOrder.folio}</strong> ({workOrder.descripcion}). Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteOT}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-600/30 disabled:opacity-50"
                >
                  {deleting ? 'Eliminando...' : 'Sí, Eliminar Definitivamente'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Pause Modal / Input Box */}
          {showPauseModal && (
            <div className="bg-purple-950/70 border border-purple-500/50 rounded-2xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                  <PauseCircle className="w-4 h-4 text-purple-400" />
                  Pausar Trabajo de la OT
                </h4>
                <button
                  onClick={() => setShowPauseModal(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-purple-300/80">
                Escribe el motivo por el cual se deja en pausa este trabajo (ej: <em>"Llegó trabajo urgente de DEACERO"</em>):
              </p>
              <textarea
                value={motivoPausaInput}
                onChange={(e) => setMotivoPausaInput(e.target.value)}
                placeholder="Motivo de la pausa..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-900 border border-purple-500/40 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowPauseModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePausar}
                  disabled={pausing || !motivoPausaInput.trim()}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-purple-600/30"
                >
                  {pausing ? 'Pausando...' : 'Confirmar Pausa ⏸️'}
                </button>
              </div>
            </div>
          )}

          {/* Banner de OT Pausada */}
          {(workOrder.status === 'en_pausa' || workOrder.esPausada) && (
            <div className="bg-purple-950/50 border border-purple-500/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                  <PauseCircle className="w-5 h-5 text-purple-400 animate-pulse" />
                  <span>ESTA ORDEN ESTÁ EN PAUSA</span>
                </div>
                <button
                  onClick={handleReanudar}
                  disabled={pausing}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Reanudar Trabajo
                </button>
              </div>
              {workOrder.motivoPausa && (
                <p className="text-xs text-purple-200 bg-purple-900/40 p-2.5 rounded-xl border border-purple-500/20">
                  <strong>Motivo de la Pausa:</strong> {workOrder.motivoPausa}
                </p>
              )}
            </div>
          )}
          {/* Formulario de Edición de OT */}
          {isEditing ? (
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-400" />
                  Editar Datos de la OT
                </h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Descripción de la Pieza / Trabajo *
                </label>
                <input
                  type="text"
                  value={editDescripcion}
                  onChange={(e) => setEditDescripcion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Total Piezas
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editTotalPiezas}
                    onChange={(e) => setEditTotalPiezas(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Fecha Compromiso Interno (Taller) *
                  </label>
                  <input
                    type="date"
                    value={editFechaEntrega}
                    onChange={(e) => setEditFechaEntrega(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {userData?.role === 'admin' && (
                <div className="p-3 bg-violet-950/30 border border-violet-500/30 rounded-xl space-y-1">
                  <label className="block text-xs font-semibold text-violet-300 flex items-center gap-1.5">
                    🔒 Fecha Real del Cliente (Solo Admin)
                  </label>
                  <input
                    type="date"
                    value={editFechaCliente}
                    onChange={(e) => setEditFechaCliente(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <p className="text-[11px] text-slate-400">Esta fecha solo la puedes ver tú como Administrador.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Material / Insumo Especificado
                </label>
                <input
                  type="text"
                  value={editMaterial}
                  onChange={(e) => setEditMaterial(e.target.value)}
                  placeholder="Ej: Aluminio 6061-T6, Acero 4140, etc."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Link al Dibujo / Plano Técnico (URL Google Drive / PDF)
                </label>
                <input
                  type="url"
                  value={editPlanoURL}
                  onChange={(e) => setEditPlanoURL(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Descripción */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Descripción
                </h3>
                <p className="text-white font-medium">{workOrder.descripcion}</p>
              </div>

              {/* Técnico(s) Asignado(s) */}
              <div className="glass-light rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-400" />
                    Técnico(s) / Responsables Asignados:
                  </span>
                  <span className="text-xs font-semibold text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                    {workOrder.asignadosNombres?.join(', ') || workOrder.asignadoNombre || 'Sin Asignar'}
                  </span>
                </div>
                {(userData?.role === 'admin' || userData?.role === 'supervisor' || userData?.role === 'produccion') && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] text-slate-400 font-medium">Selecciona 1 o más responsables para esta OT:</p>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-900/80 rounded-xl border border-slate-800">
                      {technicians.map((t) => {
                        const currentUids = workOrder.asignadosA || (workOrder.asignadoA ? [workOrder.asignadoA] : []);
                        const isAssigned = currentUids.includes(t.uid);

                        return (
                          <button
                            key={t.uid}
                            type="button"
                            onClick={() => handleToggleTechnician({ uid: t.uid, displayName: t.displayName })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                              isAssigned
                                ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/20 font-bold'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                            }`}
                          >
                            <span>{isAssigned ? '✓' : '+'}</span>
                            <span>{t.displayName}</span>
                            <span className="text-[9px] opacity-70">({t.role === 'tecnico' ? 'Técnico' : t.role})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Plano link & Dibujo técnico */}
              <div className="glass-light rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Dibujo / Plano Técnico
                    </h3>
                  </div>
                </div>

                {workOrder.planoURL ? (
                  <a
                    href={workOrder.planoURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    id="drawer-plano-link"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold transition-all text-xs shadow-lg shadow-blue-500/20 w-full"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir Plano / Dibujo en Google Drive / PDF ↗
                  </a>
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-800/60 p-3 rounded-xl">
                    <span>No hay link de dibujo adjunto.</span>
                    {canEdit && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-blue-400 hover:underline font-semibold"
                      >
                        + Agregar Link
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Progress */}
          <div className="glass-light rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Progreso Global
            </h3>
            <ProgressBar workOrder={workOrder} />

            {/* Stage pipeline */}
            <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-1">
              {OT_STATUS_ORDER.filter(s => s !== 'completada').map((stage, i, arr) => (
                <div key={stage} className="flex items-center gap-1">
                  <div className={`px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    workOrder.status === stage
                      ? 'bg-blue-600 text-white'
                      : OT_STATUS_ORDER.indexOf(workOrder.status) > OT_STATUS_ORDER.indexOf(stage)
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {OT_STATUS_LABELS[stage]}
                  </div>
                  {i < arr.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Hash, label: 'Total Piezas', value: workOrder.totalPiezas },
              { icon: Package, label: 'Procesadas', value: workOrder.piezasProcesadas },
              { icon: Clock, label: 'Fecha Entrega', value: formatDate(workOrder.fechaEntrega) },
              { icon: FileText, label: 'Material', value: workOrder.material || '—' },
            ].map((item) => (
              <div key={item.label} className="bg-slate-800/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <item.icon className="w-3.5 h-3.5 text-slate-500" />
                  <p className="text-xs text-slate-500">{item.label}</p>
                </div>
                <p className="text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          {/* ── Panel de Operaciones de Manufactura ── */}
          <div className="glass-light rounded-xl overflow-hidden">
            {/* Header del panel */}
            <button
              type="button"
              onClick={() => setOpsExpanded((v) => !v)}
              className="flex items-center gap-2 w-full px-4 py-3 hover:bg-slate-800/40 transition-all"
            >
              <Settings2 className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                Operaciones de Manufactura
              </span>
              <span className="ml-2 text-[11px] font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                {localOps.length} op{localOps.length !== 1 ? 's' : ''}
              </span>
              <span className="ml-auto text-slate-500">
                {opsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>

            {opsExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {localOps.length === 0 && !addingOp && (
                  <p className="text-xs text-slate-500 text-center py-3">
                    No hay operaciones definidas. {canEdit && 'Agrega la secuencia de operaciones para esta OT.'}
                  </p>
                )}

                {localOps.map((op) => {
                  const pct = workOrder.totalPiezas > 0
                    ? Math.round((op.piezasCompletadas / workOrder.totalPiezas) * 100)
                    : 0;
                  const isLoading = loadingOpId === op.id;
                  return (
                    <div key={op.id} className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-3 space-y-2">
                      {/* Row 1: número, nombre, centro, eliminar */}
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-600/20 border border-blue-500/30 text-[10px] font-bold text-blue-400 flex items-center justify-center shrink-0">
                          {op.orden}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{op.nombre || 'Sin nombre'}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Factory className="w-3 h-3" />
                            {op.centroTrabajo}
                          </p>
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteOp(op.id)}
                            className="w-5 h-5 rounded bg-red-500/10 hover:bg-red-500/25 flex items-center justify-center text-red-400 shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Row 2: progreso + contador */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>{op.piezasCompletadas}/{workOrder.totalPiezas} pzas</span>
                            <span className="font-semibold text-white">{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {canEdit && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleOpPiezas(op, -1)}
                              disabled={isLoading || op.piezasCompletadas <= 0}
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 disabled:opacity-30 transition-all"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleOpPiezas(op, 1)}
                              disabled={isLoading || op.piezasCompletadas >= workOrder.totalPiezas}
                              className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white disabled:opacity-30 transition-all"
                            >
                              {isLoading ? (
                                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                </svg>
                              ) : (
                                <Plus className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Formulario para agregar op */}
                {addingOp && (
                  <div className="bg-slate-900/80 border border-blue-500/30 rounded-xl p-3 space-y-2">
                    <input
                      type="text"
                      value={newOpNombre}
                      onChange={(e) => setNewOpNombre(e.target.value)}
                      placeholder="Nombre de la operación (ej: Fresado – Agujero Frontal)"
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <select
                      value={newOpCentro}
                      onChange={(e) => setNewOpCentro(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {centrosTrabajo.map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAddingOp(false)}
                        className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddOp}
                        disabled={!newOpNombre.trim()}
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold disabled:opacity-40"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                )}

                {canEdit && !addingOp && (
                  <button
                    type="button"
                    onClick={() => setAddingOp(true)}
                    className="flex items-center gap-2 px-3 py-2 w-full border border-dashed border-slate-700 hover:border-blue-500/50 rounded-xl text-xs text-slate-400 hover:text-blue-400 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar Operación
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Plano link */}
          {workOrder.planoURL && (
            <a
              href={workOrder.planoURL}
              target="_blank"
              rel="noopener noreferrer"
              id="drawer-plano-link"
              className="flex items-center gap-2 px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 hover:bg-blue-500/20 transition-all text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Ver Plano / Archivo
            </a>
          )}

          {/* Bitácora de Tiempos y Avance de Piezas */}
          <div className="glass-light rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Bitácora de Tiempos &amp; Comentarios
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {changelog.length} registro{changelog.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Formulario para agregar comentario libre */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe una nota o comentario de seguimiento..."
                className="flex-1 px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={submittingComment || !newComment.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-all shrink-0"
              >
                {submittingComment ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    Comentar
                  </>
                )}
              </button>
            </form>

            {loadingLog ? (
              <div className="space-y-2 py-2">
                <div className="h-10 bg-slate-800/40 rounded-lg animate-pulse" />
                <div className="h-10 bg-slate-800/40 rounded-lg animate-pulse" />
              </div>
            ) : changelog.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                No hay registros en la bitácora de esta OT aún.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {changelog.map((log) => {
                  const isPieceUpdate = log.accion === 'piezas_update';
                  const isNota = log.accion === 'nota';
                  const piezasDelta =
                    typeof log.valorNuevo === 'number' && typeof log.valorAnterior === 'number'
                      ? log.valorNuevo - log.valorAnterior
                      : 0;

                  return (
                    <div
                      key={log.id}
                      className={`p-3 rounded-xl text-xs space-y-1.5 ${
                        isNota
                          ? 'bg-blue-950/40 border border-blue-500/30'
                          : 'bg-slate-900/60 border border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-slate-400">
                        <div className="flex items-center gap-1.5 font-medium text-slate-300">
                          <User className="w-3 h-3 text-slate-500" />
                          <span>{log.usuarioNombre}</span>
                          {isNota && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              NOTA
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>

                      {isNota ? (
                        <div className="flex items-start gap-2 text-slate-200">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                          <p className="whitespace-pre-wrap">{String(log.valorNuevo)}</p>
                        </div>
                      ) : isPieceUpdate ? (
                        <div className="flex items-center gap-2 text-emerald-400 font-medium">
                          <Package className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            + {piezasDelta} pieza{piezasDelta !== 1 ? 's' : ''} registrada
                            {piezasDelta !== 1 ? 's' : ''}
                          </span>
                          <span className="text-slate-500 text-[11px] font-normal">
                            ({String(log.valorAnterior)} → {String(log.valorNuevo)} de {workOrder.totalPiezas})
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-blue-400 font-medium">
                          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Cambio de estado: {OT_STATUS_LABELS[log.valorAnterior as OTStatus] || String(log.valorAnterior)} ➔ {OT_STATUS_LABELS[log.valorNuevo as OTStatus] || String(log.valorNuevo)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notas */}
          {workOrder.notas && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Notas
              </h3>
              <p className="text-sm text-slate-300 bg-slate-800/40 rounded-xl p-3">
                {workOrder.notas}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Actions footer — only for authorized roles */}
        {canEdit && workOrder.status !== 'completada' && workOrder.status !== 'cancelada' && (
          <div className="p-6 border-t border-slate-800 space-y-3">
            {/* Piezas counter — only when in produccion_interna */}
            {workOrder.status === 'produccion_interna' && (
              <div className="glass-light rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-3 font-medium">Registrar Piezas Completadas</p>
                <div className="flex items-center gap-3">
                  <button
                    id="piezas-minus-btn"
                    onClick={() => setPiezasInput(Math.max(1, piezasInput - 1))}
                    className="w-9 h-9 rounded-xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-all"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    id="piezas-input"
                    type="number"
                    min={1}
                    max={workOrder.totalPiezas - workOrder.piezasProcesadas}
                    value={piezasInput}
                    onChange={(e) => setPiezasInput(Number(e.target.value))}
                    className="flex-1 text-center bg-slate-800 border border-slate-700 rounded-xl py-2 text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    id="piezas-plus-btn"
                    onClick={() => setPiezasInput(piezasInput + 1)}
                    className="w-9 h-9 rounded-xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    id="piezas-confirm-btn"
                    onClick={handleAddPiezas}
                    disabled={loadingPiezas || piezasInput <= 0}
                    className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingPiezas ? '...' : `+${piezasInput} pzas`}
                  </button>
                </div>
              </div>
            )}

            {/* Advance status */}
            {nextStatus && (
              <button
                id="advance-status-btn"
                onClick={handleStatusChange}
                disabled={loadingStatus}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
              >
                {loadingStatus ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Actualizando...
                  </span>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    Avanzar a: {OT_STATUS_LABELS[nextStatus]}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
