import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: 'MXN' | 'USD' = 'MXN'
): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function parseLocalDate(dateInput: string | Date | null | undefined): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  const parts = dateInput.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 12, 0, 0);
  }
  return new Date(dateInput);
}

export function formatDate(
  date: { toDate: () => Date } | Date | string | undefined | null
): string {
  if (!date) return '—';
  let d: Date;
  if (typeof date === 'string') {
    d = parseLocalDate(date);
  } else if ('toDate' in date && typeof date.toDate === 'function') {
    d = date.toDate();
  } else {
    d = date as Date;
  }

  // Si la hora es exactamente 00:00:00 UTC (guardada desde YYYY-MM-DD),
  // ajustar al día UTC en hora local del mediodía para evitar desfases de zona horaria (-06:00)
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
    d = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0);
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(
  date: { toDate: () => Date } | Date | string | undefined | null
): string {
  if (!date) return '—';
  let d: Date;
  if (typeof date === 'string') {
    d = parseLocalDate(date);
  } else if ('toDate' in date && typeof date.toDate === 'function') {
    d = date.toDate();
  } else {
    d = date as Date;
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function getPeriodLabel(periodo: string): string {
  const [year, month] = periodo.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
