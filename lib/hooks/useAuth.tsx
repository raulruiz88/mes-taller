'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { User } from 'firebase/auth';
import { AppUser } from '@/lib/types';
import { onAuthChange, getUserData } from '@/lib/firebase/auth';

interface AuthContextType {
  user: User | null;
  userData: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  isProduccion: boolean;
  isCompras: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isAdmin: false,
  isProduccion: false,
  isCompras: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // 1. Intentar cargar inmediatamente de la memoria del navegador por si existe
        if (typeof window !== 'undefined') {
          const cachedStr = localStorage.getItem(`user_data_${firebaseUser.uid}`);
          if (cachedStr) {
            try {
              setUserData(JSON.parse(cachedStr));
            } catch {
              // ignore
            }
          }
        }

        // 2. OBLIGATORIO: Esperar la respuesta oficial de la base de datos Firestore en la Nube
        try {
          const data = await getUserData(firebaseUser.uid);
          if (data) {
            setUserData(data);
            if (typeof window !== 'undefined') {
              localStorage.setItem(`user_data_${firebaseUser.uid}`, JSON.stringify(data));
            }
          }
        } catch (e) {
          console.error('Error al obtener datos de Firestore:', e);
        }
      } else {
        setUserData(null);
        if (typeof window !== 'undefined') {
          const keys = Object.keys(localStorage).filter((k) => k.startsWith('user_data_'));
          keys.forEach((k) => localStorage.removeItem(k));
        }
      }

      // 3. SOLO desactivar el spinner de carga cuando Firestore ya haya respondido
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const isFullyLoaded = !loading && (!user || Boolean(userData));

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading: !isFullyLoaded,
        isAdmin: userData?.role === 'admin',
        isProduccion: userData?.role === 'produccion',
        isCompras: userData?.role === 'compras',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
