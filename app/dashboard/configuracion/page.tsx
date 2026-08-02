'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { AppSettings, AppUser, UserRole } from '@/lib/types';
import { getAllUsers, createUserDocument, updateUserRole, updateUserProfile, deleteUserDocument } from '@/lib/firebase/firestore/users';
import { toast } from '@/components/ui/toaster';
import { formatDate } from '@/lib/utils';
import {
  Settings,
  Save,
  Users,
  Plus,
  Shield,
  Trash2,
  Mail,
  User,
  X,
  CheckCircle2,
  Lock,
  Key,
  Factory,
  ShoppingBag,
} from 'lucide-react';
import { CENTROS_TRABAJO, DEFAULT_CATEGORIAS_GASTOS } from '@/lib/types';

const DEFAULT_SETTINGS: Omit<AppSettings, 'updatedAt' | 'updatedBy'> = {
  id: 'global',
  tallerNombre: 'Lions mechanical and electrical',
  storageBaseURL: '',
  monedaDefault: 'MXN',
  folioOCPrefix: 'OC',
  folioOTPrefix: 'OT',
  folioOSPrefix: 'OS',
  contadorOC: 0,
  contadorOT: 0,
  contadorOS: 0,
  slaRojo: 24,
  slaAmarillo: 72,
};

