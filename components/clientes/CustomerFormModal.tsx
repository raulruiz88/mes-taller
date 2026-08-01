'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Customer, CustomerFormValues } from '@/lib/types';
import { createCustomer, updateCustomer } from '@/lib/firebase/firestore/customers';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from '@/components/ui/toaster';
import { X, Save, Building2 } from 'lucide-react';

const REGIMENES_FISCALES = [
  { code: '601', label: '601 - General de Ley Personas Morales' },
  { code: '603', label: '603 - Personas Morales con Fines no Lucrativos' },
  { code: '605', label: '605 - Sueldos y Salarios e Ingresos Asimilados a Salarios' },
  { code: '606', label: '606 - Arrendamiento' },
  { code: '612', label: '612 - Personas Físicas con Actividades Empresariales y Profesionales' },
  { code: '625', label: '625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
  { code: '626', label: '626 - Régimen Simplificado de Confianza (RESICO)' },
];

const USOS_CFDI = [
  { code: 'G01', label: 'G01 - Adquisición de mercancías' },
  { code: 'G03', label: 'G03 - Gastos en general' },
  { code: 'I01', label: 'I01 - Construcciones' },
  { code: 'I02', label: 'I02 - Mobiliario y equipo de oficina por inversiones' },
  { code: 'I04', label: 'I04 - Equipo de cómputo y accesorios' },
  { code: 'I08', label: 'I08 - Otra maquinaria y equipo' },
  { code: 'P01', label: 'P01 - Por definir' },
  { code: 'S01', label: 'S01 - Sin efectos fiscales' },
];

const schema = z.object({
  nombreComercial: z.string().min(2, 'El nombre comercial es requerido'),
  razonSocial: z.string().min(2, 'La razón social es requerida'),
  rfc: z.string().min(12, 'RFC inválido (12-13 caracteres)').max(13, 'RFC inválido'),
  regimenFiscal: z.string().min(1, 'Selecciona un régimen fiscal'),
  usoCFDI: z.string().min(1, 'Selecciona uso de CFDI'),
  direccionFiscal: z.string().min(5, 'La dirección fiscal es requerida'),
  correoFacturacion: z.string().email('Correo de facturación inválido'),
  telefono: z.string().min(7, 'Teléfono requerido'),
  contactoNombre: z.string().min(2, 'Nombre de contacto requerido'),
  notas: z.string().optional(),
});

interface Props {
  customerToEdit?: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function CustomerFormModal({ customerToEdit, onClose, onSaved }: Props) {
  const { userData } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombreComercial: '',
      razonSocial: '',
      rfc: '',
      regimenFiscal: '601',
      usoCFDI: 'G03',
      direccionFiscal: '',
      correoFacturacion: '',
      telefono: '',
      contactoNombre: '',
      notas: '',
    },
  });

  useEffect(() => {
    if (customerToEdit) {
      setValue('nombreComercial', customerToEdit.nombreComercial);
      setValue('razonSocial', customerToEdit.razonSocial);
      setValue('rfc', customerToEdit.rfc);
      setValue('regimenFiscal', customerToEdit.regimenFiscal);
      setValue('usoCFDI', customerToEdit.usoCFDI);
      setValue('direccionFiscal', customerToEdit.direccionFiscal);
      setValue('correoFacturacion', customerToEdit.correoFacturacion);
      setValue('telefono', customerToEdit.telefono);
      setValue('contactoNombre', customerToEdit.contactoNombre);
      setValue('notas', customerToEdit.notas || '');
    }
  }, [customerToEdit, setValue]);

  async function onSubmit(data: CustomerFormValues) {
    if (!userData) return;
    setSaving(true);
    setError('');

    try {
      if (customerToEdit) {
        await updateCustomer(customerToEdit.id, data);
        toast({ message: 'Cliente actualizado correctamente', type: 'success' });
      } else {
        await createCustomer(data, userData.uid);
        toast({ message: 'Cliente registrado correctamente', type: 'success' });
      }
      onSaved();
      onClose();
    } catch {
      setError('Error al guardar el cliente. Revisa los datos.');
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
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-2xl mx-auto bg-slate-900 border border-slate-700 rounded-2xl z-50 shadow-2xl shadow-black/60 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="font-semibold text-white">
              {customerToEdit ? 'Editar Cliente / Datos Fiscales' : 'Nuevo Cliente'}
            </h2>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre comercial */}
            <div>
              <label className={labelClass}>Nombre Comercial / Alias *</label>
              <input
                id="customer-nombre-comercial"
                {...register('nombreComercial')}
                placeholder="Ej: Autopartes del Norte"
                className={inputClass}
              />
              {errors.nombreComercial && <p className={errorClass}>{errors.nombreComercial.message}</p>}
            </div>

            {/* Razón social */}
            <div>
              <label className={labelClass}>Razón Social *</label>
              <input
                id="customer-razon-social"
                {...register('razonSocial')}
                placeholder="Ej: Autopartes del Norte S.A. de C.V."
                className={inputClass}
              />
              {errors.razonSocial && <p className={errorClass}>{errors.razonSocial.message}</p>}
            </div>

            {/* RFC */}
            <div>
              <label className={labelClass}>RFC (Persona Moral o Física) *</label>
              <input
                id="customer-rfc"
                {...register('rfc')}
                placeholder="Ej: ANO120304ABC"
                className={`${inputClass} uppercase font-mono`}
              />
              {errors.rfc && <p className={errorClass}>{errors.rfc.message}</p>}
            </div>

            {/* Teléfono */}
            <div>
              <label className={labelClass}>Teléfono de Contacto *</label>
              <input
                id="customer-telefono"
                {...register('telefono')}
                placeholder="Ej: 81 8123 4567"
                className={inputClass}
              />
              {errors.telefono && <p className={errorClass}>{errors.telefono.message}</p>}
            </div>

            {/* Régimen fiscal */}
            <div>
              <label className={labelClass}>Régimen Fiscal *</label>
              <select id="customer-regimen" {...register('regimenFiscal')} className={inputClass}>
                {REGIMENES_FISCALES.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
              {errors.regimenFiscal && <p className={errorClass}>{errors.regimenFiscal.message}</p>}
            </div>

            {/* Uso CFDI */}
            <div>
              <label className={labelClass}>Uso de CFDI Predeterminado *</label>
              <select id="customer-cfdi" {...register('usoCFDI')} className={inputClass}>
                {USOS_CFDI.map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.label}
                  </option>
                ))}
              </select>
              {errors.usoCFDI && <p className={errorClass}>{errors.usoCFDI.message}</p>}
            </div>

            {/* Correo Facturación */}
            <div className="md:col-span-2">
              <label className={labelClass}>Correo Electrónico de Facturación *</label>
              <input
                id="customer-correo"
                type="email"
                {...register('correoFacturacion')}
                placeholder="facturacion@cliente.com"
                className={inputClass}
              />
              {errors.correoFacturacion && <p className={errorClass}>{errors.correoFacturacion.message}</p>}
            </div>

            {/* Dirección Fiscal */}
            <div className="md:col-span-2">
              <label className={labelClass}>Dirección Fiscal Completa (Calle, Num, Col, C.P., Ciudad) *</label>
              <textarea
                id="customer-direccion"
                {...register('direccionFiscal')}
                rows={2}
                placeholder="Av. Industrial #1200, Col. Parque Industrial, C.P. 66000, Monterrey, N.L."
                className={`${inputClass} resize-none`}
              />
              {errors.direccionFiscal && <p className={errorClass}>{errors.direccionFiscal.message}</p>}
            </div>

            {/* Contacto Nombre */}
            <div>
              <label className={labelClass}>Nombre de Contacto Principal *</label>
              <input
                id="customer-contacto"
                {...register('contactoNombre')}
                placeholder="Ing. Roberto Garza"
                className={inputClass}
              />
              {errors.contactoNombre && <p className={errorClass}>{errors.contactoNombre.message}</p>}
            </div>

            {/* Notas */}
            <div>
              <label className={labelClass}>Notas / Observaciones</label>
              <input
                id="customer-notas"
                {...register('notas')}
                placeholder="Horario de entrega, portal de compras, etc."
                className={inputClass}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-all"
            >
              Cancelar
            </button>
            <button
              id="save-customer-btn"
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : customerToEdit ? 'Actualizar Cliente' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
