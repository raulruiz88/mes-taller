import { WorkOrder, PurchaseOrder, Customer, Supplier, DirectExpense, FixedCost } from '@/lib/types';
import { formatDate, formatCurrency } from '@/lib/utils';

export interface ExportInvoice {
  id: string;
  folioFactura: string;
  folioOC: string;
  clienteNombre: string;
  fechaEmision?: any;
  fechaVencimiento?: any;
  subtotal: number;
  iva: number;
  total: number;
  estatusPago: string;
  diasCartera?: number;
}

/**
 * Downloads a CSV file readable natively by Microsoft Excel with UTF-8 BOM encoding.
 */
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent =
    '\uFEFF' +
    [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const val = cell === null || cell === undefined ? '' : String(cell);
            return `"${val.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 1. Export Work Orders
export function exportWorkOrdersToExcel(workOrders: WorkOrder[], isAdmin: boolean = true) {
  const headers = [
    'Folio OT',
    'Folio OC',
    'Nombre Pieza',
    'Estado',
    'Prioridad',
    'Cant. Solicitada',
    'Cant. Fabricada',
    'Material / Insumo',
    'Tratamiento / Maquila',
    'Fecha de Entrega Prometida',
    'Entregado en Taller MP',
    'Progreso %',
  ];

  if (isAdmin) {
    headers.push('Monto Venta (MXN)');
  }

  const rows = workOrders.map((ot: any) => {
    const pct = ot.totalPiezas > 0 ? Math.round(((ot.piezasProcesadas || 0) / ot.totalPiezas) * 100) : 0;
    const row = [
      ot.folio,
      ot.ocFolio || ot.ocId || 'N/A',
      ot.descripcion || 'N/A',
      (ot.status || '').toUpperCase(),
      (ot.prioridad || 'normal').toUpperCase(),
      ot.totalPiezas || 0,
      ot.piezasProcesadas || 0,
      ot.materialNombre || 'N/A',
      ot.requiereMaquila ? ot.maquilaDetalle || 'Sí' : 'No',
      ot.fechaEntrega ? formatDate(ot.fechaEntrega) : 'N/A',
      ot.fechaEstimadaLlegadaMP ? formatDate(ot.fechaEstimadaLlegadaMP) : 'Entregado',
      `${pct}%`,
    ];

    if (isAdmin) {
      row.push(ot.montoVenta ? ot.montoVenta : 0);
    }

    return row;
  });

  downloadCSV('Ordenes_de_Trabajo_MES_Taller', headers, rows);
}

// 2. Export Financial Invoices & Expenses (P&L)
export function exportFinancesToExcel(
  invoices: ExportInvoice[],
  expenses: DirectExpense[],
  fixedCosts: FixedCost[]
) {
  // Sheet 1: Sales Invoices
  const invoiceHeaders = [
    'Folio Factura',
    'Folio OC',
    'Cliente',
    'Fecha Emisión',
    'Fecha Vencimiento',
    'Subtotal',
    'IVA (16%)',
    'Total (MXN)',
    'Estatus Pago',
    'Días Cartera',
  ];

  const invoiceRows = invoices.map((inv) => [
    inv.folioFactura,
    inv.folioOC,
    inv.clienteNombre,
    inv.fechaEmision ? formatDate(inv.fechaEmision) : 'N/A',
    inv.fechaVencimiento ? formatDate(inv.fechaVencimiento) : 'N/A',
    inv.subtotal,
    inv.iva,
    inv.total,
    inv.estatusPago.toUpperCase(),
    inv.diasCartera || 0,
  ]);

  downloadCSV('Facturas_Venta_P&L', invoiceHeaders, invoiceRows);

  // Sheet 2: Expenses
  const expenseHeaders = [
    'Folio Gasto',
    'Folio OT/OC',
    'Proveedor',
    'Categoría',
    'Descripción',
    'Subtotal',
    'IVA',
    'Total (MXN)',
    'Estatus Pago',
    'Fecha Gasto',
  ];

  const expenseRows = expenses.map((exp: any) => [
    exp.id,
    exp.otFolio || exp.ocId || 'N/A',
    exp.proveedor || 'N/A',
    (exp.categoria || '').toUpperCase(),
    exp.descripcion || '',
    exp.monto || 0,
    Math.round((exp.monto || 0) * 0.16),
    Math.round((exp.monto || 0) * 1.16),
    exp.estaPagado ? 'PAGADO' : 'PENDIENTE',
    exp.fecha ? formatDate(exp.fecha) : 'N/A',
  ]);

  downloadCSV('Gastos_Directos_P&L', expenseHeaders, expenseRows);
}

// 3. Export Suppliers Catalog
export function exportSuppliersToExcel(suppliers: Supplier[]) {
  const headers = ['Nombre Proveedor', 'Contacto', 'Teléfono', 'Email', 'Servicios / Materiales', 'Notas'];
  const rows = suppliers.map((s) => [
    s.nombre,
    s.contacto || '',
    s.telefono || '',
    s.email || '',
    (s.servicios || []).join('; '),
    s.notas || '',
  ]);

  downloadCSV('Catalogo_Proveedores', headers, rows);
}

// 4. Export Customers Catalog
export function exportCustomersToExcel(customers: Customer[]) {
  const headers = ['Nombre Comercial', 'Razón Social', 'RFC', 'Régimen Fiscal', 'Uso CFDI', 'Contacto', 'Teléfono', 'Correo Facturación'];
  const rows = customers.map((c) => [
    c.nombreComercial,
    c.razonSocial || '',
    c.rfc || '',
    c.regimenFiscal || '',
    c.usoCFDI || '',
    c.contactoNombre || '',
    c.telefono || '',
    c.correoFacturacion || '',
  ]);

  downloadCSV('Catalogo_Clientes', headers, rows);
}
