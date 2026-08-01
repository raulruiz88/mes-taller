import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, addDoc, collection, Timestamp, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDwuII2T4lbyP6ecTiO7rr_19fXLpASkIs",
  authDomain: "mes-taller-maquinados.firebaseapp.com",
  projectId: "mes-taller-maquinados",
  storageBucket: "mes-taller-maquinados.firebasestorage.app",
  messagingSenderId: "851385190679",
  appId: "1:851385190679:web:ab3c0b23308f91e3274f52"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("🌱 Poblando base de datos en la Nube (Firebase Cloud)...");

// Intentar autenticarnos con admin
let adminUid = 'seed-admin';
try {
  const cred = await signInWithEmailAndPassword(auth, "admin@mestaller.com", "Admin123!");
  adminUid = cred.user.uid;
  console.log("✅ Conectado como Admin:", adminUid);

  // Asegurar documento de usuario admin en Firestore
  await setDoc(doc(db, 'users', adminUid), {
    displayName: 'Administrador',
    email: 'admin@mestaller.com',
    role: 'admin',
    createdAt: Timestamp.now(),
  }, { merge: true });
  console.log("✅ Documento users/admin asegurado");
} catch (e) {
  console.log("⚠️ No se pudo autenticar con admin@mestaller.com:", e.message);
}

// 1. Clientes iniciales
console.log("\n🏢 Creando clientes iniciales...");
const clientes = [
  { id: 'cli-001', data: { nombreComercial: 'Autopartes del Norte S.A.', razonSocial: 'Autopartes del Norte S.A. de C.V.', rfc: 'ANO850412KH9', regimenFiscal: '601', usoCFDI: 'G03', direccionFiscal: 'Av. Industrial #450, Monterrey, N.L.', correoFacturacion: 'facturas@autopartesnorte.com', telefono: '81 8150 2000', contactoNombre: 'Ing. Roberto Garza', isActive: true }},
  { id: 'cli-002', data: { nombreComercial: 'Aerospace Components LLC', razonSocial: 'Aerospace Components Mexico S. de R.L.', rfc: 'ACM1209059A1', regimenFiscal: '601', usoCFDI: 'G03', direccionFiscal: 'Parque Industrial Aeropuerto Bodega 12, Apodaca, N.L.', correoFacturacion: 'ap@aerospacecomponents.com', telefono: '81 1234 5678', contactoNombre: 'Lic. Sarah Jenkins', isActive: true }},
  { id: 'cli-003', data: { nombreComercial: 'Hidráulica Industrial MX', razonSocial: 'Hidráulica y Neumática Industrial SA', rfc: 'HNI9802203L4', regimenFiscal: '601', usoCFDI: 'G03', direccionFiscal: 'Calle del Acero #102, Guadalupe, N.L.', correoFacturacion: 'compras@hidraulica.mx', telefono: '81 8300 4455', contactoNombre: 'Ing. Carlos Mendoza', isActive: true }},
];

for (const c of clientes) {
  await setDoc(doc(db, `customers/${c.id}`), c.data, { merge: true });
}
console.log(`  ✅ ${clientes.length} clientes en la nube`);

// 2. Proveedores iniciales
console.log("\n🏪 Creando proveedores iniciales...");
const proveedores = [
  { id: 'prov-001', data: { nombre: 'Metales Especiales de México', contacto: 'Lic. Antonio Pérez', telefono: '81 8123 9900', email: 'ventas@metalesespeciales.com', servicios: ['Acero 4140', 'Acero 1045', 'Aluminio 6061-T6', 'Inconel 718'], notas: 'Proveedor principal de materias primas', isActive: true }},
  { id: 'prov-002', data: { nombre: 'Tratamientos Térmicos del Norte SA', contacto: 'Ing. Fernando Rios', telefono: '81 8345 1122', email: 'cotizaciones@ttnorte.com', servicios: ['Temple y Revenido', 'Cementado', 'Nitrurado'], notas: 'Maquila de tratamiento térmico certificado', isActive: true }},
  { id: 'prov-003', data: { nombre: 'Cromados y Niquelados Jalisco', contacto: 'Sr. Manuel Gómez', telefono: '33 3612 8844', email: 'ventas@cromadosjalisco.com', servicios: ['Cromado Duro 0.05mm', 'Anodizado Duro', 'Galvanizado'], notas: 'Recubrimientos electrolíticos', isActive: true }},
];

for (const p of proveedores) {
  await setDoc(doc(db, `suppliers/${p.id}`), p.data, { merge: true });
}
console.log(`  ✅ ${proveedores.length} proveedores en la nube`);

console.log("\n🎉 SEED DE PRODUCCIÓN COMPLETADO CON ÉXITO");
