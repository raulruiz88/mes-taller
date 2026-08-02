'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useWorkOrders } from '@/lib/hooks/useWorkOrders';
import { useRouter } from 'next/navigation';
import { Bell, Search, X, AlertTriangle, Clock, Menu, ShoppingCart, CheckCheck } from 'lucide-react';
import { getUrgency, URGENCY_LABELS } from '@/lib/utils/urgency';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  subscribeNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  AppNotification,
} from '@/lib/firebase/firestore/notifications';

export default function Header({ onToggleMobileMenu }: { onToggleMobileMenu?: () => void }) {
  const { userData } = useAuth();
  const { workOrders } = useWorkOrders();
  const router = useRouter();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'alerts' | 'oc'>('oc');
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeNotifications((notifs) => {
      setAppNotifications(notifs);
    });
    return () => unsub();
  }, []);

  // Abrir búsqueda con ⌘K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotifOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Enfocar input al abrir
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [searchOpen]);

  // Cerrar notif al hacer clic fuera
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [notifOpen]);

  // OTs críticas para notificaciones (solo activas)
  const criticalOTs = workOrders.filter((ot) => {
    if (ot.status === 'completada' || ot.status === 'cancelada') return false;
    const level = getUrgency(ot.fechaEntrega, ot.status);
    return level === 'rojo';
  });

  const unreadAppNotifs = appNotifications.filter((n) => {
    if (!userData?.uid) return true;
    return !(n.leidoPor || []).includes(userData.uid);
  });

  const totalBadges = criticalOTs.length + unreadAppNotifs.length;

  // Resultados de búsqueda
  const searchResults = searchQuery.length >= 2
    ? workOrders
        .filter((ot) =>
          ot.folio.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ot.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ot.descripcion.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 6)
    : [];

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  function goToOT(otId: string) {
    setSearchOpen(false);
    setSearchQuery('');
    router.push('/dashboard');
    // Pequeño delay para que el drawer pueda abrirse en el dashboard
    setTimeout(() => {
      const btn = document.getElementById(`ot-row-${otId}`);
      btn?.click();
    }, 300);
  }

  return (
    <>
      <header className="h-16 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-3">
          {onToggleMobileMenu && (
            <button
              id="mobile-menu-btn"
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
              title="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div>
            <p className="text-xs text-slate-400">{greeting()},</p>
            <p className="font-semibold text-white leading-tight text-sm">
              {userData?.displayName || userData?.email || 'Usuario'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search trigger */}
          <button
            id="header-search-btn"
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-slate-500 text-sm cursor-pointer hover:border-slate-600 hover:text-slate-300 transition-all"
          >
            <Search className="w-4 h-4" />
            <span>Buscar OT, OC...</span>
            <kbd className="text-xs bg-slate-700 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </button>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              id="header-notifications-btn"
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative w-9 h-9 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-all"
            >
              <Bell className="w-4 h-4" />
              {totalBadges > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 ring-2 ring-slate-900 flex items-center justify-center text-[9px] font-bold text-white">
                  {totalBadges > 9 ? '9+' : totalBadges}
                </span>
              )}
            </button>

            {/* Notif dropdown */}
            {notifOpen && (
              <div className="absolute right-0 top-12 w-88 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
                {/* Header Tabs */}
                <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1">
                  <button
                    onClick={() => setNotifTab('oc')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      notifTab === 'oc'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    🔔 Avisos ({unreadAppNotifs.length})
                  </button>
                  <button
                    onClick={() => setNotifTab('alerts')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      notifTab === 'alerts'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    OTs Críticas ({criticalOTs.length})
                  </button>
                </div>

                {/* Tab Content: Avisos / OCs / Asignaciones */}
                {notifTab === 'oc' && (
                  <div>
                    {unreadAppNotifs.length > 0 && (
                      <div className="flex justify-end px-3 py-1.5 bg-slate-800/40 border-b border-slate-800">
                        <button
                          onClick={() => userData?.uid && markAllNotificationsAsRead(userData.uid, appNotifications)}
                          className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <CheckCheck className="w-3 h-3" />
                          Marcar todas como leídas
                        </button>
                      </div>
                    )}

                    {appNotifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-slate-500 text-sm">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        No hay avisos recientes 🔔
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
                        {appNotifications.map((notif) => {
                          const isUnread = Boolean(userData?.uid && !(notif.leidoPor || []).includes(userData.uid));
                          return (
                            <button
                              key={notif.id}
                              onClick={async () => {
                                if (userData?.uid && isUnread) {
                                  await markNotificationAsRead(notif.id, userData.uid);
                                }
                                setNotifOpen(false);
                                if (notif.otId) {
                                  goToOT(notif.otId);
                                } else if (notif.ocId) {
                                  router.push(`/dashboard/ordenes/${notif.ocId}`);
                                } else {
                                  router.push('/dashboard/ordenes');
                                }
                              }}
                              className={`w-full text-left px-4 py-3 hover:bg-slate-800/60 transition-colors flex items-start gap-3 ${
                                isUnread ? 'bg-blue-950/30 font-medium' : ''
                              }`}
                            >
                              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                                <Bell className="w-4 h-4 text-blue-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <p className="text-xs font-semibold text-white truncate">
                                    {notif.titulo}
                                  </p>
                                  {isUnread && (
                                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">
                                  {notif.mensaje}
                                </p>
                                {notif.creadoPorNombre && (
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Por: {notif.creadoPorNombre}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Content: OTs Críticas */}
                {notifTab === 'alerts' && (
                  <div>
                    {criticalOTs.length === 0 ? (
                      <div className="px-4 py-8 text-center text-slate-500 text-sm">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Sin alertas críticas 🎉
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
                        {criticalOTs.map((ot) => {
                          const level = getUrgency(ot.fechaEntrega, ot.status);
                          return (
                            <button
                              key={ot.id}
                              onClick={() => { setNotifOpen(false); goToOT(ot.id); }}
                              className="w-full text-left px-4 py-3 hover:bg-slate-800/60 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0 animate-pulse" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-white truncate">
                                    {ot.folio} — {ot.descripcion}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-0.5">{ot.cliente}</p>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <Clock className="w-3 h-3 text-red-400" />
                                    <span className="text-xs text-red-400 font-medium">
                                      {URGENCY_LABELS[level]} · {formatDate(ot.fechaEntrega)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-900/80 flex justify-between items-center text-xs">
                  <button
                    onClick={() => { setNotifOpen(false); router.push('/dashboard/ordenes'); }}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Ver todas las OCs →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Role badge */}
          {userData && (
            <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${
              userData.role === 'admin'
                ? 'bg-violet-500/10 text-violet-400 border-violet-500/30'
                : userData.role === 'produccion'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              {userData.role === 'admin' ? 'Admin' : userData.role === 'produccion' ? 'Producción' : 'Compras'}
            </span>
          )}
        </div>
      </header>

      {/* ── Search Modal ────────────────────────────────────────────── */}
      {searchOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setSearchOpen(false)}
          />
          <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50 px-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  ref={searchRef}
                  id="global-search-input"
                  type="text"
                  placeholder="Buscar OT por folio, cliente, descripción..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder:text-slate-500 text-sm focus:outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-slate-300">
                    <X className="w-4 h-4" />
                  </button>
                )}
                <kbd
                  onClick={() => setSearchOpen(false)}
                  className="text-xs bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-500 cursor-pointer hover:text-slate-300"
                >
                  Esc
                </kbd>
              </div>

              {/* Results */}
              {searchQuery.length < 2 ? (
                <div className="px-4 py-8 text-center text-slate-600 text-sm">
                  Escribe al menos 2 caracteres para buscar
                </div>
              ) : searchResults.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500 text-sm">
                  Sin resultados para "{searchQuery}"
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
                  {searchResults.map((ot) => {
                    const level = getUrgency(ot.fechaEntrega, ot.status);
                    return (
                      <button
                        key={ot.id}
                        onClick={() => goToOT(ot.id)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-800/60 transition-colors flex items-center gap-3"
                      >
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            ot.status === 'completada' || ot.status === 'cancelada'
                              ? 'bg-slate-500'
                              : level === 'rojo'
                              ? 'bg-red-500'
                              : level === 'amarillo'
                              ? 'bg-yellow-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white">
                            <span className="font-mono text-blue-400">{ot.folio}</span>
                            {' — '}
                            {ot.descripcion}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {ot.cliente} · {ot.ocFolio}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500 shrink-0">{formatDate(ot.fechaEntrega)}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="px-4 py-2 border-t border-slate-800 flex gap-4 text-xs text-slate-600">
                <span>↑↓ navegar</span>
                <span>↵ abrir</span>
                <span>Esc cerrar</span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
