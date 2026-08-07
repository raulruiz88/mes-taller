'use client';

import { useEffect, useState } from 'react';
import { subscribeRemisiones } from '@/lib/firebase/firestore/remisiones';
import { Remision } from '@/lib/types';

export function useRemisiones() {
  const [remisiones, setRemisiones] = useState<Remision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeRemisiones((list) => {
      setRemisiones(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { remisiones, loading };
}
