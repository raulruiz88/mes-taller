'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { DEFAULT_CATEGORIAS_GASTOS } from '@/lib/types';

/**
 * Hook que carga la lista de Categorías de Gastos desde Firestore (app_settings/global).
 * Si no hay lista guardada, usa el catálogo por defecto.
 * Se sincroniza en tiempo real.
 */
export function useCategoriasGastos() {
  const [categorias, setCategorias] = useState<string[]>([...DEFAULT_CATEGORIAS_GASTOS]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app_settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.categoriasGastos) && data.categoriasGastos.length > 0) {
          setCategorias(data.categoriasGastos);
        } else {
          setCategorias([...DEFAULT_CATEGORIAS_GASTOS]);
        }
      } else {
        setCategorias([...DEFAULT_CATEGORIAS_GASTOS]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { categorias, loading };
}
