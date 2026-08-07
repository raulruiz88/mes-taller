import { Timestamp } from 'firebase/firestore';

// ─────────────────────────────────────────────
// ROLES & USERS
// ─────────────────────────────────────────────

export type UserRole = 'admin' | 'produccion' | 'compras' | 'tecnico' | 'supervisor';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  isActive: boolean;
}

// ─────────────────────────────────────────────
// ÓRDENES DE COMPRA (purchase_orders)
// ─────────────────────────────────────────────

export type OCStatus = 'activa' | 'completada' | 'cancelada';
export type Currency = 'MXN' | 'USD';
export type OCEstadoCobro = 'sin_facturar' | 'facturada' | 'cobrada';

export interface PurchaseOrder {
  id: string;
  folio: string;           // ej: "OC-2025-001"
  ocCliente?: string;      // ej: "PO-CLIENTE-9942" (Folio del Cliente)
  cliente: string;
  montoVenta: number;
  currency: Currency;
  fechaCompromiso: Timestamp;   // Fecha Compromiso Interno (Taller)
  fechaCliente?: Timestamp;    // Fecha Real del Cliente (Solo visible para Admin)
  fechaCreacion: Timestamp;
  creadoPor: string;       // uid
  status: OCStatus;
  dibujoURL?: string;      // Link a dibujo / plano o carpeta Drive
  notas?: string;
  // Facturación de Venta y Cobranza al Cliente (Cuentas por Cobrar)
  facturaVenta?: string;       // # de Factura emitida al Cliente (ej: F-1049)
  fechaFacturacion?: Timestamp; // Fecha en que se emitió la factura
  estadoCobro?: OCEstadoCobro;  // 'sin_facturar' | 'facturada' | 'cobrada'
  fechaCobro?: Timestamp;       // Fecha real en que el cliente pagó
  diasCobro?: number;          // Días transcurridos entre facturación y cobro real
  // Desnormalizado para queries rápidas
  totalOTs: number;
  otCompletadas: number;
}

// ─────────────────────────────────────────────
// ÓRDENES DE TRABAJO (work_orders)
// ─────────────────────────────────────────────

export type OTStatus =
  | 'pendiente'
  | 'compras_mp'
  | 'diseno'
  | 'produccion_interna'
  | 'maquila_externa'
  | 'calidad_envio'
  | 'en_pausa'
  | 'completada'
  | 'cancelada';

export type OTPrioridad = 'normal' | 'urgente' | 'critica';
export type UrgencyLevel = 'rojo' | 'amarillo' | 'verde' | 'gris';

// ─────────────────────────────────────────────
// OPERACIONES DE MANUFACTURA (sub-modelo de WorkOrder)
// ─────────────────────────────────────────────

export interface OTOperation {
  id: string;                // uuid generado en cliente
  orden: number;             // 1, 2, 3...
  nombre: string;            // ej: "Fresado – Agujero Frontal"
  centroTrabajo: string;     // ej: "Centro de Maquinado"
  piezasCompletadas: number; // 0..totalPiezas
  notas?: string;
}

export const CENTROS_TRABAJO = [
  'Centro de Maquinado',
  'Torno CNC',
  'Fresadora Manual',
  'Taladro',
  'Soldadura',
  'Rectificadora',
  'Calidad / Inspección',
  'Maquila Externa',
  'Pintura / Acabado',
] as const;

export type CentroTrabajo = typeof CENTROS_TRABAJO[number];

export interface WorkOrder {
  id: string;
  folio: string;           // ej: "OT-2025-001-A"
  ocId: string;
  ocFolio: string;         // desnormalizado
  cliente: string;         // desnormalizado
  descripcion: string;
  totalPiezas: number;
  piezasProcesadas: number;
  piezasEntregadas?: number; // Piezas entregadas al cliente vía remisiones
  status: OTStatus;
  prioridad: OTPrioridad;
  fechaInicio: Timestamp;
  fechaEntrega: Timestamp;     // Fecha Compromiso Interno (Taller)
  fechaCliente?: Timestamp;    // Fecha Real del Cliente (Solo visible para Admin)
  fechaCompletada?: Timestamp;
  material?: string;
  fechaEstimadaLlegadaMP?: Timestamp; // Fecha estimada de llegada de materia prima al taller
  planoURL?: string;
  notas?: string;
  asignadoA?: string;      // uid (asignado principal o retrocompatible)
  asignadoNombre?: string; // nombre del técnico desnormalizado
  asignadosA?: string[];    // uids de los usuarios asignados (soporta 1 o más)
  asignadosNombres?: string[]; // nombres desnormalizados de los usuarios asignados
  creadoPor: string;       // uid
  updatedAt: Timestamp;
  operaciones?: OTOperation[]; // Operaciones de manufactura por OT
  materialExistente?: boolean; // Si la materia prima ya existe en taller (sobrante/stock)
  notasCompras?: string;       // Comentario libre de compras/materia prima
  esMaquilaDirecta?: boolean;  // OT 100% Maquila Externa / Servicio Directo
  esPausada?: boolean;
  statusAnterior?: OTStatus;
  motivoPausa?: string;
  fechaPausa?: Timestamp;
}

