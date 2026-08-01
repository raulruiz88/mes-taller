'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, resetPassword } from '@/lib/firebase/auth';
import { Factory, Lock, Mail, AlertCircle, FlaskConical, KeyRound, CheckCircle2, X } from 'lucide-react';

const DEMO_USERS = [
  {
    label: 'Admin',
    email: 'admin@mestaller.demo',
    password: 'Admin123!',
    emoji: '👑',
    color: 'from-violet-600/20 to-violet-600/10 border-violet-500/30 hover:border-violet-400/60 text-violet-300',
  },
  {
    label: 'Producción',
    email: 'produccion@mestaller.demo',
    password: 'Prod123!',
    emoji: '🔧',
    color: 'from-blue-600/20 to-blue-600/10 border-blue-500/30 hover:border-blue-400/60 text-blue-300',
  },
  {
    label: 'Compras',
    email: 'compras@mestaller.demo',
    password: 'Compras123!',
    emoji: '🛒',
    color: 'from-amber-600/20 to-amber-600/10 border-amber-500/30 hover:border-amber-400/60 text-amber-300',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password reset states
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  function getAuthErrorMessage(code: string): string {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Correo electrónico o contraseña incorrectos. Por favor verifica tus datos.';
      case 'auth/invalid-email':
        return 'El correo electrónico ingresado no tiene un formato válido.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos fallidos. Por seguridad, espera unos minutos o restablece tu contraseña.';
      case 'auth/user-disabled':
        return 'Esta cuenta ha sido desactivada. Contacta al administrador del taller.';
      case 'auth/network-request-failed':
        return 'Error de conexión. Verifica tu acceso a internet.';
      default:
        return 'Ocurrió un error al iniciar sesión. Inténtalo de nuevo.';
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    setResetError('');
    try {
      await resetPassword(resetEmail.trim());
      setResetSent(true);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        setResetError('No se encontró ninguna cuenta registrada con este correo.');
      } else if (code === 'auth/invalid-email') {
        setResetError('El formato del correo no es válido.');
      } else {
        setResetError('No se pudo enviar el correo. Verifica los datos e intenta de nuevo.');
      }
    } finally {
      setResetLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Sign in error:', err);
      const code = err?.code || '';
      setError(getAuthErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(user: (typeof DEMO_USERS)[0]) {
    setEmail(user.email);
    setPassword(user.password);
    setError('');
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-900/50 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Title */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-64 sm:w-72 h-24 sm:h-28 rounded-2xl overflow-hidden shadow-2xl shadow-orange-500/15 mb-4 border-0 flex items-center justify-center">
            <img
              src="/images/logo-full.png"
              alt="Lions Mechanical & Electrical"
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
            Lions Mechanical & Electrical
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Control Industrial & Gestión de Producción</p>
        </div>

        {/* Login Card */}
        <div className="glass rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Iniciar Sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@taller.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span />
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setResetSent(false);
                    setResetError('');
                    setResetModalOpen(true);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              id="login-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed transform active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Iniciando sesión...
                </span>
              ) : (
                'Entrar al Sistema'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            Acceso restringido al personal autorizado
          </p>
        </div>

        {/* ── DEMO QUICK-LOGIN — solo en desarrollo ─────────────────────── */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-5">
            {/* Divider */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-px bg-slate-800" />
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                <FlaskConical className="w-3 h-3 text-amber-400" />
                <span className="text-xs font-medium text-amber-400 tracking-wide">MODO DEMO</span>
              </div>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Quick-login buttons */}
            <div className="grid grid-cols-3 gap-2">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.email}
                  id={`demo-${u.label.toLowerCase().replace('ó','o')}-btn`}
                  type="button"
                  onClick={() => fillDemo(u)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border bg-gradient-to-b ${u.color} transition-all duration-150 active:scale-95`}
                >
                  <span className="text-xl leading-none">{u.emoji}</span>
                  <span className="text-xs font-semibold leading-none">{u.label}</span>
                  <span className="text-[10px] opacity-60 leading-none font-mono">Demo</span>
                </button>
              ))}
            </div>

            <p className="text-center text-[10px] text-slate-600 mt-2">
              Toca un rol para rellenar las credenciales · Luego presiona Entrar
            </p>
          </div>
        )}

        <p className="text-center text-[10px] text-slate-600 mt-4 font-mono">
          Firebase Project: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-local'}
        </p>
      </div>

      {/* Password Reset Modal */}
      {resetModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setResetModalOpen(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-slate-900 border border-slate-700 rounded-2xl z-50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white text-sm">Recuperar / Crear Contraseña</h3>
              </div>
              <button onClick={() => setResetModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetSent ? (
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>¡Enlace enviado! Revisa tu correo para asignar tu contraseña privada.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-slate-400">
                  Escribe el correo del empleado. Le enviaremos un enlace oficial para que asigne su propia contraseña personal.
                </p>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Correo Electrónico</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    placeholder="tu@taller.com"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {resetError && <p className="text-xs text-red-400">{resetError}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResetModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                  >
                    {resetLoading ? 'Enviando...' : 'Enviar Enlace'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