export default function ConfiguracionPage() {
  const { isAdmin, userData } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'general' | 'usuarios' | 'centros' | 'gastos'>('general');
  const [settings, setSettings] = useState<Omit<AppSettings, 'updatedAt' | 'updatedBy'>>(DEFAULT_SETTINGS);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Centros de trabajo state
  const [centros, setCentros] = useState<string[]>([...CENTROS_TRABAJO]);
  const [newCentro, setNewCentro] = useState('');
  const [savingCentros, setSavingCentros] = useState(false);
  const [savedCentros, setSavedCentros] = useState(false);

  // Categorías de gastos state
  const [catGastos, setCatGastos] = useState<string[]>([...DEFAULT_CATEGORIAS_GASTOS]);
  const [newCatGasto, setNewCatGasto] = useState('');
  const [savingGastos, setSavingGastos] = useState(false);
  const [savedGastos, setSavedGastos] = useState(false);

  // Edit user name state
  const [editingNameUid, setEditingNameUid] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    loadData();
  }, [isAdmin]);

  async function loadData() {
    setLoading(true);
    try {
      const [snap, userList] = await Promise.all([
        getDoc(doc(db, 'app_settings', 'global')),
        getAllUsers(),
      ]);
      if (snap.exists()) {
        const data = snap.data() as Omit<AppSettings, 'updatedAt' | 'updatedBy'>;
        setSettings(data);
        if (Array.isArray((data as any).centrosTrabajo) && (data as any).centrosTrabajo.length > 0) {
          setCentros((data as any).centrosTrabajo);
        }
        if (Array.isArray((data as any).categoriasGastos) && (data as any).categoriasGastos.length > 0) {
          setCatGastos((data as any).categoriasGastos);
        }
      }
      setUsers(userList);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings() {
    if (!userData) return;
    setSaving(true);
    await setDoc(
      doc(db, 'app_settings', 'global'),
      {
        ...settings,
        updatedAt: serverTimestamp(),
        updatedBy: userData.uid,
      },
      { merge: true }
    );
    setSaving(false);
    setSaved(true);
    toast({ message: 'Configuración guardada correctamente', type: 'success' });
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSaveCentros() {
    if (!userData) return;
    setSavingCentros(true);
    await setDoc(
      doc(db, 'app_settings', 'global'),
      { centrosTrabajo: centros, updatedAt: serverTimestamp(), updatedBy: userData.uid },
      { merge: true }
    );
    setSavingCentros(false);
    setSavedCentros(true);
    toast({ message: 'Centros de trabajo guardados', type: 'success' });
    setTimeout(() => setSavedCentros(false), 2000);
  }

  function addCentro() {
    const trimmed = newCentro.trim();
    if (!trimmed || centros.includes(trimmed)) return;
    setCentros((prev) => [...prev, trimmed]);
    setNewCentro('');
  }

  function removeCentro(name: string) {
    setCentros((prev) => prev.filter((c) => c !== name));
  }

  function moveCentro(index: number, direction: 'up' | 'down') {
    const arr = [...centros];
    const swap = direction === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= arr.length) return;
    [arr[index], arr[swap]] = [arr[swap], arr[index]];
    setCentros(arr);
  }

  async function handleSaveGastos() {
    if (!userData) return;
    setSavingGastos(true);
    await setDoc(
      doc(db, 'app_settings', 'global'),
      { categoriasGastos: catGastos, updatedAt: serverTimestamp(), updatedBy: userData.uid },
      { merge: true }
    );
    setSavingGastos(false);
    setSavedGastos(true);
    toast({ message: 'Categorías de gastos guardadas', type: 'success' });
    setTimeout(() => setSavedGastos(false), 2000);
  }

  function addCatGasto() {
    const trimmed = newCatGasto.trim();
    if (!trimmed || catGastos.includes(trimmed)) return;
    setCatGastos((prev) => [...prev, trimmed]);
    setNewCatGasto('');
  }

  function removeCatGasto(name: string) {
    setCatGastos((prev) => prev.filter((c) => c !== name));
  }

  function moveCatGasto(index: number, direction: 'up' | 'down') {
    const arr = [...catGastos];
    const swap = direction === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= arr.length) return;
    [arr[index], arr[swap]] = [arr[swap], arr[index]];
    setCatGastos(arr);
  }

  async function handleChangeRole(uid: string, newRole: UserRole) {
    try {
      await updateUserRole(uid, newRole);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)));
      toast({ message: 'Rol de usuario actualizado', type: 'success' });
    } catch {
      toast({ message: 'Error al actualizar el rol', type: 'error' });
    }
  }

  async function handleUpdateName(uid: string, newName: string) {
    if (!newName.trim()) return;
    try {
      await updateUserProfile(uid, { displayName: newName.trim() });
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, displayName: newName.trim() } : u)));
      if (userData && uid === userData.uid) {
        const updatedData = { ...userData, displayName: newName.trim() };
        localStorage.setItem(`user_data_${uid}`, JSON.stringify(updatedData));
      }
      toast({ message: 'Nombre actualizado correctamente. Si es tu cuenta, recarga la página para ver el cambio arriba.', type: 'success' });
      setEditingNameUid(null);
    } catch {
      toast({ message: 'Error al actualizar el nombre', type: 'error' });
    }
  }

  async function handleDeleteUser(userToDelete: AppUser) {
    if (confirm(`¿Eliminar al usuario ${userToDelete.displayName}?`)) {
      try {
        await deleteUserDocument(userToDelete.uid);
        setUsers((prev) => prev.filter((u) => u.uid !== userToDelete.uid));
        toast({ message: 'Usuario eliminado de Firestore', type: 'info' });
      } catch {
        toast({ message: 'Error al eliminar usuario', type: 'error' });
      }
    }
  }

  const inputClass =
    'w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';
  const labelClass = 'block text-xs font-medium text-slate-400 mb-1.5';

  if (loading) {
    return <div className="h-48 bg-slate-800/40 rounded-2xl animate-pulse" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Settings className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Configuración & Gestión del Taller</h1>
            <p className="text-sm text-slate-400">Panel de control del Administrador</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-800/60 border border-slate-700 rounded-xl p-1 gap-1 flex-wrap">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'general'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Configuración General
          </button>
          <button
            onClick={() => setActiveTab('centros')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'centros'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Factory className="w-4 h-4" />
            Centros de Trabajo ({centros.length})
          </button>
          <button
            onClick={() => setActiveTab('gastos')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'gastos'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Categorías de Gastos ({catGastos.length})
          </button>
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'usuarios'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Usuarios & Roles ({users.length})
          </button>
        </div>
      </div>

      {/* ── TAB 1: CONFIGURACIÓN GENERAL ──────────────────────────────────────── */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 space-y-5">
            <h2 className="font-semibold text-white text-sm">Datos del Taller</h2>

            <div>
              <label className={labelClass}>Nombre del Taller</label>
              <input
                id="config-nombre"
                value={settings.tallerNombre}
                onChange={(e) => setSettings({ ...settings, tallerNombre: e.target.value })}
                placeholder="Mi Taller Industrial"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>URL Raíz de Almacenamiento (Google Drive u otro)</label>
              <input
                id="config-storage"
                value={settings.storageBaseURL}
                onChange={(e) => setSettings({ ...settings, storageBaseURL: e.target.value })}
                placeholder="https://drive.google.com/drive/folders/..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Moneda Predeterminada</label>
              <select
                id="config-moneda"
                value={settings.monedaDefault}
                onChange={(e) => setSettings({ ...settings, monedaDefault: e.target.value as 'MXN' | 'USD' })}
                className={inputClass}
              >
                <option value="MXN">MXN — Peso Mexicano</option>
                <option value="USD">USD — Dólar Americano</option>
              </select>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 space-y-5">
            <h2 className="font-semibold text-white text-sm">Prefijos de Folios</h2>
            <div className="grid grid-cols-3 gap-4">
              {([
                { key: 'folioOCPrefix', label: 'Prefijo OC' },
                { key: 'folioOTPrefix', label: 'Prefijo OT' },
                { key: 'folioOSPrefix', label: 'Prefijo OS (Salidas)' },
              ] as const).map(({ key, label }) => (
                <div key={key}>
                  <label className={labelClass}>{label}</label>
                  <input
                    id={`config-${key}`}
                    value={settings[key]}
                    onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                    placeholder="OC"
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            id="save-settings-btn"
            onClick={handleSaveSettings}
            disabled={saving}
            className={`w-full flex items-center justify-center gap-2 py-3 font-semibold rounded-xl transition-all ${
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-blue-500/20'
            } disabled:opacity-60`}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar Configuración'}
          </button>
        </div>
      )}

      {/* ── TAB 2: CENTROS DE TRABAJO ─────────────────────────────────────────── */}
      {activeTab === 'centros' && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                <Factory className="w-4 h-4 text-blue-400" />
                Catálogo de Centros de Trabajo / Máquinas
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Estos centros aparecen en el selector al definir operaciones de manufactura en cada OT. Agrega, quita u ordénalos como necesites.
              </p>
            </div>

            {/* Lista de centros */}
            <div className="space-y-2">
              {centros.map((centro, i) => (
                <div
                  key={centro}
                  className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3"
                >
                  {/* Orden arrows */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveCentro(i, 'up')}
                      disabled={i === 0}
                      className="w-5 h-4 flex items-center justify-center text-slate-500 hover:text-slate-200 disabled:opacity-20 text-xs"
                    >▲</button>
                    <button
                      onClick={() => moveCentro(i, 'down')}
                      disabled={i === centros.length - 1}
                      className="w-5 h-4 flex items-center justify-center text-slate-500 hover:text-slate-200 disabled:opacity-20 text-xs"
                    >▼</button>
                  </div>

                  <span className="text-xs font-mono text-slate-500 w-5 shrink-0 text-right">{i + 1}</span>

                  <div className="flex items-center gap-2 flex-1">
                    <Factory className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="text-sm text-white font-medium">{centro}</span>
                  </div>

                  <button
                    onClick={() => removeCentro(centro)}
                    className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/25 flex items-center justify-center text-red-400 transition-all shrink-0"
                    title="Eliminar centro de trabajo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Agregar nuevo */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCentro}
                onChange={(e) => setNewCentro(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCentro()}
                placeholder="Nuevo centro de trabajo (ej: Torno Manual, CNC 5 Ejes...)"
                className="flex-1 px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <button
                onClick={addCentro}
                disabled={!newCentro.trim()}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-all"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>

            {/* Guardar */}
            <button
              id="save-centros-btn"
              onClick={handleSaveCentros}
              disabled={savingCentros}
              className={`w-full flex items-center justify-center gap-2 py-3 font-semibold rounded-xl transition-all ${
                savedCentros
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-blue-500/20'
              } disabled:opacity-60`}
            >
              <Save className="w-4 h-4" />
              {savingCentros ? 'Guardando...' : savedCentros ? '✓ Guardado' : 'Guardar Centros de Trabajo'}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 3: CATEGORÍAS DE GASTOS ────────────────────────────────────────── */}
      {activeTab === 'gastos' && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-400" />
                Catálogo de Categorías de Gastos (Variables y de OT)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Administra los tipos de gastos disponibles al registrar compras o gastos del taller (Gasolina, Herramientas, Insumos, etc.).
              </p>
            </div>

            {/* Lista de categorías de gastos */}
            <div className="space-y-2">
              {catGastos.map((cat, i) => (
                <div
                  key={cat}
                  className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveCatGasto(i, 'up')}
                      disabled={i === 0}
                      className="w-5 h-4 flex items-center justify-center text-slate-500 hover:text-slate-200 disabled:opacity-20 text-xs"
                    >▲</button>
                    <button
                      onClick={() => moveCatGasto(i, 'down')}
                      disabled={i === catGastos.length - 1}
                      className="w-5 h-4 flex items-center justify-center text-slate-500 hover:text-slate-200 disabled:opacity-20 text-xs"
                    >▼</button>
                  </div>

                  <span className="text-xs font-mono text-slate-500 w-5 shrink-0 text-right">{i + 1}</span>

                  <div className="flex items-center gap-2 flex-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="text-sm text-white font-medium">{cat}</span>
                  </div>

                  <button
                    onClick={() => removeCatGasto(cat)}
                    className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/25 flex items-center justify-center text-red-400 transition-all shrink-0"
                    title="Eliminar categoría"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Agregar nuevo */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCatGasto}
                onChange={(e) => setNewCatGasto(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCatGasto()}
                placeholder="Nueva categoría de gasto (ej: Refacciones, Fletes Locales...)"
                className="flex-1 px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <button
                onClick={addCatGasto}
                disabled={!newCatGasto.trim()}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-all"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>

            {/* Guardar */}
            <button
              id="save-gastos-btn"
              onClick={handleSaveGastos}
              disabled={savingGastos}
              className={`w-full flex items-center justify-center gap-2 py-3 font-semibold rounded-xl transition-all ${
                savedGastos
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-blue-500/20'
              } disabled:opacity-60`}
            >
              <Save className="w-4 h-4" />
              {savingGastos ? 'Guardando...' : savedGastos ? '✓ Guardado' : 'Guardar Categorías de Gastos'}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 2: GESTIÓN DE USUARIOS Y ROLES ───────────────────────────────── */}
      {activeTab === 'usuarios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Administración de roles y permisos de acceso para el personal del taller
            </p>
            <button
              id="nuevo-usuario-btn"
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              Dar de Alta Nuevo Usuario
            </button>
          </div>

          <div className="space-y-2.5">
            {users.map((u) => (
              <div
                key={u.uid}
                className="glass rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-slate-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {editingNameUid === u.uid ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateName(u.uid, tempName)}
                            className="px-2 py-1 bg-slate-900 border border-blue-500 rounded text-xs text-white focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateName(u.uid, tempName)}
                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded font-medium"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditingNameUid(null)}
                            className="text-xs text-slate-400 hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{u.displayName}</span>
                          <button
                            onClick={() => {
                              setEditingNameUid(u.uid);
                              setTempName(u.displayName);
                            }}
                            className="text-[11px] text-blue-400 hover:underline"
                            title="Cambiar nombre"
                          >
                            ✏️ Editar Nombre
                          </button>
                        </div>
                      )}

                      {u.role === 'admin' && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/30 font-medium">
                          👑 Admin
                        </span>
                      )}
                      {u.role === 'produccion' && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 font-medium">
                          🔧 Producción
                        </span>
                      )}
                      {u.role === 'compras' && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">
                          🛒 Compras
                        </span>
                      )}
                      {u.role === 'tecnico' && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                          👨‍🔧 Técnico / Operador
                        </span>
                      )}
                      {u.role === 'supervisor' && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-medium">
                          👮 Supervisor
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <select
                    value={u.role}
                    onChange={(e) => handleChangeRole(u.uid, e.target.value as UserRole)}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="admin">Administrador</option>
                    <option value="produccion">Producción</option>
                    <option value="compras">Compras</option>
                    <option value="tecnico">Técnico / Operador</option>
                    <option value="supervisor">Supervisor</option>
                  </select>

                  {u.uid !== userData?.uid && (
                    <button
                      onClick={() => handleDeleteUser(u)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                      title="Eliminar usuario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para Crear Usuario */}
      {modalOpen && (
        <UserCreateModal
          onClose={() => setModalOpen(false)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}

function UserCreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [uid, setUid] = useState('');
  const [role, setRole] = useState<UserRole>('produccion');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid.trim() || !displayName.trim() || !email.trim()) {
      toast({ message: 'Completa todos los campos obligatorios', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      await createUserDocument(uid.trim(), {
        displayName: displayName.trim(),
        email: email.trim(),
        role,
      });
      toast({ message: 'Usuario registrado correctamente en Firestore', type: 'success' });
      onSaved();
      onClose();
    } catch {
      toast({ message: 'Error al registrar usuario en Firestore', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full px-3.5 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';
  const labelClass = 'block text-xs font-medium text-slate-400 mb-1.5';

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-slate-900 border border-slate-700 rounded-2xl z-50 shadow-2xl shadow-black/60 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="font-semibold text-white">Dar de Alta Nuevo Usuario</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-300 space-y-1">
            <p className="font-semibold">💡 Guía para crear usuarios:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-slate-300">
              <li>Crea primero el usuario en <strong>Firebase Console $\rightarrow$ Authentication</strong>.</li>
              <li>Copia el <strong>User UID</strong> generado y pégalo abajo.</li>
            </ol>
          </div>

          <div>
            <label className={labelClass}>User UID de Firebase Auth *</label>
            <input
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="Ej: z09IX1GZXqNSNIxiUApn7GWjEV22"
              className={`${inputClass} font-mono text-xs`}
            />
          </div>

          <div>
            <label className={labelClass}>Nombre Completo del Usuario *</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej: Ing. Juan Pérez"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Correo Electrónico *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan.perez@taller.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Rol Asignado en el Taller *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className={inputClass}
            >
              <option value="produccion">🔧 Producción (Taller / Maquinados)</option>
              <option value="compras">🛒 Compras (Materia Prima / Facturas)</option>
              <option value="admin">👑 Administrador (Acceso Total)</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-800 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl">
              Cancelar
            </button>
            <button
              id="save-user-btn"
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Registrar Usuario'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
