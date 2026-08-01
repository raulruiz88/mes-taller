'use client';

import { useEffect, useState } from 'react';
import { subscribeWorkOrders } from '@/lib/firebase/firestore/work-orders';
import { WorkOrder } from '@/lib/types';

export function useWorkOrders() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeWorkOrders((orders) => {
      setWorkOrders(orders);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { workOrders, loading };
}