// ─────────────────────────────────────────────
// REMISIONES / ENTREGAS PARCIALES (remisiones)
// ─────────────────────────────────────────────

export interface RemisionItem {
  otId: string;
  otFolio: string;
  descripcion: string;
  piezasEntregadas: number;
  totalPiezas: number;
}

export interface Remision {
  id: string;
  folio: string;               // ej: "REM-2026-001"
  ocId: string;
  ocFolio: string;
  cliente: string;
  fechaEntrega: Timestamp;
  recibioPor: string;          // Nombre de quien recibe en cliente
  notas?: string;
  creadoPor: string;           // uid del creador
  creadoPorNombre?: string;
  createdAt: Timestamp;
  items: RemisionItem[];
}

export interface RemisionFormValues {
  ocId: string;
  fechaEntrega: Date;
  recibioPor: string;
  notas?: string;
  items: {
    otId: string;
    otFolio: string;
    descripcion: string;
    piezasEntregadas: number;
    totalPiezas: number;
  }[];
}

// Subcolección: work_orders/{otId}/changelog
export interface OTChangeLog {
  id: string;
  timestamp: Timestamp;
  usuarioUid: string;
  usuarioNombre: string;
  campo: string;
  valorAnterior: unknown;
  valorNuevo: unknown;
  accion: 'status_change' | 'piezas_update' | 'edit' | 'nota';
}

// ─────────────────────────────────────────────
// ÓRDENES DE SALIDA / MAQUILA (exit_slips)
// ─────────────────────────────────────────────

export type ExitSlipStatus = 'activa' | 'cerrada';

export interface ExitSlip {
  id: string;
  folio: string;           // ej: "OS-2025-001"
  otId: string;
  otFolio: string;
  ocId: string;
  cliente: string;
  proveedorId?: string;
  proveedorNombre: string;
  servicio: string;
  cantidadPiezas: number;
  fechaSalida: Timestamp;
  fechaRegresoEstimada: Timestamp;
  fechaRegresoReal?: Timestamp;
  status: ExitSlipStatus;
  costoEstimado?: number;
  costoReal?: number;
  notas?: string;
  creadoPor: string;
  updatedAt: Timestamp;
}

// ─────────────────────────────────────────────
// GASTOS DIRECTOS POR OT (direct_expenses)
// ─────────────────────────────────────────────

export const DEFAULT_CATEGORIAS_GASTOS = [
  'Materia Prima (Acero, Aluminio, Plásticos)',
  'Maquila / Servicio Externo',
  'Insumos / Consumibles (Taladrina, Aceites, Lijado)',
  'Gasolina / Viáticos / Transporte',
  'Herramientas / Insertos / Brocas',
  'Mantenimiento / Reparación de Máquinas',
  'Fletes / Logística',
  'Papelería / Oficina',
  'Limpieza / Aseo',
  'Otro Gasto Operativo',
] as const;

export type ExpenseCategory = string;

export interface DirectExpense {
  id: string;
  otId?: string;
  otFolio?: string;
  ocId?: string;
  periodo: string;         // "YYYY-MM"
  categoria: ExpenseCategory;
  descripcion: string;
  monto: number;
  esGastoGeneral?: boolean;
  proveedor?: string;
  factura?: string;        // Número de Factura
  facturaURL?: string;     // Link a Factura / Comprobante (Google Drive / URL)
  estaPagado: boolean;     // ¿Factura / gasto pagado?
  fechaPago?: Timestamp;   // Fecha en que se realizó el pago
  fecha: Timestamp;        // Fecha de registro
  creadoPor: string;
  comprobante?: string;
}

// Form values for DirectExpense
export interface DirectExpenseFormValues {
  otId?: string;
  categoria: ExpenseCategory;
  descripcion: string;
  monto: number;
  proveedor?: string;
  factura?: string;
  facturaURL?: string;
  fecha: Date;
  esGastoGeneral?: boolean;
}

// ─────────────────────────────────────────────
// COSTOS FIJOS MENSUALES (fixed_costs)
// ─────────────────────────────────────────────

export type FixedCostCategory =
  | 'nomina'
  | 'renta'
  | 'electricidad'
  | 'agua'
  | 'internet'
  | 'credito'
  | 'mantenimiento'
  | 'seguros'
  | 'otro';

export interface FixedCost {
  id: string;
  periodo: string;         // "YYYY-MM"
  categoria: FixedCostCategory;
  descripcion: string;
  monto: number;
  esRecurrente: boolean;
  factura?: string;        // Número de Factura
  estaPagado: boolean;     // ¿Factura / costo pagado?
  fechaPago?: Timestamp;   // Fecha en que se realizó el pago
  fecha: Timestamp;        // Fecha de registro
  creadoPor: string;
}

// ─────────────────────────────────────────────
// CONFIGURACIÓN GLOBAL (app_settings)
// ─────────────────────────────────────────────

