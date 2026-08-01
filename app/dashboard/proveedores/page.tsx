'use client';

import { useState, useMemo } from 'react';
import { useSuppliers } from '@/lib/hooks/useSuppliers';
import { Supplier } from '@/lib/types';
import { createSupplier, updateSupplier, deleteSupplier, SupplierFormValues } from '@/lib/firebase/firestore/suppliers';
import { toast } from '@/components/ui/toaster';
import { exportSuppliersToExcel } from '@/lib/utils/exportToExcel';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  User,
  Wrench,
  X,
  Save,
  Tag,
  Download,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const supplierSchema = z.object({
  nombre: z.string().min(2, 'Nombre o Razón Social requerida'),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  servicios: z.string().optional(),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof supplierSchema>;

export default function ProveedoresPage() {
  const { suppliers, loading } = useSuppliers();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const filtered = useMemo(() => {
    return suppliers.filter(
      (s) =>
        !search ||
        s.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (s.contacto && s.contacto.toLowerCase().includes(search.toLowerCase())) ||
        (s.servicios && s.servicios.some((srv) => srv.toLowerCase().includes(search.toLowerCase())))
    );
  }, [suppliers, search]);

  async function handleDelete(s: Supplier) {
    if (confirm(`¿Eliminar al proveedor "${s.nombre}"?`)) {
      await deleteSupplier(s.id);
      toast({ message: `Proveedor "${s.nombre}" eliminado`, type: 'info' });
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Catálogo de Proveedores</h1>
            <p className="text-sm text-slate-400">{suppliers.length} proveedores registrados</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="export-proveedores-excel"
            onClick={() => exportSuppliersToExcel(suppliers)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-xl transition-all"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Exportar Proveedores
          </button>
          <button
            id="nuevo-proveedor-btn"
            onClick={() => {
              setEditingSupplier(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          id="proveedor-search"
          type="text"
          placeholder="Buscar proveedor por nombre, contacto o servicio (ej: Aluminio, Tratamientos, CNC)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-slate-800/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl text-slate-500 space-y-2">
          <Building2 className="w-10 h-10 mx-auto opacity-30" />
          <p className="font-medium text-slate-400">No hay proveedores registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="glass rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-bold text-white text-base leading-tight">{s.nombre}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingSupplier(s);
                        setModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 my-3">
                  {s.contacto && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>{s.contacto}</span>
                    </div>
                  )}
                  {s.telefono && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{s.telefono}</span>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-mono text-slate-300">{s.email}</span>
                    </div>
                  )}
                </div>

                {s.servicios && s.servicios.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800">
                    <Tag className="w-3 h-3 text-slate-500 shrink-0" />
                    {s.servicios.map((srv, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/30"
                      >
                        {srv}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <SupplierModal
          supplierToEdit={editingSupplier}
          onClose={() => setModalOpen(false)}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}

function SupplierModal({
  supplierToEdit,
  onClose,
  onSaved,
}: {
  supplierToEdit: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      nombre: supplierToEdit?.nombre || '',
      contacto: supplierToEdit?.contacto || '',
      telefono: supplierToEdit?.telefono || '',
      email: supplierToEdit?.email || '',
      servicios: supplierToEdit?.servicios?.join(', ') || '',
      notas: supplierToEdit?.notas || '',
    },
  });

  async function onSubmit(data: FormValues) {
    setSaving(true);
    try {
      if (supplierToEdit) {
        await updateSupplier(supplierToEdit.id, data as SupplierFormValues);
        toast({ message: 'Proveedor actualizado', type: 'success' });
      } else {
        await createSupplier(data as SupplierFormValues);
        toast({ message: 'Proveedor registrado correctamente', type: 'success' });
      }
      onSaved();
      onClose();
    } catch {
      toast({ message: 'Error al guardar proveedor', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full px-3.5 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all';
  const labelClass = 'block text-xs font-medium text-slate-400 mb-1.5';

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-slate-900 border border-slate-700 rounded-2xl z-50 shadow-2xl shadow-black/60 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="font-semibold text-white">
              {supplierToEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className={labelClass}>Nombre Comercial / Razón Social *</label>
            <input {...register('nombre')} placeholder="Ej: Metales Especiales de México" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Persona de Contacto</label>
              <input {...register('contacto')} placeholder="Ej: Lic. Antonio Pérez" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input {...register('telefono')} placeholder="Ej: 81 8123 9900" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Correo Electrónico</label>
            <input type="email" {...register('email')} placeholder="ventas@proveedor.com" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Servicios / Especialidad (Separados por coma)</label>
            <input {...register('servicios')} placeholder="Ej: Aluminio, Titanio, Tratamientos Térmicos, Insertos CNC" className={inputClass} />
          </div>

          <div className="pt-3 border-t border-slate-800 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl">
              Cancelar
            </button>
            <button
              id="save-supplier-btn"
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : supplierToEdit ? 'Actualizar' : 'Guardar Proveedor'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
