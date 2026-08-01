# MES Taller — Sistema de Control de Producción

Sistema MES/Job Shop PWA para taller industrial de maquinados CNC.

---

## 🚀 Inicio Rápido (Revisión Local con Emulador)

> **No necesitas Firebase real para revisar la app.** El emulador corre todo localmente.

### Requisitos previos
- Node.js 18+
- Java 11+ (requerido por Firebase Emulator) — [descargar aquí](https://adoptium.net/)

### 1. Iniciar el emulador Firebase (Terminal 1)
```bash
cd mes-taller
firebase emulators:start
```
El emulador UI queda disponible en **http://localhost:4000**

### 2. Cargar datos demo (Terminal 2)
```bash
node scripts/seed-demo.mjs
```

### 3. Iniciar la app (Terminal 2, después del seed)
```bash
npm run dev
```

Abre **http://localhost:3000**

---

## 🔑 Usuarios Demo

| Rol | Email | Contraseña |
|-----|-------|------------|
| **Admin** | admin@mestaller.demo | Admin123! |
| **Producción** | produccion@mestaller.demo | Prod123! |
| **Compras** | compras@mestaller.demo | Compras123! |

---

## 📊 Datos Demo Incluidos

- **5 Órdenes de Compra** (Autopartes, Aerospace, Hidráulica, Fertilizantes, Motores)
- **11 Órdenes de Trabajo** con todos los estados:
  - 🔴 **CRÍTICAS**: OT-002 (Producción, 7/12 piezas) y OT-003 (En maquila)
  - 🟡 **URGENTE**: OT-006 (Calidad/Envío)
  - 🟢 **EN TIEMPO**: Diseño, Compras MP, Pendientes
  - ⚫ **CERRADAS**: OT-001, OT-007, OT-008
- **4 Órdenes de Salida** (2 activas en maquila, 2 cerradas)
- **9 Costos Fijos** del mes actual (~$154,630 MXN)
- **8 Gastos Directos** distribuidos en varias OTs

---

## 🚢 Deploy a Producción

### 1. Configurar Firebase real
1. [console.firebase.google.com](https://console.firebase.google.com) → Crear proyecto
2. Habilitar **Authentication** → Email/Password
3. Crear **Firestore Database** en modo producción

### 2. Actualizar `.env.local`
```
NEXT_PUBLIC_USE_EMULATOR=false
NEXT_PUBLIC_FIREBASE_API_KEY=tu-key-real
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-real
# ... resto de variables
```

### 3. Publicar reglas de Firestore
```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules
```

### 4. Crear usuario Admin
En Firebase Console → Authentication → Add user, luego en Firestore `users/{uid}`:
```json
{ "uid": "...", "email": "...", "role": "admin", "isActive": true, ... }
```

### 5. Deploy a Vercel
```bash
npx vercel
```
Agregar variables de `.env.local` en Vercel → Settings → Environment Variables.

---

## 🔒 Roles de Acceso

| Módulo | Admin | Producción | Compras |
|--------|-------|------------|---------|
| Dashboard OTs | ✅ | ✅ | ✅ |
| Órdenes de Compra | ✅ CRUD | Solo lectura | ✅ CRUD |
| Maquilas / Salidas | ✅ CRUD | ✅ CRUD | Solo lectura |
| Finanzas & P&L | ✅ | ❌ | ❌ |
| Configuración | ✅ | ❌ | ❌ |