export interface AppSettings {
  id: 'global';
  tallerNombre: string;
  tallerLogo?: string;
  storageBaseURL?: string;
  monedaDefault: Currency;
  folioOCPrefix: string;
  folioOTPrefix: string;
  folioOSPrefix: string;
  contadorOC: number;
  contadorOT: number;
  contadorOS: number;
  slaRojo: number;         // horas (default: 24)
  slaAmarillo: number;     // horas (default: 72)
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─────────────────────────────────────────────
// CLIENTES Y DATOS DE FACTURACIÓN (customers)
// ─────────────────────────────────────────────

export interface Customer {
  id: string;
  nombreComercial: string;
  razonSocial: string;
  rfc: string;
  regimenFiscal: string;
  usoCFDI: string;
  direccionFiscal: string;
  correoFacturacion: string;
  telefono: string;
  contactoNombre: string;
  notas?: string;
  isActive: boolean; // false = en historial / desactivado
  createdAt: Timestamp;
  updatedAt: Timestamp;
  creadoPor: string;
}

export interface CustomerFormValues {
  nombreComercial: string;
  razonSocial: string;
  rfc: string;
  regimenFiscal: string;
  usoCFDI: string;
  direccionFiscal: string;
  correoFacturacion: string;
  telefono: string;
  contactoNombre: string;
  notas?: string;
}

// ─────────────────────────────────────────────
// PROVEEDORES (suppliers)
// ─────────────────────────────────────────────

export interface Supplier {
  id: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  servicios: string[];
  tiempoPromedioHoras?: number;
  isActive: boolean;
  notas?: string;
  createdAt: Timestamp;
}

// ─────────────────────────────────────────────
// P&L / ESTADO DE RESULTADOS
// ─────────────────────────────────────────────

export interface PnLStatement {
  periodo: string;
  ingresosTotales: number;
  costosDirectosTotales: number;
  utilidadBruta: number;
  costosFijosTotales: number;
  utilidadOperativa: number;
  margenBruto: number;
  margenOperativo: number;
  detalleGastos: {
    categoria: ExpenseCategory;
    total: number;
  }[];
  detalleCostosFijos: {
    categoria: FixedCostCategory;
    total: number;
  }[];
}

// ─────────────────────────────────────────────
// FORM TYPES (para react-hook-form)
// ─────────────────────────────────────────────

export interface OCFormValues {
  cliente: string;
  ocCliente?: string;
  montoVenta: number;
  currency: Currency;
  fechaCompromiso: Date;       // Fecha Compromiso Interno
  fechaCliente?: Date;         // Fecha Real del Cliente (Solo Admin)
  dibujoURL?: string;
  notas?: string;
}

export interface OTFormValues {
  descripcion: string;
  totalPiezas: number;
  prioridad?: OTPrioridad;
  fechaEntrega: Date;          // Fecha Compromiso Interno
  fechaCliente?: Date;         // Fecha Real del Cliente (Solo Admin)
  material?: string;
  planoURL?: string;
  notas?: string;
  operaciones?: OTOperation[];
  esMaquilaDirecta?: boolean;
}

export interface ExitSlipFormValues {
  otId: string;
  proveedorNombre: string;
  proveedorId?: string;
  servicio: string;
  cantidadPiezas: number;
  fechaSalida: Date;
  fechaRegresoEstimada: Date;
  costoEstimado?: number;
  notas?: string;
}

export interface FixedCostFormValues {
  categoria: FixedCostCategory;
  descripcion: string;
  monto: number;
  esRecurrente: boolean;
  factura?: string;
  fecha: Date;
}

// ─────────────────────────────────────────────
// LABELS Y MAPS (para UI)
// ─────────────────────────────────────────────

export const OT_STATUS_LABELS: Record<OTStatus, string> = {
  pendiente: 'Pendiente',
  compras_mp: 'Compras MP',
  diseno: 'Diseño',
  produccion_interna: 'Producción',
  maquila_externa: 'Maquila Externa',
  calidad_envio: 'Calidad / Envío',
  en_pausa: 'En Pausa ⏸️',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  materia_prima: 'Materia Prima (Acero, Aluminio...)',
  maquila_externa: 'Maquila / Servicio Externo',
  consumibles: 'Insumos / Consumibles (Taladrina, Aceites, Lijado...)',
  gasolina: 'Gasolina / Viáticos / Transporte',
  herramienta: 'Herramientas / Insertos / Brocas',
  mantenimiento: 'Mantenimiento / Reparación de Máquina',
  flete: 'Flete / Logística',
  otro: 'Otro Gasto Operativo / Variable',
};

export const FIXED_COST_CATEGORY_LABELS: Record<FixedCostCategory, string> = {
  nomina: 'Nómina',
  renta: 'Renta',
  electricidad: 'Electricidad',
  agua: 'Agua',
  internet: 'Internet',
  credito: 'Crédito',
  mantenimiento: 'Mantenimiento',
  seguros: 'Seguros',
  otro: 'Otro',
};

export const OT_STATUS_ORDER: OTStatus[] = [
  'pendiente',
  'compras_mp',
  'diseno',
  'produccion_interna',
  'maquila_externa',
  'calidad_envio',
  'completada',
];
