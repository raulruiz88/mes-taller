/**
 * Formateador de correo electrónico para notificaciones de nuevas OCs
 */
export function formatOCNotificationEmail(
  ocFolio: string,
  cliente: string,
  montoVenta: number,
  currency: string,
  totalOTs: number,
  creadoPorNombre: string
) {
  const subject = `[MES Taller] Nueva OC Registrada: ${ocFolio} - ${cliente}`;
  const body = `Hola equipo,

Se ha registrado una nueva Orden de Compra en el sistema MES Taller:

• Folio: ${ocFolio}
• Cliente: ${cliente}
• Monto de Venta: $${montoVenta.toLocaleString('es-MX', { minimumFractionDigits: 2 })} ${currency}
• Cantidad de OTs: ${totalOTs}
• Registrado por: ${creadoPorNombre}

Ingresa al sistema para consultar los detalles:
https://mes-taller.vercel.app/dashboard/ordenes`;

  return { subject, body };
}
