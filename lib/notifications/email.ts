import { WorkOrder } from '@/lib/types';

export async function sendEmailNotification({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  try {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    });
  } catch (err) {
    console.error('Error enviando notificación por correo:', err);
  }
}

export function buildAssignEmailHTML(userDisplayName: string, workOrder: WorkOrder) {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px;">
      <h2 style="color: #38bdf8; margin-top: 0;">📋 Nueva OT Asignada: ${workOrder.folio}</h2>
      <p>Hola <strong>${userDisplayName}</strong>,</p>
      <p>Se te ha asignado como responsable para la siguiente Orden de Trabajo en el taller:</p>
      
      <div style="background-color: #1e293b; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Folio:</strong> <span style="font-family: monospace; color: #60a5fa;">${workOrder.folio}</span></p>
        <p style="margin: 4px 0;"><strong>Cliente:</strong> ${workOrder.cliente}</p>
        <p style="margin: 4px 0;"><strong>Descripción:</strong> ${workOrder.descripcion}</p>
        <p style="margin: 4px 0;"><strong>Material Requerido:</strong> ${workOrder.material || 'No especificado'}</p>
      </div>

      <p style="font-size: 14px; color: #94a3b8;">
        Ingresa a tu panel de <strong>Mis OTs Asignadas</strong> en MES Taller para consultar los planos y registrar tu avance.
      </p>
    </div>
  `;
}

export function buildComprasEmailHTML(workOrder: WorkOrder) {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px;">
      <h2 style="color: #f59e0b; margin-top: 0;">🛒 Nueva Solicitud en Compras: ${workOrder.folio}</h2>
      <p>Equipo de Compras,</p>
      <p>Se ha registrado una nueva Orden de Trabajo que requiere su revisión para cotizar y gestionar materia prima.</p>
      
      <div style="background-color: #1e293b; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Folio:</strong> <span style="font-family: monospace; color: #fbbf24;">${workOrder.folio}</span></p>
        <p style="margin: 4px 0;"><strong>Cliente:</strong> ${workOrder.cliente}</p>
        <p style="margin: 4px 0;"><strong>Descripción:</strong> ${workOrder.descripcion}</p>
      </div>

      <p style="font-size: 14px; color: #94a3b8;">
        Por favor ingresa a la plataforma <strong>MES Taller</strong> para revisar los detalles, realizar las cotizaciones correspondientes o marcar si existe material disponible en taller.
      </p>
    </div>
  `;
}
