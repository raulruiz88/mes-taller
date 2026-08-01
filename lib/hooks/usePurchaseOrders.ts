'use client';

import { useEffect, useState } from 'react';
import { subscribePurchaseOrders } from '@/lib/firebase/firestore/purchase-orders';
import { PurchaseOrder } from '@/lib/types';

export function usePurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribePurchaseOrders((orders) => {
      setPurchaseOrders(orders);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { purchaseOrders, loading };
}
