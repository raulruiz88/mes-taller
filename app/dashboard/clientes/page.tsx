'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomers } from '@/lib/hooks/useCustomers';
import { useAuth } from '@/lib/hooks/useAuth';
import { Customer } from '@/lib/types';
import { toggleCustomerStatus, deleteCustomerPermanent } from '@/lib/firebase/firestore/customers';
import CustomerFormModal from '@/components/clientes/CustomerFormModal';
import { toast } from '@/components/ui/toaster';
import { exportCustomersToExcel } from '@/lib/utils/exportToExcel';
import {
  Users,
  Plus,
  Search,
  Copy,
  Check,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  Building2,
  Mail,
  Phone,
  FileText,
  History,
  Zap,
  Download,
} from 'lucide-react';

export default function ClientesPage() {
  const { userData, isAdmin } = useAuth();
  const router = useRouter();
  const { customers, loading } = useCustomers();
  const [search, setSearch] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (userData && !isAdmin) {
      router.push('/dashboard');
    }
  }, [userData, isAdmin, router]);

  const activeCustomers = useMemo(
    () => customers.filter((c) => c.isActive !== false),
    [customers]
  );
  const historicalCustomers = useMemo(
    () => customers.filter((c) => c.isActive === false),
    [customers]
  );

  const baseList = showHistory ? historicalCustomers : activeCustomers;

  const filtered = baseList.filter(
    (c) =>
      !search ||
      c.nombreComercial.toLowerCase().includes(search.toLowerCase()) ||
      c.razonSocial.toLowerCase().includes(search.toLowerCase()) ||
      c.rfc.toLowerCase().includes(search.toLowerCase()) ||
      c.correoFacturacion.toLowerCase().includes(search.toLowerCase()) ||
      c.contactoNombre.toLowerCase().includes(search.toLowerCase())
  );

  function copyBillingData(c: Customer) {
    const text = `RAZÓN SOCIAL: ${c.razonSocial}
RFC: ${c.rfc}
RÉGIMEN FISCAL: ${c.regimenFiscal}
USO CFDI: ${c.usoCFDI}
DIRECCIÓN FISCAL: ${c.direccionFiscal}
CORREO FACTURACIÓN: ${c.correoFacturacion}
CONTACTO: ${c.contactoNombre} (${c.telefono})`;

    navigator.clipboard.writeText(text);
    setCopiedId(c.id);
    toast({ message: `Datos fiscales de "${c.nombreComercial}" copiados al portapapeles`, type: 'success' });
    setTimeout(() => setCopiedId(null), 2500);
  }

  async function handleToggleStatus(c: Customer) {
    const newStatus = !c.isActive;
    await toggleCustomerStatus(c.id, newStatus);
    toast({
      message: newStatus
        ? `Cliente "${c.nombreComercial}" reactivado`
        : `Cliente "${c.nombreComercial}" movido al historial`,
      type: 'info',
    });
  }

  async function handleDeletePermanent(c: Customer) {
    if (confirm(`¿Eliminar definitivamente a "${c.nombreComercial}"? Esta acción no se puede deshacer.`)) {
      await deleteCustomerPermanent(c.id);
      toast({ message: `Cliente "${c.nombreComercial}" eliminado`, type: 'error' });
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Clientes</h1>
            <p className="text-sm text-slate-400">
              {activeCustomers.length} activos · {historicalCustomers.length} en historial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="export-clientes-excel"
            onClick={() => exportCustomersToExcel(customers)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-xl transition-all"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Exportar
          </button>
          <button
            id="nuevo-cliente-btn"
            onClick={() => {
              setEditingCustomer(null);
              setModalOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Tabs */}
        <div className="flex bg-slate-800/60 border border-slate-700 rounded-xl p-1 gap-1 self-start">
          <button
            id="tab-clientes-activos"
            onClick={() => setShowHistory(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              !showHistory
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Activos
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
              !showHistory ? 'bg-white/20' : 'bg-slate-700'
            }`}>
              {activeCustomers.length}
            </span>
          </button>
          <button
            id="tab-clientes-historial"
            onClick={() => setShowHistory(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              showHistory
                ? 'bg-slate-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historial
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
              showHistory ? 'bg-white/20' : 'bg-slate-700'
            }`}>
              {historicalCustomers.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            id="cliente-search"
            type="text"
            placeholder="Buscar por RFC, Razón Social, Nombre, Correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Grid of Client Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-44 bg-slate-800/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl text-slate-500 space-y-2">
          <Building2 className="w-10 h-10 mx-auto opacity-30" />
          <p className="font-medium text-slate-400">
            {showHistory ? 'No hay clientes en el historial' : 'No hay clientes registrados'}
          </p>
          <p className="text-xs text-slate-600">
            {showHistory
              ? 'Los clientes que desactives aparecerán aquí.'
              : 'Haz clic en "Nuevo Cliente" para agregar uno.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className={`glass rounded-2xl p-5 border flex flex-col justify-between transition-all hover:border-slate-600 ${
                !c.isActive ? 'opacity-70 bg-slate-900/30' : ''
              }`}
            >
              {/* Header Card */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight">
                      {c.nombreComercial}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">{c.razonSocial}</p>
                  </div>
                  <span className="font-mono text-xs font-bold px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg shrink-0">
                    {c.rfc}
                  </span>
                </div>

                {/* Billing Info Grid */}
                <div className="space-y-2 text-xs text-slate-300 py-3 border-y border-slate-800/60 my-3">
                  <div className="flex items-start gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                    <span className="text-slate-400 line-clamp-2">{c.direccionFiscal}</span>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="text-slate-300 font-mono">{c.correoFacturacion}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="text-slate-300">{c.telefono}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                    <span>Régimen: <strong className="text-slate-300">{c.regimenFiscal}</strong></span>
                    <span>•</span>
                    <span>CFDI: <strong className="text-slate-300">{c.usoCFDI}</strong></span>
                    <span>•</span>
                    <span>Contacto: <strong className="text-slate-300">{c.contactoNombre}</strong></span>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-between gap-2 pt-1">
                {/* 1-Click Copy Fiscal Data */}
                <button
                  id={`copy-fiscal-${c.id}`}
                  onClick={() => copyBillingData(c)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    copiedId === c.id
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {copiedId === c.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      ¡Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar Datos Fiscales
                    </>
                  )}
                </button>

                {/* Edit & Archive/Delete controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingCustomer(c);
                      setModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition-all"
                    title="Editar datos del cliente"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {c.isActive ? (
                    <button
                      onClick={() => handleToggleStatus(c)}
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 border border-slate-700/60 transition-all"
                      title="Mover a Historial (Desactivar)"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleToggleStatus(c)}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border border-slate-700/60 transition-all"
                        title="Reactivar cliente"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePermanent(c)}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/60 transition-all"
                        title="Eliminar definitivamente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <CustomerFormModal
          customerToEdit={editingCustomer}
          onClose={() => setModalOpen(false)}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}
