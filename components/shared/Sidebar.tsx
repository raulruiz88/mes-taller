'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { useWorkshopSettings } from '@/lib/hooks/useWorkshopSettings';
import { signOut } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import {
  Factory,
  LayoutDashboard,
  ClipboardList,
  Wrench,
  TrendingUp,
  Settings,
  LogOut,
  ChevronRight,
  Package,
  Users,
  ShoppingBag,
  Building2,
  X,
} from 'lucide-react';

const navItems = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    roles: ['admin', 'produccion', 'compras'],
  },
  {
    href: '/dashboard/ordenes',
    icon: ClipboardList,
    label: 'Órdenes de Compra',
    roles: ['admin', 'produccion', 'compras'],
  },
  {
    href: '/dashboard/compras',
    icon: ShoppingBag,
    label: 'Compras & Insumos',
    roles: ['admin', 'compras'],
  },
  {
    href: '/dashboard/maquilas',
    icon: Package,
    label: 'Maquilas / Salidas',
    roles: ['admin', 'produccion'],
  },
  {
    href: '/dashboard/finanzas',
    icon: TrendingUp,
    label: 'Finanzas & P&L',
    roles: ['admin'],
  },
  {
    href: '/dashboard/clientes',
    icon: Users,
    label: 'Clientes',
    roles: ['admin'],
  },
  {
    href: '/dashboard/proveedores',
    icon: Building2,
    label: 'Proveedores',
    roles: ['admin', 'compras'],
  },
  {
    href: '/dashboard/configuracion',
    icon: Settings,
    label: 'Configuración',
    roles: ['admin'],
  },
];

interface SidebarProps {
  currentPath: string;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ currentPath, mobileOpen, onCloseMobile }: SidebarProps) {
  const { userData } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  const rawRole = (userData?.role || '').toLowerCase().trim();
  const normalizedRole = rawRole.includes('admin')
    ? 'admin'
    : rawRole.includes('prod')
    ? 'produccion'
    : 'compras';

  const filteredNav = navItems.filter((item) =>
    item.roles.includes(normalizedRole)
  );

  const { tallerNombre } = useWorkshopSettings();

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between">
      <div>
        {/* Brand */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-700/60 shrink-0 bg-slate-900 shadow-md shadow-orange-500/10 flex items-center justify-center">
              <img
                src="/images/logo-icon.png"
                alt="Logo Taller"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-white text-xs leading-tight truncate capitalize" title={tallerNombre}>
                {tallerNombre || 'Lions Mechanical & Electrical'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">Control Industrial</p>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white shrink-0 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const active =
              item.href === '/dashboard'
                ? currentPath === '/dashboard'
                : currentPath.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                id={`nav-${item.href.replace(/\//g, '-').slice(1)}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  active
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <item.icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3 h-3 opacity-60" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        {userData && (
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
              {userData.displayName?.[0] ?? userData.email?.[0] ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">
                {userData.displayName || userData.email}
              </p>
              <p className="text-xs text-slate-500 capitalize">{userData.role}</p>
            </div>
          </div>
        )}
        <button
          id="sidebar-logout-btn"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex w-64 bg-slate-900/80 border-r border-slate-800 flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (visible only on mobile when mobileOpen is true) */}
      {mobileOpen && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-800 z-50 shadow-2xl flex flex-col">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
