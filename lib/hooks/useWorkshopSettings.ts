'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export function useWorkshopSettings() {
  const [tallerNombre, setTallerNombre] = useState<string>('Lions Mechanical & Electrical');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('taller_nombre');
      if (cached) setTallerNombre(cached);
    }

    const unsub = onSnapshot(
      doc(db, 'settings', 'global'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.tallerNombre) {
            setTallerNombre(data.tallerNombre);
            if (typeof window !== 'undefined') {
              localStorage.setItem('taller_nombre', data.tallerNombre);
            }
          }
        }
      },
      (err) => {
        console.warn('Error syncing workshop settings:', err);
      }
    );

    return () => unsub();
  }, []);

  return { tallerNombre };
}
