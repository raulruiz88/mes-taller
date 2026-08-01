'use client';

import { useEffect, useState } from 'react';
import { subscribeExitSlips } from '@/lib/firebase/firestore/exit-slips';
import { ExitSlip, ExitSlipStatus } from '@/lib/types';

export function useExitSlips(filter: ExitSlipStatus | 'all' = 'all') {
  const [exitSlips, setExitSlips] = useState<ExitSlip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeExitSlips(filter, (slips) => {
      setExitSlips(slips);
      setLoading(false);
    });
    return () => unsub();
  }, [filter]);

  return { exitSlips, loading };
}
