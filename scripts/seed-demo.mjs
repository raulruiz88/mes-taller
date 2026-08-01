/**
 * SEED SCRIPT — Datos Demo para MES Taller
 * ──────────────────────────────────────────────────────────────────────────
 * Usa el REST API del emulador directamente (sin validar reglas de Firestore)
 * para poder crear datos de prueba incluso antes de tener usuarios creados.
 *
 * Uso:
 *   node scripts/seed-demo.mjs
 *
 * Requiere que el emulador esté corriendo:
 *   firebase emulators:start --project mes-taller-demo
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  addDoc,
  collection,
  Timestamp,
} from 'firebase/firestore';

const PROJECT_ID = 'mes-taller-demo';
const FIRESTORE_EMULATOR = 'localhost:8080';
const AUTH_EMULATOR = 'http://localhost:9099';

// ─── Firebase client (para Auth) ──────────────────────────────────────────
const app = initializeApp({
  apiKey: 'demo-key',
  authDomain: 'localhost',
  projectId: PROJECT_ID,
  storageBucket: `${PROJECT_ID}.appspot.com`,
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:demo',
});

const auth = getAuth(app);
const db = getFirestore(app);

connectAuthEmulator(auth, AUTH_EMULATOR, { disableWarnings: true });
connectFirestoreEmulator(db, 'localhost', 8080);

// ─── REST helper (bypass de reglas — solo funciona en emulador) ───────────
async function firestoreSet(path, data) {
  const url = `http://${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`;

  function toFirestoreValue(val) {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (typeof val === 'number') {
      if (Number.isInteger(val)) return { integerValue: String(val) };
      return { doubleValue: val };
    }
    if (typeof val === 'string') return { stringValue: val };
    if (val instanceof Timestamp) {
      return { timestampValue: val.toDate().toISOString() };
    }
    if (val instanceof Date) return { timestampValue: val.toISOString() };
    if (Array.isArray(val)) {
      return { arrayValue: { values: val.map(toFirestoreValue) } };
    }
    if (typeof val === 'object') {
      const fields = {};
      for (const [k, v] of Object.entries(val)) {
        if (v !== undefined) fields[k] = toFirestoreValue(v);
      }
      return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
  }

  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) fields[k] = toFirestoreValue(v);
  }

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore REST error ${res.status}: ${err}`);
  }
}

async function firestoreAdd(collectionPath, data) {
  const url = `http://${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionPath}`;

  function toFirestoreValue(val) {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (typeof val === 'number') {
      if (Number.isInteger(val)) return { integerValue: String(val) };
      return { doubleValue: val };
    }
    if (typeof val === 'string') return { stringValue: val };
    if (val instanceof Timestamp) {
      return { timestampValue: val.toDate().toISOString() };
    }
    if (val instanceof Date) return { timestampValue: val.toISOString() };
    if (Array.isArray(val)) {
      return { arrayValue: { values: val.map(toFirestoreValue) } };
    }
    if (typeof val === 'object') {
      const fields = {};
      for (const [k, v] of Object.entries(val)) {
        if (v !== undefined) fields[k] = toFirestoreValue(v);
      }
      return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
  }

  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) fields[k] = toFirestoreValue(v);
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore REST error ${res.status}: ${err}`);
  }
}

// ─── Helpers de fecha ─────────────────────────────────────────────────────
function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return Timestamp.fromDate(d);
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return Timestamp.fromDate(d);
}

const now = Timestamp.now();
const CURRENT_PERIOD = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
})();

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱  Iniciando seed de datos demo...\n');

  // 1. Crear usuarios en Auth (Firebase Auth Emulator sí acepta)
  console.log('👤  Creando usuarios en Auth...');
  const USERS = [
    { email: 'admin@mestaller.demo', password: 'Admin123!', displayName: 'Carlos Hernández', role: 'admin' },
    { email: 'produccion@mestaller.demo', password: 'Prod123!', displayName: 'Miguel Ángel Torres', role: 'produccion' },
    { email: 'compras@mestaller.demo', password: 'Compras123!', displayName: 'Laura Ramírez', role: 'compras' },
  ];

  const uids = {};
  for (const u of USERS) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, u.email, u.password);
      uids[u.role] = cred.user.uid;
      console.log(`  ✅  ${u.role}: ${u.email} / ${u.password}  [uid: ${cred.user.uid.slice(0,8)}...]`);
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        console.log(`  ⚠️  ${u.email} ya existe`);
        // Intentar obtener el UID via REST del emulador de Auth
        const res = await fetch(`${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: u.email, password: u.password, returnSecureToken: true }),
        });
        const data = await res.json();
        if (data.localId) uids[u.role] = data.localId;
      } else {
        throw e;
      }
    }
  }

  // 2. Escribir docs de usuario en Firestore via REST (sin reglas)
  console.log('\n📝  Creando documentos de usuario en Firestore...');
  for (const u of USERS) {
    const uid = uids[u.role];
    if (!uid) continue;
    await firestoreSet(`users/${uid}`, {
      uid, email: u.email, displayName: u.displayName,
      role: u.role, isActive: true, createdAt: now, lastLoginAt: now,
    });
    console.log(`  ✅  users/${uid.slice(0,8)}... (${u.role})`);
  }

  // 3. App settings
  console.log('\n⚙️   App settings...');
  await firestoreSet('app_settings/global', {
    id: 'global',
    tallerNombre: 'Taller de Maquinados Precisión CNC',
    storageBaseURL: 'https://drive.google.com/drive/folders/demo',
    monedaDefault: 'MXN',
    folioOCPrefix: 'OC', folioOTPrefix: 'OT', folioOSPrefix: 'OS',
    contadorOC: 5, contadorOT: 11, contadorOS: 4,
    slaRojo: 24, slaAmarillo: 72,
    updatedAt: now, updatedBy: 'seed',
  });
  console.log('  ✅  app_settings/global');

  const YEAR = new Date().getFullYear();

  // 4. Purchase Orders
  console.log('\n📋  Órdenes de Compra...');
  const OCs = [
    { id: `oc-${YEAR}-001`, data: { folio: `OC-${YEAR}-001`, cliente: 'Autopartes del Norte S.A.', montoVenta: 185000, currency: 'MXN', fechaCompromiso: daysFromNow(2), fechaCreacion: daysAgo(12), creadoPor: uids.compras||'seed', status: 'activa', notas: 'Cliente prioritario. No retrasar entrega.', totalOTs: 3, otCompletadas: 1 }},
    { id: `oc-${YEAR}-002`, data: { folio: `OC-${YEAR}-002`, cliente: 'Aerospace Components LLC', montoVenta: 8500, currency: 'USD', fechaCompromiso: daysFromNow(15), fechaCreacion: daysAgo(5), creadoPor: uids.compras||'seed', status: 'activa', notas: 'Piezas para cabina. Tolerancias ±0.005mm.', totalOTs: 2, otCompletadas: 0 }},
    { id: `oc-${YEAR}-003`, data: { folio: `OC-${YEAR}-003`, cliente: 'Hidráulica Industrial MX', montoVenta: 42000, currency: 'MXN', fechaCompromiso: daysFromNow(5), fechaCreacion: daysAgo(3), creadoPor: uids.compras||'seed', status: 'activa', notas: '', totalOTs: 1, otCompletadas: 0 }},
    { id: `oc-${YEAR}-004`, data: { folio: `OC-${YEAR}-004`, cliente: 'Fertilizantes del Bajío', montoVenta: 67500, currency: 'MXN', fechaCompromiso: daysAgo(8), fechaCreacion: daysAgo(30), creadoPor: uids.compras||'seed', status: 'completada', notas: '', totalOTs: 2, otCompletadas: 2 }},
    { id: `oc-${YEAR}-005`, data: { folio: `OC-${YEAR}-005`, cliente: 'Motores y Transmisiones SA de CV', montoVenta: 95000, currency: 'MXN', fechaCompromiso: daysFromNow(30), fechaCreacion: now, creadoPor: uids.compras||'seed', status: 'activa', notas: 'Pedido a 30 días.', totalOTs: 3, otCompletadas: 0 }},
  ];
  for (const oc of OCs) { await firestoreSet(`purchase_orders/${oc.id}`, oc.data); }
  console.log(`  ✅  ${OCs.length} OCs`);

  // 5. Work Orders
  console.log('\n🔧  Órdenes de Trabajo...');
  const OTs = [
    { id: `ot-${YEAR}-001`, d: { folio:`OT-${YEAR}-001`, ocId:`oc-${YEAR}-001`, ocFolio:`OC-${YEAR}-001`, cliente:'Autopartes del Norte S.A.', descripcion:'Eje de transmisión Ø38mm L=450mm', totalPiezas:24, piezasProcesadas:24, status:'completada', prioridad:'normal', fechaInicio:daysAgo(12), fechaEntrega:daysFromNow(2), fechaCompletada:daysAgo(1), material:'Acero 4140 T/T', planoURL:'https://drive.google.com/file/demo-plano-eje', notas:'Acabado superficial Ra 0.8µm', creadoPor:uids.admin||'seed', updatedAt:daysAgo(1) }},
    { id: `ot-${YEAR}-002`, d: { folio:`OT-${YEAR}-002`, ocId:`oc-${YEAR}-001`, ocFolio:`OC-${YEAR}-001`, cliente:'Autopartes del Norte S.A.', descripcion:'Brida de sujeción con 8 barrenos', totalPiezas:12, piezasProcesadas:7, status:'produccion_interna', prioridad:'urgente', fechaInicio:daysAgo(8), fechaEntrega:daysFromNow(1), material:'Aluminio 6061-T6', planoURL:'', notas:'Tolerancia ±0.02mm en barrenos', creadoPor:uids.admin||'seed', updatedAt:now }},
    { id: `ot-${YEAR}-003`, d: { folio:`OT-${YEAR}-003`, ocId:`oc-${YEAR}-001`, ocFolio:`OC-${YEAR}-001`, cliente:'Autopartes del Norte S.A.', descripcion:'Perno de seguridad M16x80mm endurecido', totalPiezas:48, piezasProcesadas:0, status:'maquila_externa', prioridad:'urgente', fechaInicio:daysAgo(4), fechaEntrega:daysFromNow(1), material:'Acero 1045', planoURL:'', notas:'T/T 50-55 HRC requerido', creadoPor:uids.admin||'seed', updatedAt:now }},
    { id: `ot-${YEAR}-004`, d: { folio:`OT-${YEAR}-004`, ocId:`oc-${YEAR}-002`, ocFolio:`OC-${YEAR}-002`, cliente:'Aerospace Components LLC', descripcion:'Soporte de instrumentación en titanio Ti-6Al-4V', totalPiezas:6, piezasProcesadas:0, status:'diseno', prioridad:'critica', fechaInicio:daysAgo(2), fechaEntrega:daysFromNow(13), material:'Titanio Ti-6Al-4V', planoURL:'https://drive.google.com/file/demo-soporte', notas:'Norma AS9100. Trazabilidad requerida.', creadoPor:uids.admin||'seed', updatedAt:now }},
    { id: `ot-${YEAR}-005`, d: { folio:`OT-${YEAR}-005`, ocId:`oc-${YEAR}-002`, ocFolio:`OC-${YEAR}-002`, cliente:'Aerospace Components LLC', descripcion:'Manguito de acoplamiento con rosca especial', totalPiezas:12, piezasProcesadas:0, status:'compras_mp', prioridad:'normal', fechaInicio:daysAgo(1), fechaEntrega:daysFromNow(14), material:'Inconel 718', planoURL:'', notas:'Solicitar cert. de material.', creadoPor:uids.admin||'seed', updatedAt:now }},
    { id: `ot-${YEAR}-006`, d: { folio:`OT-${YEAR}-006`, ocId:`oc-${YEAR}-003`, ocFolio:`OC-${YEAR}-003`, cliente:'Hidráulica Industrial MX', descripcion:'Cilindro hidráulico 2.5" diámetro bore', totalPiezas:8, piezasProcesadas:8, status:'calidad_envio', prioridad:'urgente', fechaInicio:daysAgo(15), fechaEntrega:daysFromNow(3), material:'Acero 1018 CR', planoURL:'', notas:'Prueba hidrostática a 3000 PSI', creadoPor:uids.admin||'seed', updatedAt:now }},
    { id: `ot-${YEAR}-007`, d: { folio:`OT-${YEAR}-007`, ocId:`oc-${YEAR}-004`, ocFolio:`OC-${YEAR}-004`, cliente:'Fertilizantes del Bajío', descripcion:'Agitador de mezcladora tipo paleta', totalPiezas:4, piezasProcesadas:4, status:'completada', prioridad:'normal', fechaInicio:daysAgo(30), fechaEntrega:daysAgo(8), fechaCompletada:daysAgo(9), material:'Acero inoxidable 316L', planoURL:'', notas:'', creadoPor:uids.admin||'seed', updatedAt:daysAgo(9) }},
    { id: `ot-${YEAR}-008`, d: { folio:`OT-${YEAR}-008`, ocId:`oc-${YEAR}-004`, ocFolio:`OC-${YEAR}-004`, cliente:'Fertilizantes del Bajío', descripcion:'Rodetes de bomba centrífuga', totalPiezas:6, piezasProcesadas:6, status:'completada', prioridad:'normal', fechaInicio:daysAgo(25), fechaEntrega:daysAgo(8), fechaCompletada:daysAgo(10), material:'Acero CF8M', planoURL:'', notas:'Balance dinámico requerido', creadoPor:uids.admin||'seed', updatedAt:daysAgo(10) }},
    { id: `ot-${YEAR}-009`, d: { folio:`OT-${YEAR}-009`, ocId:`oc-${YEAR}-005`, ocFolio:`OC-${YEAR}-005`, cliente:'Motores y Transmisiones SA de CV', descripcion:'Engrane helicoidal módulo 3, Z=42', totalPiezas:10, piezasProcesadas:0, status:'pendiente', prioridad:'normal', fechaInicio:now, fechaEntrega:daysFromNow(28), material:'Acero 8620 cementado', planoURL:'', notas:'', creadoPor:uids.admin||'seed', updatedAt:now }},
    { id: `ot-${YEAR}-010`, d: { folio:`OT-${YEAR}-010`, ocId:`oc-${YEAR}-005`, ocFolio:`OC-${YEAR}-005`, cliente:'Motores y Transmisiones SA de CV', descripcion:'Piñón de ataque diferencial trasero', totalPiezas:5, piezasProcesadas:0, status:'pendiente', prioridad:'normal', fechaInicio:now, fechaEntrega:daysFromNow(30), material:'Acero 9310', planoURL:'', notas:'Coordinar con OT-011 para lote de T/T', creadoPor:uids.admin||'seed', updatedAt:now }},
    { id: `ot-${YEAR}-011`, d: { folio:`OT-${YEAR}-011`, ocId:`oc-${YEAR}-005`, ocFolio:`OC-${YEAR}-005`, cliente:'Motores y Transmisiones SA de CV', descripcion:'Árbol de levas en blanco para rectificado', totalPiezas:3, piezasProcesadas:0, status:'pendiente', prioridad:'normal', fechaInicio:now, fechaEntrega:daysFromNow(32), material:'Hierro fundido gris', planoURL:'', notas:'', creadoPor:uids.admin||'seed', updatedAt:now }},
  ];
  for (const ot of OTs) { await firestoreSet(`work_orders/${ot.id}`, ot.d); }
  console.log(`  ✅  ${OTs.length} OTs`);

  // Changelog para OT-002
  await firestoreAdd(`work_orders/ot-${YEAR}-002/changelog`, { timestamp:daysAgo(8), usuarioUid:uids.admin||'seed', usuarioNombre:'Carlos Hernández', campo:'status', valorAnterior:'pendiente', valorNuevo:'compras_mp', accion:'status_change' });
  await firestoreAdd(`work_orders/ot-${YEAR}-002/changelog`, { timestamp:daysAgo(6), usuarioUid:uids.admin||'seed', usuarioNombre:'Carlos Hernández', campo:'status', valorAnterior:'compras_mp', valorNuevo:'produccion_interna', accion:'status_change' });
  await firestoreAdd(`work_orders/ot-${YEAR}-002/changelog`, { timestamp:daysAgo(3), usuarioUid:uids.produccion||'seed', usuarioNombre:'Miguel Ángel Torres', campo:'piezasProcesadas', valorAnterior:0, valorNuevo:7, accion:'piezas_update' });
  console.log('  ✅  3 entradas de changelog en OT-002');

  // 6. Exit Slips
  console.log('\n📦  Órdenes de Salida...');
  const exitSlips = [
    { id:`os-${YEAR}-001`, d:{ folio:`OS-${YEAR}-001`, otId:`ot-${YEAR}-003`, otFolio:`OT-${YEAR}-003`, ocId:`oc-${YEAR}-001`, cliente:'Autopartes del Norte S.A.', proveedorNombre:'Tratamientos Térmicos del Norte SA', servicio:'Temple y Revenido 50-55 HRC', cantidadPiezas:48, fechaSalida:daysAgo(3), fechaRegresoEstimada:daysFromNow(1), status:'activa', costoEstimado:3200, notas:'Urgente. Llamar al recibir.', creadoPor:uids.produccion||'seed', updatedAt:daysAgo(3) }},
    { id:`os-${YEAR}-002`, d:{ folio:`OS-${YEAR}-002`, otId:`ot-${YEAR}-006`, otFolio:`OT-${YEAR}-006`, ocId:`oc-${YEAR}-003`, cliente:'Hidráulica Industrial MX', proveedorNombre:'Cromados y Niquelados Jalisco', servicio:'Cromado duro 0.05mm', cantidadPiezas:8, fechaSalida:daysAgo(5), fechaRegresoEstimada:daysAgo(1), fechaRegresoReal:daysAgo(1), status:'cerrada', costoEstimado:4800, costoReal:4650, notas:'', creadoPor:uids.produccion||'seed', updatedAt:daysAgo(1) }},
    { id:`os-${YEAR}-003`, d:{ folio:`OS-${YEAR}-003`, otId:`ot-${YEAR}-005`, otFolio:`OT-${YEAR}-005`, ocId:`oc-${YEAR}-002`, cliente:'Aerospace Components LLC', proveedorNombre:'Maquinados de Precisión Láser SRL', servicio:'Rectificado externo Ra 0.4µm', cantidadPiezas:12, fechaSalida:daysAgo(1), fechaRegresoEstimada:daysFromNow(7), status:'activa', costoEstimado:7200, notas:'Certificado de inspección requerido.', creadoPor:uids.produccion||'seed', updatedAt:daysAgo(1) }},
    { id:`os-${YEAR}-004`, d:{ folio:`OS-${YEAR}-004`, otId:`ot-${YEAR}-007`, otFolio:`OT-${YEAR}-007`, ocId:`oc-${YEAR}-004`, cliente:'Fertilizantes del Bajío', proveedorNombre:'Recubrimientos Industriales del Centro', servicio:'Pintura epóxica anticorrosión', cantidadPiezas:4, fechaSalida:daysAgo(15), fechaRegresoEstimada:daysAgo(10), fechaRegresoReal:daysAgo(11), status:'cerrada', costoEstimado:1800, costoReal:1800, notas:'', creadoPor:uids.produccion||'seed', updatedAt:daysAgo(11) }},
  ];
  for (const s of exitSlips) { await firestoreSet(`exit_slips/${s.id}`, s.d); }
  console.log(`  ✅  ${exitSlips.length} Órdenes de Salida`);

  // 7. Fixed Costs
  console.log('\n💰  Costos Fijos...');
  const fixedCosts = [
    { categoria:'nomina', descripcion:'Nómina quincenal operarios (3 torneros, 2 fresadores)', monto:62000, esRecurrente:true },
    { categoria:'nomina', descripcion:'Nómina administración y supervisión', monto:28000, esRecurrente:true },
    { categoria:'renta', descripcion:'Renta nave industrial 500m²', monto:18500, esRecurrente:true },
    { categoria:'electricidad', descripcion:'CFE Industrial tarifa H-M', monto:14200, esRecurrente:true },
    { categoria:'internet', descripcion:'Fibra óptica 100Mbps + telefonía', monto:1450, esRecurrente:true },
    { categoria:'credito', descripcion:'Crédito MAQUINARIA CNC — Cuota mensual', monto:22000, esRecurrente:true },
    { categoria:'mantenimiento', descripcion:'Mantenimiento preventivo tornos CNC', monto:4500, esRecurrente:false },
    { categoria:'seguros', descripcion:'Seguro de equipos e instalaciones', monto:3200, esRecurrente:true },
    { categoria:'agua', descripcion:'Agua potable e industrial', monto:780, esRecurrente:true },
  ];
  for (const fc of fixedCosts) {
    await firestoreAdd('fixed_costs', { ...fc, periodo:CURRENT_PERIOD, factura:'', fecha:now, creadoPor:uids.admin||'seed' });
  }
  console.log(`  ✅  ${fixedCosts.length} costos fijos ($${fixedCosts.reduce((s,f)=>s+f.monto,0).toLocaleString()} MXN)`);

  // 8. Direct Expenses
  console.log('\n🧾  Gastos Directos...');
  const directExpenses = [
    { otId:'ot-2025-002', otFolio:'OT-2025-002', ocId:'oc-2025-001', categoria:'materia_prima', descripcion:'Barra aluminio 6061 Ø80mm x 3m', monto:8400, proveedor:'Aluminio del Norte SA', factura:'F-23891' },
    { otId:'ot-2025-002', otFolio:'OT-2025-002', ocId:'oc-2025-001', categoria:'consumibles', descripcion:'Insertos carburo Sandvik CNMG 120408', monto:2160, proveedor:'Herramientas de Corte MX', factura:'F-10445' },
    { otId:'ot-2025-003', otFolio:'OT-2025-003', ocId:'oc-2025-001', categoria:'materia_prima', descripcion:'Barra redonda 1045 Ø25mm', monto:3200, proveedor:'ACERO MX Distribuidora', factura:'F-56712' },
    { otId:'ot-2025-003', otFolio:'OT-2025-003', ocId:'oc-2025-001', categoria:'maquila_externa', descripcion:'T/T pernos — Anticipo 50%', monto:1600, proveedor:'Tratamientos Térmicos del Norte SA', factura:'' },
    { otId:'ot-2025-004', otFolio:'OT-2025-004', ocId:'oc-2025-002', categoria:'materia_prima', descripcion:'Placa titanio Ti-6Al-4V 200x200x30mm', monto:28500, proveedor:'Metales Especiales Import', factura:'F-00312' },
    { otId:'ot-2025-006', otFolio:'OT-2025-006', ocId:'oc-2025-003', categoria:'materia_prima', descripcion:'Tubo 1018 CR Ø65mm ID/Ø90mm OD', monto:6800, proveedor:'ACERO MX Distribuidora', factura:'F-56890' },
    { otId:'ot-2025-006', otFolio:'OT-2025-006', ocId:'oc-2025-003', categoria:'maquila_externa', descripcion:'Cromado duro cilindros', monto:4650, proveedor:'Cromados y Niquelados Jalisco', factura:'F-CR0891' },
    { otId:'ot-2025-006', otFolio:'OT-2025-006', ocId:'oc-2025-003', categoria:'flete', descripcion:'Flete redondo a cromadora y regreso', monto:650, proveedor:'Envíos Exprés Guadalajara', factura:'' },
  ];
  for (const de of directExpenses) {
    await firestoreAdd('direct_expenses', { ...de, periodo:CURRENT_PERIOD, fecha:now, creadoPor:uids.admin||'seed' });
  }
  console.log(`  ✅  ${directExpenses.length} gastos directos`);

  // 9. Clientes y Datos Fiscales
  console.log('\n🏢  Clientes y Datos de Facturación...');
  const customers = [
    {
      id: 'cust-001',
      data: {
        nombreComercial: 'Autopartes del Norte',
        razonSocial: 'Autopartes del Norte S.A. de C.V.',
        rfc: 'ANO120304ABC',
        regimenFiscal: '601',
        usoCFDI: 'G03',
        direccionFiscal: 'Av. Industrial #1200, Col. Parque Industrial, C.P. 66000, Monterrey, N.L.',
        correoFacturacion: 'facturacion@autopartesnorte.com',
        telefono: '81 8123 4567',
        contactoNombre: 'Ing. Roberto Garza',
        notas: 'Entrega de facturas los lunes de 9 a 12h',
        isActive: true,
        createdAt: now, updatedAt: now, creadoPor: uids.admin || 'seed',
      },
    },
    {
      id: 'cust-002',
      data: {
        nombreComercial: 'Aerospace Components',
        razonSocial: 'Aerospace Components Mexico S. de R.L. de C.V.',
        rfc: 'ACM180512XYZ',
        regimenFiscal: '601',
        usoCFDI: 'G01',
        direccionFiscal: 'Carr. Querétaro-Chihuahua Km 14, C.P. 76000, Querétaro, Qro.',
        correoFacturacion: 'ap@aerospacecomponents.com',
        telefono: '442 987 6543',
        contactoNombre: 'Lic. Claudia Morales',
        notas: 'Requiere número de OC impreso en la factura',
        isActive: true,
        createdAt: now, updatedAt: now, creadoPor: uids.admin || 'seed',
      },
    },
    {
      id: 'cust-003',
      data: {
        nombreComercial: 'Hidráulica Industrial',
        razonSocial: 'Hidráulica Industrial MX S.A. de C.V.',
        rfc: 'HIM091120KL9',
        regimenFiscal: '601',
        usoCFDI: 'G03',
        direccionFiscal: 'Calle Central #450, Col. Industrial, C.P. 44100, Guadalajara, Jal.',
        correoFacturacion: 'contabilidad@hidraulicamx.com',
        telefono: '33 3612 8900',
        contactoNombre: 'Ing. Fernando Rios',
        notas: '',
        isActive: true,
        createdAt: now, updatedAt: now, creadoPor: uids.admin || 'seed',
      },
    },
    {
      id: 'cust-004',
      data: {
        nombreComercial: 'Fertilizantes del Bajío',
        razonSocial: 'Fertilizantes y Químicos del Bajío S.A.',
        rfc: 'FQB9507153M2',
        regimenFiscal: '603',
        usoCFDI: 'G03',
        direccionFiscal: 'Blvd. Aeropuerto #890, C.P. 37000, León, Gto.',
        correoFacturacion: 'cuentasporpagar@ferti-bajio.com',
        telefono: '477 710 2030',
        contactoNombre: 'CP Martha Sánchez',
        notas: 'Cliente inactivo temporalmente',
        isActive: false, // Historial
        createdAt: daysAgo(60), updatedAt: now, creadoPor: uids.admin || 'seed',
      },
    },
  ];
  for (const cust of customers) {
    await firestoreSet(`customers/${cust.id}`, cust.data);
  }
  console.log(`  ✅  ${customers.length} clientes creados (3 activos, 1 historial)`);

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎉  SEED COMPLETADO');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('📌  CREDENCIALES DE ACCESO:\n');
  console.log('  👑  ADMIN       admin@mestaller.demo        /  Admin123!');
  console.log('  🔧  PRODUCCIÓN  produccion@mestaller.demo   /  Prod123!');
  console.log('  🛒  COMPRAS     compras@mestaller.demo       /  Compras123!\n');
  console.log('🌐  Emulator UI:  http://localhost:4000');
  console.log('🖥️   App local:    http://localhost:3000\n');

  process.exit(0);
}

seed().catch((e) => {
  console.error('\n❌  Error:', e.message || e);
  process.exit(1);
});
