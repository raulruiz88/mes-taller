'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { CENTROS_TRABAJO } from '@/lib/types';

/**
 * Hook que carga la lista de Centros de Trabajo desde Firestore (app_settings/global).
 * Si no hay lista guardada, usa el catálogo estático por defecto.
 * Se sincroniza en tiempo real.
 */
export function useCentrosTrabajo() {
  const [centros, setCentros] = useState<string[]>([...CENTROS_TRABAJO]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app_settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.centrosTrabajo) && data.centrosTrabajo.length > 0) {
          setCentros(data.centrosTrabajo);
        } else {
          setCentros([...CENTROS_TRABAJO]);
        }
      } else {
        setCentros([...CENTROS_TRABAJO]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { centros, loading };
}
