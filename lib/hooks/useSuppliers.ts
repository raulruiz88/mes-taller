'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Supplier } from '../types';

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'suppliers'), orderBy('nombre', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Supplier[];
        setSuppliers(list);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching suppliers:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { suppliers, loading };
}
